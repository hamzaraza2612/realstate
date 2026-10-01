import { useLocalSearchParams } from 'expo-router'
import { UnitDetailScreen } from '@/features/property/PropertyScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <UnitDetailScreen id={id} />
}
