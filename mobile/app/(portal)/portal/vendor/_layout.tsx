import { PORTAL_AREAS } from '@/features/portal/areas'
import { PortalAreaStack } from '@/features/portal/navigation'

/** `/portal/vendor` — the Vendor portal area: its tab bar plus the screens pushed over it. */
const SCREENS: [string, string][] = [
  ['order/[id]', 'procurement.orders.detailTitle'],
  ['work', 'portal.vendor.assignedWork'],
]

export default function VendorAreaLayout() {
  return <PortalAreaStack area={PORTAL_AREAS.Vendor} screens={SCREENS} />
}
