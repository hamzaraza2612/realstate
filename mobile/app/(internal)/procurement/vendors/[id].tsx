import { useLocalSearchParams } from 'expo-router'
import { VendorDetailScreen } from '@/features/procurement/ProcurementScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <VendorDetailScreen id={id} />
}
