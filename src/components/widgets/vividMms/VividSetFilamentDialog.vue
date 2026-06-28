<template>
  <v-dialog
    v-model="isOpen"
    max-width="400"
    @keydown.esc="close"
  >
    <v-card>
      <v-card-title>
        Set Filament - Slot {{ laneId }}
      </v-card-title>

      <v-card-text>
        <v-switch
          v-model="useSpoolman"
          label="Use Spoolman"
          :disabled="!hasSpoolman"
          :hint="hasSpoolman ? '' : 'Spoolman must be configured to use this feature'"
          :persistent-hint="!hasSpoolman"
          class="mt-0 mb-4"
        >
          <template #append>
            <v-chip
              v-if="useSpoolman && selectedSpoolId !== null"
              small
              color="primary"
            >
              ID: {{ selectedSpoolId }}
            </v-chip>
          </template>
        </v-switch>

        <v-autocomplete
          v-if="useSpoolman"
          v-model="selectedSpoolId"
          :items="spoolsList"
          item-text="displayText"
          item-value="id"
          label="Select Spool from Spoolman"
          outlined
          dense
          class="mb-2"
        >
          <template #item="{ item }">
            <v-list-item-avatar>
              <div :style="{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: item.color, border: '1px solid rgba(128,128,128,0.3)' }" />
            </v-list-item-avatar>
            <v-list-item-content>
              <v-list-item-title>{{ item.displayText }}</v-list-item-title>
              <v-list-item-subtitle v-if="item.remaining != null">
                {{ item.remaining.toFixed(1) }}g remaining
              </v-list-item-subtitle>
            </v-list-item-content>
          </template>
        </v-autocomplete>

        <v-form @submit.prevent="save">
          <v-text-field
            v-model="formData.vendor"
            label="Vendor"
            placeholder="e.g. Polymaker"
            outlined
            dense
            :disabled="useSpoolman"
          />
          <v-text-field
            v-model="formData.material"
            label="Material"
            placeholder="e.g. PLA"
            outlined
            dense
            :disabled="useSpoolman"
          />

          <v-row
            class="mb-2"
            align="center"
          >
            <v-col cols="auto">
              <span class="mr-2">Color:</span>
            </v-col>
            <v-col cols="auto">
              <input
                v-model="formData.color"
                type="color"
                :disabled="useSpoolman"
                :style="{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '4px', cursor: useSpoolman ? 'not-allowed' : 'pointer', opacity: useSpoolman ? '0.5' : '1' }"
              >
            </v-col>
            <v-col>
              <v-text-field
                v-model="formData.color"
                label="Hex Code"
                outlined
                dense
                hide-details
                :disabled="useSpoolman"
              />
            </v-col>
          </v-row>

          <v-expansion-panels
            flat
            class="mb-4"
          >
            <v-expansion-panel>
              <v-expansion-panel-header class="pa-0 text-button text--secondary">
                Advanced (RFID & Print Settings)
              </v-expansion-panel-header>
              <v-expansion-panel-content class="pt-4">
                <v-row dense>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="formData.min_print_temperature"
                      label="Min Extruder Temp"
                      type="number"
                      dense
                      outlined
                      :disabled="useSpoolman"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="formData.max_print_temperature"
                      label="Max Extruder Temp"
                      type="number"
                      dense
                      outlined
                      :disabled="useSpoolman"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="formData.min_bed_temperature"
                      label="Min Bed Temp"
                      type="number"
                      dense
                      outlined
                      :disabled="useSpoolman"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="formData.max_bed_temperature"
                      label="Max Bed Temp"
                      type="number"
                      dense
                      outlined
                      :disabled="useSpoolman"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="formData.nominal_netto_full_weight"
                      label="Filament Weight (g)"
                      type="number"
                      dense
                      outlined
                      :disabled="useSpoolman"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="formData.empty_container_weight"
                      label="Spool Weight (g)"
                      type="number"
                      dense
                      outlined
                      :disabled="useSpoolman"
                    />
                  </v-col>
                </v-row>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>

          <v-checkbox
            v-model="writeToRfid"
            label="Write to RFID Tag"
            hide-details
            class="mt-0 mb-4"
          />
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-btn
          text
          color="error"
          @click="clearSlot"
        >
          Clear Slot
        </v-btn>
        <v-spacer />
        <v-btn
          text
          @click="close"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          @click="save"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'

@Component
export default class VividSetFilamentDialog extends Vue {
  isOpen = false
  laneId: number = 0
  writeToRfid = false
  useSpoolman = false
  selectedSpoolId: number | null = null

  formData = {
    vendor: '',
    material: '',
    color: '#ffffff',
    min_print_temperature: 0,
    max_print_temperature: 0,
    min_bed_temperature: 0,
    max_bed_temperature: 0,
    nominal_netto_full_weight: 1000,
    empty_container_weight: 200
  }

