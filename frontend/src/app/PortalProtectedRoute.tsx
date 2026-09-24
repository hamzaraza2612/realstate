import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { usePortalAuthStore } from '@/stores/portalAuthStore'
import type { PortalActorType } from '@/types/api'

/**
 * Analogous to `ProtectedRoute`, but checks `usePortalAuthStore` instead of `useAuthStore` and
 * optionally gates on the signed-in actor's `actorType`. The backend independently enforces this
 * same actor-type isolation server-side (see docs/PORTAL_ARCHITECTURE.md) — this is a UX guard,
 * not the security boundary.
 */
export function PortalProtectedRoute({ children, actorType }: { children: ReactNode; actorType?: PortalActorType }) {
  const accessToken = usePortalAuthStore((s) => s.accessToken)
  const profile = usePortalAuthStore((s) => s.profile)
  const location = useLocation()

  if (!accessToken || !profile) {
    return <Navigate to="/portal/login" state={{ from: location.pathname }} replace />
  }
  if (actorType && profile.actorType !== actorType) {
    return <Navigate to="/portal/login" replace />
  }
  return <>{children}</>
}
