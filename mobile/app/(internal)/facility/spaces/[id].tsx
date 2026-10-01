import { useLocalSearchParams } from 'expo-router'
import { SpaceDetailScreen } from '@/features/facility/FacilityScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <SpaceDetailScreen id={id} />
}
