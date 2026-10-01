import { useLocalSearchParams } from 'expo-router'
import { TenantLeaseDetailScreen } from '@/features/portal/tenant/TenantScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <TenantLeaseDetailScreen id={id} />
}
