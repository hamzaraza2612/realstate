import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type {
  ApiEnvelope,
  LeaseDto,
  LeasePaymentFrequency,
  LeaseStatus,
  PageMeta,
  PaymentMethod,
  RentPaymentDto,
  RentScheduleDto,
  SecurityDepositDto,
} from '@/types/api'

const LEASES_KEY = ['property', 'leases']

export interface LeaseFilters {
  propertyId?: string
  unitId?: string
  rentalTenantId?: string
  status?: LeaseStatus
  search?: string
}

export function useLeases(page: number, filters: LeaseFilters) {
  return useQuery({
    queryKey: [...LEASES_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<LeaseDto[]>>('/property/leases', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useLease(id: string | undefined) {
  return useQuery({
    queryKey: [...LEASES_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<LeaseDto>>(`/property/leases/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface LeaseRequest {
  propertyId: string
  unitId: string
  rentalTenantId: string
  startDate: string
  endDate: string
  rentAmount: number
  securityDeposit: number
  paymentFrequency: LeasePaymentFrequency
  gracePeriodDays: number
  terms: string | null
  notes: string | null
}

export interface UpdateLeaseRequest {
  startDate: string
  endDate: string
  rentAmount: number
  securityDeposit: number
  paymentFrequency: LeasePaymentFrequency
  gracePeriodDays: number
  terms: string | null
  notes: string | null
}

function invalidateLeases(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: LEASES_KEY })
  queryClient.invalidateQueries({ queryKey: ['property', 'units'] })
  queryClient.invalidateQueries({ queryKey: ['property', 'dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['property', 'rental-dashboard'] })
}

export function useCreateLease() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: LeaseRequest) => {
      const response = await apiClient.post<ApiEnvelope<LeaseDto>>('/property/leases', payload)
      return response.data.data
    },
    onSuccess: () => invalidateLeases(queryClient),
  })
}

export function useUpdateLease() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateLeaseRequest }) => {
      const response = await apiClient.put<ApiEnvelope<LeaseDto>>(`/property/leases/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateLeases(queryClient),
  })
}

function useLeaseAction(action: 'submit' | 'approve' | 'expire' | 'terminate' | 'cancel') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<ApiEnvelope<LeaseDto>>(`/property/leases/${id}/${action}`)
      return response.data.data
    },
    onSuccess: () => invalidateLeases(queryClient),
  })
}

export const useSubmitLease = () => useLeaseAction('submit')
export const useApproveLease = () => useLeaseAction('approve')
export const useExpireLease = () => useLeaseAction('expire')
export const useTerminateLease = () => useLeaseAction('terminate')
export const useCancelLease = () => useLeaseAction('cancel')

const RENT_SCHEDULE_KEY = ['property', 'rent-schedule']

export function useRentSchedule(leaseId: string | undefined) {
  return useQuery({
    queryKey: [...RENT_SCHEDULE_KEY, leaseId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<RentScheduleDto[]>>(`/property/leases/${leaseId}/rent-schedule`)
      return response.data.data
    },
    enabled: !!leaseId,
  })
}

const RENT_PAYMENTS_KEY = ['property', 'rent-payments']

export function useRentPayments(leaseId: string | undefined) {
  return useQuery({
    queryKey: [...RENT_PAYMENTS_KEY, leaseId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<RentPaymentDto[]>>(`/property/leases/${leaseId}/payments`)
      return response.data.data
    },
    enabled: !!leaseId,
  })
}

export interface RecordRentPaymentRequest {
  rentScheduleId: string
  amount: number
  paymentDate: string
  method: PaymentMethod
  referenceNumber: string | null
  notes: string | null
  idempotencyKey: string
}

export function useRecordRentPayment(leaseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: RecordRentPaymentRequest) => {
      const response = await apiClient.post<ApiEnvelope<RentPaymentDto>>(`/property/leases/${leaseId}/payments`, payload)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...RENT_SCHEDULE_KEY, leaseId] })
      queryClient.invalidateQueries({ queryKey: [...RENT_PAYMENTS_KEY, leaseId] })
      queryClient.invalidateQueries({ queryKey: ['property', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['property', 'rental-dashboard'] })
    },
  })
}

const SECURITY_DEPOSIT_KEY = ['property', 'security-deposit']

export function useSecurityDeposit(leaseId: string | undefined) {
  return useQuery({
    queryKey: [...SECURITY_DEPOSIT_KEY, leaseId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<SecurityDepositDto>>(`/property/leases/${leaseId}/security-deposit`)
      return response.data.data
    },
    enabled: !!leaseId,
    retry: false,
  })
}

function invalidateSecurityDeposit(queryClient: ReturnType<typeof useQueryClient>, leaseId: string | undefined) {
  queryClient.invalidateQueries({ queryKey: [...SECURITY_DEPOSIT_KEY, leaseId] })
  queryClient.invalidateQueries({ queryKey: ['property', 'dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['property', 'rental-dashboard'] })
}

export function useReceiveSecurityDeposit(leaseId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, receivedDate, notes }: { id: string; receivedDate: string; notes: string | null }) => {
      const response = await apiClient.post<ApiEnvelope<SecurityDepositDto>>(`/property/security-deposits/${id}/receive`, { receivedDate, notes })
      return response.data.data
    },
    onSuccess: () => invalidateSecurityDeposit(queryClient, leaseId),
  })
}

export function useRefundSecurityDeposit(leaseId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, amount, refundDate, notes }: { id: string; amount: number; refundDate: string; notes: string | null }) => {
      const response = await apiClient.post<ApiEnvelope<SecurityDepositDto>>(`/property/security-deposits/${id}/refund`, { amount, refundDate, notes })
      return response.data.data
    },
    onSuccess: () => invalidateSecurityDeposit(queryClient, leaseId),
  })
}

export function useForfeitSecurityDeposit(leaseId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string | null }) => {
      const response = await apiClient.post<ApiEnvelope<SecurityDepositDto>>(`/property/security-deposits/${id}/forfeit`, { notes })
      return response.data.data
    },
    onSuccess: () => invalidateSecurityDeposit(queryClient, leaseId),
  })
}
