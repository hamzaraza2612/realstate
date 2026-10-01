import { useLocalSearchParams } from 'expo-router'
import { MemberBookingDetailScreen } from '@/features/portal/member/MemberScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <MemberBookingDetailScreen id={id} />
}
