import { PORTAL_AREAS } from '@/features/portal/areas'
import { PortalAreaStack } from '@/features/portal/navigation'

/** `/portal/tenant` — the RentalTenant portal area: its tab bar plus the screens pushed over it. */
const SCREENS: [string, string][] = [
  ['lease/[id]', 'property.leases.detailTitle'],
  ['maintenance/index', 'portal.tenant.maintenance'],
  ['payments', 'portal.payments.title'],
  ['maintenance/new', 'portal.tenant.form.title'],
]

export default function RentalTenantAreaLayout() {
  return <PortalAreaStack area={PORTAL_AREAS.RentalTenant} screens={SCREENS} />
}
