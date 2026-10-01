import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URL } from '@/config'
import { emitSessionExpired } from '@/auth/sessionEvents'
import type { SessionStore } from '@/auth/sessionStore'
import type { StoredSession } from '@/storage/secureTokens'

/**
 * Builds an axios instance with the exact interceptor behavior of the web app's
 * `frontend/src/lib/apiClient.ts` / `portalApiClient.ts`:
 *
 *  - request: attach `Authorization: Bearer <accessToken>` from THIS client's session store;
 *  - response: on a 401 that is not already a retry and not an `/auth/` endpoint, run ONE refresh
 *    (a module-level in-flight promise shared by every concurrent 401 — no thundering herd), then
 *    retry the original request once with the new token; if the refresh fails, clear the session
 *    and signal the navigation layer to show the login screen (see `sessionEvents.ts`).
 *
 * `apiClient.ts` and `portalApiClient.ts` each call this once with their own store and refresh
 * endpoint, so the two token families never share an instance, a store or a refresh promise.
 */
export function createApiClient<TResult, TProfile>(options: {
  store: SessionStore<TProfile>
  /** Path (relative to the API base) of this token family's refresh endpoint. */
  refreshPath: string
  /** Maps the refresh endpoint's `data` payload to what we persist. */
  toSession: (result: TResult) => StoredSession<TProfile>
}): AxiosInstance {
  const { store, refreshPath, toSession } = options
  const client = axios.create({ baseURL: API_BASE_URL, timeout: 30_000 })

  client.interceptors.request.use((config) => {
    const token = store.getState().session?.accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  let refreshPromise: Promise<string | null> | null = null

  async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = store.getState().session?.refreshToken
    if (!refreshToken) return null

    try {
      // Plain `axios`, not `client` — the refresh call must never recurse through this interceptor.
      const response = await axios.post<{ data: TResult }>(`${API_BASE_URL}${refreshPath}`, { refreshToken }, { timeout: 30_000 })
      const session = toSession(response.data.data)
      await store.setSession(session)
      return session.accessToken
    } catch (error) {
      // A network failure (no response at all) is NOT a rejected refresh token — keep the session
      // so the app keeps working from cache offline, and let the original request fail normally.
      if (axios.isAxiosError(error) && !error.response) {
        throw error
      }
      await store.clear()
      return null
    }
  }

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
      const isAuthEndpoint = originalRequest?.url?.includes('/auth/')

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
        originalRequest._retry = true

        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null
        })

        let newToken: string | null
        try {
          newToken = await refreshPromise
        } catch {
          return Promise.reject(error)
        }

        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return client(originalRequest)
        }

        emitSessionExpired(store.kind)
      }

      return Promise.reject(error)
    },
  )

  return client
}

/** Same helper as the web `extractErrorMessage` — the backend's ProblemDetails-style `{ title }`
 * or `{ error }`, else the caller's fallback. */
export function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { title?: string; error?: string } | undefined
    return data?.title ?? data?.error ?? fallback
  }
  return fallback
}

/** The backend's machine-readable failure code (`{ code }`), e.g. `feature_not_entitled`. */
export function extractErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { code?: string } | undefined)?.code
  }
  return undefined
}

export function extractStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}

export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response
}
