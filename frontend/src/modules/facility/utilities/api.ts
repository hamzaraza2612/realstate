import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, PageMeta, UtilityReadingDto, UtilityType } from '@/types/api'

const UTILITY_READINGS_KEY = ['facility', 'utility-readings']

export interface UtilityReadingFilters {
  facilityId?: string
  propertyId?: string
  type?: UtilityType
  meterReference?: string
}

export function useUtilityReadings(page: number, filters: UtilityReadingFilters) {
  return useQuery({
    queryKey: [...UTILITY_READINGS_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<UtilityReadingDto[]>>('/facility/utility-readings', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export interface UtilityReadingRequest {
  facilityId: string | null
  propertyId: string | null
  type: UtilityType
  meterReference: string
  readingValue: number
  readingDate: string
  ratePerUnit: number | null
}

function invalidateUtilityReadings(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: UTILITY_READINGS_KEY })
  queryClient.invalidateQueries({ queryKey: ['facility', 'dashboard'] })
}

export function useCreateUtilityReading() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UtilityReadingRequest) => {
      const response = await apiClient.post<ApiEnvelope<UtilityReadingDto>>('/facility/utility-readings', payload)
      return response.data.data
    },
    onSuccess: () => invalidateUtilityReadings(queryClient),
  })
}
