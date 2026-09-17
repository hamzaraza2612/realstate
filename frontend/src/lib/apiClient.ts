import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import type { ApiEnvelope, AuthResult } from '@/types/api'

// Same-origin relative path by default (works behind the reverse-proxy Nginx, which routes
// /api/* to the api service) — override via VITE_API_BASE_URL at build time if the frontend
// and API are ever served from different origins. Never hard-code a host here.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export const apiClient = axios.create({ baseURL: API_BASE_URL })

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken
  if (!refreshToken) return null

  try {
    const response = await axios.post<ApiEnvelope<AuthResult>>(`${API_BASE_URL}/auth/refresh`, { refreshToken })
    useAuthStore.getState().setSession(response.data.data)
    return response.data.data.accessToken
  } catch {
    useAuthStore.getState().clear()
    return null
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/')

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true

      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })

      const newToken = await refreshPromise
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      }

      window.location.assign('/login')
    }

    return Promise.reject(error)
  },
)

export function extractErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { title?: string; error?: string } | undefined
    return data?.title ?? data?.error ?? fallback
  }
  return fallback
}
