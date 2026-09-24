import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, FacilityPaymentDto, FacilityPaymentSourceType, PaymentMethod } from '@/types/api'

const PAYMENTS_KEY = ['facility', 'payments']

export function usePaymentsBySource(sourceType: FacilityPaymentSourceType, sourceId: string | undefined) {
  return useQuery({
    queryKey: [...PAYMENTS_KEY, sourceType, sourceId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<FacilityPaymentDto[]>>('/facility/payments', {
        params: { sourceType, sourceId },
      })
      return response.data.data
    },
    enabled: !!sourceId,
  })
}

export interface RecordFacilityPaymentRequest {
  sourceType: FacilityPaymentSourceType
  sourceId: string
  amount: number
  paymentDate: string
  method: PaymentMethod
  referenceNumber: string | null
  notes: string | null
  idempotencyKey: string
}

export function useRecordFacilityPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: RecordFacilityPaymentRequest) => {
      const response = await apiClient.post<ApiEnvelope<FacilityPaymentDto>>('/facility/payments', payload)
      return response.data.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [...PAYMENTS_KEY, variables.sourceType, variables.sourceId] })
      queryClient.invalidateQueries({ queryKey: ['facility', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['facility', 'mall-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['facility', 'coworking-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['facility', 'mall', 'service-charges'] })
      queryClient.invalidateQueries({ queryKey: ['facility', 'mall', 'parking-allocations'] })
      queryClient.invalidateQueries({ queryKey: ['facility', 'coworking', 'memberships'] })
      queryClient.invalidateQueries({ queryKey: ['facility', 'coworking', 'bookings'] })
      queryClient.invalidateQueries({ queryKey: ['facility', 'utility-readings'] })
    },
  })
}
