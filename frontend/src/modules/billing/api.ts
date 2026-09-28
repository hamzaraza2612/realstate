import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, BillingPaymentDto, InvoiceDto, PageMeta, SubscriptionDto, TenantEntitlementDto, TenantUsageDto } from '@/types/api'

/** The caller's own tenant only — every endpoint here reads the ambient tenant server-side and
 * takes no id, so there is nothing for a caller to substitute for another tenant's (see
 * docs/SAAS_BILLING.md's "Tenant isolation" section). */

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'response' in error && (error as { response?: { status?: number } }).response?.status === 404
}

export function useMySubscription() {
  return useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<ApiEnvelope<SubscriptionDto>>('/subscription')
        return response.data.data
      } catch (error) {
        if (isNotFound(error)) return null
        throw error
      }
    },
  })
}

export function useMyUsage() {
  return useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<TenantUsageDto>>('/subscription/usage')
      return response.data.data
    },
  })
}

export function useMyEntitlements() {
  return useQuery({
    queryKey: ['billing', 'entitlements'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<TenantEntitlementDto[]>>('/subscription/entitlements')
      return response.data.data
    },
  })
}

export function useMyInvoices(page: number, pageSize = 20) {
  return useQuery({
    queryKey: ['billing', 'invoices', page, pageSize],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<InvoiceDto[]>>('/billing/invoices', { params: { page, pageSize } })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useMyInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['billing', 'invoices', id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<InvoiceDto>>(`/billing/invoices/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export function useMyPayments() {
  return useQuery({
    queryKey: ['billing', 'payments'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<BillingPaymentDto[]>>('/billing/payments')
      return response.data.data
    },
  })
}
