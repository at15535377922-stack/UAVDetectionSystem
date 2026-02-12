import { useState, useCallback } from 'react'
import { MapPin, Trash2, Play, Download, RotateCcw } from 'lucide-react'
import MapView, { type MapMarker, type MapPath } from '../components/MapView'

interface WaypointData {
  id: number
  lat: number
  lng: number
}

const algorithms = [
  { id: 'a_star', name: 'A* 算法', desc: '全局最优，适合静态环境' },
  { id: 'rrt_star', name: 'RRT* 算法', desc: '采样规划，适合复杂空间' },
  { id: 'ant_colony', name: '改进蚁群算法', desc: '多航点顺序优化' },
  { id: 'd_star_lite', name: 'D* Lite', desc: '动态避障，增量重规划' },
  { id: 'coverage', name: '区域覆盖', desc: '牛耕式全覆盖扫描' },
]

export default function PathPlanning() {
  const [algorithm, setAlgorithm] = useState('a_star')
  const [altitude, setAltitude] = useState(100)
  const [speed, setSpeed] = useState(8)
  const [waypoints, setWaypoints] = useState<WaypointData[]>([])
  const [plannedPath, setPlannedPath] = useState<[number, number][]>([])
  const [pathInfo, setPathInfo] = useState<{
    distance: string; waypoints: string; time: string; planTime: string
  } | null>(null)
  const [nextId, setNextId] = useState(1)

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setWaypoints((prev) => [...prev, { id: nextId, lat, lng }])
    setNextId((n) => n + 1)
  }, [nextId])

  const removeWaypoint = (id: number) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id))
  }

  const clearAll = () => {
    setWaypoints([])
    setPlannedPath([])
    setPathInfo(null)
  }

  const generatePath = () => {
    if (waypoints.length < 2) return

    // Simulate path generation with smooth interpolation
    const points: [number, number][] = []
    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = waypoints[i]
      const b = waypoints[i + 1]
      const steps = 10
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        // Add slight curve for visual appeal
        const jitter = Math.sin(t * Math.PI) * 0.0005
        points.push([
          a.lat + (b.lat - a.lat) * t + jitter,
          a.lng + (b.lng - a.lng) * t + jitter,
        ])
      }
    }
    setPlannedPath(points)

    // Calculate mock stats
    let totalDist = 0
    for (let i = 1; i < waypoints.length; i++) {
      const dx = (waypoints[i].lat - waypoints[i - 1].lat) * 111320
      const dy = (waypoints[i].lng - waypoints[i - 1].lng) * 111320 * 0.85
      totalDist += Math.sqrt(dx * dx + dy * dy)
    }

    setPathInfo({
      distance: totalDist.toFixed(0) + ' m',
      waypoints: waypoints.length.toString(),
      time: (totalDist / speed / 60).toFixed(1) + ' min',
      planTime: (Math.random() * 50 + 10).toFixed(1) + ' ms',
    })
  }

  const markers: MapMarker[] = waypoints.map((w, i) => ({
    id: `wp-${w.id}`,
    lat: w.lat,
    lng: w.lng,
    label: `WP${i + 1}`,
    color: i === 0 ? '#22c55e' : i === waypoints.length - 1 ? '#ef4444' : '#3b82f6',
    popup: `<b>航点 ${i + 1}</b><br/>纬度: ${w.lat.toFixed(6)}<br/>经度: ${w.lng.toFixed(6)}`,
  }))

  const paths: MapPath[] = plannedPath.length > 0
    ? [{ id: 'planned', points: plannedPath, color: '#3b82f6', weight: 3 }]
    : waypoints.length >= 2
      ? [{
          id: 'preview',
          points: waypoints.map((w) => [w.lat, w.lng] as [number, number]),
          color: '#9ca3af',
          weight: 2,
          dashed: true,
        }]
      : []

  const selectedAlgo = algorithms.find((a) => a.id === algorithm)

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">路径规划</h2>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">规划算法</label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {algorithms.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">飞行高度 (m)</label>
            <input
              type="number"
              value={altitude}
              onChange={(e) => setAltitude(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">飞行速度 (m/s)</label>
            <input
              type="number"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={generatePath}
              disabled={waypoints.length < 2}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" /> 生成路径
            </button>
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> 清除
            </button>
            <button
              disabled={!pathInfo}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> 下发航线
            </button>
          </div>
        </div>
        {selectedAlgo && (
          <p className="text-xs text-gray-400 mt-3">
            {selectedAlgo.name} — {selectedAlgo.desc}。点击地图添加航点。
          </p>
        )}
      </div>

      {/* Map and path info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">航线地图</h3>
          <MapView
            markers={markers}
            paths={paths}
            className="h-[500px]"
            onClick={handleMapClick}
          />
          <p className="text-xs text-gray-400 mt-2">点击地图添加航点，绿色=起点，红色=终点</p>
        </div>

        <div className="space-y-6">
          {/* Path info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">路径信息</h3>
            <div className="space-y-3">
              {[
                { label: '算法', value: selectedAlgo?.name || '—' },
                { label: '航点数', value: pathInfo?.waypoints || waypoints.length.toString() || '0' },
                { label: '总距离', value: pathInfo?.distance || '—' },
                { label: '预计耗时', value: pathInfo?.time || '—' },
                { label: '规划用时', value: pathInfo?.planTime || '—' },
                { label: '飞行高度', value: `${altitude} m` },
                { label: '飞行速度', value: `${speed} m/s` },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">{item.label}</span>
                  <span className="text-sm font-medium text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Waypoint list */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              航点列表 <span className="text-sm font-normal text-gray-400">({waypoints.length})</span>
            </h3>
            {waypoints.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-4">
                点击地图添加航点
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {waypoints.map((w, i) => (
                  <div key={w.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className={`w-4 h-4 ${
                        i === 0 ? 'text-green-500' : i === waypoints.length - 1 ? 'text-red-500' : 'text-blue-500'
                      }`} />
                      <div>
                        <p className="text-xs font-medium text-gray-800">WP{i + 1}</p>
                        <p className="text-[10px] text-gray-400">{w.lat.toFixed(5)}, {w.lng.toFixed(5)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeWaypoint(w.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
