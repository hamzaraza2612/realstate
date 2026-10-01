import { PORTAL_AREAS } from '@/features/portal/areas'
import { PortalNotificationsScreen } from '@/features/portal/PortalNotificationsScreen'

export default function Route() {
  return <PortalNotificationsScreen area={PORTAL_AREAS.CoworkingMember} />
}
