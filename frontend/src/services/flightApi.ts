import api from './api'

export interface UAVTelemetry {
  uav_id: string
  connected: boolean
  armed: boolean
  flight_mode: string
  latitude: number
  longitude: number
  altitude: number
  heading: number
  speed: number
  battery: number
  mission_progress: string
  flying: boolean
}

export interface CommandResult {
  success: boolean
  uav_id?: string
  command?: string
  error?: string
  telemetry?: UAVTelemetry
}

export const flightApi = {
  connect: (uav_id: string, connection_string?: string) =>
    api.post<any, CommandResult>('/flight/connect', null, {
      params: { uav_id, connection_string },
    }),

  disconnect: (uav_id: string) =>
    api.post<any, { success: boolean }>('/flight/disconnect', null, {
      params: { uav_id },
    }),

  listConnections: () =>
    api.get<any, { connections: UAVTelemetry[] }>('/flight/connections'),

  arm: (uav_id: string) =>
    api.post<any, CommandResult>('/flight/command/arm', null, { params: { uav_id } }),

  disarm: (uav_id: string) =>
    api.post<any, CommandResult>('/flight/command/disarm', null, { params: { uav_id } }),

  takeoff: (uav_id: string, altitude: number = 10) =>
    api.post<any, CommandResult>('/flight/command/takeoff', null, {
      params: { uav_id, altitude },
    }),

  land: (uav_id: string) =>
    api.post<any, CommandResult>('/flight/command/land', null, { params: { uav_id } }),

  rtl: (uav_id: string) =>
    api.post<any, CommandResult>('/flight/command/rtl', null, { params: { uav_id } }),

  hover: (uav_id: string) =>
    api.post<any, CommandResult>('/flight/command/hover', null, { params: { uav_id } }),

  goto: (uav_id: string, lat: number, lng: number, altitude: number = 100) =>
    api.post<any, CommandResult>('/flight/command/goto', { lat, lng, altitude }, {
      params: { uav_id },
    }),

  uploadMission: (uav_id: string, waypoints: { lat: number; lng: number }[], altitude: number = 100, speed: number = 8) =>
    api.post<any, CommandResult>('/flight/mission/upload', { waypoints, altitude, speed }, {
      params: { uav_id },
    }),

  startMission: (uav_id: string) =>
    api.post<any, CommandResult>('/flight/mission/start', null, { params: { uav_id } }),

  getTelemetry: (uav_id: string) =>
    api.get<any, UAVTelemetry>('/flight/telemetry', { params: { uav_id } }),

  getStatus: () =>
    api.get<any, { mode: string; connected_uavs: number; connections: UAVTelemetry[] }>('/flight/status'),
}
