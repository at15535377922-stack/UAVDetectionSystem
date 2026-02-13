import { useState, useEffect } from 'react'
import { Plus, Play, Square, Trash2, Loader2, RefreshCw } from 'lucide-react'
import { missionApi, type Mission as MissionType } from '../services/missionApi'
import { useToast } from '../components/Toast'
import { TableSkeleton } from '../components/Loading'

const statusMap: Record<string, { label: string; cls: string }> = {
  completed: { label: '已完成', cls: 'bg-green-100 text-green-700' },
  running: { label: '执行中', cls: 'bg-blue-100 text-blue-700' },
  pending: { label: '待执行', cls: 'bg-yellow-100 text-yellow-700' },
  failed: { label: '失败', cls: 'bg-red-100 text-red-700' },
  paused: { label: '已暂停', cls: 'bg-gray-100 text-gray-700' },
}

export default function Mission() {
  const [missions, setMissions] = useState<MissionType[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newType, setNewType] = useState('inspection')
  const [creating, setCreating] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const toast = useToast()

  const fetchMissions = async () => {
    setLoading(true)
    try {
      const res = await missionApi.list({ limit: 50 })
      setMissions(res.missions)
      setTotal(res.total)
    } catch {
      // API not available
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMissions() }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await missionApi.create({ name: newName, description: newDesc, mission_type: newType, device_id: 1 })
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
      toast.success('任务创建成功')
      await fetchMissions()
    } catch {
      toast.error('任务创建失败')
    } finally {
      setCreating(false)
    }
  }

  const handleStart = async (id: number) => {
    try {
      await missionApi.start(id)
      toast.success('任务已启动')
      await fetchMissions()
    } catch { toast.error('启动失败') }
  }

  const handleStop = async (id: number) => {
    try {
      await missionApi.stop(id)
      toast.success('任务已停止')
      await fetchMissions()
    } catch { toast.error('停止失败') }
  }

  const handleDelete = async (id: number) => {
    try {
      await missionApi.delete(id)
      toast.success('任务已删除')
      setDeleteConfirmId(null)
      await fetchMissions()
    } catch { toast.error('删除失败') }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">任务管理</h2>

      {/* Actions */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> 新建任务
        </button>
        <button
          onClick={fetchMissions}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 刷新
        </button>
        <span className="text-sm text-gray-500">共 {total} 条任务</span>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">新建任务</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">任务名称</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入任务名称"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">任务类型</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="inspection">巡检</option>
                <option value="patrol">巡逻</option>
                <option value="survey">测绘</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">描述</label>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="可选描述"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />} 创建
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Task table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-4 px-6 text-gray-500 font-medium">ID</th>
              <th className="text-left py-4 px-6 text-gray-500 font-medium">任务名称</th>
              <th className="text-left py-4 px-6 text-gray-500 font-medium">状态</th>
              <th className="text-left py-4 px-6 text-gray-500 font-medium">类型</th>
              <th className="text-left py-4 px-6 text-gray-500 font-medium">创建时间</th>
              <th className="text-left py-4 px-6 text-gray-500 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4">
                  <TableSkeleton rows={4} />
                </td>
              </tr>
            ) : missions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  暂无任务数据
                </td>
              </tr>
            ) : (
              missions.map((task) => {
                const st = statusMap[task.status] || statusMap.pending
                return (
                  <tr key={task.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6 font-medium text-gray-800">{task.id}</td>
                    <td className="py-4 px-6 text-gray-700">{task.name}</td>
                    <td className="py-4 px-6">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="py-4 px-6 text-gray-500">{task.mission_type}</td>
                    <td className="py-4 px-6 text-gray-500">{new Date(task.created_at).toLocaleString()}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {task.status === 'pending' || task.status === 'paused' ? (
                          <button onClick={() => handleStart(task.id)} className="text-green-600 hover:text-green-800" title="启动">
                            <Play className="w-4 h-4" />
                          </button>
                        ) : task.status === 'running' ? (
                          <button onClick={() => handleStop(task.id)} className="text-orange-600 hover:text-orange-800" title="停止">
                            <Square className="w-4 h-4" />
                          </button>
                        ) : null}
                        {deleteConfirmId === task.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(task.id)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              确认
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirmId(task.id)} className="text-red-500 hover:text-red-700" title="删除">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
