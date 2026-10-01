import { useLocalSearchParams } from 'expo-router'
import { BookingDetailScreen } from '@/features/sales/BookingsScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <BookingDetailScreen id={id} />
}
