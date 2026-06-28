<template>
  <v-dialog
    v-model="internalValue"
    max-width="600px"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <span class="text-h5">Bind Spool to Lane {{ targetLane }}</span>
        <v-spacer />
        <v-btn
          icon
          @click="internalValue = false"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-text-field
          v-model="searchQuery"
          append-icon="mdi-magnify"
          label="Search Spools (Vendor, Material, Color)"
          single-line
          hide-details
          class="mb-4"
          outlined
          dense
        />

        <v-data-table
          :headers="headers"
          :items="filteredSpools"
          class="elevation-1 spool-table"
          :items-per-page="5"
          hover
          @click:row="selectSpool"
        >
          <template #[`item.color`]="{ item }">
            <div class="d-flex align-center">
              <div
                class="color-swatch mr-2"
                :style="{ backgroundColor: item.color }"
              />
              {{ item.color }}
            </div>
          </template>
          <template #[`item.remaining_weight`]="{ item }">
            <span
              v-if="item.remaining_weight != null"
              :class="item.remaining_weight < 50 ? 'error--text font-weight-bold' : ''"
            >
              {{ item.remaining_weight.toFixed(1) }}g
            </span>
            <span
              v-else
              class="text--disabled"
            >Unknown</span>
          </template>
        </v-data-table>
      </v-card-text>

      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn
          color="error"
          text
          @click="clearSpool"
        >
          <v-icon left>
            mdi-link-variant-off
          </v-icon> Clear Assignment
        </v-btn>
        <v-btn
          color="primary"
          @click="internalValue = false"
        >
          Cancel
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'

@Component
export default class SpoolSelectionModal extends Vue {
  @Prop({ type: Boolean, required: true }) readonly value!: boolean
  @Prop({ type: Number, default: null }) readonly targetLane!: number | null

  searchQuery = ''

  headers = [
    { text: 'ID', value: 'id' },
    { text: 'Vendor', value: 'vendor' },
    { text: 'Material', value: 'material' },
    { text: 'Color', value: 'color' },
    { text: 'Remaining', value: 'remaining_weight' }
  ]

  get internalValue () {
    return this.value
  }

  set internalValue (val: boolean) {
    this.$emit('input', val)
  }

  get spools () {
    const rawSpools = this.$store.state.spoolman?.spools || []
    return rawSpools.map((s: any) => ({
      id: s.id,
      vendor: s.filament?.vendor?.name || 'Unknown',
      material: s.filament?.material || s.filament?.name || 'Unknown',
      color: s.filament?.color_hex ? `#${s.filament.color_hex}` : '#cccccc',
      remaining_weight: (s.initial_weight != null && s.used_weight != null) ? (s.initial_weight - s.used_weight) : null,
      raw: s // Keep a reference to the original spool
    }))
  }

  get filteredSpools () {
    if (!this.searchQuery) return this.spools
    const lowerSearch = this.searchQuery.toLowerCase()
    return this.spools.filter((s: any) =>
      s.vendor?.toLowerCase().includes(lowerSearch) ||
      s.material?.toLowerCase().includes(lowerSearch) ||
      s.color?.toLowerCase().includes(lowerSearch)
    )
  }

  selectSpool (item: any) {
    this.$emit('bind', item.id)
  }

  clearSpool () {
    this.$emit('bind', null)
  }
}
</script>

<style scoped>
.color-swatch { width: 16px; height: 16px; border-radius: 50%; border: 1px solid rgba(128, 128, 128, 0.3); box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
.spool-table ::v-deep tbody tr { cursor: pointer; }
</style>
