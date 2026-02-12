import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Monitor,
  ScanSearch,
  Route,
  MapPin,
  ClipboardList,
  Settings,
  Plane,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: '总览', icon: LayoutDashboard },
  { to: '/monitor', label: '实时监控', icon: Monitor },
  { to: '/detection', label: '目标检测', icon: ScanSearch },
  { to: '/tracking', label: '目标跟踪', icon: Route },
  { to: '/path-planning', label: '路径规划', icon: MapPin },
  { to: '/mission', label: '任务管理', icon: ClipboardList },
  { to: '/settings', label: '系统设置', icon: Settings },
]

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
          <Plane className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-lg font-bold leading-tight">UAV Detection</h1>
            <p className="text-xs text-gray-400">无人机智能巡检系统</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-gray-700 text-xs text-gray-500">
          v0.1.0 · UAV Detection System
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
