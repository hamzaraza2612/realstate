import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, PageMeta, PurchasePriority, PurchaseRequestDto, PurchaseRequestStatus } from '@/types/api'

const PURCHASE_REQUESTS_KEY = ['procurement', 'purchase-requests']

export interface PurchaseRequestFilters {
  projectId?: string
  status?: PurchaseRequestStatus
  search?: string
}

export function usePurchaseRequests(page: number, filters: PurchaseRequestFilters) {
  return useQuery({
    queryKey: [...PURCHASE_REQUESTS_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PurchaseRequestDto[]>>('/procurement/purchase-requests', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useAllPurchaseRequests(projectId?: string, status?: PurchaseRequestStatus) {
  return useQuery({
    queryKey: [...PURCHASE_REQUESTS_KEY, 'all', projectId, status],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PurchaseRequestDto[]>>('/procurement/purchase-requests', {
        params: { page: 1, pageSize: 200, projectId, status },
      })
      return response.data.data
    },
  })
}

export function usePurchaseRequest(id: string | undefined) {
  return useQuery({
    queryKey: [...PURCHASE_REQUESTS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PurchaseRequestDto>>(`/procurement/purchase-requests/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface PurchaseRequestLineRequest {
  materialId: string | null
  itemDescription: string
  unitOfMeasure: string
  quantity: number
  estimatedUnitPrice: number
}

export interface PurchaseRequestRequest {
  projectId: string
  workPackageId: string | null
  requiredDate: string | null
  priority: PurchasePriority
  notes: string | null
  lines: PurchaseRequestLineRequest[]
}

export interface UpdatePurchaseRequestRequest {
  requiredDate: string | null
  priority: PurchasePriority
  notes: string | null
  lines: PurchaseRequestLineRequest[]
}

function invalidatePurchaseRequests(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: PURCHASE_REQUESTS_KEY })
  queryClient.invalidateQueries({ queryKey: ['construction', 'dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['procurement', 'dashboard'] })
}

export function useCreatePurchaseRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: PurchaseRequestRequest) => {
      const response = await apiClient.post<ApiEnvelope<PurchaseRequestDto>>('/procurement/purchase-requests', payload)
      return response.data.data
    },
    onSuccess: () => invalidatePurchaseRequests(queryClient),
  })
}

export function useUpdatePurchaseRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdatePurchaseRequestRequest }) => {
      const response = await apiClient.put<ApiEnvelope<PurchaseRequestDto>>(`/procurement/purchase-requests/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidatePurchaseRequests(queryClient),
  })
}

function useSimplePurchaseRequestAction(action: 'submit' | 'approve' | 'reject' | 'cancel') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<ApiEnvelope<PurchaseRequestDto>>(`/procurement/purchase-requests/${id}/${action}`)
      return response.data.data
    },
    onSuccess: () => invalidatePurchaseRequests(queryClient),
  })
}

export const useSubmitPurchaseRequest = () => useSimplePurchaseRequestAction('submit')
export const useApprovePurchaseRequest = () => useSimplePurchaseRequestAction('approve')
export const useRejectPurchaseRequest = () => useSimplePurchaseRequestAction('reject')
export const useCancelPurchaseRequest = () => useSimplePurchaseRequestAction('cancel')
