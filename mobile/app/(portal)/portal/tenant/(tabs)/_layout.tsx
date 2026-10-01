import { PORTAL_AREAS } from '@/features/portal/areas'
import { PortalAreaTabs } from '@/features/portal/navigation'

export default function RentalTenantTabs() {
  return <PortalAreaTabs area={PORTAL_AREAS.RentalTenant} primary={{ name: 'leases', titleKey: 'portal.tenant.leases', icon: 'document-text-outline' }} />
}
