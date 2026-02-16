import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, Play, Square, Loader2, BarChart3, Image as ImageIcon, Video, Camera, Radio, ScanSearch } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { detectionApi, type DetectionResult, type DetectionBox, type DetectionStats, type ModelInfo } from '../services/detectionApi'
import { useToast } from '../components/Toast'

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#6366f1', '#14b8a6']
const BOX_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1']

type DetectMode = 'image' | 'video' | 'camera' | 'rtsp'

// ── Bounding-box overlay drawn on a <canvas> ──────────────────────
function AnnotatedCanvas({
  imageUrl,
  videoRef,
  detections,
  mode,
}: {
  imageUrl: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  detections: DetectionBox[]
  mode: DetectMode
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let srcW = 0, srcH = 0
    let source: CanvasImageSource | null = null

    if ((mode === 'camera' || mode === 'video' || mode === 'rtsp') && videoRef.current && videoRef.current.videoWidth) {
      srcW = videoRef.current.videoWidth
      srcH = videoRef.current.videoHeight
      source = videoRef.current
    } else if (imageUrl && imgRef.current && imgRef.current.complete) {
      srcW = imgRef.current.naturalWidth
      srcH = imgRef.current.naturalHeight
      source = imgRef.current
    }

    if (!source || srcW === 0) return

    canvas.width = canvas.clientWidth * window.devicePixelRatio
    canvas.height = canvas.clientHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    const scale = Math.min(cw / srcW, ch / srcH)
    const dx = (cw - srcW * scale) / 2
    const dy = (ch - srcH * scale) / 2

    ctx.clearRect(0, 0, cw, ch)
    ctx.drawImage(source, dx, dy, srcW * scale, srcH * scale)

    // Draw bounding boxes
    detections.forEach((det, i) => {
      const color = BOX_COLORS[i % BOX_COLORS.length]
      const x = dx + det.x1 * scale
      const y = dy + det.y1 * scale
      const w = (det.x2 - det.x1) * scale
      const h = (det.y2 - det.y1) * scale

      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, w, h)

      // Label background
      const label = `${det.class_name} ${(det.confidence * 100).toFixed(0)}%`
      ctx.font = '12px sans-serif'
      const tm = ctx.measureText(label)
      const lh = 18
      ctx.fillStyle = color
      ctx.fillRect(x, y - lh, tm.width + 8, lh)
      ctx.fillStyle = '#fff'
      ctx.fillText(label, x + 4, y - 5)
    })
  }, [imageUrl, videoRef, detections, mode])

  // Draw when image loads or detections change
  useEffect(() => {
    if (imageUrl) {
      const img = new Image()
      img.onload = () => { imgRef.current = img; draw() }
      img.src = imageUrl
    } else {
      draw()
    }
  }, [imageUrl, detections, draw])

  // For video/camera: redraw every frame via requestAnimationFrame
  useEffect(() => {
    if (mode !== 'camera' && mode !== 'video' && mode !== 'rtsp') return
    let raf = 0
    const loop = () => { draw(); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [mode, draw])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-lg bg-gray-900"
      style={{ display: 'block' }}
    />
  )
}

