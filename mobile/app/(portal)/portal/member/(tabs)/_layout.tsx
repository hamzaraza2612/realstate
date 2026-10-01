import { PORTAL_AREAS } from '@/features/portal/areas'
import { PortalAreaTabs } from '@/features/portal/navigation'

export default function CoworkingMemberTabs() {
  return <PortalAreaTabs area={PORTAL_AREAS.CoworkingMember} primary={{ name: 'bookings', titleKey: 'portal.member.bookings', icon: 'calendar-outline' }} />
}
