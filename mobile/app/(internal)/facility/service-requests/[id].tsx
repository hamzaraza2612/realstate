import { useLocalSearchParams } from 'expo-router'
import { ServiceRequestDetailScreen } from '@/features/facility/FacilityScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ServiceRequestDetailScreen id={id} />
}
