import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, InventoryAreaUnit, InventoryStatus, InventoryUnitDto, InventoryUnitType, PageMeta } from '@/types/api'

const INVENTORY_KEY = ['inventory']

export interface InventoryFilters {
  projectId?: string
  nodeId?: string
  type?: InventoryUnitType
  status?: InventoryStatus
  minArea?: number
  maxArea?: number
  search?: string
}

export function useInventory(page: number, filters: InventoryFilters, pageSize = 20) {
  return useQuery({
    queryKey: [...INVENTORY_KEY, page, filters, pageSize],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<InventoryUnitDto[]>>('/inventory', {
        params: { page, pageSize, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useInventoryUnit(id: string | undefined) {
  return useQuery({
    queryKey: [...INVENTORY_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<InventoryUnitDto>>(`/inventory/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface CreateInventoryUnitRequest {
  projectId: string
  nodeId: string | null
  code: string
  type: InventoryUnitType
  areaSize: number | null
  areaUnit: InventoryAreaUnit | null
  latitude: number | null
  longitude: number | null
  geoJson: string | null
  metadataJson: string | null
}

export interface UpdateInventoryUnitRequest {
  nodeId: string | null
  code: string
  type: InventoryUnitType
  areaSize: number | null
  areaUnit: InventoryAreaUnit | null
  latitude: number | null
  longitude: number | null
  geoJson: string | null
  metadataJson: string | null
}

function invalidateInventory(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: INVENTORY_KEY })
}

export function useCreateInventoryUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateInventoryUnitRequest) => {
      const response = await apiClient.post<ApiEnvelope<InventoryUnitDto>>('/inventory', payload)
      return response.data.data
    },
    onSuccess: () => invalidateInventory(queryClient),
  })
}

export function useUpdateInventoryUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateInventoryUnitRequest }) => {
      const response = await apiClient.put<ApiEnvelope<InventoryUnitDto>>(`/inventory/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateInventory(queryClient),
  })
}

export function useDeleteInventoryUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/inventory/${id}`)
    },
    onSuccess: () => invalidateInventory(queryClient),
  })
}

export function useChangeInventoryStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InventoryStatus }) => {
      const response = await apiClient.post<ApiEnvelope<InventoryUnitDto>>(`/inventory/${id}/status`, { status })
      return response.data.data
    },
    onSuccess: () => invalidateInventory(queryClient),
  })
}
