import { useLocalSearchParams } from 'expo-router'
import { ProjectDetailScreen } from '@/features/projects/ProjectsScreens'

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ProjectDetailScreen id={id} />
}
