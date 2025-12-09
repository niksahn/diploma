import { useAuthStore } from '../state/auth'
import { authApi } from './auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const API_PREFIX = '/api/v1'

type RequestOptions = RequestInit & { skipAuthHeader?: boolean }

// Флаг для предотвращения множественных одновременных рефрешей
let isRefreshing = false
let refreshPromise: Promise<string> | null = null

async function refreshToken(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  try {
    const response = await authApi.refresh({ refresh_token: refreshToken })
    const newToken = response.access_token
    useAuthStore.getState().setToken(newToken)
    return newToken
  } catch (error) {
    // Если рефреш не удался, очищаем состояние и редиректим на авторизацию
    useAuthStore.getState().logout()
    // Редирект на страницу авторизации
    if (typeof window !== 'undefined') {
      window.location.href = '/auth'
    }
    throw error
  }
}


export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuthHeader, ...init } = options
  const headers = new Headers(init.headers || {})

  let token = useAuthStore.getState().token
  const shouldAttachAuth = token && !skipAuthHeader

  const isFormData = init.body instanceof FormData
  if (!headers.has('Content-Type') && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }
  if (shouldAttachAuth) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const url = path.startsWith('http')
    ? path
    : `${API_BASE_URL}${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`

  let response = await fetch(url, {
    ...init,
    headers,
  })

  // Если получили 401 и у нас есть refresh токен, пытаемся рефрешить
  if (response.status === 401 && !skipAuthHeader && useAuthStore.getState().refreshToken) {
    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = refreshToken().finally(() => {
        isRefreshing = false
        refreshPromise = null
      })
    }

    try {
      const newToken = await refreshPromise!
      // Повторяем оригинальный запрос с новым токеном
      headers.set('Authorization', `Bearer ${newToken}`)
      response = await fetch(url, {
        ...init,
        headers,
      })
    } catch (error) {
      // Рефреш не удался, ошибка уже обработана в refreshToken
      throw error
    }
  }

  const text = await response.text()
  const data = text ? safeJson(text) : null

  if (!response.ok) {
    const message = (data as { message?: string })?.message || `Request failed: ${response.status}`
    throw new Error(message)
  }

  return data as T
}

function safeJson(payload: string) {
  try {
    return JSON.parse(payload)
  } catch {
    return payload
  }
}

