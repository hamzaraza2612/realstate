import { PORTAL_AREAS } from '@/features/portal/areas'
import { PortalAreaTabs } from '@/features/portal/navigation'

export default function PropertyOwnerTabs() {
  return <PortalAreaTabs area={PORTAL_AREAS.PropertyOwner} primary={{ name: 'properties', titleKey: 'portal.owner.properties', icon: 'business-outline' }} />
}
