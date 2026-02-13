import api from './api'

export interface Mission {
  id: number
  name: string
  description: string | null
  status: string
  mission_type: string
  device_id: number | null
  creator_id: number | null
  waypoints: number[][] | null
  algorithm: string | null
  total_distance: number | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface MissionListResponse {
  missions: Mission[]
  total: number
}

export const missionApi = {
  list(params?: { skip?: number; limit?: number; status?: string }) {
    return api.get<any, MissionListResponse>('/missions/', { params })
  },

  get(id: number) {
    return api.get<any, Mission>(`/missions/${id}`)
  },

  create(data: {
    name: string
    description?: string
    mission_type?: string
    device_id: number
    waypoints?: number[][]
    algorithm?: string
    altitude?: number
    speed?: number
  }) {
    return api.post<any, Mission>('/missions/', data)
  },

  update(id: number, data: { name?: string; description?: string; status?: string }) {
    return api.put<any, Mission>(`/missions/${id}`, data)
  },

  start(id: number) {
    return api.post<any, Mission>(`/missions/${id}/start`)
  },

  stop(id: number) {
    return api.post<any, Mission>(`/missions/${id}/stop`)
  },

  delete(id: number) {
    return api.delete(`/missions/${id}`)
  },
}
