export default function Detection() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">目标检测</h2>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>YOLOv8n</option>
            <option>YOLOv8s</option>
            <option>YOLOv8m</option>
            <option>YOLOv11n</option>
            <option>YOLOv11s</option>
          </select>
          <input
            type="number"
            placeholder="置信度阈值 (0.5)"
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            defaultValue={0.5}
            min={0}
            max={1}
            step={0.05}
          />
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
            上传图片检测
          </button>
          <button className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">
            开启实时检测
          </button>
        </div>
      </div>

      {/* Detection result area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">检测画面</h3>
          <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
            上传图片或开启视频流后显示检测结果
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">检测结果</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">ID</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">类别</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">置信度</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">边界框</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">
                    暂无检测结果
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
