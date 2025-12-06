import { request } from './client'
import type { UserProfile } from '../state/auth'

export type LoginPayload = { login: string; password: string }
export type RegisterPayload = { login: string; password: string; surname?: string; name?: string }

export type LoginResponse = {
  access_token?: string
  accessToken?: string
  token?: string
  jwt?: string
  refresh_token?: string
  expires_in?: number
  user?: UserProfile
}

export type RegisterResponse = {
  id?: number
  login?: string
  message?: string
}

export const authApi = {
  login: (payload: LoginPayload) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload), skipAuthHeader: true }),
  register: (payload: RegisterPayload) =>
    request<RegisterResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload), skipAuthHeader: true }),
  me: () => request<UserProfile>('/users/me'),
}

export function extractToken(payload: LoginResponse): string {
  const token = payload.access_token || payload.accessToken || payload.token || payload.jwt
  if (!token) {
    throw new Error('Не удалось получить токен из ответа логина')
  }
  return token
}

