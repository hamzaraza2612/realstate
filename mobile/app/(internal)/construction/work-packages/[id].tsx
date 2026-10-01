import { useLocalSearchParams } from 'expo-router'
import { WorkPackageDetailScreen } from '@/features/construction/ConstructionScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <WorkPackageDetailScreen id={id} />
}
