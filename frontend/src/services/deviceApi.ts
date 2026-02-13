import api from './api'

export interface Device {
  id: number
  name: string
  device_type: string
  serial_number: string
  status: string
  latitude: number | null
  longitude: number | null
  altitude: number | null
  battery: number | null
  owner_id: number | null
  created_at: string
  updated_at: string | null
}

export const deviceApi = {
  list() {
    return api.get<any, Device[]>('/devices/')
  },

  get(id: number) {
    return api.get<any, Device>(`/devices/${id}`)
  },

  register(data: { name: string; device_type?: string; serial_number: string }) {
    return api.post<any, Device>('/devices/', data)
  },

  update(id: number, data: {
    name?: string; status?: string;
    latitude?: number; longitude?: number; altitude?: number; battery?: number
  }) {
    return api.put<any, Device>(`/devices/${id}`, data)
  },

  delete(id: number) {
    return api.delete(`/devices/${id}`)
  },
}
