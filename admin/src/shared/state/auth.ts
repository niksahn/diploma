import { create } from "zustand";
import { persist } from "zustand/middleware";
import { API_BASE_URL } from "../api/client";

export type AdminInfo = {
  id: string;
  login: string;
  email?: string;
};

export type LoginRequest = {
  login: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  admin: AdminInfo;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  admin: AdminInfo | null;
  isAuthenticated: () => boolean;
  login: (payload: LoginRequest) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      admin: null,
      isAuthenticated: () => Boolean(get().accessToken),
      login: async (payload) => {
        const res = await fetch(`${API_BASE_URL}/auth/admin/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Login failed");
        const data = (await res.json()) as LoginResponse;
        const expiresAt = Date.now() + data.expires_in * 1000;
        set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          admin: data.admin
        });
      },
      refresh: async () => {
        const { refreshToken, logout } = get();
        if (!refreshToken) {
          await logout();
          return;
        }
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken })
        });
        if (!res.ok) {
          await logout();
          return;
        }
        const data = (await res.json()) as LoginResponse;
        const expiresAt = Date.now() + data.expires_in * 1000;
        set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          admin: data.admin
        });
      },
      logout: async () => {
        const { refreshToken } = get();
        if (refreshToken) {
          try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh_token: refreshToken })
            });
          } catch {
            // ignore network errors on logout
          }
        }
        set({
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          admin: null
        });
      }
    }),
    {
      name: "admin-auth"
    }
  )
);

