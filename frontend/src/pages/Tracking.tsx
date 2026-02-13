import { useState, useEffect } from 'react'
import { Play, Square, RefreshCw, Circle } from 'lucide-react'
import { trackingApi, type TrackingSession, type TrackResult } from '../services/trackingApi'
import { useToast } from '../components/Toast'
import api from '../services/api'

export default function Tracking() {
  const [trackerType, setTrackerType] = useState('deep_sort')
  const [session, setSession] = useState<TrackingSession | null>(null)
  const [tracks, setTracks] = useState<TrackResult[]>([])
  const [sessions, setSessions] = useState<TrackingSession[]>([])
  const [info, setInfo] = useState<string | null>(null)
  const [trackerAvail, setTrackerAvail] = useState<Record<string, boolean>>({})
  const toast = useToast()

  const fetchTracks = async () => {
    try {
      const res = await trackingApi.listTracks({ limit: 20 })
      setTracks(res)
    } catch { /* */ }
  }

  const fetchSessions = async () => {
    try {
      const res = await trackingApi.listSessions()
      setSessions(res.sessions)
    } catch { /* */ }
  }

  useEffect(() => {
    fetchTracks()
    fetchSessions()
    api.get<any, { trackers: { id: string; available: boolean }[] }>('/tracking/trackers')
      .then((res) => {
        const map: Record<string, boolean> = {}
        res.trackers.forEach((t) => { map[t.id] = t.available })
        setTrackerAvail(map)
      })
      .catch(() => {})
  }, [])

  const handleStart = async () => {
    try {
      const res = await trackingApi.start({ tracker_type: trackerType })
      setSession(res)
      setInfo(`跟踪已启动 — 会话: ${res.session_id}, 算法: ${res.tracker_type}`)
      toast.success('跟踪已启动')
      await fetchSessions()
    } catch (err: any) {
      toast.error('启动失败: ' + (err.response?.data?.detail || err.message))
    }
  }

  const handleStop = async () => {
    if (!session) return
    try {
      await trackingApi.stop(session.session_id)
      setSession(null)
      setInfo('跟踪已停止')
      toast.success('跟踪已停止')
      await fetchSessions()
      await fetchTracks()
    } catch {
      toast.error('停止失败')
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">目标跟踪</h2>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <select
            value={trackerType}
            onChange={(e) => setTrackerType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="deep_sort">DeepSORT {trackerAvail.deep_sort ? '✓' : ''}</option>
            <option value="byte_track">ByteTrack {trackerAvail.byte_track ? '✓' : ''}</option>
            <option value="bot_sort">BoT-SORT {trackerAvail.bot_sort ? '✓' : ''}</option>
          </select>
          {!session ? (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              <Play className="w-4 h-4" /> 开启跟踪
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              <Square className="w-4 h-4" /> 停止跟踪
            </button>
          )}
          <button
            onClick={() => { fetchTracks(); fetchSessions() }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> 刷新
          </button>
        </div>
        {info && <p className="text-sm text-gray-500 mt-3">{info}</p>}
      </div>

      {/* Tracking view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">跟踪画面</h3>
            <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center text-gray-500 relative">
              <div className="text-center">
                <p className="text-gray-400 text-lg">跟踪视频流</p>
                <p className="text-gray-500 text-sm mt-1">检测框 + Track ID + 轨迹线</p>
              </div>
              {session && (
                <div className="absolute top-3 left-3 flex items-center gap-2 text-xs text-green-400 font-mono">
                  <Circle className="w-2 h-2 fill-green-400" />
                  {session.tracker_type} | 会话: {session.session_id}
                </div>
              )}
            </div>
          </div>

          {/* Active sessions */}
          {sessions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">活跃会话</h3>
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div key={s.session_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Circle className={`w-2 h-2 fill-current ${s.status === 'running' ? 'text-green-500' : 'text-gray-400'}`} />
                      <span className="text-sm font-medium text-gray-800">{s.session_id}</span>
                      <span className="text-xs text-gray-500">{s.tracker_type}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${s.status === 'running' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            跟踪记录 <span className="text-sm font-normal text-gray-400">({tracks.length})</span>
          </h3>
          <div className="space-y-3">
            {tracks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">暂无跟踪记录</p>
            ) : (
              tracks.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-800">Track #{t.track_id}</span>
                    <span className="text-xs text-gray-500 ml-2">{t.class_name}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{t.tracker_type} · {t.total_frames} 帧</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(t.created_at).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
