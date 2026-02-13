import api from './api'

export interface TrackingSession {
  session_id: string
  tracker_type: string
  status: string
  active_tracks: number
  total_tracks: number
  fps: number
}

export interface TrackResult {
  id: number
  track_id: number
  mission_id: number | null
  class_name: string
  tracker_type: string
  trajectory: any[] | null
  total_frames: number
  created_at: string
}

export const trackingApi = {
  start(params?: { tracker_type?: string; source?: string; mission_id?: number }) {
    return api.post<any, TrackingSession>('/tracking/start', null, { params })
  },

  stop(sessionId: string) {
    return api.post<any, TrackingSession>('/tracking/stop', null, {
      params: { session_id: sessionId },
    })
  },

  listSessions() {
    return api.get<any, { sessions: TrackingSession[] }>('/tracking/sessions')
  },

  listTracks(params?: { skip?: number; limit?: number; mission_id?: number }) {
    return api.get<any, TrackResult[]>('/tracking/tracks', { params })
  },

  getTrack(id: number) {
    return api.get<any, TrackResult>(`/tracking/tracks/${id}`)
  },

  getTrajectory(id: number) {
    return api.get<any, { track_id: number; tracker_type: string; trajectory: any[] }>(
      `/tracking/tracks/${id}/trajectory`
    )
  },
}
