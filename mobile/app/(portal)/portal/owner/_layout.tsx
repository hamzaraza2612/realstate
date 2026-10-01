import { PORTAL_AREAS } from '@/features/portal/areas'
import { PortalAreaStack } from '@/features/portal/navigation'

/** `/portal/owner` — the PropertyOwner portal area: its tab bar plus the screens pushed over it. */
const SCREENS: [string, string][] = [
  ['property/[id]', 'property.properties.detailTitle'],
  ['reports', 'portal.owner.reports'],
  ['maintenance', 'portal.owner.maintenance'],
]

export default function PropertyOwnerAreaLayout() {
  return <PortalAreaStack area={PORTAL_AREAS.PropertyOwner} screens={SCREENS} />
}