export default function Detection() {
  const [mode, setMode] = useState<DetectMode>('image')
  const [modelName, setModelName] = useState('yolov8n')
  const [confidence, setConfidence] = useState(0.5)
  const [loading, setLoading] = useState(false)
  const [detections, setDetections] = useState<DetectionBox[]>([])
  const [resultInfo, setResultInfo] = useState<string | null>(null)
  const [history, setHistory] = useState<DetectionResult[]>([])
  const [streamSession, setStreamSession] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [stats, setStats] = useState<DetectionStats | null>(null)
  const [rtspUrl, setRtspUrl] = useState('rtsp://localhost:8554/stream')
  const [cameraActive, setCameraActive] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [detectionMode, setDetectionMode] = useState<string>('real')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoFileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const frameLoopRef = useRef<number | null>(null)
  const detectingRef = useRef(false)
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const toast = useToast()

  // Load recent results, stats, and available models
  useEffect(() => {
    detectionApi.listResults({ limit: 10 }).then(setHistory).catch(() => {})
    detectionApi.getStats().then(setStats).catch(() => {})
    detectionApi.listModels().then((res) => {
      setModels(res.models || [])
      setDetectionMode(res.mode || 'mock')
      // Auto-select first available model
      const available = (res.models || []).filter((m) => m.weights_available)
      if (available.length > 0 && !available.find((m) => m.id === modelName)) {
        setModelName(available[0].id)
      }
    }).catch(() => {})
  }, [])

  // Cleanup camera on unmount or mode change
  useEffect(() => {
    return () => { stopFrameLoop(); stopCamera() }
  }, [])

  // ── Image detection ──
  const handleUpload = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    stopCamera()
    setVideoPlaying(false)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setMode('image')
    setLoading(true)
    setDetections([])
    setResultInfo(null)
    try {
      const result = await detectionApi.detectImage(file, { model_name: modelName, confidence })
      setDetections(result.detections || [])
      setResultInfo(`检测完成 — 模型: ${result.model_name}, 目标数: ${result.detections?.length || 0}, 耗时: ${result.inference_time_ms?.toFixed(0) || '—'}ms`)
      toast.success(`检测完成，发现 ${result.detections?.length || 0} 个目标`)
      setHistory((prev) => [result, ...prev].slice(0, 10))
      detectionApi.getStats().then(setStats).catch(() => {})
    } catch (err: any) {
      setResultInfo('检测失败: ' + (err.response?.data?.detail || err.message))
      toast.error('检测失败')
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Frame capture loop for real-time detection ──
  const startFrameLoop = () => {
    stopFrameLoop()
    // Create an offscreen canvas for frame capture
    if (!captureCanvasRef.current) {
      captureCanvasRef.current = document.createElement('canvas')
    }
    const FRAME_INTERVAL = 500 // ms between frame captures (2 FPS to avoid overloading)
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
          const result = await detectionApi.detectImage(file, { model_name: modelName, confidence })
          setDetections(result.detections || [])
          setResultInfo(`实时检测中 — 目标数: ${result.detections?.length || 0}, 耗时: ${result.inference_time_ms?.toFixed(0) || '—'}ms`)
        } catch {
          // On 429 or other errors, back off longer
        } finally {
          detectingRef.current = false
          frameLoopRef.current = window.setTimeout(loop, FRAME_INTERVAL)
        }
      }, 'image/jpeg', 0.75)
    }
    frameLoopRef.current = window.setTimeout(loop, 500)
  }

  const stopFrameLoop = () => {
    if (frameLoopRef.current !== null) {
      clearTimeout(frameLoopRef.current)
      frameLoopRef.current = null
    }
    detectingRef.current = false
  }

  // ── Video file detection ──
  const handleVideoUpload = () => videoFileInputRef.current?.click()

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    stopCamera()
    setPreviewUrl(null)
    setDetections([])
    const url = URL.createObjectURL(file)
    setMode('video')
    setVideoPlaying(true)
    setResultInfo(`视频已加载: ${file.name}，检测中...`)

    // Set video source
    if (videoRef.current) {
      videoRef.current.src = url
      videoRef.current.play()
    }

    // Start frame capture loop for real detection
    startFrameLoop()
    if (videoFileInputRef.current) videoFileInputRef.current.value = ''
  }

  // ── Camera real-time detection ──
  const startCamera = async () => {
    try {
      stopCamera()
      setPreviewUrl(null)
      setMode('camera')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'environment' },
        audio: false,
      })
      cameraStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCameraActive(true)
      setResultInfo('摄像头已开启，实时检测中...')
      toast.success('摄像头已开启')
      // Start frame capture loop for real detection
      startFrameLoop()
    } catch (err: any) {
      toast.error('无法访问摄像头: ' + err.message)
      setResultInfo('摄像头访问失败: ' + err.message)
    }
  }

  const stopCamera = () => {
    stopFrameLoop()
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop())
      cameraStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.src = ''
    }
    setCameraActive(false)
    setVideoPlaying(false)
    if (streamSession) {
      detectionApi.stopStream(streamSession).catch(() => {})
      setStreamSession(null)
    }
  }

  // ── RTSP stream detection ──
  const startRtsp = async () => {
    if (!rtspUrl.trim()) {
      toast.error('请输入 RTSP 地址')
      return
    }
    stopCamera()
    setPreviewUrl(null)
    setMode('rtsp')
    setResultInfo(`RTSP 流连接中: ${rtspUrl}`)
    startStreamDetection(rtspUrl)
    toast.success('RTSP 流检测已启动')
  }

  // ── Stream detection (shared for camera / video / rtsp) ──
  const startStreamDetection = async (source: string) => {
    try {
      const res = await detectionApi.startStream({ source, model_name: modelName, confidence })
      setStreamSession(res.session_id)
      setResultInfo(`实时检测已启动 — 会话: ${res.session_id}`)
    } catch (err: any) {
      setResultInfo('启动失败: ' + (err.response?.data?.detail || err.message))
    }
  }

  const stopAllDetection = () => {
    stopFrameLoop()
    stopCamera()
    setDetections([])
    setResultInfo('检测已停止')
    toast.success('检测已停止')
  }

  const isStreaming = cameraActive || videoPlaying || (mode === 'rtsp' && !!streamSession)

  const modeButtons: { id: DetectMode; label: string; icon: typeof ImageIcon }[] = [
    { id: 'image', label: '图片检测', icon: ImageIcon },
    { id: 'video', label: '视频检测', icon: Video },
    { id: 'camera', label: '摄像头实时', icon: Camera },
    { id: 'rtsp', label: 'RTSP 流', icon: Radio },
  ]

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">目标检测</h2>

      {/* Mode tabs + Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {/* Mode selector */}
        <div className="flex items-center gap-2 mb-4">
          {modeButtons.map((m) => (
            <button
              key={m.id}
              onClick={() => { if (!isStreaming) setMode(m.id) }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === m.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${isStreaming && mode !== m.id ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <m.icon className="w-4 h-4" /> {m.label}
            </button>
          ))}
        </div>

        {/* Shared params */}
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">模型</label>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {models.length > 0 ? (
                models.map((m) => (
                  <option key={m.id} value={m.id} disabled={!m.weights_available}>
                    {m.name}{m.file_size_mb ? ` (${m.file_size_mb}MB)` : ''}{m.loaded ? ' ✓' : ''}{!m.weights_available ? ' [未安装]' : ''}
                  </option>
                ))
              ) : (
                <option value="yolov8n">YOLOv8n (默认)</option>
              )}
            </select>
            {detectionMode === 'mock' && (
              <span className="ml-2 text-xs text-amber-500">模拟模式</span>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">置信度阈值</label>
            <input
              type="number"
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={0} max={1} step={0.05}
            />
          </div>

          {/* Mode-specific controls */}
          {mode === 'image' && (
            <>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <div className="flex items-end">
                <button
                  onClick={handleUpload}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  上传图片
                </button>
              </div>
            </>
          )}

          {mode === 'video' && (
            <>
              <input ref={videoFileInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoFileChange} />
              <div className="flex items-end gap-2">
                <button
                  onClick={handleVideoUpload}
                  disabled={isStreaming}
                  className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  <Video className="w-4 h-4" /> 上传视频
                </button>
                {isStreaming && (
                  <button
                    onClick={stopAllDetection}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                  >
                    <Square className="w-4 h-4" /> 停止
                  </button>
                )}
              </div>
            </>
          )}

          {mode === 'camera' && (
            <div className="flex items-end gap-2">
              {!cameraActive ? (
                <button
                  onClick={startCamera}
                  className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                >
                  <Camera className="w-4 h-4" /> 开启摄像头
                </button>
              ) : (
                <button
                  onClick={stopAllDetection}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                >
                  <Square className="w-4 h-4" /> 关闭摄像头
                </button>
              )}
            </div>
          )}

          {mode === 'rtsp' && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">RTSP 地址</label>
                <input
                  type="text"
                  value={rtspUrl}
                  onChange={(e) => setRtspUrl(e.target.value)}
                  placeholder="rtsp://..."
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end gap-2">
                {!streamSession ? (
                  <button
                    onClick={startRtsp}
                    className="flex items-center gap-2 px-5 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700 transition-colors"
                  >
                    <Play className="w-4 h-4" /> 连接 RTSP
                  </button>
                ) : (
                  <button
                    onClick={stopAllDetection}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                  >
                    <Square className="w-4 h-4" /> 断开
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        {resultInfo && <p className="text-sm text-gray-500 mt-3">{resultInfo}</p>}
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.total_detections.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">总检测数</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.today_detections.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">今日检测</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{Object.keys(stats.class_distribution).length}</p>
            <p className="text-xs text-gray-500 mt-1">目标类别数</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{history.length}</p>
            <p className="text-xs text-gray-500 mt-1">历史记录</p>
          </div>
        </div>
      )}

      {/* Dual-panel: Original (left) + Annotated with bboxes (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Original image / video source */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-gray-400" /> 原始画面
          </h3>
          <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center text-gray-500 relative overflow-hidden">
            {/* Hidden video element used for camera / video file */}
            <video
              ref={videoRef}
              className={`w-full h-full object-contain ${(mode === 'camera' || mode === 'video') && (cameraActive || videoPlaying) ? '' : 'hidden'}`}
              muted
              playsInline
              loop={mode === 'video'}
            />

            {/* Image preview for image mode */}
            {mode === 'image' && previewUrl && (
              <img src={previewUrl} alt="原始图片" className="w-full h-full object-contain" />
            )}

            {/* RTSP placeholder */}
            {mode === 'rtsp' && streamSession && (
              <div className="text-center">
                <Radio className="w-10 h-10 text-cyan-400 mx-auto mb-2 animate-pulse" />
                <p className="text-cyan-400 text-sm">RTSP 流接收中</p>
                <p className="text-gray-500 text-xs mt-1 font-mono">{rtspUrl}</p>
              </div>
            )}

            {/* Empty state */}
            {!previewUrl && !cameraActive && !videoPlaying && !streamSession && (
              <div className="text-center text-gray-500">
                <ScanSearch className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">选择检测模式并上传文件或开启流</p>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}

            {/* Live indicator */}
            {isStreaming && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-600/80 text-white text-xs px-2 py-1 rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE
              </div>
            )}
          </div>
        </div>

        {/* Right: Annotated with bounding boxes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ScanSearch className="w-5 h-5 text-gray-400" /> 检测标注
            {detections.length > 0 && (
              <span className="ml-auto text-xs font-normal text-gray-400">
                {detections.length} 个目标
              </span>
            )}
          </h3>
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
            {(previewUrl || cameraActive || videoPlaying || streamSession) ? (
              <AnnotatedCanvas
                imageUrl={previewUrl}
                videoRef={videoRef}
                detections={detections}
                mode={mode}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <ScanSearch className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">检测结果将在此显示标注框</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detection result table + details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-400" /> 检测结果
          </h3>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">ID</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">类别</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">置信度</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">边界框</th>
                </tr>
              </thead>
              <tbody>
                {detections.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400">暂无检测结果</td>
                  </tr>
                ) : (
                  detections.map((d, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 text-gray-800">
                        <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: BOX_COLORS[i % BOX_COLORS.length] }} />
                        {i + 1}
                      </td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{d.class_name}</span>
                      </td>
                      <td className="py-3 px-2 text-gray-700">{(d.confidence * 100).toFixed(1)}%</td>
                      <td className="py-3 px-2 text-gray-500 text-xs font-mono">
                        [{d.x1.toFixed(0)}, {d.y1.toFixed(0)}, {d.x2.toFixed(0)}, {d.y2.toFixed(0)}]
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Class distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">类别分布</h3>
          {stats && Object.keys(stats.class_distribution).length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={Object.entries(stats.class_distribution).map(([name, value]) => ({ name, value }))}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {Object.keys(stats.class_distribution).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">暂无分布数据</p>
          )}
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">历史记录</h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">暂无历史记录</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-800">#{r.id}</span>
                  <span className="text-xs text-gray-500 ml-3">{r.model_name}</span>
                  <span className="text-xs text-gray-500 ml-3">{r.detections?.length || 0} 个目标</span>
                  {r.inference_time_ms && <span className="text-xs text-gray-400 ml-3">{r.inference_time_ms.toFixed(0)}ms</span>}
                </div>
                <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
