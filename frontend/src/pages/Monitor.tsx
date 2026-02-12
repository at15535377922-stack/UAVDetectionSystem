import { useState, useEffect } from 'react'
import { Battery, Wifi, Navigation, Gauge, Satellite, Radio, Circle } from 'lucide-react'
import MapView, { type MapMarker, type MapPath } from '../components/MapView'

interface TelemetryItem {
  label: string
  value: string
  icon: typeof Battery
  color: string
  unit?: string
}

const mockTelemetry: TelemetryItem[] = [
  { label: '飞行高度', value: '120', icon: Navigation, color: 'text-blue-500', unit: 'm' },
  { label: '飞行速度', value: '8.5', icon: Gauge, color: 'text-green-500', unit: 'm/s' },
  { label: '电池电量', value: '78', icon: Battery, color: 'text-yellow-500', unit: '%' },
  { label: 'GPS 卫星', value: '14', icon: Satellite, color: 'text-purple-500', unit: '颗' },
  { label: '信号强度', value: '-65', icon: Wifi, color: 'text-cyan-500', unit: 'dBm' },
  { label: '通信延迟', value: '32', icon: Radio, color: 'text-orange-500', unit: 'ms' },
]

export default function Monitor() {
  const [selectedUav, setSelectedUav] = useState('UAV-01')
  const [telemetry, setTelemetry] = useState(mockTelemetry)

  // Simulate telemetry updates
  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry((prev) =>
        prev.map((t) => {
          if (t.label === '飞行高度') return { ...t, value: (120 + Math.random() * 5 - 2.5).toFixed(1) }
          if (t.label === '飞行速度') return { ...t, value: (8.5 + Math.random() * 2 - 1).toFixed(1) }
          if (t.label === '通信延迟') return { ...t, value: Math.floor(28 + Math.random() * 15).toString() }
          return t
        })
      )
    }, 2000)
    return () => clearInterval(timer)
  }, [])

  const uavList = [
    { id: 'UAV-01', status: 'flying', battery: 78, mode: '自主巡航' },
    { id: 'UAV-02', status: 'flying', battery: 62, mode: '定点悬停' },
    { id: 'UAV-03', status: 'idle', battery: 95, mode: '待命' },
  ]

  const uavMarkers: MapMarker[] = [
    { id: 'uav-1', lat: 30.5728, lng: 104.0668, label: 'UAV-01', color: 'uav', popup: '<b>UAV-01</b><br/>自主巡航中' },
    { id: 'uav-2', lat: 30.5780, lng: 104.0720, label: 'UAV-02', color: 'uav', popup: '<b>UAV-02</b><br/>定点悬停' },
    { id: 'uav-3', lat: 30.5690, lng: 104.0600, label: 'UAV-03', color: '#9ca3af', popup: '<b>UAV-03</b><br/>待命中' },
  ]

  const flightPath: MapPath[] = [
    {
      id: 'trail-1',
      points: [
        [30.5700, 104.0630], [30.5710, 104.0645], [30.5718, 104.0655],
        [30.5728, 104.0668], [30.5735, 104.0678],
      ],
      color: '#3b82f6', weight: 3,
    },
    {
      id: 'trail-2',
      points: [
        [30.5760, 104.0700], [30.5770, 104.0710], [30.5780, 104.0720],
      ],
      color: '#10b981', weight: 3, dashed: true,
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">实时监控</h2>
        <div className="flex items-center gap-3">
          {uavList.map((uav) => (
            <button
              key={uav.id}
              onClick={() => setSelectedUav(uav.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedUav === uav.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Circle className={`w-2.5 h-2.5 fill-current ${
                uav.status === 'flying' ? 'text-green-400' : 'text-gray-400'
              }`} />
              {uav.id}
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
              30.5728°N, 104.0668°E | ALT 120m
            </div>
          </div>
        </div>

        {/* Telemetry panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">遥测数据</h3>
          <div className="space-y-4">
            {telemetry.map((t) => (
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
              {uavList.find((u) => u.id === selectedUav)?.mode}
            </p>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">实时地图</h3>
        <MapView
          markers={uavMarkers}
          paths={flightPath}
          className="h-96"
        />
      </div>
    </div>
  )
}
