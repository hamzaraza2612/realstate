import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, ConstructionTaskDto, ConstructionTaskStatus, PageMeta } from '@/types/api'

const TASKS_KEY = ['construction', 'tasks']

export interface TaskFilters {
  workPackageId?: string
  status?: ConstructionTaskStatus
  assignedToUserId?: string
  search?: string
}

export function useTasks(page: number, filters: TaskFilters, pageSize = 20) {
  return useQuery({
    queryKey: [...TASKS_KEY, page, filters, pageSize],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ConstructionTaskDto[]>>('/construction/tasks', {
        params: { page, pageSize, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: [...TASKS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ConstructionTaskDto>>(`/construction/tasks/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface CreateTaskRequest {
  workPackageId: string
  title: string
  description: string | null
  assignedToUserId: string | null
  priority: ConstructionTaskDto['priority']
  plannedStartDate: string | null
  plannedEndDate: string | null
  dependsOnTaskId: string | null
}

export interface UpdateTaskRequest {
  title: string
  description: string | null
  assignedToUserId: string | null
  priority: ConstructionTaskDto['priority']
  plannedStartDate: string | null
  plannedEndDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  progressPercent: number
}

function invalidateTasks(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: TASKS_KEY })
  queryClient.invalidateQueries({ queryKey: ['construction', 'work-packages'] })
  queryClient.invalidateQueries({ queryKey: ['construction', 'dashboard'] })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateTaskRequest) => {
      const response = await apiClient.post<ApiEnvelope<ConstructionTaskDto>>('/construction/tasks', payload)
      return response.data.data
    },
    onSuccess: () => invalidateTasks(queryClient),
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateTaskRequest }) => {
      const response = await apiClient.put<ApiEnvelope<ConstructionTaskDto>>(`/construction/tasks/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateTasks(queryClient),
  })
}

export function useTaskStatusAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ConstructionTaskStatus }) => {
      const response = await apiClient.post<ApiEnvelope<ConstructionTaskDto>>(`/construction/tasks/${id}/status`, { status })
      return response.data.data
    },
    onSuccess: () => invalidateTasks(queryClient),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/construction/tasks/${id}`)
    },
    onSuccess: () => invalidateTasks(queryClient),
  })
}
