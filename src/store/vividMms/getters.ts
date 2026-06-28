import type { GetterTree } from 'vuex'
import type { VividMmsState, VividMmsLaneState } from './types'
import type { RootState } from '../types'

export const getters: GetterTree<VividMmsState, RootState> = {
  klipperMms: (state, getters, rootState) => {
    return rootState.printer?.printer?.mms || null
  },
  klipperMmsSlotMap: (state, getters, rootState) => {
    // Some implementations register the slot map under 'mms_slot_map' or 'mms_extend_slot_map'
    return rootState.printer?.printer?.mms_slot_map || rootState.printer?.printer?.['mms_extend slot'] || null
  },

  derivedLanes: (state, getters): VividMmsLaneState[] => {
    const mms = getters.klipperMms
    const slotMap = getters.klipperMmsSlotMap

    // If Klipper hasn't loaded MMS yet, return the default empty lanes
    if (!mms && !slotMap) return state.lanes

    // Try to extract from the most likely Klipper payloads
    const slotsObj = mms?.slots || slotMap?.slots || {}

    // If there are no slots from Klipper yet, fallback to dummy
    if (Object.keys(slotsObj).length === 0) return state.lanes

    // Map Klipper's slot data to our UI lane state
    const lanes: VividMmsLaneState[] = []

    // Convert object { "0": {...}, "1": {...} } to array
    for (const [key, val] of Object.entries(slotsObj)) {
      const id = parseInt(key)
      const slotData = val as any

      // Determine spool ID. (Klipper might store it as spool_id, spoolId, or under filament_info)
      let spool_id = state.lanes[id]?.spool_id // use local optimistic state if any
      if (slotData.spool_id !== undefined) spool_id = slotData.spool_id
      else if (slotData.filament_info?.spool_id !== undefined) spool_id = slotData.filament_info.spool_id

      let vendor: string | undefined = slotData.vendor || slotData.filament_info?.vendor
      let material: string | undefined = slotData.material || slotData.filament_info?.material
      let color: string | undefined = slotData.color || slotData.filament_info?.color
      let manual_has_filament = false

      // Fallback to Moonraker DB manual data only if Klipper hasn't populated it
      // AND Klipper doesn't explicitly mark the slot as empty (if it's empty, we don't want zombie data)
      const isKlipperEmpty = slotData.is_empty === true

      if (!vendor && !material && !color && !isKlipperEmpty) {
        let manualData = null
        if (state.lane_data && typeof state.lane_data === 'object' && !Array.isArray(state.lane_data)) {
          manualData = state.lane_data[`lane${id}`]
        } else if (Array.isArray(state.lane_data)) {
          manualData = state.lane_data.find((l: any) => l.id === id)
        }

        if (manualData) {
          if (manualData.vendor_name || manualData.vendor) vendor = manualData.vendor_name || manualData.vendor
          if (manualData.material) material = manualData.material
          if (manualData.color) color = manualData.color
          if (manualData.has_filament !== false) manual_has_filament = true
        }
      }

      lanes[id] = {
        id,
        has_filament: slotData.is_empty === false || slotData.inlet === 1 || slotData.status === 'loaded' || manual_has_filament,
        spool_id,
        rfid_uid: slotData.rfid_uid || null,
        vendor,
        material,
        color
      }
    }

    // Fill any gaps just in case up to the configured lane count
    for (let i = 0; i < state.lanes.length; i++) {
      if (!lanes[i]) {
        lanes[i] = { id: i, has_filament: false, spool_id: null, rfid_uid: null }
      }
    }

    // Ensure we don't display ghost lanes if Klipper sent more than configured
    return lanes.slice(0, state.lanes.length)
  },

  activeLaneState: (state, getters) => {
    const lanes = getters.derivedLanes
    const mms = getters.klipperMms

    // Klipper might expose active_gate or active_slot directly
    // Check which lane has the selector = 1
    if (mms && mms.slots) {
      for (const [key, slot] of Object.entries(mms.slots) as any) {
        if (slot.selector === 1) {
          const id = parseInt(key)
          return lanes[id] || null
        }
      }
    }

    return lanes.find((l: any) => l.is_active) || null
  },

  activeSlotData: (state, getters) => {
    const activeLane = getters.activeLaneState
    const mms = getters.klipperMms
    if (activeLane !== null && mms?.slots?.[activeLane.id]) {
      return mms.slots[activeLane.id]
    }
    return null
  },

  filamentPosition: (state, getters) => {
    const activeLane = getters.activeLaneState
    const mms = getters.klipperMms

    if (activeLane !== null && mms?.slots?.[activeLane.id]) {
      const slotObj = mms.slots[activeLane.id]
      if (slotObj.entry === 1) return 'toolhead'
      if (slotObj.outlet === 1) return 'bowden'
      if (slotObj.gate === 1 || slotObj.inlet === 1) return 'feeder'
    }

    // Check Klipper's MMS state for filament position globally if slot isn't active
    const klipperPos = mms?.filament_pos || mms?.state

    if (klipperPos === 'toolhead' || klipperPos === 'loaded') return 'toolhead'
    if (klipperPos === 'bowden' || klipperPos === 'tube') return 'bowden'
    if (klipperPos === 'feeder') return 'feeder'

    return state.filament_position
  },

  getLaneSpool: (state, getters, rootState) => (laneId: number) => {
    const lanes = getters.derivedLanes
    const lane = lanes[laneId]

    // Fallback: Spoolman stores spools in an array in Fluidd
    const spools = rootState.spoolman?.spools || []
    const spoolmanSpool = spools.find((s: any) => s.id === lane.spool_id)

    // Check if Moonraker's lane_data has info for this lane
    const dbLaneData = state.lane_data[`lane${laneId}`]
    if (dbLaneData) {
      // Return a combined object, patching in remaining weight from Spoolman if available
      let remainingWeight = null
      if (spoolmanSpool && spoolmanSpool.initial_weight != null && spoolmanSpool.used_weight != null) {
        remainingWeight = spoolmanSpool.initial_weight - spoolmanSpool.used_weight
      }

      return {
        id: dbLaneData.spool_id || null,
        vendor: dbLaneData.vendor_name || '',
        material: dbLaneData.material || '',
        color: dbLaneData.color ? `#${dbLaneData.color.replace('#', '')}` : '#ccc',
        remaining_weight: remainingWeight
      }
    }

    if (!lane || lane.spool_id === null) return null
    if (!spoolmanSpool) return null

    return {
      id: spoolmanSpool.id,
      vendor: spoolmanSpool.filament?.vendor?.name || '',
      material: spoolmanSpool.filament?.material || spoolmanSpool.filament?.name || '',
      color: spoolmanSpool.filament?.color_hex ? `#${spoolmanSpool.filament.color_hex}` : '#ccc',
      remaining_weight: (spoolmanSpool.initial_weight != null && spoolmanSpool.used_weight != null) ? (spoolmanSpool.initial_weight - spoolmanSpool.used_weight) : null
    }
  }
}
