import { PORTAL_AREAS } from '@/features/portal/areas'
import { PortalAreaStack } from '@/features/portal/navigation'

/** `/portal/member` — the CoworkingMember portal area: its tab bar plus the screens pushed over it. */
const SCREENS: [string, string][] = [
  ['booking/[id]', 'facility.coworkingBookings.detailTitle'],
  ['memberships', 'portal.member.memberships'],
]

export default function CoworkingMemberAreaLayout() {
  return <PortalAreaStack area={PORTAL_AREAS.CoworkingMember} screens={SCREENS} />
}
