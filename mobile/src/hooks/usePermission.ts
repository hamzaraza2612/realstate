import { useAuth } from '@/auth/AuthProvider'

/** `usePermission('ai.view')` — the mobile analogue of the web `PermissionGate`/`hasPermission`.
 * A UX convenience for hiding what the user can't use, never a security boundary: the backend
 * re-authorizes every request. */
export function usePermission(code: string): boolean {
  return useAuth().hasPermission(code)
}
