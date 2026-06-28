import type { ActionTree } from 'vuex'
import type { VividMmsState } from './types'
import type { RootState } from '../types'
import { SocketActions } from '@/api/socketActions'

export const actions: ActionTree<VividMmsState, RootState> = {
  async sendMacro (_, payload: { macro: string, params?: Record<string, any> }) {
    let gcode = payload.macro
    if (payload.params) {
      for (const [key, value] of Object.entries(payload.params)) {
        gcode += ` ${key}=${value}`
      }
    }
    await SocketActions.printerGcodeScript(gcode)
  },
  loadLane ({ dispatch }, laneId: number) {
    return dispatch('sendMacro', { macro: `T${laneId}` })
  },
  preloadLane ({ dispatch }, laneId: number) {
    return dispatch('sendMacro', { macro: 'MMS_PRELOAD', params: { SLOT_NUM: laneId } })
  },
  popLane ({ dispatch }, laneId: number) {
    // Pops the filament completely out of the lane
    return dispatch('sendMacro', { macro: 'MMS_POP_SLOT', params: { SLOT_NUM: laneId } })
  },
  selectLane ({ dispatch }, laneId: number) {
    // Moves the rotator to the target slot
    return dispatch('sendMacro', { macro: 'MMS_SELECT_SLOT', params: { SLOT_NUM: laneId } })
  },
  ejectFilament ({ dispatch }) {
    // Safely ejects the filament from the toolhead back to the buffer
    return dispatch('sendMacro', { macro: 'MMS_EJECT_SLOT' })
  },
  cutFilament ({ dispatch }) {
    return dispatch('sendMacro', { macro: 'MMS_CUT' })
  },
  brushNozzle ({ dispatch }) {
    return dispatch('sendMacro', { macro: 'MMS_BRUSH' })
  },
  purgeFilament ({ dispatch }) {
    return dispatch('sendMacro', { macro: 'MMS_PURGE' })
  },
  clearPause ({ dispatch }) {
    return dispatch('sendMacro', { macro: 'CLEAR_PAUSE' })
  },
  readRfid ({ dispatch }, laneId: number) {
    return dispatch('sendMacro', { macro: 'MMS_RFID_READ', params: { SLOT: laneId, ALIGN: 1, SWITCH: 1 } })
  },
  writeRfid ({ dispatch }, payload: { laneId: number, spoolId: number }) {
    return dispatch('sendMacro', { macro: 'MMS_RFID_WRITE', params: { SLOT: payload.laneId, SPOOLID: payload.spoolId, ALIGN: 1 } })
  },
  writeRfidData ({ dispatch }, payload: { laneId: number, data: string }) {
    return dispatch('sendMacro', { macro: 'MMS_RFID_WRITE', params: { SLOT: payload.laneId, DATA: `'${payload.data}'`, ALIGN: 1 } })
  },
  bindSpoolToLane ({ dispatch, commit }, payload: { laneId: number, spoolId: number | null }) {
    commit('setSpoolId', payload)
    if (payload.spoolId !== null) {
      return dispatch('sendMacro', { macro: 'MMS_SLOT_SPOOL', params: { SLOT: payload.laneId, SPOOL_ID: payload.spoolId } })
    }
  },
  async fetchLaneData ({ commit }) {
    try {
      const response = await SocketActions.serverDatabaseGetItem('lane_data')
      if (response && response.value) {
        commit('setLaneData', response.value)
      }
    } catch {
      // Ignore if not present
    }
  },
  async setLaneData ({ dispatch }, payload: {
    laneId: number,
    vendor: string,
    material: string,
    color: string,
    has_filament: boolean,
    nozzle_temp?: number,
    bed_temp?: number,
    spool_id?: number | null
  }) {
    if (payload.has_filament) {
      const params: Record<string, any> = {
        SLOT: payload.laneId,
        VENDOR: `"${payload.vendor}"`,
        MATERIAL: `"${payload.material}"`,
        COLOR: `"${payload.color}"`,
        NAME: `"${payload.vendor} ${payload.material}"`
      }

      if (payload.nozzle_temp) params.NOZZLE_TEMP = payload.nozzle_temp
      if (payload.bed_temp) params.BED_TEMP = payload.bed_temp
      if (payload.spool_id !== undefined && payload.spool_id !== null) {
        params.SPOOLID = payload.spool_id
      }

      await dispatch('sendMacro', {
        macro: 'MMS_SLOT_MAP',
        params
      })
    } else {
      // Clear Klipper slot natively via MMS_SLOT_MAP RESET
      await dispatch('sendMacro', {
        macro: 'MMS_SLOT_MAP',
        params: {
          SLOT: payload.laneId,
          RESET: 1
        }
      })
    }
  }
}
