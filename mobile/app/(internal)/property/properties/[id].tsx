import { useLocalSearchParams } from 'expo-router'
import { PropertyDetailScreen } from '@/features/property/PropertyScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <PropertyDetailScreen id={id} />
}
