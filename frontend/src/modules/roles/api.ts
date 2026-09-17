import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, PermissionDto, RoleDto } from '@/types/api'

const ROLES_KEY = ['roles']
const PERMISSIONS_KEY = ['permissions']

export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<RoleDto[]>>('/roles')
      return response.data.data
    },
  })
}

export function usePermissions() {
  return useQuery({
    queryKey: PERMISSIONS_KEY,
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PermissionDto[]>>('/permissions')
      return response.data.data
    },
    staleTime: Infinity,
  })
}

export interface RoleRequest {
  name?: string
  description: string | null
  permissionCodes: string[]
}

export function useCreateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: RoleRequest & { name: string }) => {
      const response = await apiClient.post<ApiEnvelope<RoleDto>>('/roles', payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: RoleRequest }) => {
      const response = await apiClient.put<ApiEnvelope<RoleDto>>(`/roles/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/roles/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  })
}
