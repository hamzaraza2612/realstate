import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, PageMeta, UserDto } from '@/types/api'

export interface CreateUserRequest {
  email: string
  fullName: string
  password: string
  phoneNumber: string | null
  roleNames: string[]
}

export interface UpdateUserRequest {
  fullName: string
  phoneNumber: string | null
  isActive: boolean
}

const USERS_KEY = ['users']

export function useUsers(page: number, search: string) {
  return useQuery({
    queryKey: [...USERS_KEY, page, search],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<UserDto[]>>('/users', {
        params: { page, pageSize: 20, search: search || undefined },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateUserRequest) => {
      const response = await apiClient.post<ApiEnvelope<UserDto>>('/users', payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateUserRequest }) => {
      const response = await apiClient.put<ApiEnvelope<UserDto>>(`/users/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  })
}

export function useDeactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/users/${id}/deactivate`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  })
}

export function useAssignRoles() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, roleNames }: { id: string; roleNames: string[] }) => {
      const response = await apiClient.post<ApiEnvelope<UserDto>>(`/users/${id}/roles`, { roleNames })
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  })
}
