export interface VividMmsLaneState {
  id: number
  has_filament: boolean
  spool_id: number | null
  rfid_uid: string | null
  vendor?: string
  material?: string
  color?: string
}

export interface VividMmsState {
  toolhead_loaded: boolean
  active_lane: number | null
  filament_position: 'empty' | 'feeder' | 'bowden' | 'toolhead'
  lanes: VividMmsLaneState[]
  is_paused: boolean
  status_message: string
  lane_data: Record<string, any>
}
