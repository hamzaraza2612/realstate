import { useLocalSearchParams } from 'expo-router'
import { RentalTenantDetailScreen } from '@/features/property/PropertyScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <RentalTenantDetailScreen id={id} />
}