  open (laneId: number) {
    this.laneId = laneId

    // Load existing data if any
    let lanes = this.$store.getters['vividMms/derivedLanes'] || []
    if (!Array.isArray(lanes) && typeof lanes === 'object') {
      lanes = Object.values(lanes)
    }
    const laneObj = lanes.find((l: any) => l.id === laneId)
    if (laneObj && laneObj.has_filament) {
      this.formData.vendor = laneObj.vendor || ''
      this.formData.material = laneObj.material || ''
      this.formData.color = laneObj.color && laneObj.color.startsWith('#') ? laneObj.color : `#${laneObj.color || 'ffffff'}`
    } else {
      this.formData.vendor = ''
      this.formData.material = ''
      this.formData.color = '#ffffff'
    }

    this.writeToRfid = false
    this.useSpoolman = this.hasSpoolman
    this.selectedSpoolId = laneObj?.spool_id || null
    this.isOpen = true
  }

  get hasSpoolman () {
    return this.$store.getters['server/componentSupport']('spoolman')
  }

  get spoolsList () {
    const rawSpools = this.$store.state.spoolman?.spools || []
    return rawSpools.map((s: any) => ({
      id: s.id,
      vendor: s.filament?.vendor?.name || 'Unknown',
      material: s.filament?.material || s.filament?.name || 'Unknown',
      color: s.filament?.color_hex ? `#${s.filament.color_hex}` : '#cccccc',
      remaining: (s.initial_weight != null && s.used_weight != null) ? (s.initial_weight - s.used_weight) : null,
      displayText: `${s.filament?.vendor?.name || 'Unknown'} - ${s.filament?.material || s.filament?.name || 'Unknown'}`,
      min_print_temperature: s.filament?.settings_extruder_temp || 0,
      max_print_temperature: s.filament?.settings_extruder_temp || 0,
      min_bed_temperature: s.filament?.settings_bed_temp || 0,
      max_bed_temperature: s.filament?.settings_bed_temp || 0,
      nominal_netto_full_weight: s.filament?.weight || 1000,
      empty_container_weight: s.filament?.spool_weight || 200
    }))
  }

  @Watch('selectedSpoolId')
  onSpoolSelected (newId: number | null) {
    if (newId !== null && this.useSpoolman) {
      const spool = this.spoolsList.find((s: any) => s.id === newId)
      if (spool) {
        this.formData.vendor = spool.vendor
        this.formData.material = spool.material
        this.formData.color = spool.color
        this.formData.min_print_temperature = spool.min_print_temperature
        this.formData.max_print_temperature = spool.max_print_temperature
        this.formData.min_bed_temperature = spool.min_bed_temperature
        this.formData.max_bed_temperature = spool.max_bed_temperature
        this.formData.nominal_netto_full_weight = spool.nominal_netto_full_weight
        this.formData.empty_container_weight = spool.empty_container_weight
      }
    }
  }

  close () {
    this.isOpen = false
  }

  async clearSlot () {
    await this.$store.dispatch('vividMms/setLaneData', {
      laneId: this.laneId,
      vendor: '',
      material: '',
      color: '',
      has_filament: false
    })
    this.close()
  }

  async save () {
    // We no longer need to call bindSpoolToLane separately if setLaneData handles SPOOLID
    // But we'll leave it in case other logic relies on it, or we can just let setLaneData handle everything!

    await this.$store.dispatch('vividMms/setLaneData', {
      laneId: this.laneId,
      vendor: this.formData.vendor,
      material: this.formData.material,
      color: this.formData.color.replace('#', ''),
      nozzle_temp: this.formData.min_print_temperature,
      bed_temp: this.formData.min_bed_temperature,
      spool_id: this.useSpoolman ? this.selectedSpoolId : null,
      has_filament: true
    })

    if (this.writeToRfid) {
      if (this.useSpoolman && this.selectedSpoolId !== null) {
        this.$store.dispatch('vividMms/writeRfid', {
          laneId: this.laneId,
          spoolId: this.selectedSpoolId
        })
      } else {
        const payload: any = {
          brand_name: this.formData.vendor,
          material_type: this.formData.material,
          primary_color: this.formData.color.replace('#', '') + 'FF'
        }

        if (this.formData.min_print_temperature) payload.min_print_temperature = this.formData.min_print_temperature
        if (this.formData.max_print_temperature) payload.max_print_temperature = this.formData.max_print_temperature
        if (this.formData.min_bed_temperature) payload.min_bed_temperature = this.formData.min_bed_temperature
        if (this.formData.max_bed_temperature) payload.max_bed_temperature = this.formData.max_bed_temperature
        if (this.formData.nominal_netto_full_weight) payload.nominal_netto_full_weight = this.formData.nominal_netto_full_weight
        if (this.formData.empty_container_weight) payload.empty_container_weight = this.formData.empty_container_weight

        const dataStr = JSON.stringify(payload)
        this.$store.dispatch('vividMms/writeRfidData', {
          laneId: this.laneId,
          data: dataStr
        })
      }
    }

    this.close()
  }
}
</script>
