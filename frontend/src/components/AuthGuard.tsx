import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, user, fetchMe } = useAuthStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (token && !user) {
      fetchMe().finally(() => setChecking(false))
    } else {
      setChecking(false)
    }
  }, [token, user, fetchMe])

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-3">验证登录状态...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
