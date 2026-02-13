import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Wifi, WifiOff, Battery, MapPin, Loader2, X } from 'lucide-react'
import { deviceApi, type Device } from '../services/deviceApi'
import { useToast } from '../components/Toast'

const statusMap: Record<string, { label: string; cls: string }> = {
  online: { label: '在线', cls: 'bg-green-100 text-green-700' },
  offline: { label: '离线', cls: 'bg-gray-100 text-gray-500' },
  flying: { label: '飞行中', cls: 'bg-blue-100 text-blue-700' },
  charging: { label: '充电中', cls: 'bg-yellow-100 text-yellow-700' },
  maintenance: { label: '维护中', cls: 'bg-orange-100 text-orange-700' },
}

const typeMap: Record<string, string> = {
  quadcopter: '四旋翼',
  hexacopter: '六旋翼',
  fixed_wing: '固定翼',
  vtol: '垂直起降',
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', device_type: 'quadcopter', serial_number: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const toast = useToast()

  const fetchDevices = async () => {
    setLoading(true)
    try {
      const data = await deviceApi.list()
      setDevices(data)
    } catch {
      setError('加载设备列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDevices() }, [])

  const openCreate = () => {
    setEditId(null)
    setForm({ name: '', device_type: 'quadcopter', serial_number: '' })
    setShowForm(true)
    setError(null)
  }

  const openEdit = (d: Device) => {
    setEditId(d.id)
    setForm({ name: d.name, device_type: d.device_type, serial_number: d.serial_number })
    setShowForm(true)
    setError(null)
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.serial_number.trim()) {
      setError('请填写设备名称和序列号')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (editId) {
        await deviceApi.update(editId, { name: form.name })
        toast.success('设备信息已更新')
      } else {
        await deviceApi.register(form)
        toast.success('设备注册成功')
      }
      setShowForm(false)
      fetchDevices()
    } catch (err: any) {
      setError(err.response?.data?.detail || '操作失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deviceApi.delete(id)
      toast.success('设备已删除')
      setDeleteConfirmId(null)
      fetchDevices()
    } catch {
      toast.error('删除失败')
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">设备管理</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> 注册设备
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {editId ? '编辑设备' : '注册新设备'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">设备名称</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="如：巡检无人机-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">设备类型</label>
              <select
                value={form.device_type}
                onChange={(e) => setForm({ ...form, device_type: e.target.value })}
                disabled={!!editId}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="quadcopter">四旋翼</option>
                <option value="hexacopter">六旋翼</option>
                <option value="fixed_wing">固定翼</option>
                <option value="vtol">垂直起降</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">序列号</label>
              <input
                value={form.serial_number}
                onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                disabled={!!editId}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="如：UAV-2024-001"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editId ? '保存修改' : '注册'}
            </button>
          </div>
        </div>
      )}

      {/* Device cards */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">暂无设备</p>
          <p className="text-sm">点击"注册设备"添加第一台无人机</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((d) => {
            const st = statusMap[d.status] || statusMap.offline
            return (
              <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-base font-semibold text-gray-800">{d.name}</h4>
                    <p className="text-xs text-gray-400 mt-1">{d.serial_number}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.cls}`}>
                    {st.label}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    {d.status === 'online' || d.status === 'flying' ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-gray-400" />
                    )}
                    <span>类型: {typeMap[d.device_type] || d.device_type}</span>
                  </div>
                  {d.battery !== null && (
                    <div className="flex items-center gap-2">
                      <Battery className={`w-4 h-4 ${d.battery > 20 ? 'text-green-500' : 'text-red-500'}`} />
                      <span>电量: {d.battery.toFixed(0)}%</span>
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full ml-2">
                        <div
                          className={`h-full rounded-full ${d.battery > 50 ? 'bg-green-500' : d.battery > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${d.battery}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {d.latitude !== null && d.longitude !== null && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-mono">
                        {d.latitude.toFixed(6)}, {d.longitude.toFixed(6)}
                        {d.altitude !== null && ` · ${d.altitude.toFixed(0)}m`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    注册: {new Date(d.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(d)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="编辑"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {deleteConfirmId === d.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          确认
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(d.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
