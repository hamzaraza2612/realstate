import { Bell, FileText, LayoutDashboard, Receipt, Wallet } from 'lucide-react'
import { PortalLayout, type PortalNavItem } from '@/components/portal/PortalLayout'
import { useUnreadNotificationCount } from './api'

const navItems: PortalNavItem[] = [
  { to: '/portal/customer', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/portal/customer/bookings', label: 'Bookings', icon: Receipt, end: false },
  { to: '/portal/customer/payments', label: 'Payments', icon: Wallet },
  { to: '/portal/customer/documents', label: 'Documents', icon: FileText },
  { to: '/portal/customer/notifications', label: 'Notifications', icon: Bell },
]

export function CustomerPortalLayout() {
  return (
    <PortalLayout
      navItems={navItems}
      portalTitle="Customer Portal"
      notificationsPath="/portal/customer/notifications"
      useUnreadCount={useUnreadNotificationCount}
    />
  )
}
