import { PORTAL_AREAS } from '@/features/portal/areas'
import { PortalAreaTabs } from '@/features/portal/navigation'

export default function VendorTabs() {
  return <PortalAreaTabs area={PORTAL_AREAS.Vendor} primary={{ name: 'orders', titleKey: 'portal.vendor.orders', icon: 'cart-outline' }} />
}
