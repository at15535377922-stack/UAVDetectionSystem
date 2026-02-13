import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md px-6">
        <p className="text-8xl font-bold text-blue-600 mb-4">404</p>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">页面未找到</h2>
        <p className="text-gray-500 mb-8">
          您访问的页面不存在或已被移除
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> 返回上页
          </button>
          <button
            onClick={() => navigate('/dashboard', { replace: true })}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <Home className="w-4 h-4" /> 回到首页
          </button>
        </div>
      </div>
    </div>
  )
}
