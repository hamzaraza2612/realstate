import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, PageMeta, PropertyUnitDto, PropertyUnitStatus, PropertyUnitType } from '@/types/api'

const UNITS_KEY = ['property', 'units']

export interface UnitFilters {
  propertyId?: string
  type?: PropertyUnitType
  status?: PropertyUnitStatus
  search?: string
}

export function useUnits(page: number, filters: UnitFilters) {
  return useQuery({
    queryKey: [...UNITS_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PropertyUnitDto[]>>('/property/units', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useUnitsByProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: [...UNITS_KEY, 'by-property', propertyId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PropertyUnitDto[]>>('/property/units', {
        params: { propertyId, page: 1, pageSize: 200 },
      })
      return response.data.data
    },
    enabled: !!propertyId,
  })
}

export function useUnit(id: string | undefined) {
  return useQuery({
    queryKey: [...UNITS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PropertyUnitDto>>(`/property/units/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface UnitRequest {
  propertyId: string
  buildingBlock: string | null
  unitNumber: string
  type: PropertyUnitType
  floor: string | null
  areaSize: number | null
  areaUnit: string | null
  bedrooms: number | null
  marketRentRate: number | null
  metadataJson: string | null
}

export interface UpdateUnitRequest {
  buildingBlock: string | null
  unitNumber: string
  type: PropertyUnitType
  floor: string | null
  areaSize: number | null
  areaUnit: string | null
  bedrooms: number | null
  marketRentRate: number | null
  metadataJson: string | null
}

function invalidateUnits(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: UNITS_KEY })
  queryClient.invalidateQueries({ queryKey: ['property', 'properties'] })
  queryClient.invalidateQueries({ queryKey: ['property', 'dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['property', 'rental-dashboard'] })
}

export function useCreateUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UnitRequest) => {
      const response = await apiClient.post<ApiEnvelope<PropertyUnitDto>>('/property/units', payload)
      return response.data.data
    },
    onSuccess: () => invalidateUnits(queryClient),
  })
}

export function useUpdateUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateUnitRequest }) => {
      const response = await apiClient.put<ApiEnvelope<PropertyUnitDto>>(`/property/units/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateUnits(queryClient),
  })
}

export function useUpdateUnitStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PropertyUnitStatus }) => {
      const response = await apiClient.post<ApiEnvelope<PropertyUnitDto>>(`/property/units/${id}/status`, { status })
      return response.data.data
    },
    onSuccess: () => invalidateUnits(queryClient),
  })
}

export function useDeleteUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/property/units/${id}`)
    },
    onSuccess: () => invalidateUnits(queryClient),
  })
}
