import axios from 'axios'
import { emitApiError } from '../utils/apiErrors'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status
    const detail = error.response?.data?.detail

    // Auto redirect to login on 401 (token expired or invalid)
    if (status === 401) {
      localStorage.removeItem('token')
      const currentPath = window.location.pathname
      if (currentPath !== '/login') {
        window.location.href = '/login'
      }
    } else if (status === 429) {
      emitApiError('请求过于频繁，请稍后再试', 429)
    } else if (status && status >= 500) {
      emitApiError(detail || '服务器内部错误', status)
    }

    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  },
)

export default api
