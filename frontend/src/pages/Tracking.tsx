export default function Tracking() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">目标跟踪</h2>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>DeepSORT</option>
            <option>ByteTrack</option>
            <option>BoT-SORT</option>
          </select>
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
            开启跟踪
          </button>
          <button className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors">
            轨迹回放
          </button>
        </div>
      </div>

      {/* Tracking view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">跟踪画面</h3>
          <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center text-gray-500">
            跟踪视频流（检测框 + Track ID + 轨迹线）
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">跟踪目标列表</h3>
          <div className="space-y-3">
            {[
              { id: 'T-001', cls: '行人', status: '跟踪中', color: 'bg-green-100 text-green-700' },
              { id: 'T-002', cls: '车辆', status: '跟踪中', color: 'bg-green-100 text-green-700' },
              { id: 'T-003', cls: '行人', status: '已丢失', color: 'bg-red-100 text-red-700' },
            ].map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-800">{t.id}</span>
                  <span className="text-xs text-gray-500 ml-2">{t.cls}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${t.color}`}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
