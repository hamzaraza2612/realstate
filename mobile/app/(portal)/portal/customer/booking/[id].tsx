import { useLocalSearchParams } from 'expo-router'
import { CustomerBookingDetailScreen } from '@/features/portal/customer/CustomerScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <CustomerBookingDetailScreen id={id} />
}
