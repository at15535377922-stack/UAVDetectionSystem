import api from './api'

export interface UserResponse {
  id: number
  username: string
  email: string
  is_active: boolean
  is_admin: boolean
  created_at: string
}

export interface Token {
  access_token: string
  token_type: string
}

export const authApi = {
  register(data: { username: string; email: string; password: string }) {
    return api.post<any, UserResponse>('/auth/register', data)
  },

  login(data: { username: string; password: string }) {
    return api.post<any, Token>('/auth/login', data)
  },

  getMe() {
    return api.get<any, UserResponse>('/auth/me')
  },
}
