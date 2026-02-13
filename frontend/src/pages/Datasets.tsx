import { useState, useEffect } from 'react'
import { Database, Plus, Trash2, Play, Square, RefreshCw, BarChart3 } from 'lucide-react'
import { datasetApi, trainingApi, type Dataset, type TrainingJob } from '../services/datasetApi'
import { useToast } from '../components/Toast'
import { TableSkeleton } from '../components/Loading'

const statusMap: Record<string, { label: string; cls: string }> = {
  draft: { label: '草稿', cls: 'bg-gray-100 text-gray-700' },
  ready: { label: '就绪', cls: 'bg-green-100 text-green-700' },
  archived: { label: '归档', cls: 'bg-yellow-100 text-yellow-700' },
  pending: { label: '待训练', cls: 'bg-gray-100 text-gray-700' },
  running: { label: '训练中', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: '已完成', cls: 'bg-green-100 text-green-700' },
  failed: { label: '失败', cls: 'bg-red-100 text-red-700' },
}

export default function Datasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [jobs, setJobs] = useState<TrainingJob[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDs, setShowCreateDs] = useState(false)
  const [showCreateJob, setShowCreateJob] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [deleteJobConfirm, setDeleteJobConfirm] = useState<number | null>(null)
  const toast = useToast()

  // Form state
  const [dsName, setDsName] = useState('')
  const [dsDesc, setDsDesc] = useState('')
  const [dsFormat, setDsFormat] = useState('yolo')
  const [dsClasses, setDsClasses] = useState('drone,bird,airplane')
  const [jobName, setJobName] = useState('')
  const [jobDatasetId, setJobDatasetId] = useState(0)
  const [jobModel, setJobModel] = useState('yolov8n')
  const [jobEpochs, setJobEpochs] = useState(100)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      datasetApi.list().then((r) => setDatasets(r.datasets)).catch(() => {}),
      trainingApi.list().then((r) => setJobs(r.jobs)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleCreateDataset = async () => {
    if (!dsName.trim()) return
    try {
      await datasetApi.create({
        name: dsName,
        description: dsDesc || undefined,
        format: dsFormat,
        class_names: dsClasses.split(',').map((s) => s.trim()).filter(Boolean),
        num_classes: dsClasses.split(',').filter(Boolean).length,
      })
      toast.success('数据集创建成功')
      setShowCreateDs(false)
      setDsName(''); setDsDesc(''); setDsClasses('drone,bird,airplane')
      fetchData()
    } catch { toast.error('创建失败') }
  }

  const handleDeleteDataset = async (id: number) => {
    try {
      await datasetApi.delete(id)
      toast.success('数据集已删除')
      setDeleteConfirm(null)
      fetchData()
    } catch { toast.error('删除失败') }
  }

  const handleCreateJob = async () => {
    if (!jobName.trim() || !jobDatasetId) return
    try {
      await trainingApi.create({
        name: jobName,
        dataset_id: jobDatasetId,
        base_model: jobModel,
        epochs: jobEpochs,
      })
      toast.success('训练任务创建成功')
      setShowCreateJob(false)
      setJobName('')
      fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || '创建失败')
    }
  }

  const handleStartJob = async (id: number) => {
    try {
      await trainingApi.start(id)
      toast.success('训练已启动')
      fetchData()
    } catch (err: any) { toast.error(err.response?.data?.detail || '启动失败') }
  }

  const handleStopJob = async (id: number) => {
    try {
      await trainingApi.stop(id)
      toast.success('训练已停止')
      fetchData()
    } catch (err: any) { toast.error(err.response?.data?.detail || '停止失败') }
  }

  const handleSimulate = async (id: number) => {
    try {
      await trainingApi.simulateProgress(id)
      toast.success('模拟推进成功')
      fetchData()
    } catch (err: any) { toast.error(err.response?.data?.detail || '模拟失败') }
  }

  const handleDeleteJob = async (id: number) => {
    try {
      await trainingApi.delete(id)
      toast.success('训练任务已删除')
      setDeleteJobConfirm(null)
      fetchData()
    } catch (err: any) { toast.error(err.response?.data?.detail || '删除失败') }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Datasets section */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Database className="w-6 h-6" /> 数据集管理
        </h2>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 text-gray-500 hover:text-gray-700">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreateDs(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> 新建数据集
          </button>
        </div>
      </div>

      {/* Create dataset modal */}
      {showCreateDs && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">新建数据集</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">名称</label>
              <input value={dsName} onChange={(e) => setDsName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="UAV Detection v1" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">格式</label>
              <select value={dsFormat} onChange={(e) => setDsFormat(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="yolo">YOLO</option>
                <option value="coco">COCO</option>
                <option value="voc">VOC</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">描述</label>
              <input value={dsDesc} onChange={(e) => setDsDesc(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="可选描述" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">类别（逗号分隔）</label>
              <input value={dsClasses} onChange={(e) => setDsClasses(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleCreateDataset} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">创建</button>
            <button onClick={() => setShowCreateDs(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">取消</button>
          </div>
        </div>
      )}

      {/* Datasets table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-6"><TableSkeleton rows={3} /></div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-6 py-3 font-medium">ID</th>
                <th className="text-left px-6 py-3 font-medium">名称</th>
                <th className="text-left px-6 py-3 font-medium">格式</th>
                <th className="text-left px-6 py-3 font-medium">图片数</th>
                <th className="text-left px-6 py-3 font-medium">大小</th>
                <th className="text-left px-6 py-3 font-medium">状态</th>
                <th className="text-left px-6 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {datasets.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">暂无数据集</td></tr>
              ) : datasets.map((ds) => (
                <tr key={ds.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-500">{ds.id}</td>
                  <td className="px-6 py-3 font-medium text-gray-800">{ds.name}</td>
                  <td className="px-6 py-3 text-gray-500 uppercase">{ds.format}</td>
                  <td className="px-6 py-3 text-gray-700">{ds.num_images}</td>
                  <td className="px-6 py-3 text-gray-500">{ds.size_mb} MB</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${(statusMap[ds.status] || statusMap.draft).cls}`}>
                      {(statusMap[ds.status] || statusMap.draft).label}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {deleteConfirm === ds.id ? (
                      <span className="flex items-center gap-2">
                        <button onClick={() => handleDeleteDataset(ds.id)} className="text-xs text-red-600 hover:underline">确认删除</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 hover:underline">取消</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirm(ds.id)} className="text-gray-400 hover:text-red-500">
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

      {/* Training jobs section */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" /> 模型训练
        </h2>
        <button
          onClick={() => { setShowCreateJob(true); if (datasets.length > 0) setJobDatasetId(datasets[0].id) }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> 新建训练任务
        </button>
      </div>

      {/* Create training job modal */}
      {showCreateJob && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">新建训练任务</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">任务名称</label>
              <input value={jobName} onChange={(e) => setJobName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="UAV Detection Training" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">数据集</label>
              <select value={jobDatasetId} onChange={(e) => setJobDatasetId(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {datasets.filter((d) => d.status === 'ready').map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.num_images} 张)</option>
                ))}
                {datasets.filter((d) => d.status === 'ready').length === 0 && <option value={0}>无可用数据集</option>}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">基础模型</label>
              <select value={jobModel} onChange={(e) => setJobModel(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="yolov8n">YOLOv8 Nano</option>
                <option value="yolov8s">YOLOv8 Small</option>
                <option value="yolov8m">YOLOv8 Medium</option>
                <option value="yolov11n">YOLOv11 Nano</option>
                <option value="yolov11s">YOLOv11 Small</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">训练轮数</label>
              <input type="number" value={jobEpochs} onChange={(e) => setJobEpochs(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" min={1} max={1000} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleCreateJob} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">创建</button>
            <button onClick={() => setShowCreateJob(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">取消</button>
          </div>
        </div>
      )}

      {/* Training jobs table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-6"><TableSkeleton rows={3} /></div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-6 py-3 font-medium">ID</th>
                <th className="text-left px-6 py-3 font-medium">名称</th>
                <th className="text-left px-6 py-3 font-medium">模型</th>
                <th className="text-left px-6 py-3 font-medium">进度</th>
                <th className="text-left px-6 py-3 font-medium">mAP50</th>
                <th className="text-left px-6 py-3 font-medium">状态</th>
                <th className="text-left px-6 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">暂无训练任务</td></tr>
              ) : jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-500">{job.id}</td>
                  <td className="px-6 py-3 font-medium text-gray-800">{job.name}</td>
                  <td className="px-6 py-3 text-gray-500">{job.base_model}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${job.progress}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{job.current_epoch}/{job.epochs}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-700">{job.metrics?.mAP50?.toFixed(3) || '—'}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${(statusMap[job.status] || statusMap.pending).cls}`}>
                      {(statusMap[job.status] || statusMap.pending).label}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      {job.status === 'pending' && (
                        <button onClick={() => handleStartJob(job.id)} className="text-green-600 hover:text-green-800" title="启动">
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {job.status === 'running' && (
                        <>
                          <button onClick={() => handleSimulate(job.id)} className="text-blue-600 hover:text-blue-800" title="模拟推进">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleStopJob(job.id)} className="text-red-600 hover:text-red-800" title="停止">
                            <Square className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {job.status === 'failed' && (
                        <button onClick={() => handleStartJob(job.id)} className="text-green-600 hover:text-green-800" title="重试">
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {deleteJobConfirm === job.id ? (
                        <span className="flex items-center gap-1 ml-1">
                          <button onClick={() => handleDeleteJob(job.id)} className="text-xs text-red-600 hover:underline">确认</button>
                          <button onClick={() => setDeleteJobConfirm(null)} className="text-xs text-gray-500 hover:underline">取消</button>
                        </span>
                      ) : job.status !== 'running' && (
                        <button onClick={() => setDeleteJobConfirm(job.id)} className="text-gray-400 hover:text-red-500 ml-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
