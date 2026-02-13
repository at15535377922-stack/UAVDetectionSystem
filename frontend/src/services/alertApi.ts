import api from './api'

export interface AlertRule {
  id: number
  name: string
  description: string | null
  enabled: boolean
  severity: string
  trigger_type: string
  conditions: Record<string, any> | null
  cooldown_seconds: number
  creator_id: number | null
  created_at: string
  updated_at: string
}

export interface Alert {
  id: number
  rule_id: number | null
  severity: string
  title: string
  message: string | null
  source: string
  device_id: number | null
  mission_id: number | null
  metadata_json: Record<string, any> | null
  acknowledged: boolean
  acknowledged_by: number | null
  acknowledged_at: string | null
  resolved: boolean
  resolved_at: string | null
  created_at: string
}

export interface AlertStats {
  total: number
  unacknowledged: number
  critical: number
  warning: number
  info: number
  resolved: number
}

export const alertApi = {
  // Rules
  listRules: (params?: { skip?: number; limit?: number }) =>
    api.get<any, { rules: AlertRule[]; total: number }>('/alerts/rules', { params }),

  createRule: (data: { name: string; trigger_type: string; severity?: string; conditions?: Record<string, any>; cooldown_seconds?: number; description?: string }) =>
    api.post<any, AlertRule>('/alerts/rules', data),

  updateRule: (id: number, data: Partial<{ name: string; enabled: boolean; severity: string; conditions: Record<string, any>; cooldown_seconds: number }>) =>
    api.put<any, AlertRule>(`/alerts/rules/${id}`, data),

  deleteRule: (id: number) =>
    api.delete(`/alerts/rules/${id}`),

  // Alerts
  list: (params?: { skip?: number; limit?: number; severity?: string; acknowledged?: boolean }) =>
    api.get<any, { alerts: Alert[]; total: number }>('/alerts', { params }),

  create: (data: { title: string; severity?: string; message?: string; source?: string; device_id?: number }) =>
    api.post<any, Alert>('/alerts', data),

  acknowledge: (id: number) =>
    api.post<any, Alert>(`/alerts/${id}/acknowledge`),

  resolve: (id: number) =>
    api.post<any, Alert>(`/alerts/${id}/resolve`),

  delete: (id: number) =>
    api.delete(`/alerts/${id}`),

  stats: () =>
    api.get<any, AlertStats>('/alerts/stats'),
}
