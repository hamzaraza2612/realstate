import { useLocalSearchParams } from 'expo-router'
import { TenantNewMaintenanceScreen } from '@/features/portal/tenant/TenantScreens'

export default function Route() {
  const { leaseId } = useLocalSearchParams<{ leaseId?: string }>()
  return <TenantNewMaintenanceScreen initialLeaseId={leaseId} />
}
