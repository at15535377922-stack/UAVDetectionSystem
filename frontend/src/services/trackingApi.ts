import api from './api'

export interface TrackingSession {
  session_id: string
  tracker_type: string
  source: string
  status: string
  active_tracks: number
  total_tracks: number
  fps: number
  is_mock: boolean
}

export interface TrackedObject {
  track_id: number
  x1: number
  y1: number
  x2: number
  y2: number
  confidence: number
  class_name: string
  class_id: number
}

export interface TrackFrameResponse {
  session_id: string
  tracked_objects: TrackedObject[]
  active_tracks: number
  total_tracks: number
  inference_time_ms: number
}

export interface TrackerInfo {
  id: string
  name: string
  available: boolean
  description: string
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

  trackFrame(sessionId: string, file: File, opts?: { model_name?: string; confidence?: number }) {
    const formData = new FormData()
    formData.append('file', file)
    const params: Record<string, any> = { session_id: sessionId }
    if (opts?.model_name) params.model_name = opts.model_name
    if (opts?.confidence !== undefined) params.confidence = opts.confidence
    return api.post<any, TrackFrameResponse>('/tracking/frame', formData, {
      params,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  listSessions() {
    return api.get<any, { sessions: TrackingSession[] }>('/tracking/sessions')
  },

  listTrackers() {
    return api.get<any, { trackers: TrackerInfo[] }>('/tracking/trackers')
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
