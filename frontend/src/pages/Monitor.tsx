import { useState, useEffect, useCallback, useRef } from 'react'
import { Battery, Wifi, Navigation, Gauge, Satellite, Radio, Circle, Loader2, PlaneTakeoff, PlaneLanding, RotateCcw, Pause } from 'lucide-react'
import MapView, { type MapMarker, type MapPath } from '../components/MapView'
import { useWebSocket } from '../hooks/useWebSocket'
import { deviceApi, type Device } from '../services/deviceApi'
import { flightApi } from '../services/flightApi'
import { useToast } from '../components/Toast'

interface TelemetryData {
  latitude: number; longitude: number; altitude: number
  speed: number; heading: number; battery: number
  satellites: number; signal_strength: number; flight_mode: string
}

export default function Monitor() {
  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [selectedUav, setSelectedUav] = useState('')
  const [telemetryMap, setTelemetryMap] = useState<Record<string, TelemetryData>>({})
  const trailsRef = useRef<Record<string, [number, number][]>>({})
  const [markers, setMarkers] = useState<MapMarker[]>([])
  const [paths, setPaths] = useState<MapPath[]>([])
  const [cmdLoading, setCmdLoading] = useState(false)
  const toast = useToast()

  const sendFlightCmd = async (cmd: () => Promise<any>, label: string) => {
    setCmdLoading(true)
    try {
      const uavId = selectedUav || 'UAV-01'
      await flightApi.connect(uavId)
      const res = await cmd()
      if (res.success) {
        toast.success(`${label} 成功`)
      } else {
        toast.error(res.error || `${label} 失败`)
      }
    } catch (err: any) {
      toast.error(`${label} 失败: ` + (err.response?.data?.detail || err.message))
    } finally {
      setCmdLoading(false)
    }
  }

  // Fetch devices from API, fallback to hardcoded list
  useEffect(() => {
    deviceApi.list()
      .then((data) => {
        if (data.length > 0) {
          setDevices(data)
          setSelectedUav(data[0].name)
        } else {
          const fallback = [
            { id: 0, name: 'UAV-01', status: 'online', device_type: 'quadcopter', serial_number: '', battery: null, latitude: null, longitude: null, altitude: null, owner_id: null, created_at: '', updated_at: null },
            { id: 0, name: 'UAV-02', status: 'online', device_type: 'quadcopter', serial_number: '', battery: null, latitude: null, longitude: null, altitude: null, owner_id: null, created_at: '', updated_at: null },
            { id: 0, name: 'UAV-03', status: 'offline', device_type: 'quadcopter', serial_number: '', battery: null, latitude: null, longitude: null, altitude: null, owner_id: null, created_at: '', updated_at: null },
          ] as Device[]
          setDevices(fallback)
          setSelectedUav('UAV-01')
        }
      })
      .catch(() => {
        const fallback = [
          { id: 0, name: 'UAV-01', status: 'online', device_type: 'quadcopter', serial_number: '', battery: null, latitude: null, longitude: null, altitude: null, owner_id: null, created_at: '', updated_at: null },
          { id: 0, name: 'UAV-02', status: 'online', device_type: 'quadcopter', serial_number: '', battery: null, latitude: null, longitude: null, altitude: null, owner_id: null, created_at: '', updated_at: null },
          { id: 0, name: 'UAV-03', status: 'offline', device_type: 'quadcopter', serial_number: '', battery: null, latitude: null, longitude: null, altitude: null, owner_id: null, created_at: '', updated_at: null },
        ] as Device[]
        setDevices(fallback)
        setSelectedUav('UAV-01')
      })
      .finally(() => setDevicesLoading(false))
  }, [])

  const handleWsMessage = useCallback((data: any) => {
    if (data.type === 'telemetry') {
      const d = data.data as TelemetryData
      setTelemetryMap((prev) => ({ ...prev, [data.uav_id]: d }))

      // Update trail
      if (!trailsRef.current[data.uav_id]) trailsRef.current[data.uav_id] = []
      const trail = trailsRef.current[data.uav_id]
      trail.push([d.latitude, d.longitude])
      if (trail.length > 80) trail.shift()

      // Rebuild markers & paths for all UAVs
      setTelemetryMap((latest) => {
        const newMarkers: MapMarker[] = Object.entries(latest).map(([id, pos]) => ({
          id, lat: pos.latitude, lng: pos.longitude, label: id, color: 'uav',
          popup: `<b>${id}</b><br/>高度: ${pos.altitude.toFixed(0)}m<br/>电量: ${pos.battery.toFixed(0)}%`,
        }))
        setMarkers(newMarkers)

        const newPaths: MapPath[] = Object.entries(trailsRef.current).map(([id, pts]) => ({
          id: `trail-${id}`, points: [...pts], color: id === selectedUav ? '#3b82f6' : '#9ca3af', weight: id === selectedUav ? 3 : 2,
        }))
        setPaths(newPaths)
        return latest
      })
    }
  }, [selectedUav])

  const { connected: _wsConnected } = useWebSocket({
    url: '/api/ws/dashboard',
    onMessage: handleWsMessage,
  })

  const currentTelemetry = telemetryMap[selectedUav]

  const telemetryItems = [
    { label: '飞行高度', value: currentTelemetry?.altitude?.toFixed(1) || '—', icon: Navigation, color: 'text-blue-500', unit: 'm' },
    { label: '飞行速度', value: currentTelemetry?.speed?.toFixed(1) || '—', icon: Gauge, color: 'text-green-500', unit: 'm/s' },
    { label: '电池电量', value: currentTelemetry?.battery?.toFixed(0) || '—', icon: Battery, color: 'text-yellow-500', unit: '%' },
    { label: 'GPS 卫星', value: currentTelemetry?.satellites?.toString() || '—', icon: Satellite, color: 'text-purple-500', unit: '颗' },
    { label: '信号强度', value: currentTelemetry?.signal_strength?.toString() || '—', icon: Wifi, color: 'text-cyan-500', unit: 'dBm' },
    { label: '航向角', value: currentTelemetry?.heading?.toFixed(0) || '—', icon: Radio, color: 'text-orange-500', unit: '°' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">实时监控</h2>
        <div className="flex items-center gap-3">
          {devicesLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          ) : devices.map((d) => (
            <button
              key={d.name}
              onClick={() => setSelectedUav(d.name)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedUav === d.name
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Circle className={`w-2.5 h-2.5 fill-current ${
                d.status === 'online' || d.status === 'flying' ? 'text-green-400' : 'text-gray-400'
              }`} />
              {d.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video stream */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">视频流 — {selectedUav}</h3>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                LIVE
              </span>
            </div>
          </div>
          <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center text-gray-500 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
            <div className="text-center z-10">
              <p className="text-gray-400 text-lg">实时视频流</p>
              <p className="text-gray-500 text-sm mt-1">WebRTC / RTSP 接入后显示</p>
            </div>
            {/* Overlay info */}
            <div className="absolute top-3 left-3 text-xs text-green-400 font-mono z-10">
              {selectedUav} | 1920x1080 | 30fps
            </div>
            <div className="absolute top-3 right-3 text-xs text-green-400 font-mono z-10">
              REC ●
            </div>
            <div className="absolute bottom-3 left-3 text-xs text-white/70 font-mono z-10">
              {currentTelemetry ? `${currentTelemetry.latitude.toFixed(4)}°N, ${currentTelemetry.longitude.toFixed(4)}°E | ALT ${currentTelemetry.altitude.toFixed(0)}m` : '等待连接...'}
            </div>
          </div>
        </div>

        {/* Telemetry panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">遥测数据</h3>
          <div className="space-y-4">
            {telemetryItems.map((t) => (
              <div key={t.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <t.icon className={`w-5 h-5 ${t.color}`} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">{t.label}</p>
                  <p className="text-lg font-bold text-gray-800">
                    {t.value}<span className="text-xs text-gray-400 ml-1">{t.unit}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-medium">飞行模式</p>
            <p className="text-sm font-bold text-blue-800 mt-1">
              {currentTelemetry?.flight_mode || devices.find((d) => d.name === selectedUav)?.status || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Flight commands */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">飞控指令</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => sendFlightCmd(() => flightApi.takeoff(selectedUav || 'UAV-01', 10), '起飞')}
            disabled={cmdLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <PlaneTakeoff className="w-4 h-4" /> 起飞
          </button>
          <button
            onClick={() => sendFlightCmd(() => flightApi.land(selectedUav || 'UAV-01'), '降落')}
            disabled={cmdLoading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            <PlaneLanding className="w-4 h-4" /> 降落
          </button>
          <button
            onClick={() => sendFlightCmd(() => flightApi.rtl(selectedUav || 'UAV-01'), '返航')}
            disabled={cmdLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" /> 返航
          </button>
          <button
            onClick={() => sendFlightCmd(() => flightApi.hover(selectedUav || 'UAV-01'), '悬停')}
            disabled={cmdLoading}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700 transition-colors disabled:opacity-50"
          >
            <Pause className="w-4 h-4" /> 悬停
          </button>
        </div>
        {cmdLoading && <p className="text-xs text-gray-400 mt-2">指令发送中...</p>}
      </div>

      {/* Map */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">实时地图</h3>
        <MapView
          markers={markers}
          paths={paths}
          className="h-96"
        />
      </div>
    </div>
  )
}
