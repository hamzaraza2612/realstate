import { Redirect } from 'expo-router'
import { usePortalArea } from '@/features/portal/navigation'

/** `/portal` — the portal's home for every mode switch (`HOME_FOR_MODE.portal`): sends the signed-in
 * portal user to their own actor area (`/portal/customer`, `/portal/tenant`, …). */
export default function PortalEntry() {
  const area = usePortalArea()
  if (!area) return null
  return <Redirect href={area.routeBase} />
}
