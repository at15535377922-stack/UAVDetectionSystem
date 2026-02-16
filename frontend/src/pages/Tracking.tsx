import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Play, Square, RefreshCw, Circle, Camera, Video, Radio,
  Crosshair, Users, Clock, Zap,
} from 'lucide-react'
import {
  trackingApi,
  type TrackingSession,
  type TrackedObject,
  type TrackerInfo,
  type TrackResult,
} from '../services/trackingApi'
import { detectionApi, type ModelInfo } from '../services/detectionApi'
import { useToast } from '../components/Toast'

type TrackMode = 'camera' | 'video' | 'rtsp'

const TRACK_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#6366f1', '#f97316', '#06b6d4',
  '#84cc16', '#e11d48', '#7c3aed', '#0891b2', '#ca8a04',
]

function getTrackColor(trackId: number) {
  return TRACK_COLORS[trackId % TRACK_COLORS.length]
}

// ── Tracking canvas: draws video + bounding boxes + track IDs + trajectory lines ──
function TrackingCanvas({
  videoRef,
  trackedObjects,
  trajectories,
  active,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  trackedObjects: TrackedObject[]
  trajectories: Map<number, { x: number; y: number }[]>
  active: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const video = videoRef.current
    let srcW = 0, srcH = 0
    let source: CanvasImageSource | null = null

    if (video && video.videoWidth) {
      srcW = video.videoWidth
      srcH = video.videoHeight
      source = video
    }

    if (!source || srcW === 0) {
      // Draw placeholder
      canvas.width = canvas.clientWidth * window.devicePixelRatio
      canvas.height = canvas.clientHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      const cw = canvas.clientWidth, ch = canvas.clientHeight
      ctx.fillStyle = '#111827'
      ctx.fillRect(0, 0, cw, ch)
      ctx.fillStyle = '#6b7280'
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(active ? '等待视频流...' : '选择输入源并开启跟踪', cw / 2, ch / 2)
      return
    }

    canvas.width = canvas.clientWidth * window.devicePixelRatio
    canvas.height = canvas.clientHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    const scale = Math.min(cw / srcW, ch / srcH)
    const dx = (cw - srcW * scale) / 2
    const dy = (ch - srcH * scale) / 2

    ctx.clearRect(0, 0, cw, ch)
    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, cw, ch)
    ctx.drawImage(source, dx, dy, srcW * scale, srcH * scale)

    // Draw trajectory lines
    trajectories.forEach((points, trackId) => {
      if (points.length < 2) return
      const color = getTrackColor(trackId)
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.6
      ctx.beginPath()
      const p0 = points[0]
      ctx.moveTo(dx + p0.x * scale, dy + p0.y * scale)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(dx + points[i].x * scale, dy + points[i].y * scale)
      }
      ctx.stroke()
      ctx.globalAlpha = 1.0
    })

    // Draw bounding boxes + track IDs
    trackedObjects.forEach((obj) => {
      const color = getTrackColor(obj.track_id)
      const x = dx + obj.x1 * scale
      const y = dy + obj.y1 * scale
      const w = (obj.x2 - obj.x1) * scale
      const h = (obj.y2 - obj.y1) * scale

      // Box
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.strokeRect(x, y, w, h)

      // Corner accents
      const cornerLen = Math.min(w, h, 15)
      ctx.lineWidth = 3.5
      // Top-left
      ctx.beginPath(); ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y); ctx.stroke()
      // Top-right
      ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cornerLen); ctx.stroke()
      // Bottom-left
      ctx.beginPath(); ctx.moveTo(x, y + h - cornerLen); ctx.lineTo(x, y + h); ctx.lineTo(x + cornerLen, y + h); ctx.stroke()
      // Bottom-right
      ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cornerLen); ctx.stroke()

      // Label: "ID:N classname conf%"
      const label = `ID:${obj.track_id} ${obj.class_name} ${(obj.confidence * 100).toFixed(0)}%`
      ctx.font = 'bold 12px sans-serif'
      const tm = ctx.measureText(label)
      const lh = 20
      const lx = x
      const ly = y - lh - 2
      ctx.fillStyle = color
      ctx.globalAlpha = 0.85
      ctx.fillRect(lx, ly, tm.width + 10, lh)
      ctx.globalAlpha = 1.0
      ctx.fillStyle = '#fff'
      ctx.fillText(label, lx + 5, ly + 14)

      // Center dot for trajectory
      const cx = dx + ((obj.x1 + obj.x2) / 2) * scale
      const cy = dy + ((obj.y1 + obj.y2) / 2) * scale
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(cx, cy, 3, 0, Math.PI * 2)
      ctx.fill()
    })
  }, [videoRef, trackedObjects, trajectories, active])

  // Redraw every animation frame when active
  useEffect(() => {
    let raf = 0
    const loop = () => { draw(); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-lg"
      style={{ display: 'block', background: '#111827' }}
    />
  )
}

export default function Tracking() {
  const [mode, setMode] = useState<TrackMode>('camera')
  const [trackerType, setTrackerType] = useState('deep_sort')
  const [modelName, setModelName] = useState('yolov8n')
  const [confidence, setConfidence] = useState(0.5)
  const [session, setSession] = useState<TrackingSession | null>(null)
  const [trackedObjects, setTrackedObjects] = useState<TrackedObject[]>([])
  const [trajectories, setTrajectories] = useState<Map<number, { x: number; y: number }[]>>(new Map())
  const [info, setInfo] = useState<string | null>(null)
  const [trackers, setTrackers] = useState<TrackerInfo[]>([])
  const [tracks, setTracks] = useState<TrackResult[]>([])
  const [rtspUrl, setRtspUrl] = useState('rtsp://localhost:8554/stream')
  const [stats, setStats] = useState({ activeTracks: 0, totalTracks: 0, fps: 0, inferenceMs: 0 })
  const [models, setModels] = useState<ModelInfo[]>([])

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const frameLoopRef = useRef<number | null>(null)
  const detectingRef = useRef(false)
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoFileInputRef = useRef<HTMLInputElement>(null)
  const trajectoriesRef = useRef<Map<number, { x: number; y: number }[]>>(new Map())
  const toast = useToast()

  // ── Init: fetch trackers + tracks + models ──
  useEffect(() => {
    trackingApi.listTrackers().then((res) => setTrackers(res.trackers)).catch(() => {})
    trackingApi.listTracks({ limit: 20 }).then(setTracks).catch(() => {})
    detectionApi.listModels().then((res) => {
      setModels(res.models || [])
      const avail = (res.models || []).filter((m) => m.weights_available)
      if (avail.length > 0 && !avail.find((m) => m.id === modelName)) {
        setModelName(avail[0].id)
      }
    }).catch(() => {})
  }, [])

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => { stopAll() }
  }, [])

  // ── Camera ──
  const startCamera = async () => {
    stopAll()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      cameraStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setMode('camera')
      toast.success('摄像头已开启')
    } catch (err: any) {
      toast.error('无法访问摄像头: ' + (err.message || ''))
    }
  }

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop())
      cameraStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.src = ''
    }
  }

  // ── Video file ──
  const handleVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    stopAll()
    const url = URL.createObjectURL(file)
    setMode('video')
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.src = url
      videoRef.current.play()
    }
    toast.success(`视频已加载: ${file.name}`)
    if (videoFileInputRef.current) videoFileInputRef.current.value = ''
  }

  // ── RTSP ──
  const startRtsp = () => {
    stopAll()
    setMode('rtsp')
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.src = rtspUrl
      videoRef.current.play().catch(() => {})
    }
    toast.success('RTSP 流已连接')
  }

  // ── Tracking session + frame loop ──
  const handleStartTracking = async () => {
    const sourceLabel = mode === 'camera' ? 'camera' : mode === 'video' ? 'video_file' : rtspUrl
    try {
      const res = await trackingApi.start({ tracker_type: trackerType, source: sourceLabel })
      setSession(res)
      setTrackedObjects([])
      trajectoriesRef.current = new Map()
      setTrajectories(new Map())
      const modeLabel = res.is_mock ? '模拟跟踪 (IoU匹配)' : res.tracker_type
      setInfo(`跟踪已启动 — 会话: ${res.session_id}, 算法: ${modeLabel}`)
      if (res.is_mock) {
        toast.warning(`${res.tracker_type} 库未安装，已降级为模拟跟踪 (IoU匹配)`)
      } else {
        toast.success(`跟踪已启动 — ${res.tracker_type}`)
      }
      startFrameLoop(res.session_id)
    } catch (err: any) {
      toast.error('启动失败: ' + (err.response?.data?.detail || err.message))
    }
  }

  const handleStopTracking = async () => {
    stopFrameLoop()
    if (session) {
      try {
        await trackingApi.stop(session.session_id)
        toast.success('跟踪已停止')
      } catch { /* */ }
    }
    setSession(null)
    setInfo('跟踪已停止，记录已保存')
    setTrackedObjects([])
    setStats({ activeTracks: 0, totalTracks: 0, fps: 0, inferenceMs: 0 })
    // Refresh track history from DB after a short delay (DB write may take a moment)
    setTimeout(() => {
      trackingApi.listTracks({ limit: 20 }).then(setTracks).catch(() => {})
    }, 500)
  }

  const stopAll = () => {
    stopFrameLoop()
    stopCamera()
    if (session) {
      trackingApi.stop(session.session_id).catch(() => {})
      setSession(null)
    }
    setTrackedObjects([])
    trajectoriesRef.current = new Map()
    setTrajectories(new Map())
  }

  // ── Frame capture → backend tracking ──
  const startFrameLoop = (sessionId: string) => {
    stopFrameLoop()
    if (!captureCanvasRef.current) {
      captureCanvasRef.current = document.createElement('canvas')
    }
    const FRAME_INTERVAL = 400
    const MAX_TRAJECTORY_LEN = 60

    const loop = async () => {
      if (detectingRef.current) { frameLoopRef.current = window.setTimeout(loop, FRAME_INTERVAL); return }
      const video = videoRef.current
      if (!video || video.paused || video.ended || !video.videoWidth) {
        frameLoopRef.current = window.setTimeout(loop, FRAME_INTERVAL)
        return
      }
      const canvas = captureCanvasRef.current!
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) { frameLoopRef.current = window.setTimeout(loop, FRAME_INTERVAL); return }
      ctx.drawImage(video, 0, 0)

      canvas.toBlob(async (blob) => {
        if (!blob) { frameLoopRef.current = window.setTimeout(loop, FRAME_INTERVAL); return }
        detectingRef.current = true
        try {
          const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' })
          const res = await trackingApi.trackFrame(sessionId, file, { model_name: modelName, confidence })
          setTrackedObjects(res.tracked_objects)
          setStats({
            activeTracks: res.active_tracks,
            totalTracks: res.total_tracks,
            fps: +(1000 / Math.max(res.inference_time_ms, 1)).toFixed(1),
            inferenceMs: res.inference_time_ms,
          })
          setInfo(`跟踪中 — 活跃: ${res.active_tracks}, 累计: ${res.total_tracks}, 耗时: ${res.inference_time_ms}ms`)

          // Update trajectories
          const traj = trajectoriesRef.current
          const seenIds = new Set<number>()
          for (const obj of res.tracked_objects) {
            seenIds.add(obj.track_id)
            const cx = (obj.x1 + obj.x2) / 2
            const cy = (obj.y1 + obj.y2) / 2
            const pts = traj.get(obj.track_id) || []
            pts.push({ x: cx, y: cy })
            if (pts.length > MAX_TRAJECTORY_LEN) pts.shift()
            traj.set(obj.track_id, pts)
          }
          // Clean old tracks not seen for a while (keep last 5 frames of data)
          setTrajectories(new Map(traj))
        } catch {
          // Silently ignore errors (session may have stopped)
        } finally {
          detectingRef.current = false
          frameLoopRef.current = window.setTimeout(loop, FRAME_INTERVAL)
        }
      }, 'image/jpeg', 0.75)
    }
    frameLoopRef.current = window.setTimeout(loop, 300)
  }

  const stopFrameLoop = () => {
    if (frameLoopRef.current !== null) {
      clearTimeout(frameLoopRef.current)
      frameLoopRef.current = null
    }
    detectingRef.current = false
  }

  const isTracking = !!session

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <Crosshair className="w-6 h-6" /> 目标跟踪
      </h2>

      {/* ── Controls ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Source buttons */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden text-sm">
            <button
              onClick={startCamera}
              disabled={isTracking}
              className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${mode === 'camera' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'} disabled:opacity-50`}
            >
              <Camera className="w-4 h-4" /> 摄像头
            </button>
            <button
              onClick={() => videoFileInputRef.current?.click()}
              disabled={isTracking}
              className={`flex items-center gap-1.5 px-3 py-2 border-l border-gray-200 transition-colors ${mode === 'video' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'} disabled:opacity-50`}
            >
              <Video className="w-4 h-4" /> 视频文件
            </button>
            <button
              onClick={startRtsp}
              disabled={isTracking}
              className={`flex items-center gap-1.5 px-3 py-2 border-l border-gray-200 transition-colors ${mode === 'rtsp' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'} disabled:opacity-50`}
            >
              <Radio className="w-4 h-4" /> RTSP
            </button>
          </div>

          {/* RTSP URL input */}
          {mode === 'rtsp' && !isTracking && (
            <input
              value={rtspUrl}
              onChange={(e) => setRtspUrl(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64"
              placeholder="rtsp://..."
            />
          )}

          {/* Tracker type */}
          <select
            value={trackerType}
            onChange={(e) => setTrackerType(e.target.value)}
            disabled={isTracking}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
          >
            {trackers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.available ? '✓' : '(未安装 - 模拟模式)'}
              </option>
            ))}
            {trackers.length === 0 && (
              <>
                <option value="deep_sort">DeepSORT (未安装 - 模拟模式)</option>
                <option value="byte_track">ByteTrack (未安装 - 模拟模式)</option>
              </>
            )}
          </select>

          {/* Model */}
          <select
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            disabled={isTracking}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
          >
            {models.length > 0 ? models.map((m) => (
              <option key={m.id} value={m.id} disabled={!m.weights_available && !m.onnx_available}>
                {m.name}
                {m.weights_available ? ' ✓' : ' (未下载)'}
                {m.file_size_mb ? ` ${m.file_size_mb}MB` : ''}
              </option>
            )) : (
              <>
                <option value="yolov8n">YOLOv8n</option>
                <option value="yolov8s">YOLOv8s</option>
              </>
            )}
          </select>

          {/* Confidence */}
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <span>置信度</span>
            <input
              type="range" min={0.1} max={0.9} step={0.05} value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              disabled={isTracking}
              className="w-20 h-1.5 accent-blue-600"
            />
            <span className="w-8 text-center font-mono">{confidence.toFixed(2)}</span>
          </div>

          {/* Start / Stop */}
          {!isTracking ? (
            <button
              onClick={handleStartTracking}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors ml-auto"
            >
              <Play className="w-4 h-4" /> 开启跟踪
            </button>
          ) : (
            <button
              onClick={handleStopTracking}
              className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors ml-auto"
            >
              <Square className="w-4 h-4" /> 停止跟踪
            </button>
          )}
        </div>
        {info && <p className="text-sm text-gray-500 mt-3">{info}</p>}
      </div>

      {/* Hidden elements */}
      <input ref={videoFileInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoFile} />
      <video ref={videoRef} className="hidden" muted playsInline />

      {/* ── Main content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Video + Canvas */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800">跟踪画面</h3>
              {isTracking && session && (
                <div className="flex items-center gap-2 text-xs font-mono">
                  <Circle className="w-2 h-2 fill-green-400 text-green-400 animate-pulse" />
                  <span className="text-green-600">{session.tracker_type}</span>
                  {session.is_mock && (
                    <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-semibold">
                      模拟模式
                    </span>
                  )}
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-500">{session.session_id}</span>
                </div>
              )}
            </div>
            <div className="aspect-video relative">
              <TrackingCanvas
                videoRef={videoRef}
                trackedObjects={trackedObjects}
                trajectories={trajectories}
                active={isTracking}
              />
            </div>
          </div>

          {/* Stats bar */}
          {isTracking && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: Users, label: '活跃目标', value: stats.activeTracks, color: 'text-blue-600' },
                { icon: Crosshair, label: '累计目标', value: stats.totalTracks, color: 'text-purple-600' },
                { icon: Zap, label: '推理耗时', value: `${stats.inferenceMs}ms`, color: 'text-orange-600' },
                { icon: Clock, label: '处理帧率', value: `${stats.fps} FPS`, color: 'text-green-600' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <div>
                    <div className={`text-lg font-bold ${color}`}>{value}</div>
                    <div className="text-xs text-gray-400">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar: active objects + history */}
        <div className="space-y-4">
          {/* Current tracked objects */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
              <Crosshair className="w-4 h-4 text-blue-500" />
              实时目标 <span className="text-gray-400 font-normal">({trackedObjects.length})</span>
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {trackedObjects.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">
                  {isTracking ? '等待检测...' : '未开启跟踪'}
                </p>
              ) : trackedObjects.map((obj) => (
                <div key={obj.track_id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getTrackColor(obj.track_id) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-800">
                      ID:{obj.track_id} <span className="text-gray-500">{obj.class_name}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {(obj.confidence * 100).toFixed(0)}% · ({Math.round(obj.x1)},{Math.round(obj.y1)})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Track history */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-gray-400" />
                跟踪记录
              </span>
              <span className="text-xs text-gray-400 font-normal">{tracks.length}</span>
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tracks.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">暂无跟踪记录</p>
              ) : tracks.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-xs font-medium text-gray-800">Track #{t.track_id}</span>
                    <span className="text-xs text-gray-500 ml-1">{t.class_name}</span>
                    <p className="text-xs text-gray-400">{t.tracker_type} · {t.total_frames} 帧</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(t.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
