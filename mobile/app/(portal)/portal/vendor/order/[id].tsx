import { useLocalSearchParams } from 'expo-router'
import { VendorOrderDetailScreen } from '@/features/portal/vendor/VendorScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <VendorOrderDetailScreen id={id} />
}
