import { Bell, CalendarClock, FileText, LayoutDashboard } from 'lucide-react'
import { PortalLayout, type PortalNavItem } from '@/components/portal/PortalLayout'
import { useUnreadNotificationCount } from './api'

const navItems: PortalNavItem[] = [
  { to: '/portal/member', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/portal/member/bookings', label: 'Bookings', icon: CalendarClock, end: false },
  { to: '/portal/member/documents', label: 'Documents', icon: FileText },
  { to: '/portal/member/notifications', label: 'Notifications', icon: Bell },
]

export function MemberPortalLayout() {
  return (
    <PortalLayout
      navItems={navItems}
      portalTitle="Coworking Member Portal"
      notificationsPath="/portal/member/notifications"
      useUnreadCount={useUnreadNotificationCount}
    />
  )
}
