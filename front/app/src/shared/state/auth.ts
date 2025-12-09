import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserProfile = {
  id: string
  login: string
  name?: string
  surname?: string
  patronymic?: string
  status?: string
}

type AuthState = {
  token: string | null
  refreshToken: string | null
  user: UserProfile | null
  setAuth: (token: string, refreshToken?: string | null, user?: UserProfile | null) => void
  setToken: (token: string) => void
  setUser: (user: UserProfile | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      setAuth: (token, refreshToken = null, user = null) => set({ token, refreshToken, user }),
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, refreshToken: null, user: null }),
    }),
    { name: 'auth-store' },
  ),
)




