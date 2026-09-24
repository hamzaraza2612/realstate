import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { usePortalAuthStore } from '@/stores/portalAuthStore'
import type { ApiEnvelope, PortalAuthResult } from '@/types/api'

// A separate axios instance from `src/lib/apiClient.ts`, with its own token source
// (`usePortalAuthStore`, not `useAuthStore`) and its own refresh/redirect target. This mirrors
// apiClient.ts's interceptor logic exactly, substituting the portal auth store/endpoints — see
// docs/PORTAL_ARCHITECTURE.md for why the two auth surfaces must never share a token source.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export const portalApiClient = axios.create({ baseURL: API_BASE_URL })

portalApiClient.interceptors.request.use((config) => {
  const token = usePortalAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

async function refreshPortalAccessToken(): Promise<string | null> {
  const refreshToken = usePortalAuthStore.getState().refreshToken
  if (!refreshToken) return null

  try {
    const response = await axios.post<ApiEnvelope<PortalAuthResult>>(`${API_BASE_URL}/portal/auth/refresh`, { refreshToken })
    usePortalAuthStore.getState().setSession(response.data.data)
    return response.data.data.accessToken
  } catch {
    usePortalAuthStore.getState().clear()
    return null
  }
}

portalApiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/')

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true

      refreshPromise ??= refreshPortalAccessToken().finally(() => {
        refreshPromise = null
      })

      const newToken = await refreshPromise
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return portalApiClient(originalRequest)
      }

      window.location.assign('/portal/login')
    }

    return Promise.reject(error)
  },
)

/** Portal-local copy of `apiClient.ts`'s helper, so no `/portal/*` page (other than the Agent
 * Portal, which intentionally uses the internal client) needs to import anything from apiClient.ts. */
export function extractErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { title?: string; error?: string } | undefined
    return data?.title ?? data?.error ?? fallback
  }
  return fallback
}
