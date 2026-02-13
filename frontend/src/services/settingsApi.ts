import api from './api'

export interface UserSettings {
  default_model: string
  confidence_threshold: number
  nms_iou_threshold: number
  input_size: string
  tracker_algorithm: string
  max_lost_frames: number
  planning_algorithm: string
  safety_distance: number
}

export const settingsApi = {
  get() {
    return api.get<any, UserSettings>('/settings/')
  },

  update(data: Partial<UserSettings>) {
    return api.put<any, UserSettings>('/settings/', data)
  },
}
