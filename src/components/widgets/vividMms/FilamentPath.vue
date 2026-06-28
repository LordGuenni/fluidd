<template>
  <div class="mms-widget-container">
    <div class="mms-main-layout">
      <!-- Hardware View (Left side) -->
      <div class="mms-hardware-view">
        <div class="mms-slots-grid">
          <div
            v-for="lane in [0, 1, 2, 3]"
            :key="`slot-${lane}`"
            :class="['mms-slot-card', {
              'active-card': selectedLane === lane,
              'physical-card': physicalLane === lane && selectedLane !== lane
            }]"
            @click="selectLane(lane)"
          >
            <div class="slot-header">
              <span class="slot-number-circle">
                {{ lane }}
              </span>
              <v-icon
                v-if="physicalLane === lane"
                small
                color="primary"
                title="Hardware active"
              >
                mdi-check-circle
              </v-icon>
              <v-btn
                v-if="hasSensor(lane, 'rfid')"
                icon
                small
                :disabled="!canExecuteAction"
                title="Read RFID"
                class="rfid-btn"
                @click="triggerRfidRead(lane)"
              >
                <v-icon
                  small
                  color="blue"
                >
                  mdi-nfc
                </v-icon>
              </v-btn>
            </div>

            <div
              class="filament-block"
              :style="{
                backgroundColor: getLaneColor(lane),
                color: getContrastColor(getLaneColor(lane)),
                boxShadow: `0 2px 8px ${getLaneColor(lane)}40`
              }"
              title="Click to map spool"
              @click.stop="editFilament(lane)"
            >
              <div class="filament-info">
                <span
                  v-if="hasSpool(lane) && getFilamentVendor(lane)"
                  class="vendor"
                >{{ getFilamentVendor(lane) }}</span>
                <span
                  class="type"
                  :style="{ opacity: !isSlotEmpty(lane) ? 1 : 0.5 }"
                >{{ getFilamentType(lane) }}</span>
                <span
                  v-if="hasSpool(lane) && getSpoolWeight(lane)"
                  class="weight"
                >{{ getSpoolWeight(lane) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="filament-path-wrapper">
          <svg
            viewBox="0 0 300 120"
            class="filament-svg"
          >
            <!-- Background paths (unified to prevent overlap opacity compounding) -->
            <path
              d="M 37.5 0 L 37.5 40 L 262.5 40 M 112.5 0 L 112.5 45 M 187.5 0 L 187.5 40 M 262.5 0 L 262.5 40"
              stroke="currentColor"
              opacity="0.4"
              stroke-width="3"
              fill="none"
              stroke-linejoin="round"
              stroke-linecap="round"
            />

            <!-- Foreground paths for each lane -->
            <template v-for="lane in [0, 1, 2, 3]">
              <!-- Solid colored filament -->
              <path
                v-if="getPathD(lane)"
                :key="`path-${lane}`"
                :d="getPathD(lane)"
                :stroke="getLaneColor(lane)"
                stroke-width="5"
                fill="none"
                stroke-linejoin="round"
                stroke-linecap="round"
                class="filament-strand"
              />
              <!-- Flow animation overlay -->
              <path
                v-if="getPathD(lane) && getAnimationClass(lane)"
                :key="`path-anim-${lane}`"
                :d="getPathD(lane)"
                stroke="#ffffff"
                opacity="0.5"
                stroke-width="5"
                fill="none"
                stroke-linejoin="round"
                stroke-linecap="round"
                :class="['filament-strand', getAnimationClass(lane)]"
              />
            </template>

            <!-- Buffer Hub -->
            <rect
              x="102.5"
              y="45"
              width="20"
              height="24"
              rx="3"
              fill="currentColor"
              fill-opacity="0.1"
              stroke="currentColor"
              opacity="0.4"
              stroke-width="2"
            />
            <!-- Buffer internal coil -->
            <circle
              cx="112.5"
              cy="57"
              r="5"
              fill="none"
              stroke="currentColor"
              opacity="0.4"
              stroke-width="2"
            />
            <circle
              cx="112.5"
              cy="57"
              r="2"
              fill="currentColor"
              opacity="0.4"
            />

            <!-- Shared Filament Path (Toolhead downstream) -->
            <!-- Background track -->
            <line
              x1="112.5"
              y1="69"
              x2="112.5"
              y2="85"
              stroke="currentColor"
              opacity="0.4"
              stroke-width="5"
            />

            <!-- Toolhead Downstream Foreground Solid -->
            <line
              v-if="physicalOutlet"
              x1="112.5"
              y1="69"
              x2="112.5"
              y2="85"
              :stroke="activeColor"
              stroke-width="5"
              stroke-linecap="round"
              class="filament-strand"
            />
            <!-- Toolhead Downstream Flow Animation Overlay -->
            <line
              v-if="physicalOutlet && getAnimationClass(physicalLane !== null ? physicalLane : 0)"
              x1="112.5"
              y1="69"
              x2="112.5"
              y2="85"
              stroke="#ffffff"
              opacity="0.5"
              stroke-width="5"
              stroke-linecap="round"
              :class="['filament-strand', getAnimationClass(physicalLane !== null ? physicalLane : 0)]"
            />

            <!-- Extruder/Nozzle Indicator -->
            <!-- Main Extruder Block -->
            <rect
              x="102.5"
              y="85"
              width="20"
              height="24"
              rx="2"
              fill="currentColor"
              opacity="0.4"
            />
            <!-- Inner Filament Window -->
            <rect
              x="106.5"
              y="89"
              width="12"
              height="16"
              rx="1"
              :fill="physicalEntry ? activeColor : 'transparent'"
            />
            <!-- Nozzle Tip -->
            <polygon
              points="106.5,109 118.5,109 112.5,117"
              fill="currentColor"
              opacity="0.4"
            />
          </svg>
        </div>

        <!-- Tips Panel (Right side) -->
        <div class="mms-tips-panel">
          <h3>Tips</h3>
          <p>Choose an MMS slot then press "Load" to automatically load filament.</p>
          <p
            v-if="mmsStatus"
            class="mt-4"
          >
            <strong>Status:</strong> {{ mmsStatus }}
          </p>

          <div
            class="mt-4 d-flex flex-column"
            style="gap: 8px;"
          >
            <v-btn
              color="success"
              :disabled="!canExecuteAction || selectedLane === null || activeEntry"
              @click="loadLane"
            >
              <v-icon left>
                mdi-download
              </v-icon>
              Load Filament
            </v-btn>

            <v-btn
              color="error"
              :disabled="!canExecuteAction || selectedLane === null || !activeOutlet"
              @click="unloadLane"
            >
              <v-icon left>
                mdi-eject
              </v-icon>
              Eject Filament
            </v-btn>

            <v-btn
              :disabled="!canExecuteAction"
              @click="brushNozzle"
            >
              <v-icon left>
                mdi-brush
              </v-icon>
              Brush Nozzle
            </v-btn>

            <v-btn
              :disabled="!canExecuteAction"
              @click="cutFilament"
            >
              <v-icon left>
                mdi-content-cut
              </v-icon>
              Cut Filament
            </v-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'

@Component
export default class FilamentPath extends Vue {
  @Prop({ type: Object, default: () => ({}) }) readonly slotsData!: Record<string, any>
  @Prop({ type: Object, default: () => ({}) }) readonly steppersData!: Record<string, any>
  @Prop({ type: Array, default: () => [] }) readonly lanes!: any[]
  @Prop({ type: Number, default: null }) readonly physicalLane!: number | null
  @Prop({ type: Number, default: null }) readonly selectedLane!: number | null
  @Prop({ type: String, required: true }) readonly activeColor!: string
  @Prop({ type: String, default: '' }) readonly mmsStatus!: string

  selectLane (lane: number) {
    this.$emit('select-lane', lane)
  }

  editFilament (lane: number) {
    this.$emit('edit-filament', lane)
  }

  loadLane () {
    if (this.selectedLane !== null) {
      this.$store.dispatch('vividMms/loadLane', this.selectedLane)
    }
  }

  unloadLane () {
    if (this.selectedLane !== null) {
      // MMS eject
      this.$store.dispatch('vividMms/ejectFilament')
    }
  }

  brushNozzle () {
    this.$store.dispatch('vividMms/brushNozzle')
  }

  cutFilament () {
    this.$store.dispatch('vividMms/cutFilament')
  }

  triggerRfidRead (laneIndex: number) {
    this.$store.dispatch('server/sendKlipperCommand', `MMS_RFID_READ SLOT=${laneIndex} SWITCH=1 ALIGN=1`)
  }

  getAnimationClass (laneIndex: number) {
    if (this.physicalLane !== laneIndex) return ''

    // Check mechanical drive state
    const drives = this.steppersData?.drives || {}
    let isRunning = false
    let isForward = true

    for (const driveId in drives) {
      const drive = drives[driveId]
      if (drive.focus_slot === laneIndex && drive.is_running) {
        isRunning = true
        isForward = drive.forward
        break
      }
    }

    if (!isRunning) {
      // If MMS motor is idle but printer is actively printing with this filament
      const isPrinting = this.$store.getters['printer/getPrinterState'] === 'printing'
      if (isPrinting && this.physicalOutlet) {
        return 'animated-path-slow'
      }
    }

    if (isRunning) {
      return isForward ? 'animated-path' : 'animated-path-reverse'
    }

    return ''
  }

  hasSpool (laneIndex: number) {
    const laneObj = this.lanes.find(l => l.id === laneIndex)
    if (laneObj) {
      const spool = this.$store.getters['vividMms/getLaneSpool'](laneObj.id)
      return !!spool
    }
    return false
  }

  getFilamentMaterial (laneIndex: number) {
    const spool = this.$store.getters['vividMms/getLaneSpool'](laneIndex)
    if (spool) return spool.material || ''

    const laneObj = this.lanes.find((l: any) => l.id === laneIndex)
    if (laneObj && laneObj.has_filament) return laneObj.material || 'Unknown'
    return 'Empty'
  }

  isSlotEmpty (laneIndex: number) {
    const laneObj = this.lanes.find(l => l.id === laneIndex)
    return laneObj ? !laneObj.has_filament : true
  }

  getLaneColor (laneIndex: number) {
    const laneObj = this.lanes.find(l => l.id === laneIndex)
    if (laneObj) {
      const spool = this.$store.getters['vividMms/getLaneSpool'](laneObj.id)
      if (spool && spool.color) {
        return spool.color.startsWith('#') ? spool.color : `#${spool.color}`
      }

      // If no spool is bound, but there IS physically filament inserted
      if (laneObj.has_filament) {
        const defaults = ['#ff4444', '#44ff44', '#4444ff', '#ffff44']
        return defaults[laneIndex]
      }
    }
    // Truly empty slot
    return 'transparent'
  }

  getFilamentVendor (laneIndex: number) {
    const laneObj = this.lanes.find(l => l.id === laneIndex)
    if (laneObj) {
      const spool = this.$store.getters['vividMms/getLaneSpool'](laneObj.id)
      if (spool && spool.vendor) return spool.vendor
    }
    return ''
  }

  getFilamentType (laneIndex: number) {
    const laneObj = this.lanes.find(l => l.id === laneIndex)
    if (laneObj) {
      const spool = this.$store.getters['vividMms/getLaneSpool'](laneObj.id)
      if (spool && spool.material) return spool.material

      // If no spool is bound, but there IS physically filament inserted
      if (laneObj.has_filament) return 'Unknown'
    }
    return 'Empty'
  }

  getSpoolWeight (laneIndex: number) {
    const laneObj = this.lanes.find(l => l.id === laneIndex)
    if (laneObj) {
      const spool = this.$store.getters['vividMms/getLaneSpool'](laneObj.id)
      if (spool && spool.remaining_weight != null) return `${Math.round(spool.remaining_weight)}g`
    }
    return ''
  }

  getContrastColor (hexColor: string) {
    if (!hexColor || hexColor === '#FFFFFF') return '#000000'
    const hex = hexColor.replace('#', '')
    if (hex.length !== 6) return '#FFFFFF'
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 150 ? '#000000' : '#FFFFFF'
  }

  hasSensor (laneIndex: number, sensor: string) {
    return this.slotsData[laneIndex]?.[sensor] === 1
  }

  get canExecuteAction () {
    const state = this.$store.getters['printer/getPrinterState']
    return state !== 'printing'
  }

  get isLoaded () {
    const klipperMms = this.$store.getters['vividMms/klipperMms']
    return (klipperMms?.state ?? klipperMms?.status ?? '').toLowerCase() === 'loaded'
  }

  get activeOutlet () {
    const slot = this.selectedLane !== null ? this.slotsData[this.selectedLane] : null
    if (!slot) return false
    return this.isLoaded || slot.outlet === 1 || slot.entry === 1
  }

  get activeEntry () {
    const slot = this.selectedLane !== null ? this.slotsData[this.selectedLane] : null
    if (!slot) return false
    if (this.isLoaded) return true
    // If entry sensor is defined, use it. Otherwise, outlet acts as the final sensor.
    if ('entry' in slot && slot.entry !== null) {
      return slot.entry === 1
    }
    return slot.outlet === 1
  }

  get physicalOutlet () {
    const slot = this.physicalLane !== null ? this.slotsData[this.physicalLane] : null
    if (!slot) return false
    return this.isLoaded || slot.outlet === 1 || slot.entry === 1
  }

  get physicalEntry () {
    const slot = this.physicalLane !== null ? this.slotsData[this.physicalLane] : null
    if (!slot) return false
    if (this.isLoaded) return true
    if ('entry' in slot && slot.entry !== null) {
      return slot.entry === 1
    }
    return slot.outlet === 1
  }

  getPathD (laneIndex: number) {
    const slot = this.slotsData[laneIndex]
    if (!slot) return ''

    const startX = [37.5, 112.5, 187.5, 262.5][laneIndex]
    let path = `M ${startX} 0`

    if (slot.inlet === 1) {
      if (slot.gate === 1) {
        if (laneIndex === 1) {
          path += ' L 112.5 45'
        } else {
          path += ` L ${startX} 40 L 112.5 40 L 112.5 45`
        }
      } else {
        // Just the stub
        path += ` L ${startX} 20`
      }
      return path
    }
    return ''
  }
}
</script>

<style scoped>
.mms-widget-container {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  width: 100%;
}

.mms-main-layout {
  display: flex;
  flex-direction: row;
  gap: 24px;
}

.mms-hardware-view {
  display: flex;
  flex-direction: column;
  background: var(--v-background-base);
  border-radius: 12px;
  padding: 16px;
  flex: 1;
  position: relative;
  min-width: 350px;
}

/* Slots Grid Styles */
.mms-slots-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.mms-slot-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.mms-slot-card:hover {
  background: rgba(255,255,255,0.05);
}

.mms-slot-card.active-card {
  border: 2px solid var(--v-success-base, #4caf50);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.physical-card {
  border: 2px solid var(--v-primary-base, #1976d2);
}

.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  width: 100%;
}

.slot-number-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #444;
  color: #fff;
  border-radius: 10px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: bold;
}

.active-card .slot-number-circle {
  background: var(--v-primary-base, #2196f3);
}

.sync-icon {
  width: 14px;
  height: 14px;
  margin-left: 4px;
  cursor: pointer;
}
.sync-icon:hover {
  opacity: 0.8;
}

.filament-block {
  width: 65px;
  height: 80px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2);
}

.filament-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 11px;
  font-weight: bold;
  text-shadow: 0px 1px 2px rgba(0,0,0,0.5);
  text-align: center;
}

.vendor {
  font-size: 9px;
  opacity: 0.8;
  margin-bottom: 2px;
  max-width: 60px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.filament-status-icon {
  font-size: 14px;
  text-shadow: 0px 1px 2px rgba(0,0,0,0.5);
}

.filament-path-wrapper {
  margin-top: 0;
}

.filament-svg {
  width: 100%;
  height: auto;
}

.spacer { flex: 1; }

.mms-tips-panel {
  flex: 0 0 250px;
  display: flex;
  flex-direction: column;
  background: var(--v-background-base, #121216);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--v-background-lighten1, #2a2a35);
}

.mms-tips-panel h3 { margin-top: 0; font-size: 16px; color: currentColor; }
.mms-tips-panel p { font-size: 14px; color: currentColor; opacity: 0.7; }

.filament-strand { transition: d 0.3s ease; }
.animated-path { stroke-dasharray: 12; animation: dash 1s linear infinite; }
.animated-path-reverse { stroke-dasharray: 12; animation: dash-reverse 1s linear infinite; }
.animated-path-slow { stroke-dasharray: 12; animation: dash 4s linear infinite; }
@keyframes dash { to { stroke-dashoffset: -24; } }
@keyframes dash-reverse { to { stroke-dashoffset: 24; } }
</style>
