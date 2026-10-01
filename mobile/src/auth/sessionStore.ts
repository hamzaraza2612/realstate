import { clearSession, loadSession, saveSession, type SessionKind, type StoredSession } from '@/storage/secureTokens'

/**
 * A tiny framework-free session store — the mobile analogue of the web app's zustand
 * `useAuthStore`/`usePortalAuthStore`. It lives outside React so the axios interceptors
 * (`src/api/*`) can read the current access token and write a refreshed session synchronously,
 * exactly like the web interceptors call `useAuthStore.getState()`. React reads it through
 * `useSyncExternalStore` in the providers.
 *
 * Every mutation is written through to SecureStore before listeners are notified, so what the UI
 * shows is always what a cold start would restore.
 */

export type SessionStatus = 'restoring' | 'authenticated' | 'unauthenticated'

export interface SessionState<TProfile> {
  status: SessionStatus
  session: StoredSession<TProfile> | null
}

export interface SessionStore<TProfile> {
  kind: SessionKind
  getState: () => SessionState<TProfile>
  subscribe: (listener: () => void) => () => void
  /** Reads SecureStore once at launch. Safe to call repeatedly; only the first call does work. */
  restore: () => Promise<void>
  setSession: (session: StoredSession<TProfile>) => Promise<void>
  clear: () => Promise<void>
}

export function createSessionStore<TProfile>(kind: SessionKind): SessionStore<TProfile> {
  let state: SessionState<TProfile> = { status: 'restoring', session: null }
  let restorePromise: Promise<void> | null = null
  const listeners = new Set<() => void>()

  function set(next: SessionState<TProfile>) {
    state = next
    listeners.forEach((listener) => listener())
  }

  return {
    kind,
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    restore: () => {
      restorePromise ??= (async () => {
        const session = await loadSession<TProfile>(kind)
        // A login that completed while we were reading the keychain wins over the stale read.
        if (state.status !== 'restoring') return
        set(session ? { status: 'authenticated', session } : { status: 'unauthenticated', session: null })
      })()
      return restorePromise
    },
    setSession: async (session) => {
      await saveSession(kind, session)
      set({ status: 'authenticated', session })
    },
    clear: async () => {
      await clearSession(kind)
      set({ status: 'unauthenticated', session: null })
    },
  }
}
