import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function PermissionRoute({ permission, children }: { permission: string; children: ReactNode }) {
  const hasPermission = useAuthStore((s) => s.hasPermission(permission))
  if (!hasPermission) return <Navigate to="/" replace />
  return <>{children}</>
}

export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const isSuperAdmin = useAuthStore((s) => s.user?.isSuperAdmin === true)
  if (!isSuperAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}
