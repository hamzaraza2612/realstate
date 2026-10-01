import { PORTAL_AREAS } from '@/features/portal/areas'
import { PortalDocumentsScreen } from '@/features/portal/PortalDocumentsScreen'

export default function Route() {
  return <PortalDocumentsScreen area={PORTAL_AREAS.Vendor} />
}
