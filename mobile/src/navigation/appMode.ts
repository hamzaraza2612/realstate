import { useAuth } from '@/auth/AuthProvider'
import { usePortalAuth } from '@/auth/PortalAuthProvider'

/**
 * Which of the three top-level route groups the app shows:
 *   'restoring' — SecureStore still being read (splash stays up; no login-screen flash),
 *   'auth'      — no session → `(auth)` group (chooser + the two login forms),
 *   'internal'  — staff session → `(internal)` group,
 *   'portal'    — portal session → `(portal)` group.
 * If a device somehow holds both sessions, the staff session wins; each lives under its own
 * SecureStore keys and neither is touched by the other.
 */
export type AppMode = 'restoring' | 'auth' | 'internal' | 'portal'

export function useAppMode(): AppMode {
  const internal = useAuth().status
  const portal = usePortalAuth().status
  if (internal === 'restoring' || portal === 'restoring') return 'restoring'
  if (internal === 'authenticated') return 'internal'
  if (portal === 'authenticated') return 'portal'
  return 'auth'
}

export const HOME_FOR_MODE = {
  auth: '/welcome',
  internal: '/home',
  portal: '/portal',
} as const
