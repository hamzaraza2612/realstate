import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, PageMeta, WorkPackageDto, WorkPackageStatus } from '@/types/api'

const WORK_PACKAGES_KEY = ['construction', 'work-packages']

export interface WorkPackageFilters {
  projectId?: string
  status?: WorkPackageStatus
  managerUserId?: string
  search?: string
}

export function useWorkPackages(page: number, filters: WorkPackageFilters) {
  return useQuery({
    queryKey: [...WORK_PACKAGES_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<WorkPackageDto[]>>('/construction/work-packages', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useAllWorkPackages(projectId?: string) {
  return useQuery({
    queryKey: [...WORK_PACKAGES_KEY, 'all', projectId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<WorkPackageDto[]>>('/construction/work-packages', {
        params: { page: 1, pageSize: 200, projectId },
      })
      return response.data.data
    },
  })
}

export function useWorkPackage(id: string | undefined) {
  return useQuery({
    queryKey: [...WORK_PACKAGES_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<WorkPackageDto>>(`/construction/work-packages/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface WorkPackageRequest {
  projectId: string
  name: string
  code: string
  description: string | null
  plannedStartDate: string | null
  plannedEndDate: string | null
  managerUserId: string | null
  budget: number
}

function invalidateWorkPackages(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: WORK_PACKAGES_KEY })
  queryClient.invalidateQueries({ queryKey: ['construction', 'dashboard'] })
}

export function useCreateWorkPackage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: WorkPackageRequest) => {
      const response = await apiClient.post<ApiEnvelope<WorkPackageDto>>('/construction/work-packages', payload)
      return response.data.data
    },
    onSuccess: () => invalidateWorkPackages(queryClient),
  })
}

export function useUpdateWorkPackage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: WorkPackageRequest }) => {
      const response = await apiClient.put<ApiEnvelope<WorkPackageDto>>(`/construction/work-packages/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateWorkPackages(queryClient),
  })
}

export function useWorkPackageStatusAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: WorkPackageStatus }) => {
      const response = await apiClient.post<ApiEnvelope<WorkPackageDto>>(`/construction/work-packages/${id}/status`, { status })
      return response.data.data
    },
    onSuccess: () => invalidateWorkPackages(queryClient),
  })
}

export function useDeleteWorkPackage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/construction/work-packages/${id}`)
    },
    onSuccess: () => invalidateWorkPackages(queryClient),
  })
}
