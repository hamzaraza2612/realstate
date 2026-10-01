import { useLocalSearchParams } from 'expo-router'
import { CoworkingBookingDetailScreen } from '@/features/facility/FacilityScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <CoworkingBookingDetailScreen id={id} />
}
