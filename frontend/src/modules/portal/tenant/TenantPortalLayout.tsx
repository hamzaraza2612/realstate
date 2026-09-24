import { Bell, FileSignature, FileText, LayoutDashboard, Wrench } from 'lucide-react'
import { PortalLayout, type PortalNavItem } from '@/components/portal/PortalLayout'
import { useUnreadNotificationCount } from './api'

const navItems: PortalNavItem[] = [
  { to: '/portal/tenant', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/portal/tenant/leases', label: 'Leases', icon: FileSignature, end: false },
  { to: '/portal/tenant/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/portal/tenant/documents', label: 'Documents', icon: FileText },
  { to: '/portal/tenant/notifications', label: 'Notifications', icon: Bell },
]

export function TenantPortalLayout() {
  return (
    <PortalLayout
      navItems={navItems}
      portalTitle="Tenant Portal"
      notificationsPath="/portal/tenant/notifications"
      useUnreadCount={useUnreadNotificationCount}
    />
  )
}
