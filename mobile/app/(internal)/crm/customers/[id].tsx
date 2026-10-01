import { useLocalSearchParams } from 'expo-router'
import { CustomerDetailScreen } from '@/features/crm/CustomersScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <CustomerDetailScreen id={id} />
}
