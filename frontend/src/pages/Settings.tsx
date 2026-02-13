import { useState, useEffect } from 'react'
import { Loader2, Check, Server, Cpu, Activity, CheckCircle, XCircle } from 'lucide-react'
import { settingsApi, type UserSettings } from '../services/settingsApi'
import api from '../services/api'

interface ModelInfo {
  id: string; name: string; params: string; speed: string
  weights_available: boolean; loaded: boolean
}
interface TrackerInfo {
  id: string; name: string; available: boolean; description: string
}

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings>({
    default_model: 'yolov8n',
    confidence_threshold: 0.5,
    nms_iou_threshold: 0.45,
    input_size: '640x640',
    tracker_algorithm: 'deep_sort',
    max_lost_frames: 30,
    planning_algorithm: 'a_star',
    safety_distance: 5,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // System status
  const [detectionMode, setDetectionMode] = useState<string>('—')
  const [models, setModels] = useState<ModelInfo[]>([])
  const [trackers, setTrackers] = useState<TrackerInfo[]>([])
  const [healthOk, setHealthOk] = useState<boolean | null>(null)

  useEffect(() => {
    settingsApi.get().then(setSettings).catch(() => {})
    // Fetch system status
    api.get<any, { status: string }>('/health')
      .then(() => setHealthOk(true))
      .catch(() => setHealthOk(false))
    api.get<any, { models: ModelInfo[]; mode: string }>('/detections/models')
      .then((res) => { setModels(res.models); setDetectionMode(res.mode) })
      .catch(() => {})
    api.get<any, { trackers: TrackerInfo[] }>('/tracking/trackers')
      .then((res) => setTrackers(res.trackers))
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await settingsApi.update(settings)
      setSettings(res)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      setError(err.response?.data?.detail || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const update = (field: keyof UserSettings, value: string | number) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">系统设置</h2>

      <div className="space-y-6 max-w-3xl">
        {/* Detection settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">检测参数</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">默认模型</label>
              <select
                value={settings.default_model}
                onChange={(e) => update('default_model', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="yolov8n">YOLOv8n</option>
                <option value="yolov8s">YOLOv8s</option>
                <option value="yolov8m">YOLOv8m</option>
                <option value="yolov11n">YOLOv11n</option>
                <option value="yolov11s">YOLOv11s</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">置信度阈值</label>
              <input
                type="number"
                value={settings.confidence_threshold}
                onChange={(e) => update('confidence_threshold', Number(e.target.value))}
                min={0} max={1} step={0.05}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">NMS IoU 阈值</label>
              <input
                type="number"
                value={settings.nms_iou_threshold}
                onChange={(e) => update('nms_iou_threshold', Number(e.target.value))}
                min={0} max={1} step={0.05}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">输入尺寸</label>
              <select
                value={settings.input_size}
                onChange={(e) => update('input_size', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="640x640">640x640</option>
                <option value="1280x1280">1280x1280</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tracking settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">跟踪参数</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">跟踪算法</label>
              <select
                value={settings.tracker_algorithm}
                onChange={(e) => update('tracker_algorithm', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="deep_sort">DeepSORT</option>
                <option value="byte_track">ByteTrack</option>
                <option value="bot_sort">BoT-SORT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">最大丢失帧数</label>
              <input
                type="number"
                value={settings.max_lost_frames}
                onChange={(e) => update('max_lost_frames', Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* Path planning settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">路径规划参数</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">默认算法</label>
              <select
                value={settings.planning_algorithm}
                onChange={(e) => update('planning_algorithm', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="a_star">A*</option>
                <option value="rrt_star">RRT*</option>
                <option value="ant_colony">改进蚁群算法</option>
                <option value="d_star_lite">D* Lite</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">安全距离 (m)</label>
              <input
                type="number"
                value={settings.safety_distance}
                onChange={(e) => update('safety_distance', Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* System status panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-gray-400" /> 系统状态
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">后端服务</p>
              <div className="flex items-center gap-2">
                {healthOk === null ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : healthOk ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm font-medium">{healthOk === null ? '检测中...' : healthOk ? '正常运行' : '无法连接'}</span>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">推理模式</p>
              <div className="flex items-center gap-2">
                <Activity className={`w-4 h-4 ${detectionMode === 'real' ? 'text-green-500' : 'text-yellow-500'}`} />
                <span className="text-sm font-medium">{detectionMode === 'real' ? '真实推理' : detectionMode === 'mock' ? 'Mock 模拟' : '—'}</span>
              </div>
            </div>
          </div>

          {models.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Cpu className="w-4 h-4" /> 检测模型
              </p>
              <div className="space-y-1.5">
                {models.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{m.name}</span>
                      <span className="text-xs text-gray-400">{m.params}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${m.speed === 'fast' ? 'bg-green-100 text-green-700' : m.speed === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {m.speed}
                      </span>
                      {m.weights_available ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-gray-300" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {trackers.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">跟踪器</p>
              <div className="space-y-1.5">
                {trackers.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div>
                      <span className="font-medium text-gray-800">{t.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{t.description}</span>
                    </div>
                    {t.available ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-gray-300" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
            {saving ? '保存中...' : saved ? '已保存' : '保存设置'}
          </button>
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
      </div>
    </div>
  )
}
