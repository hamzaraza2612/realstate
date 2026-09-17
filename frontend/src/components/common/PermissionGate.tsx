import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'

export function PermissionGate({ permission, children }: { permission: string; children: ReactNode }) {
  const hasPermission = useAuthStore((s) => s.hasPermission(permission))
  if (!hasPermission) return null
  return <>{children}</>
}
