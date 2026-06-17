import { request } from './client'
import type { UserProfile } from '../state/auth'

export type LoginPayload = { login: string; password: string }
export type RegisterPayload = { login: string; password: string; surname?: string; name?: string; patronymic?: string }

/**
 * Response from the login endpoint.
 *
 * IMPORTANT: The backend API may return the JWT access token under different field names.
 * To handle this variability, we support multiple possible field names. The token is extracted
 * using the priority order defined in extractToken():
 * 1. access_token - OAuth 2.0 standard
 * 2. accessToken - camelCase variant
 * 3. token - generic name
 * 4. jwt - explicit JWT token field
 *
 * Only one of these fields will be present in a given response, but we include all options
 * to ensure compatibility with different backend implementations.
 */
export type LoginResponse = {
  access_token?: string   // OAuth 2.0 standard format (snake_case)
  accessToken?: string    // camelCase variant
  token?: string          // generic token field name
  jwt?: string            // explicit JWT token field
  refresh_token?: string  // refresh token for token rotation
  expires_in?: number    // token expiration time in seconds
  user?: UserProfile      // user profile data
}

export type RegisterResponse = {
  id?: number
  login?: string
  message?: string
}

export type RefreshRequest = {
  refresh_token: string
}

export type RefreshResponse = {
  access_token: string
  expires_in: number
}

export const authApi = {
  login: (payload: LoginPayload) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload), skipAuthHeader: true }),
  register: (payload: RegisterPayload) =>
    request<RegisterResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload), skipAuthHeader: true }),
  refresh: (payload: RefreshRequest) =>
    request<RefreshResponse>('/auth/refresh', { method: 'POST', body: JSON.stringify(payload), skipAuthHeader: true }),
  me: () => request<UserProfile>('/users/me'),
  updateStatus: (status: number) =>
    request<{ id: number; status: number; updated_at: string }>('/users/me/status', {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
}

export const USER_STATUS_LABELS: Record<number, string> = {
  1: 'Онлайн',
  2: 'Не беспокоить',
  3: 'Отошел',
  4: 'Офлайн',
}

/**
 * Extracts the JWT access token from a login response.
 *
 * Tries multiple possible field names in priority order to handle API variability:
 * 1. access_token - OAuth 2.0 standard (snake_case)
 * 2. accessToken - camelCase variant
 * 3. token - generic field name
 * 4. jwt - explicit JWT field
 *
 * @param payload - Login response object from the backend
 * @returns The JWT token as a string
 * @throws {Error} If no token field is found in the response
 */
export function extractToken(payload: LoginResponse): string {
  // Try each possible field name in priority order
  const token = payload.access_token || payload.accessToken || payload.token || payload.jwt
  if (!token) {
    throw new Error('Не удалось получить токен из ответа логина')
  }
  return token
}

/**
 * Extracts the refresh token from a login response.
 *
 * Refresh tokens are optional and may not be present in all authentication flows.
 *
 * @param payload - Login response object from the backend
 * @returns The refresh token if present, otherwise null
 */
export function extractRefreshToken(payload: LoginResponse): string | null {
  return payload.refresh_token || null
}

