import { useLocalSearchParams } from 'expo-router'
import { ApprovalDetailScreen } from '@/features/approvals/ApprovalDetailScreen'

export default function ApprovalDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ApprovalDetailScreen id={id} />
}
