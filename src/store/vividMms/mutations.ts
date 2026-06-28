import type { MutationTree } from 'vuex'
import type { VividMmsState } from './types'

export const mutations: MutationTree<VividMmsState> = {
  setSpoolId (state, payload: { laneId: number, spoolId: number | null }) {
    state.lanes[payload.laneId].spool_id = payload.spoolId
  },
  setLaneData (state, payload: Record<string, any>) {
    state.lane_data = payload
  }
}
