import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, PageMeta, ProjectDto, ProjectStatus, ProjectType } from '@/types/api'

const PROJECTS_KEY = ['projects']

export interface ProjectFilters {
  type?: ProjectType
  status?: ProjectStatus
  search?: string
}

export function useProjects(page: number, filters: ProjectFilters) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ProjectDto[]>>('/projects', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useAllProjects() {
  return useQuery({
    queryKey: [...PROJECTS_KEY, 'all'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ProjectDto[]>>('/projects', { params: { page: 1, pageSize: 100 } })
      return response.data.data
    },
  })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ProjectDto>>(`/projects/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface CreateProjectRequest {
  name: string
  code: string
  type: ProjectType
  description: string | null
  addressLine: string | null
  city: string | null
  state: string | null
  country: string | null
  postalCode: string | null
  startDate: string | null
  endDate: string | null
  latitude: number | null
  longitude: number | null
  geoJson: string | null
}

export interface UpdateProjectRequest {
  name: string
  status: ProjectStatus
  description: string | null
  addressLine: string | null
  city: string | null
  state: string | null
  country: string | null
  postalCode: string | null
  startDate: string | null
  endDate: string | null
  latitude: number | null
  longitude: number | null
  geoJson: string | null
}

function invalidateProjects(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: PROJECTS_KEY })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateProjectRequest) => {
      const response = await apiClient.post<ApiEnvelope<ProjectDto>>('/projects', payload)
      return response.data.data
    },
    onSuccess: () => invalidateProjects(queryClient),
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateProjectRequest }) => {
      const response = await apiClient.put<ApiEnvelope<ProjectDto>>(`/projects/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateProjects(queryClient),
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/projects/${id}`)
    },
    onSuccess: () => invalidateProjects(queryClient),
  })
}
