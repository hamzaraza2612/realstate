import { useLocalSearchParams } from 'expo-router'
import { MallShopDetailScreen } from '@/features/facility/FacilityScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <MallShopDetailScreen id={id} />
}
