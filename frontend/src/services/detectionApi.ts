import api from './api'

export interface DetectionBox {
  x1: number
  y1: number
  x2: number
  y2: number
  confidence: number
  class_name: string
  class_id: number
}

export interface DetectionResult {
  id: number
  mission_id: number | null
  device_id: number | null
  image_path: string | null
  model_name: string
  detections: DetectionBox[]
  frame_number: number | null
  created_at: string
}

export interface DetectionStats {
  total_detections: number
  today_detections: number
  class_distribution: Record<string, number>
  recent_trend: { date: string; count: number }[]
}

export const detectionApi = {
  detectImage(file: File, params?: { model_name?: string; confidence?: number; mission_id?: number }) {
    const formData = new FormData()
    formData.append('file', file)
    const queryParams = new URLSearchParams()
    if (params?.model_name) queryParams.set('model_name', params.model_name)
    if (params?.confidence) queryParams.set('confidence', params.confidence.toString())
    if (params?.mission_id) queryParams.set('mission_id', params.mission_id.toString())
    const qs = queryParams.toString()
    return api.post<any, DetectionResult>(`/detections/image${qs ? '?' + qs : ''}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  startStream(params?: { source?: string; model_name?: string; confidence?: number }) {
    return api.post<any, { session_id: string; ws_url: string; status: string }>('/detections/stream/start', null, { params })
  },

  stopStream(sessionId: string) {
    return api.post<any, { session_id: string; status: string }>('/detections/stream/stop', null, {
      params: { session_id: sessionId },
    })
  },

  listResults(params?: { skip?: number; limit?: number; mission_id?: number }) {
    return api.get<any, DetectionResult[]>('/detections/results', { params })
  },

  getResult(id: number) {
    return api.get<any, DetectionResult>(`/detections/results/${id}`)
  },

  getStats() {
    return api.get<any, DetectionStats>('/detections/stats')
  },
}
