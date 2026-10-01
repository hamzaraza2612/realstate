import { useLocalSearchParams } from 'expo-router'
import { LeadDetailScreen } from '@/features/crm/LeadDetailScreen'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <LeadDetailScreen id={id} />
}
