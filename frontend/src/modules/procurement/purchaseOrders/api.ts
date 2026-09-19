import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, MaterialReceiptDto, PageMeta, PurchaseOrderDto, PurchaseOrderStatus } from '@/types/api'

const PURCHASE_ORDERS_KEY = ['procurement', 'purchase-orders']

export interface PurchaseOrderFilters {
  projectId?: string
  vendorId?: string
  status?: PurchaseOrderStatus
  search?: string
}

export function usePurchaseOrders(page: number, filters: PurchaseOrderFilters) {
  return useQuery({
    queryKey: [...PURCHASE_ORDERS_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PurchaseOrderDto[]>>('/procurement/purchase-orders', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function usePurchaseOrder(id: string | undefined) {
  return useQuery({
    queryKey: [...PURCHASE_ORDERS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PurchaseOrderDto>>(`/procurement/purchase-orders/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface PurchaseOrderLineRequest {
  materialId: string | null
  itemDescription: string
  unitOfMeasure: string
  quantity: number
  unitPrice: number
}

export interface PurchaseOrderRequest {
  vendorId: string
  projectId: string
  workPackageId: string | null
  purchaseRequestId: string | null
  orderDate: string
  expectedDeliveryDate: string | null
  discount: number
  taxAmount: number
  notes: string | null
  lines: PurchaseOrderLineRequest[]
}

export interface UpdatePurchaseOrderRequest {
  orderDate: string
  expectedDeliveryDate: string | null
  discount: number
  taxAmount: number
  notes: string | null
  lines: PurchaseOrderLineRequest[]
}

function invalidatePurchaseOrders(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_KEY })
  queryClient.invalidateQueries({ queryKey: ['procurement', 'dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['construction', 'dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['materials'] })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: PurchaseOrderRequest) => {
      const response = await apiClient.post<ApiEnvelope<PurchaseOrderDto>>('/procurement/purchase-orders', payload)
      return response.data.data
    },
    onSuccess: () => invalidatePurchaseOrders(queryClient),
  })
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdatePurchaseOrderRequest }) => {
      const response = await apiClient.put<ApiEnvelope<PurchaseOrderDto>>(`/procurement/purchase-orders/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidatePurchaseOrders(queryClient),
  })
}

function useSimplePurchaseOrderAction(action: 'submit' | 'approve' | 'send' | 'cancel') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<ApiEnvelope<PurchaseOrderDto>>(`/procurement/purchase-orders/${id}/${action}`)
      return response.data.data
    },
    onSuccess: () => invalidatePurchaseOrders(queryClient),
  })
}

export const useSubmitPurchaseOrder = () => useSimplePurchaseOrderAction('submit')
export const useApprovePurchaseOrder = () => useSimplePurchaseOrderAction('approve')
export const useSendPurchaseOrder = () => useSimplePurchaseOrderAction('send')
export const useCancelPurchaseOrder = () => useSimplePurchaseOrderAction('cancel')

export function useReceipts(purchaseOrderId: string | undefined) {
  return useQuery({
    queryKey: [...PURCHASE_ORDERS_KEY, purchaseOrderId, 'receipts'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MaterialReceiptDto[]>>(`/procurement/purchase-orders/${purchaseOrderId}/receipts`)
      return response.data.data
    },
    enabled: !!purchaseOrderId,
  })
}

export interface MaterialReceiptLineRequest {
  purchaseOrderLineId: string
  receivedQuantity: number
}

export interface MaterialReceiptRequest {
  receivedDate: string
  notes: string | null
  lines: MaterialReceiptLineRequest[]
}

export function useCreateReceipt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ purchaseOrderId, payload }: { purchaseOrderId: string; payload: MaterialReceiptRequest }) => {
      const response = await apiClient.post<ApiEnvelope<MaterialReceiptDto>>(`/procurement/purchase-orders/${purchaseOrderId}/receipts`, payload)
      return response.data.data
    },
    onSuccess: (_data, variables) => {
      invalidatePurchaseOrders(queryClient)
      queryClient.invalidateQueries({ queryKey: [...PURCHASE_ORDERS_KEY, variables.purchaseOrderId, 'receipts'] })
    },
  })
}
