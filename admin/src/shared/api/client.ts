import { useAuthStore } from "../state/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

type ApiOptions = RequestInit & { skipAuth?: boolean };

async function handleResponse<T>(response: Response, logout: () => void): Promise<T> {
  if (response.status === 401) {
    logout();
    throw new Error("Unauthorized");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type");
  if (!response.ok) {
    const message = contentType?.includes("application/json")
      ? (await response.json())?.message ?? "Request failed"
      : await response.text();
    throw new Error(message);
  }

  if (contentType?.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  return (await response.text()) as unknown as T;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { accessToken, logout } = useAuthStore.getState();
  const headers = new Headers(options.headers || {});
  const init: RequestInit = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(options.body);
  }

  if (!options.skipAuth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, init);
  return handleResponse<T>(response, logout);
}

export { API_BASE_URL };

