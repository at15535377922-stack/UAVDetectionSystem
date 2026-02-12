import { ScanSearch, Route, MapPin, Plane, Activity, AlertTriangle } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import MapView, { type MapMarker, type MapPath } from '../components/MapView'

const stats = [
  { label: '在线无人机', value: '3', icon: Plane, color: 'bg-blue-500', trend: '+1' },
  { label: '今日检测目标', value: '1,284', icon: ScanSearch, color: 'bg-green-500', trend: '+128' },
  { label: '跟踪轨迹数', value: '56', icon: Route, color: 'bg-purple-500', trend: '+8' },
  { label: '规划航线', value: '12', icon: MapPin, color: 'bg-orange-500', trend: '+2' },
]

const detectionChartData = [
  { time: '00:00', count: 45 }, { time: '02:00', count: 32 },
  { time: '04:00', count: 18 }, { time: '06:00', count: 56 },
  { time: '08:00', count: 120 }, { time: '10:00', count: 210 },
  { time: '12:00', count: 185 }, { time: '14:00', count: 240 },
  { time: '16:00', count: 178 }, { time: '18:00', count: 95 },
  { time: '20:00', count: 68 }, { time: '22:00', count: 52 },
]

const categoryData = [
  { name: '行人', count: 456 },
  { name: '车辆', count: 328 },
  { name: '建筑缺陷', count: 215 },
  { name: '电力设备', count: 186 },
  { name: '其他', count: 99 },
]

const recentMissions = [
  { id: 'M-2024-001', name: '园区A巡检', status: 'completed', time: '14:30', drone: 'UAV-01' },
  { id: 'M-2024-002', name: '输电线路巡查', status: 'running', time: '15:10', drone: 'UAV-02' },
  { id: 'M-2024-003', name: '光伏板检测', status: 'pending', time: '16:00', drone: 'UAV-03' },
  { id: 'M-2024-004', name: '桥梁结构检查', status: 'completed', time: '10:20', drone: 'UAV-01' },
  { id: 'M-2024-005', name: '河道水质监测', status: 'failed', time: '09:00', drone: 'UAV-02' },
]

const uavMarkers: MapMarker[] = [
  { id: 'uav-1', lat: 30.5728, lng: 104.0668, label: 'UAV-01', color: 'uav', popup: '<b>UAV-01</b><br/>高度: 120m<br/>电量: 78%' },
  { id: 'uav-2', lat: 30.5780, lng: 104.0720, label: 'UAV-02', color: 'uav', popup: '<b>UAV-02</b><br/>高度: 95m<br/>电量: 62%' },
  { id: 'uav-3', lat: 30.5690, lng: 104.0600, label: 'UAV-03', color: 'uav', popup: '<b>UAV-03</b><br/>待命中' },
]

const uavPaths: MapPath[] = [
  {
    id: 'path-1',
    points: [[30.5728, 104.0668], [30.5750, 104.0690], [30.5770, 104.0710], [30.5780, 104.0720]],
    color: '#3b82f6',
    weight: 3,
  },
]

const statusMap: Record<string, { label: string; cls: string }> = {
  completed: { label: '已完成', cls: 'bg-green-100 text-green-700' },
  running: { label: '执行中', cls: 'bg-blue-100 text-blue-700' },
  pending: { label: '待执行', cls: 'bg-yellow-100 text-yellow-700' },
  failed: { label: '失败', cls: 'bg-red-100 text-red-700' },
}

const systemAlerts = [
  { level: 'warning', msg: 'UAV-02 电量低于 30%，建议返航', time: '2 分钟前' },
  { level: 'info', msg: '输电线路巡查任务已启动', time: '5 分钟前' },
  { level: 'error', msg: '河道水质监测任务因信号中断失败', time: '1 小时前' },
]

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">系统总览</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Activity className="w-4 h-4 text-green-500" />
          系统运行正常
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
        </div>
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
              {recentMissions.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.drone} · {m.time}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusMap[m.status].cls}`}>
                    {statusMap[m.status].label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* System alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">系统告警</h3>
            <div className="space-y-3">
              {systemAlerts.map((a, i) => (
                <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    a.level === 'error' ? 'text-red-500' : a.level === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700">{a.msg}</p>
                    <p className="text-xs text-gray-400 mt-1">{a.time}</p>
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
