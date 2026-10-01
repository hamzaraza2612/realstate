import { useLocalSearchParams } from 'expo-router'
import { MaintenanceDetailScreen } from '@/features/property/LeaseMaintenanceScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <MaintenanceDetailScreen id={id} />
}
