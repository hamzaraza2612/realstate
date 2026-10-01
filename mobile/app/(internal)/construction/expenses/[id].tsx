import { useLocalSearchParams } from 'expo-router'
import { ExpenseDetailScreen } from '@/features/construction/ConstructionScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ExpenseDetailScreen id={id} />
}
