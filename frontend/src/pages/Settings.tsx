export default function Settings() {
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
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm">
                <option>YOLOv8n</option>
                <option>YOLOv8s</option>
                <option>YOLOv11n</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">置信度阈值</label>
              <input type="number" defaultValue={0.5} min={0} max={1} step={0.05}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">NMS IoU 阈值</label>
              <input type="number" defaultValue={0.45} min={0} max={1} step={0.05}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">输入尺寸</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm">
                <option>640×640</option>
                <option>1280×1280</option>
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
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm">
                <option>DeepSORT</option>
                <option>ByteTrack</option>
                <option>BoT-SORT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">最大丢失帧数</label>
              <input type="number" defaultValue={30}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
        </div>

        {/* Path planning settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">路径规划参数</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">默认算法</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm">
                <option>A*</option>
                <option>RRT*</option>
                <option>改进蚁群算法</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">安全距离 (m)</label>
              <input type="number" defaultValue={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
        </div>

        <button className="px-8 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
          保存设置
        </button>
      </div>
    </div>
  )
}
