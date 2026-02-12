export default function Mission() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">任务管理</h2>

      {/* Actions */}
      <div className="flex items-center gap-4 mb-6">
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
          + 新建任务
        </button>
      </div>

      {/* Task table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-4 px-6 text-gray-500 font-medium">任务ID</th>
              <th className="text-left py-4 px-6 text-gray-500 font-medium">任务名称</th>
              <th className="text-left py-4 px-6 text-gray-500 font-medium">状态</th>
              <th className="text-left py-4 px-6 text-gray-500 font-medium">无人机</th>
              <th className="text-left py-4 px-6 text-gray-500 font-medium">创建时间</th>
              <th className="text-left py-4 px-6 text-gray-500 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: 'M-001', name: '电力线路巡检-A区', status: '已完成', uav: 'UAV-01', time: '2026-02-12 14:00', statusColor: 'bg-green-100 text-green-700' },
              { id: 'M-002', name: '光伏电站巡检-B区', status: '执行中', uav: 'UAV-02', time: '2026-02-12 15:30', statusColor: 'bg-blue-100 text-blue-700' },
              { id: 'M-003', name: '建筑工地监控-C区', status: '待执行', uav: 'UAV-03', time: '2026-02-12 16:00', statusColor: 'bg-yellow-100 text-yellow-700' },
            ].map((task) => (
              <tr key={task.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-6 font-medium text-gray-800">{task.id}</td>
                <td className="py-4 px-6 text-gray-700">{task.name}</td>
                <td className="py-4 px-6">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${task.statusColor}`}>{task.status}</span>
                </td>
                <td className="py-4 px-6 text-gray-700">{task.uav}</td>
                <td className="py-4 px-6 text-gray-500">{task.time}</td>
                <td className="py-4 px-6">
                  <button className="text-blue-600 hover:text-blue-800 text-xs mr-3">详情</button>
                  <button className="text-red-600 hover:text-red-800 text-xs">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
