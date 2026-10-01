import { useLocalSearchParams } from 'expo-router'
import { PurchaseOrderDetailScreen } from '@/features/procurement/ProcurementScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <PurchaseOrderDetailScreen id={id} />
}
