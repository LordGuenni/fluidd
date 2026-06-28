<template>
  <div class="vivid-maintenance pa-2">
    <h4 class="text-subtitle-2 mb-2">
      {{ $t('app.vividMms.rfid_operations') }}
    </h4>
    <v-alert
      v-if="selectedLane === null"
      type="info"
      dense
      text
    >
      {{ $t('app.vividMms.select_lane_rfid') }}
    </v-alert>
    <div
      v-else
      class="d-flex flex-column"
      style="gap: 8px;"
    >
      <v-btn
        small
        color="secondary"
        :disabled="!canExecuteAction"
        @click="readRfid"
      >
        <v-icon left>
          mdi-nfc
        </v-icon> {{ $t('app.vividMms.read_rfid_lane', { selectedLane }) }}
      </v-btn>
    </div>

    <v-divider class="my-4" />

    <h4 class="text-subtitle-2 mb-2">
      {{ $t('app.vividMms.hardware_maintenance') }}
    </h4>
    <v-alert
      v-if="selectedLane === null"
      type="info"
      dense
      text
    >
      {{ $t('app.vividMms.select_lane_hardware') }}
    </v-alert>
    <div
      v-else
      class="d-flex flex-column"
      style="gap: 8px;"
    >
      <v-btn
        small
        color="secondary"
        :disabled="!canExecuteAction"
        @click="selectSlotAction"
      >
        <v-icon left>
          mdi-target
        </v-icon> {{ $t('app.vividMms.select_slot') }}
      </v-btn>
      <v-btn
        small
        color="secondary"
        :disabled="!canExecuteAction"
        @click="preloadLane"
      >
        <v-icon left>
          mdi-download
        </v-icon> {{ $t('app.vividMms.preload_to_feeder') }}
      </v-btn>
      <v-btn
        small
        color="secondary"
        :disabled="!canExecuteAction"
        @click="popLane"
      >
        <v-icon left>
          mdi-eject-outline
        </v-icon> {{ $t('app.vividMms.pop_filament') }}
      </v-btn>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'

@Component
export default class VividMaintenance extends Vue {
  @Prop({ type: Number, default: null }) readonly selectedLane!: number | null

  get canExecuteAction () {
    const state = this.$store.getters['printer/getPrinterState']
    return state !== 'printing'
  }

  readRfid () {
    this.$store.dispatch('vividMms/readRfid', this.selectedLane)
  }

  selectSlotAction () {
    if (this.selectedLane !== null) {
      this.$store.dispatch('vividMms/selectLane', this.selectedLane)
    }
  }

  preloadLane () {
    if (this.selectedLane !== null) {
      this.$store.dispatch('vividMms/preloadLane', this.selectedLane)
    }
  }

  popLane () {
    if (this.selectedLane !== null) {
      this.$store.dispatch('vividMms/popLane', this.selectedLane)
    }
  }
}
</script>
