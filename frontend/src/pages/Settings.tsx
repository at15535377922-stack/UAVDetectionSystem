import { useState, useEffect } from 'react'
import { Loader2, Check } from 'lucide-react'
import { settingsApi, type UserSettings } from '../services/settingsApi'

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

  useEffect(() => {
    settingsApi.get().then(setSettings).catch(() => {})
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
