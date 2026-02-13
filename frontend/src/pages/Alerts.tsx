import { useState, useEffect } from 'react'
import { Bell, Plus, Check, CheckCheck, Trash2, RefreshCw, Shield, ShieldAlert, Info } from 'lucide-react'
import { alertApi, type Alert, type AlertRule, type AlertStats } from '../services/alertApi'
import { useToast } from '../components/Toast'
import { TableSkeleton } from '../components/Loading'

const severityMap: Record<string, { label: string; cls: string; icon: typeof Bell }> = {
  critical: { label: '严重', cls: 'bg-red-100 text-red-700', icon: ShieldAlert },
  warning: { label: '警告', cls: 'bg-yellow-100 text-yellow-700', icon: Shield },
  info: { label: '信息', cls: 'bg-blue-100 text-blue-700', icon: Info },
}

const triggerTypes = [
  { value: 'detection', label: '目标检测' },
  { value: 'geofence', label: '地理围栏' },
  { value: 'battery', label: '电池电量' },
  { value: 'signal', label: '信号强度' },
  { value: 'custom', label: '自定义' },
]

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [rules, setRules] = useState<AlertRule[]>([])
  const [stats, setStats] = useState<AlertStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'alerts' | 'rules'>('alerts')
  const [showCreateRule, setShowCreateRule] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const toast = useToast()

  // Rule form
  const [ruleName, setRuleName] = useState('')
  const [ruleSeverity, setRuleSeverity] = useState('warning')
  const [ruleTrigger, setRuleTrigger] = useState('detection')
  const [ruleDesc, setRuleDesc] = useState('')

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      alertApi.list({ limit: 50 }).then((r) => setAlerts(r.alerts)).catch(() => {}),
      alertApi.listRules().then((r) => setRules(r.rules)).catch(() => {}),
      alertApi.stats().then(setStats).catch(() => {}),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleCreateRule = async () => {
    if (!ruleName.trim()) return
    try {
      await alertApi.createRule({
        name: ruleName,
        severity: ruleSeverity,
        trigger_type: ruleTrigger,
        description: ruleDesc || undefined,
      })
      toast.success('告警规则创建成功')
      setShowCreateRule(false)
      setRuleName(''); setRuleDesc('')
      fetchData()
    } catch { toast.error('创建失败') }
  }

  const handleAcknowledge = async (id: number) => {
    try {
      await alertApi.acknowledge(id)
      toast.success('已确认')
      fetchData()
    } catch (err: any) { toast.error(err.response?.data?.detail || '操作失败') }
  }

  const handleResolve = async (id: number) => {
    try {
      await alertApi.resolve(id)
      toast.success('已解决')
      fetchData()
    } catch (err: any) { toast.error(err.response?.data?.detail || '操作失败') }
  }

  const handleDeleteRule = async (id: number) => {
    try {
      await alertApi.deleteRule(id)
      toast.success('规则已删除')
      setDeleteConfirm(null)
      fetchData()
    } catch { toast.error('删除失败') }
  }

  const handleToggleRule = async (rule: AlertRule) => {
    try {
      await alertApi.updateRule(rule.id, { enabled: !rule.enabled })
      toast.success(rule.enabled ? '规则已禁用' : '规则已启用')
      fetchData()
    } catch { toast.error('操作失败') }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header + stats */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Bell className="w-6 h-6" /> 告警中心
        </h2>
        <button onClick={fetchData} className="p-2 text-gray-500 hover:text-gray-700">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            <p className="text-xs text-gray-500">总告警</p>
          </div>
          <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.unacknowledged}</p>
            <p className="text-xs text-red-500">未确认</p>
          </div>
          <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{stats.critical}</p>
            <p className="text-xs text-red-500">严重</p>
          </div>
          <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-100 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-700">{stats.warning}</p>
            <p className="text-xs text-yellow-500">警告</p>
          </div>
          <div className="bg-green-50 rounded-xl shadow-sm border border-green-100 p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{stats.resolved}</p>
            <p className="text-xs text-green-500">已解决</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('alerts')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'alerts' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          告警记录 ({alerts.length})
        </button>
        <button
          onClick={() => setTab('rules')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'rules' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          告警规则 ({rules.length})
        </button>
      </div>

      {/* Alerts tab */}
      {tab === 'alerts' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? <div className="p-6"><TableSkeleton rows={4} /></div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">级别</th>
                  <th className="text-left px-6 py-3 font-medium">标题</th>
                  <th className="text-left px-6 py-3 font-medium">来源</th>
                  <th className="text-left px-6 py-3 font-medium">时间</th>
                  <th className="text-left px-6 py-3 font-medium">状态</th>
                  <th className="text-left px-6 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alerts.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">暂无告警</td></tr>
                ) : alerts.map((a) => {
                  const sev = severityMap[a.severity] || severityMap.info
                  const SevIcon = sev.icon
                  return (
                    <tr key={a.id} className={`hover:bg-gray-50 ${!a.acknowledged ? 'bg-red-50/30' : ''}`}>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${sev.cls}`}>
                          <SevIcon className="w-3 h-3" /> {sev.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-medium text-gray-800">{a.title}</td>
                      <td className="px-6 py-3 text-gray-500">{a.source}</td>
                      <td className="px-6 py-3 text-gray-500 text-xs">{new Date(a.created_at).toLocaleString()}</td>
                      <td className="px-6 py-3">
                        {a.resolved ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">已解决</span>
                        ) : a.acknowledged ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">已确认</span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">未处理</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1">
                          {!a.acknowledged && (
                            <button onClick={() => handleAcknowledge(a.id)} className="text-blue-600 hover:text-blue-800" title="确认">
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {!a.resolved && (
                            <button onClick={() => handleResolve(a.id)} className="text-green-600 hover:text-green-800" title="解决">
                              <CheckCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Rules tab */}
      {tab === 'rules' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setShowCreateRule(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> 新建规则
            </button>
          </div>

          {showCreateRule && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">新建告警规则</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">规则名称</label>
                  <input value={ruleName} onChange={(e) => setRuleName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="无人机入侵告警" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">触发类型</label>
                  <select value={ruleTrigger} onChange={(e) => setRuleTrigger(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {triggerTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">严重级别</label>
                  <select value={ruleSeverity} onChange={(e) => setRuleSeverity(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="info">信息</option>
                    <option value="warning">警告</option>
                    <option value="critical">严重</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">描述</label>
                  <input value={ruleDesc} onChange={(e) => setRuleDesc(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="可选描述" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleCreateRule} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">创建</button>
                <button onClick={() => setShowCreateRule(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">取消</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? <div className="p-6"><TableSkeleton rows={3} /></div> : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium">名称</th>
                    <th className="text-left px-6 py-3 font-medium">类型</th>
                    <th className="text-left px-6 py-3 font-medium">级别</th>
                    <th className="text-left px-6 py-3 font-medium">状态</th>
                    <th className="text-left px-6 py-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rules.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-400">暂无规则</td></tr>
                  ) : rules.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-800">{r.name}</td>
                      <td className="px-6 py-3 text-gray-500">{triggerTypes.find((t) => t.value === r.trigger_type)?.label || r.trigger_type}</td>
                      <td className="px-6 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${(severityMap[r.severity] || severityMap.info).cls}`}>
                          {(severityMap[r.severity] || severityMap.info).label}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <button onClick={() => handleToggleRule(r)} className={`text-xs px-2 py-1 rounded-full ${r.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {r.enabled ? '启用' : '禁用'}
                        </button>
                      </td>
                      <td className="px-6 py-3">
                        {deleteConfirm === r.id ? (
                          <span className="flex items-center gap-2">
                            <button onClick={() => handleDeleteRule(r.id)} className="text-xs text-red-600 hover:underline">确认删除</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 hover:underline">取消</button>
                          </span>
                        ) : (
                          <button onClick={() => setDeleteConfirm(r.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
