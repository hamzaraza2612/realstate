import { useLocalSearchParams } from 'expo-router'
import { FacilityDetailScreen } from '@/features/facility/FacilityScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <FacilityDetailScreen id={id} />
}
