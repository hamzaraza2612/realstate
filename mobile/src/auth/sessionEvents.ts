import type { SessionKind } from '@/storage/secureTokens'

/**
 * "Your session is gone, go to login" signal from the axios interceptors to the navigation layer.
 *
 * The web interceptors call `window.location.assign('/login')`; on mobile an interceptor can't call
 * Expo Router's `router` without importing the navigation tree into the API layer (a circular
 * dependency). Instead the interceptor emits here, and the root layout — which owns navigation —
 * subscribes and does `router.replace(...)`.
 */

type Listener = (kind: SessionKind) => void

const listeners = new Set<Listener>()

export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function emitSessionExpired(kind: SessionKind) {
  listeners.forEach((listener) => listener(kind))
}
