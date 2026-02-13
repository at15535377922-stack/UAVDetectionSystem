import { create } from 'zustand'
import { authApi, type UserResponse } from '../services/authApi'

interface AuthState {
  user: UserResponse | null
  token: string | null
  loading: boolean
  error: string | null

  login: (username: string, password: string) => Promise<boolean>
  register: (username: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  fetchMe: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null })
    try {
      const res = await authApi.login({ username, password })
      localStorage.setItem('token', res.access_token)
      set({ token: res.access_token, loading: false })
      // Fetch user info
      const user = await authApi.getMe()
      set({ user })
      return true
    } catch (err: any) {
      const msg = err.response?.data?.detail || '登录失败'
      set({ error: msg, loading: false })
      return false
    }
  },

  register: async (username, email, password) => {
    set({ loading: true, error: null })
    try {
      await authApi.register({ username, email, password })
      set({ loading: false })
      return true
    } catch (err: any) {
      const msg = err.response?.data?.detail || '注册失败'
      set({ error: msg, loading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },

  fetchMe: async () => {
    try {
      const user = await authApi.getMe()
      set({ user })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, token: null })
    }
  },

  clearError: () => set({ error: null }),
}))
