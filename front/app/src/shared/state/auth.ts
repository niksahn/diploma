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
  user: UserProfile | null
  setAuth: (token: string, user?: UserProfile | null) => void
  setUser: (user: UserProfile | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user = null) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'auth-store' },
  ),
)


