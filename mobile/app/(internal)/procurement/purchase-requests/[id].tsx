import { useLocalSearchParams } from 'expo-router'
import { PurchaseRequestDetailScreen } from '@/features/procurement/ProcurementScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <PurchaseRequestDetailScreen id={id} />
}
