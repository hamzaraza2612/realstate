import { PORTAL_AREAS } from '@/features/portal/areas'
import { PortalAreaTabs } from '@/features/portal/navigation'

export default function CustomerTabs() {
  return <PortalAreaTabs area={PORTAL_AREAS.Customer} primary={{ name: 'bookings', titleKey: 'portal.customer.bookings', icon: 'receipt-outline' }} />
}
