import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, ProjectNodeDto, ProjectNodeType } from '@/types/api'

const NODES_KEY = ['projects', 'nodes']

export function useProjectNodes(projectId: string | undefined) {
  return useQuery({
    queryKey: [...NODES_KEY, projectId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ProjectNodeDto[]>>('/projects/nodes', { params: { projectId } })
      return response.data.data
    },
    enabled: !!projectId,
  })
}

export interface ProjectNodeRequest {
  projectId: string
  parentNodeId: string | null
  nodeType: ProjectNodeType
  name: string
  code: string
  sortOrder: number
  latitude: number | null
  longitude: number | null
  geoJson: string | null
  metadataJson: string | null
}

export interface UpdateProjectNodeRequest {
  name: string
  code: string
  sortOrder: number
  latitude: number | null
  longitude: number | null
  geoJson: string | null
  metadataJson: string | null
}

function invalidateNodes(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: NODES_KEY })
}

export function useCreateProjectNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ProjectNodeRequest) => {
      const response = await apiClient.post<ApiEnvelope<ProjectNodeDto>>('/projects/nodes', payload)
      return response.data.data
    },
    onSuccess: () => invalidateNodes(queryClient),
  })
}

export function useUpdateProjectNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateProjectNodeRequest }) => {
      const response = await apiClient.put<ApiEnvelope<ProjectNodeDto>>(`/projects/nodes/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateNodes(queryClient),
  })
}

export function useDeleteProjectNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/projects/nodes/${id}`)
    },
    onSuccess: () => invalidateNodes(queryClient),
  })
}
