import { useState, useRef, useEffect } from 'react'
import { Upload, Play, Square, Loader2, BarChart3, Image as ImageIcon } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { detectionApi, type DetectionResult, type DetectionBox, type DetectionStats } from '../services/detectionApi'

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#6366f1', '#14b8a6']

export default function Detection() {
  const [modelName, setModelName] = useState('yolov8n')
  const [confidence, setConfidence] = useState(0.5)
  const [loading, setLoading] = useState(false)
  const [detections, setDetections] = useState<DetectionBox[]>([])
  const [resultInfo, setResultInfo] = useState<string | null>(null)
  const [history, setHistory] = useState<DetectionResult[]>([])
  const [streamSession, setStreamSession] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [stats, setStats] = useState<DetectionStats | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load recent results and stats
  useEffect(() => {
    detectionApi.listResults({ limit: 10 }).then(setHistory).catch(() => {})
    detectionApi.getStats().then(setStats).catch(() => {})
  }, [])

  const handleUpload = async () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show image preview
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    setLoading(true)
    setDetections([])
    setResultInfo(null)
    try {
      const result = await detectionApi.detectImage(file, { model_name: modelName, confidence })
      setDetections(result.detections || [])
      setResultInfo(`检测完成 — 模型: ${result.model_name}, 目标数: ${result.detections?.length || 0}`)
      setHistory((prev) => [result, ...prev].slice(0, 10))
      // Refresh stats
      detectionApi.getStats().then(setStats).catch(() => {})
    } catch (err: any) {
      setResultInfo('检测失败: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleStartStream = async () => {
    try {
      const res = await detectionApi.startStream({ model_name: modelName, confidence })
      setStreamSession(res.session_id)
      setResultInfo(`实时检测已启动 — 会话: ${res.session_id}`)
    } catch (err: any) {
      setResultInfo('启动失败: ' + (err.response?.data?.detail || err.message))
    }
  }

  const handleStopStream = async () => {
    if (!streamSession) return
    try {
      await detectionApi.stopStream(streamSession)
      setResultInfo('实时检测已停止')
      setStreamSession(null)
    } catch {
      setResultInfo('停止失败')
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">目标检测</h2>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <select
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="yolov8n">YOLOv8n</option>
            <option value="yolov8s">YOLOv8s</option>
            <option value="yolov8m">YOLOv8m</option>
            <option value="yolov11n">YOLOv11n</option>
            <option value="yolov11s">YOLOv11s</option>
          </select>
          <input
            type="number"
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            min={0}
            max={1}
            step={0.05}
          />
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <button
            onClick={handleUpload}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            上传图片检测
          </button>
          {!streamSession ? (
            <button
              onClick={handleStartStream}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
            >
              <Play className="w-4 h-4" /> 开启实时检测
            </button>
          ) : (
            <button
              onClick={handleStopStream}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              <Square className="w-4 h-4" /> 停止检测
            </button>
          )}
        </div>
        {resultInfo && <p className="text-sm text-gray-500 mt-3">{resultInfo}</p>}
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

      {/* Detection result area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-gray-400" /> 检测画面
          </h3>
          <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 relative overflow-hidden">
            {previewUrl ? (
              <img src={previewUrl} alt="上传图片" className="w-full h-full object-contain" />
            ) : detections.length > 0 ? (
              <div className="w-full h-full p-4">
                <p className="text-sm text-gray-600 mb-2">检测到 {detections.length} 个目标</p>
                <div className="space-y-2">
                  {detections.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                      <span className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium">{d.class_name}</span>
                      <span className="text-xs text-gray-500 ml-auto">{(d.confidence * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              '上传图片或开启视频流后显示检测结果'
            )}
            {loading && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-400" /> 检测结果
          </h3>
          <div className="overflow-x-auto max-h-80">
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
                    <td colSpan={4} className="py-8 text-center text-gray-400">
                      暂无检测结果
                    </td>
                  </tr>
                ) : (
                  detections.map((d, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-3 px-2 text-gray-800">{i + 1}</td>
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
      </div>

      {/* Class distribution pie chart + History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {stats && Object.keys(stats.class_distribution).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">类别分布</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={Object.entries(stats.class_distribution).map(([name, value]) => ({ name, value }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {Object.keys(stats.class_distribution).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${stats && Object.keys(stats.class_distribution).length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
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
                  </div>
                  <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
