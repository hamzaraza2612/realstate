import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, PageMeta, PropertyDto, PropertyStatus, PropertyType } from '@/types/api'

const PROPERTIES_KEY = ['property', 'properties']

export interface PropertyFilters {
  type?: PropertyType
  status?: PropertyStatus
  search?: string
}

export function useProperties(page: number, filters: PropertyFilters) {
  return useQuery({
    queryKey: [...PROPERTIES_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PropertyDto[]>>('/property/properties', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useAllProperties() {
  return useQuery({
    queryKey: [...PROPERTIES_KEY, 'all'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PropertyDto[]>>('/property/properties', {
        params: { page: 1, pageSize: 200 },
      })
      return response.data.data
    },
  })
}

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: [...PROPERTIES_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PropertyDto>>(`/property/properties/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface PropertyRequest {
  code: string
  name: string
  type: PropertyType
  description: string | null
  addressLine: string | null
  city: string | null
  state: string | null
  country: string | null
  postalCode: string | null
  ownerName: string | null
  ownerContact: string | null
}

export interface UpdatePropertyRequest {
  name: string
  status: PropertyStatus
  description: string | null
  addressLine: string | null
  city: string | null
  state: string | null
  country: string | null
  postalCode: string | null
  ownerName: string | null
  ownerContact: string | null
}

function invalidateProperties(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: PROPERTIES_KEY })
  queryClient.invalidateQueries({ queryKey: ['property', 'dashboard'] })
}

export function useCreateProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: PropertyRequest) => {
      const response = await apiClient.post<ApiEnvelope<PropertyDto>>('/property/properties', payload)
      return response.data.data
    },
    onSuccess: () => invalidateProperties(queryClient),
  })
}

export function useUpdateProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdatePropertyRequest }) => {
      const response = await apiClient.put<ApiEnvelope<PropertyDto>>(`/property/properties/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateProperties(queryClient),
  })
}

export function useDeleteProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/property/properties/${id}`)
    },
    onSuccess: () => invalidateProperties(queryClient),
  })
}
