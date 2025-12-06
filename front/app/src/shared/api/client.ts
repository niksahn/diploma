import { useAuthStore } from '../state/auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const API_PREFIX = '/api/v1'

type RequestOptions = RequestInit & { skipAuthHeader?: boolean }

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuthHeader, ...init } = options
  const headers = new Headers(init.headers || {})

  const token = useAuthStore.getState().token
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
  const response = await fetch(url, {
    ...init,
    headers,
  })

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

