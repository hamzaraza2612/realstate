import { PORTAL_AREAS } from '@/features/portal/areas'
import { PortalAreaStack } from '@/features/portal/navigation'

/** `/portal/customer` — the Customer portal area: its tab bar plus the screens pushed over it. */
const SCREENS: [string, string][] = [
  ['booking/[id]', 'sales.bookings.detailTitle'],
  ['payments', 'portal.payments.title'],
]

export default function CustomerAreaLayout() {
  return <PortalAreaStack area={PORTAL_AREAS.Customer} screens={SCREENS} />
}
