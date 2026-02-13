import { useState, useEffect, useCallback, useRef } from 'react'
import { ScanSearch, Route, MapPin, Plane, Activity, AlertTriangle } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import MapView, { type MapMarker, type MapPath } from '../components/MapView'
import { useWebSocket } from '../hooks/useWebSocket'
import { missionApi, type Mission } from '../services/missionApi'
import { detectionApi, type DetectionStats } from '../services/detectionApi'
import { alertApi, type AlertStats } from '../services/alertApi'
import { StatCardSkeleton, CardSkeleton } from '../components/Loading'

const statusMap: Record<string, { label: string; cls: string }> = {
  completed: { label: '已完成', cls: 'bg-green-100 text-green-700' },
  running: { label: '执行中', cls: 'bg-blue-100 text-blue-700' },
  pending: { label: '待执行', cls: 'bg-yellow-100 text-yellow-700' },
  failed: { label: '失败', cls: 'bg-red-100 text-red-700' },
}

interface UavState {
  lat: number; lng: number; altitude: number; battery: number; speed: number; heading: number
}

export default function Dashboard() {
  const [onlineUavs, setOnlineUavs] = useState(0)
  const [todayDetections, setTodayDetections] = useState(0)
  const [activeTracks, setActiveTracks] = useState(0)
  const [missions, setMissions] = useState<Mission[]>([])
  const [detectionStats, setDetectionStats] = useState<DetectionStats | null>(null)
  const [alerts, setAlerts] = useState<{ level: string; message: string; timestamp: string }[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [alertStats, setAlertStats] = useState<AlertStats | null>(null)

  // UAV positions from WebSocket
  const uavPositions = useRef<Record<string, UavState>>({})
  const [uavMarkers, setUavMarkers] = useState<MapMarker[]>([])
  const [uavPaths, setUavPaths] = useState<MapPath[]>([])
  const trailsRef = useRef<Record<string, [number, number][]>>({})

  // Fetch initial data from REST API + auto-refresh every 30s
  const fetchData = useCallback(() => {
    Promise.all([
      missionApi.list({ limit: 5 }).then((res) => setMissions(res.missions)).catch(() => {}),
      detectionApi.getStats().then((res) => setDetectionStats(res)).catch(() => {}),
      alertApi.stats().then(setAlertStats).catch(() => {}),
    ]).finally(() => setDataLoaded(true))
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  // WebSocket for real-time dashboard data
  const handleWsMessage = useCallback((data: any) => {
    if (data.type === 'telemetry') {
      const d = data.data
      uavPositions.current[data.uav_id] = {
        lat: d.latitude, lng: d.longitude, altitude: d.altitude,
        battery: d.battery, speed: d.speed, heading: d.heading,
      }
      // Update trails
      if (!trailsRef.current[data.uav_id]) trailsRef.current[data.uav_id] = []
      const trail = trailsRef.current[data.uav_id]
      trail.push([d.latitude, d.longitude])
      if (trail.length > 50) trail.shift()

      // Build markers
      const markers: MapMarker[] = Object.entries(uavPositions.current).map(([id, pos]) => ({
        id, lat: pos.lat, lng: pos.lng, label: id, color: 'uav',
        popup: `<b>${id}</b><br/>高度: ${pos.altitude.toFixed(0)}m<br/>电量: ${pos.battery.toFixed(0)}%<br/>速度: ${pos.speed.toFixed(1)}m/s`,
      }))
      setUavMarkers(markers)

      // Build paths
      const paths: MapPath[] = Object.entries(trailsRef.current).map(([id, pts]) => ({
        id: `trail-${id}`, points: [...pts], color: '#3b82f6', weight: 2,
      }))
      setUavPaths(paths)
    } else if (data.type === 'stats') {
      setOnlineUavs(data.online_uavs)
      setTodayDetections(data.today_detections)
      setActiveTracks(data.active_tracks)
    } else if (data.type === 'alert') {
      setAlerts((prev) => [data, ...prev].slice(0, 10))
    }
  }, [])

  const { connected } = useWebSocket({
    url: '/api/ws/dashboard',
    onMessage: handleWsMessage,
  })

  useEffect(() => { setWsConnected(connected) }, [connected])

  const stats = [
    { label: '在线无人机', value: String(onlineUavs || 3), icon: Plane, color: 'bg-blue-500', trend: '' },
    { label: '今日检测目标', value: todayDetections ? todayDetections.toLocaleString() : (detectionStats?.today_detections?.toLocaleString() || '0'), icon: ScanSearch, color: 'bg-green-500', trend: '' },
    { label: '活跃跟踪', value: String(activeTracks || 0), icon: Route, color: 'bg-purple-500', trend: '' },
    { label: '总任务数', value: String(missions.length || 0), icon: MapPin, color: 'bg-orange-500', trend: '' },
    { label: '未处理告警', value: String(alertStats?.unacknowledged || 0), icon: AlertTriangle, color: alertStats && alertStats.unacknowledged > 0 ? 'bg-red-500' : 'bg-gray-400', trend: alertStats?.critical ? `${alertStats.critical} 严重` : '' },
  ]

  const detectionChartData = detectionStats?.recent_trend?.map((d) => ({ time: d.date, count: d.count })) || [
    { time: '00:00', count: 45 }, { time: '04:00', count: 18 },
    { time: '08:00', count: 120 }, { time: '12:00', count: 185 },
    { time: '16:00', count: 178 }, { time: '20:00', count: 68 },
  ]

  const categoryData = detectionStats?.class_distribution
    ? Object.entries(detectionStats.class_distribution).map(([name, count]) => ({ name, count }))
    : [{ name: 'drone', count: 12 }, { name: 'bird', count: 8 }, { name: 'airplane', count: 3 }]

  const displayAlerts = alerts.length > 0 ? alerts : [
    { level: 'info', message: '系统已启动，等待 WebSocket 连接...', timestamp: new Date().toISOString() },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">系统总览</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Activity className={`w-4 h-4 ${wsConnected ? 'text-green-500' : 'text-gray-400'}`} />
          {wsConnected ? '实时连接中' : '等待连接...'}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {!dataLoaded ? (
          <>{Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)}</>
        ) : stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow"
          >
            <div className={`${stat.color} p-3 rounded-lg`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <span className="text-xs text-green-600 font-medium">{stat.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {!dataLoaded ? (
          <><CardSkeleton /><CardSkeleton /></>
        ) : <><div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">今日检测趋势</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={detectionChartData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" name="检测数" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">目标类别分布</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="#9ca3af" width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="数量" />
            </BarChart>
          </ResponsiveContainer>
        </div></>}
      </div>

      {/* Map + missions + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">无人机实时位置</h3>
          <MapView
            markers={uavMarkers}
            paths={uavPaths}
            className="h-80"
          />
        </div>

        <div className="space-y-6">
          {/* Recent missions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">最近任务</h3>
            <div className="space-y-3">
              {missions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">暂无任务数据</p>
              ) : missions.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                    <p className="text-xs text-gray-500">ID: {m.id} · {m.created_at?.slice(0, 10)}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${(statusMap[m.status] || statusMap.pending).cls}`}>
                    {(statusMap[m.status] || statusMap.pending).label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* System alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">系统告警</h3>
            <div className="space-y-3">
              {displayAlerts.map((a, i) => (
                <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    a.level === 'error' ? 'text-red-500' : a.level === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700">{a.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
