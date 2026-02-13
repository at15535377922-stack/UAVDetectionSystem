import api from './api'

export interface PlanResponse {
  algorithm: string
  path: number[][]
  waypoints_count: number
  total_distance_m: number
  estimated_time_s: number
  planning_time_ms: number
}

export interface Algorithm {
  id: string
  name: string
  type: string
  description: string
}

export const planningApi = {
  generate(data: {
    algorithm?: string
    waypoints: number[][]
    obstacles?: number[][]
    altitude?: number
    speed?: number
  }) {
    return api.post<any, PlanResponse>('/planning/generate', data)
  },

  listAlgorithms() {
    return api.get<any, { algorithms: Algorithm[] }>('/planning/algorithms')
  },

  validate(data: {
    waypoints: number[][]
    altitude?: number
    max_distance_m?: number
  }) {
    return api.post<any, { valid: boolean; errors: string[]; total_distance_m: number }>(
      '/planning/validate', data.waypoints, { params: { altitude: data.altitude, max_distance_m: data.max_distance_m } }
    )
  },
}
