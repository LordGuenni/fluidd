import type { VividMmsState } from './types'

export const defaultState = (): VividMmsState => {
  return {
    toolhead_loaded: false,
    active_lane: null,
    filament_position: 'empty',
    lanes: Array.from({ length: 4 }, (_, i) => ({
      id: i,
      has_filament: false,
      spool_id: null,
      rfid_uid: null
    })),
    is_paused: false,
    status_message: 'Idle',
    lane_data: {}
  }
}

export const state = defaultState()
