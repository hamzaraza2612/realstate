import { Bell, Building, FileBarChart, FileText, LayoutDashboard, Wrench } from 'lucide-react'
import { PortalLayout, type PortalNavItem } from '@/components/portal/PortalLayout'
import { useUnreadNotificationCount } from './api'

const navItems: PortalNavItem[] = [
  { to: '/portal/owner', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/portal/owner/properties', label: 'Properties', icon: Building, end: false },
  { to: '/portal/owner/reports', label: 'Reports', icon: FileBarChart },
  { to: '/portal/owner/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/portal/owner/documents', label: 'Documents', icon: FileText },
  { to: '/portal/owner/notifications', label: 'Notifications', icon: Bell },
]

export function OwnerPortalLayout() {
  return (
    <PortalLayout
      navItems={navItems}
      portalTitle="Owner Portal"
      notificationsPath="/portal/owner/notifications"
      useUnreadCount={useUnreadNotificationCount}
    />
  )
}
