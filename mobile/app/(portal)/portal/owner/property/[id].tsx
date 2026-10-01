import { useLocalSearchParams } from 'expo-router'
import { OwnerPropertyDetailScreen } from '@/features/portal/owner/OwnerScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <OwnerPropertyDetailScreen id={id} />
}
