<template>
  <collapsable-card
    :title="$t('app.vividMms.title')"
    icon="$mmu"
    draggable
    layout-path="dashboard.vivid-mms-card"
  >
    <template #menu>
      <v-chip
        :color="isPaused ? 'warning' : 'success'"
        small
        class="me-1"
      >
        {{ statusMessage }}
      </v-chip>
    </template>

    <v-card-text class="pa-0">
      <filament-path
        :slots-data="slotsData"
        :lanes="derivedLanes"
        :physical-lane="activeLane"
        :selected-lane="selectedLaneId"
        :active-color="activeSpoolColor"
        :mms-status="statusMessage"
        :steppers-data="steppersData"
        @edit-filament="onEditFilament"
        @select-lane="onSelectLane"
      />
    </v-card-text>

    <v-divider />
    <!-- Advanced / Maintenance Section -->
    <v-expansion-panels flat>
      <v-expansion-panel>
        <v-expansion-panel-header>
          <div>
            <v-icon left>
              mdi-cog
            </v-icon> {{ $t('app.vividMms.advanced_maintenance') }}
          </div>
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <vivid-maintenance :selected-lane="selectedLaneId" />
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>

    <spool-selection-modal
      v-model="isSpoolModalOpen"
      :target-lane="modalTargetLane"
      @bind="onSpoolBind"
    />

    <vivid-set-filament-dialog ref="setFilamentDialog" />
  </collapsable-card>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import FilamentPath from './FilamentPath.vue'
import SpoolSelectionModal from './SpoolSelectionModal.vue'
import VividMaintenance from './VividMaintenance.vue'
import VividSetFilamentDialog from './VividSetFilamentDialog.vue'

@Component({
  components: {
    FilamentPath,
    SpoolSelectionModal,
    VividMaintenance,
    VividSetFilamentDialog
  }
})
export default class VividMmsCard extends Vue {
  selectedLaneId: number | null = null
  isSpoolModalOpen = false
  modalTargetLane: number | null = null
  fetchTimer: ReturnType<typeof setInterval> | null = null

  mounted () {
    this.$store.dispatch('vividMms/fetchLaneData')
    // Initialize selected lane with physical lane if available
    this.selectedLaneId = this.activeLane

    // Check every 10 seconds just to keep lane_data in sync
    this.fetchTimer = setInterval(() => {
      this.$store.dispatch('vividMms/fetchLaneData')
    }, 10000)
  }

  beforeDestroy () {
    if (this.fetchTimer) clearInterval(this.fetchTimer)
  }

  get activeSlotData () {
    return this.$store.getters['vividMms/activeSlotData']
  }

  get isFilamentLoaded () {
    const slot = this.activeSlotData
    return slot && (slot.outlet === 1 || slot.entry === 1)
  }

  get derivedLanes () {
    return this.$store.getters['vividMms/derivedLanes']
  }

  get activeLane () {
    const activeLaneState = this.$store.getters['vividMms/activeLaneState']
    return activeLaneState ? activeLaneState.id : null
  }

  get filamentPosition () {
    return this.$store.getters['vividMms/filamentPosition']
  }

  get isPaused () {
    const klipperMms = this.$store.getters['vividMms/klipperMms']
    return klipperMms?.is_paused ?? this.$store.state.vividMms.is_paused
  }

  get slotsData () {
    const klipperMms = this.$store.getters['vividMms/klipperMms']
    return klipperMms?.slots || {}
  }

  get steppersData () {
    const klipperMms = this.$store.getters['vividMms/klipperMms']
    return klipperMms?.steppers || {}
  }

  get statusMessage () {
    const klipperMms = this.$store.getters['vividMms/klipperMms']
    const rawStatus = (klipperMms?.state ?? klipperMms?.status ?? this.$store.state.vividMms.status_message ?? '').toLowerCase()

    if (rawStatus === 'idle' || rawStatus === 'ready') {
      if (this.activeLane !== null) {
        return `Selector at Slot ${this.activeLane}`
      }
      return 'Idle'
    }

    if (rawStatus === 'loaded') {
      if (this.activeLane !== null) {
        return `Loaded Slot ${this.activeLane}`
      }
      return 'Loaded'
    }

    return rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)
  }

  get activeSpoolColor () {
    if (this.activeLane === null) return 'transparent'

    const spool = this.$store.getters['vividMms/getLaneSpool'](this.activeLane)
    if (spool && spool.color) {
      return spool.color.startsWith('#') ? spool.color : `#${spool.color}`
    }

    const laneObj = this.derivedLanes.find((l: any) => l.id === this.activeLane)
    if (laneObj && laneObj.has_filament) {
      const defaults = ['#ff4444', '#44ff44', '#4444ff', '#ffff44']
      return defaults[this.activeLane] || '#ccc'
    }

    return 'transparent'
  }

  onSelectLane (laneId: number) {
    this.selectedLaneId = laneId
  }

  onEditFilament (laneId: number) {
    this.modalTargetLane = laneId
    ;(this.$refs.setFilamentDialog as any).open(laneId)
  }

  onSpoolBind (spoolId: number) {
    if (this.modalTargetLane !== null) {
      this.$store.dispatch('vividMms/bindSpoolToLane', { laneId: this.modalTargetLane, spoolId })
    }
    this.isSpoolModalOpen = false
  }
}
</script>

<style scoped>
</style>
