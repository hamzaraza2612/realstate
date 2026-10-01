import { useLocalSearchParams } from 'expo-router'
import { LeaseDetailScreen } from '@/features/property/LeaseMaintenanceScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <LeaseDetailScreen id={id} />
}
