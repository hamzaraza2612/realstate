import { Bell, ClipboardList, FileText, LayoutDashboard, ShoppingCart } from 'lucide-react'
import { PortalLayout, type PortalNavItem } from '@/components/portal/PortalLayout'
import { useUnreadNotificationCount } from './api'

const navItems: PortalNavItem[] = [
  { to: '/portal/vendor', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/portal/vendor/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, end: false },
  { to: '/portal/vendor/assigned-work', label: 'Assigned Work', icon: ClipboardList },
  { to: '/portal/vendor/documents', label: 'Documents', icon: FileText },
  { to: '/portal/vendor/notifications', label: 'Notifications', icon: Bell },
]

export function VendorPortalLayout() {
  return (
    <PortalLayout
      navItems={navItems}
      portalTitle="Vendor Portal"
      notificationsPath="/portal/vendor/notifications"
      useUnreadCount={useUnreadNotificationCount}
    />
  )
}
