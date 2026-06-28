<template>
  <v-card
    :class="['mms-lane', { 'active-lane': isActive, 'selected-lane': isSelected }]"
    outlined
    @click="$emit('select')"
  >
    <div class="d-flex justify-space-between align-center pa-2">
      <div class="text-h6 font-weight-bold">
        {{ lane.id }}
      </div>
      <div>
        <v-icon :color="isActive ? 'success' : (lane.has_filament ? 'info' : 'grey')">
          {{ isActive ? 'mdi-printer-3d-nozzle' : (lane.has_filament ? 'mdi-dots-horizontal' : 'mdi-close-circle-outline') }}
        </v-icon>
      </div>
    </div>

    <v-card-text class="pt-0 pb-2">
      <div
        v-ripple
        class="spool-preview rounded cursor-pointer d-flex align-center pa-1"
        :style="{ borderLeft: `6px solid ${spoolData ? spoolData.color : '#555'}` }"
        @click.stop="$emit('open-spoolman')"
      >
        <div class="flex-grow-1 ml-2">
          <template v-if="spoolData">
            <div class="text-caption font-weight-bold text-truncate">
              {{ spoolData.material || spoolData.name }}
              <span
                v-if="spoolData.remaining_weight != null"
                class="font-weight-regular ml-1"
              >
                ({{ Number(spoolData.remaining_weight).toFixed(0) }}g)
              </span>
            </div>
            <div class="text-caption text-truncate">
              {{ spoolData.vendor }}
            </div>
          </template>
          <template v-else>
            <div class="text-caption text-grey">
              {{ $t('app.vividMms.empty_unassigned') }}
            </div>
            <div class="text-caption primary--text">
              {{ $t('app.vividMms.click_to_bind') }}
            </div>
          </template>
        </div>
      </div>
    </v-card-text>

    <v-card-actions
      v-if="isSelected"
      class="px-2 pb-2 pt-0"
    >
      <div
        class="d-flex flex-column"
        style="gap: 4px; width: 100%;"
      >
        <v-btn
          x-small
          block
          outlined
          color="success"
          @click.stop="loadLane"
        >
          {{ $t('app.vividMms.load_to_extruder') }}
        </v-btn>
        <v-btn
          x-small
          block
          outlined
          color="info"
          @click.stop="selectLane"
        >
          {{ $t('app.vividMms.select_slot') }}
        </v-btn>
        <v-btn
          x-small
          block
          outlined
          color="primary"
          @click.stop="preloadLane"
        >
          {{ $t('app.vividMms.preload_to_feeder') }}
        </v-btn>
        <v-btn
          x-small
          block
          outlined
          color="warning"
          @click.stop="popLane"
        >
          {{ $t('app.vividMms.pop_slot') }}
        </v-btn>
      </div>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import type { VividMmsLaneState } from '@/store/vividMms/types'

@Component
export default class MmsLane extends Vue {
  @Prop({ type: Object, required: true }) readonly lane!: VividMmsLaneState
  @Prop({ type: Boolean, required: true }) readonly isActive!: boolean
  @Prop({ type: Boolean, required: true }) readonly isSelected!: boolean

  get spoolData () {
    return this.$store.getters['vividMms/getLaneSpool'](this.lane.id)
  }

  preloadLane () {
    this.$store.dispatch('vividMms/preloadLane', this.lane.id)
  }

  popLane () {
    this.$store.dispatch('vividMms/popLane', this.lane.id)
  }

  selectLane () {
    this.$store.dispatch('vividMms/selectLane', this.lane.id)
  }

  loadLane () {
    this.$store.dispatch('vividMms/loadLane', this.lane.id)
  }
}
</script>

<style scoped>
.mms-lane { transition: all 0.2s ease-in-out; cursor: pointer; }
.mms-lane:hover { border-color: var(--v-primary-base); }
.active-lane { border: 2px solid var(--v-success-base) !important; background-color: rgba(var(--v-success-base), 0.05); }
.selected-lane { box-shadow: 0 0 0 2px var(--v-primary-base); }
.spool-preview { background-color: rgba(128, 128, 128, 0.1); min-height: 60px; }
.cursor-pointer { cursor: pointer; }
</style>
