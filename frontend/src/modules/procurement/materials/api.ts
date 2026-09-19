import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, MaterialDto, PageMeta, StockMovementDto, StockMovementType } from '@/types/api'

const MATERIALS_KEY = ['materials']

export interface MaterialFilters {
  isActive?: boolean
  belowMinimumOnly?: boolean
  search?: string
}

export function useMaterials(page: number, filters: MaterialFilters) {
  return useQuery({
    queryKey: [...MATERIALS_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MaterialDto[]>>('/materials', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useAllMaterials() {
  return useQuery({
    queryKey: [...MATERIALS_KEY, 'all'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MaterialDto[]>>('/materials', {
        params: { page: 1, pageSize: 200, isActive: true },
      })
      return response.data.data
    },
  })
}

export function useMaterial(id: string | undefined) {
  return useQuery({
    queryKey: [...MATERIALS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MaterialDto>>(`/materials/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export function useMaterialMovements(id: string | undefined) {
  return useQuery({
    queryKey: [...MATERIALS_KEY, id, 'movements'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<StockMovementDto[]>>(`/materials/${id}/movements`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface CreateMaterialRequest {
  sku: string
  name: string
  unitOfMeasure: string
  category: string | null
  minimumQuantity: number
}

export interface UpdateMaterialRequest {
  name: string
  category: string | null
  minimumQuantity: number
  isActive: boolean
}

export interface StockMovementRequest {
  type: StockMovementType
  quantity: number
  notes: string | null
}

function invalidateMaterials(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: MATERIALS_KEY })
}

export function useCreateMaterial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateMaterialRequest) => {
      const response = await apiClient.post<ApiEnvelope<MaterialDto>>('/materials', payload)
      return response.data.data
    },
    onSuccess: () => invalidateMaterials(queryClient),
  })
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateMaterialRequest }) => {
      const response = await apiClient.put<ApiEnvelope<MaterialDto>>(`/materials/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateMaterials(queryClient),
  })
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/materials/${id}`)
    },
    onSuccess: () => invalidateMaterials(queryClient),
  })
}

export function useRecordStockMovement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: StockMovementRequest }) => {
      const response = await apiClient.post<ApiEnvelope<StockMovementDto>>(`/materials/${id}/movements`, payload)
      return response.data.data
    },
    onSuccess: (_data, variables) => {
      invalidateMaterials(queryClient)
      queryClient.invalidateQueries({ queryKey: [...MATERIALS_KEY, variables.id, 'movements'] })
    },
  })
}
