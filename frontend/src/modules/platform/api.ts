import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type {
  ApiEnvelope,
  BillingPaymentDto,
  ExchangeRateDto,
  InvoiceDto,
  InvoiceStatus,
  OrganizationDto,
  PageMeta,
  SubscriptionDto,
  SubscriptionPlanDto,
  SubscriptionStatus,
  TaxProfileDto,
  TaxRateDto,
  TenantEntitlementsDto,
  TenantLocalizationDto,
  TenantStatus,
  TenantUsageDto,
  UpdateTenantLocalizationRequest,
} from '@/types/api'

const PLATFORM_ORGS_KEY = ['platform', 'organizations']
const PLATFORM_PLANS_KEY = ['platform', 'subscription-plans']
const PLATFORM_SUBSCRIPTIONS_KEY = ['platform', 'subscriptions']
const PLATFORM_INVOICES_KEY = ['platform', 'invoices']
const PLATFORM_TAX_PROFILES_KEY = ['platform', 'tax-profiles']
const PLATFORM_EXCHANGE_RATES_KEY = ['platform', 'exchange-rates']

// --- Organizations ---

export function usePlatformOrganizations(page: number, search: string, pageSize = 20) {
  return useQuery({
    queryKey: [...PLATFORM_ORGS_KEY, page, search, pageSize],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<OrganizationDto[]>>('/platform/organizations', {
        params: { page, pageSize, search: search || undefined },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function usePlatformOrganization(id: string | undefined) {
  return useQuery({
    queryKey: [...PLATFORM_ORGS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<OrganizationDto>>(`/platform/organizations/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface CreateOrganizationRequest {
  name: string
  slug: string
  contactEmail: string | null
  contactPhone: string | null
  timezone: string
  subscriptionPlanId: string | null
  ownerEmail: string
  ownerFullName: string
  ownerPassword: string
  // --- Milestone 15: optional at create time — when countryCode is set, the backend fills
  // sensible currency/locale defaults for whichever of these is left unset. ---
  countryCode?: string | null
  currency?: string | null
  locale?: string | null
}

export function useCreatePlatformOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateOrganizationRequest) => {
      const response = await apiClient.post<ApiEnvelope<OrganizationDto>>('/platform/organizations', payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLATFORM_ORGS_KEY }),
  })
}

export function useUpdateOrganizationStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TenantStatus }) => {
      const response = await apiClient.post<ApiEnvelope<OrganizationDto>>(`/platform/organizations/${id}/status`, { status })
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLATFORM_ORGS_KEY }),
  })
}

// --- Subscription Plans ---

export function usePlatformSubscriptionPlans() {
  return useQuery({
    queryKey: PLATFORM_PLANS_KEY,
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<SubscriptionPlanDto[]>>('/platform/subscription-plans')
      return response.data.data
    },
  })
}

export interface PlanEntitlementInput {
  code: string
  boolValue?: boolean | null
  numericValue?: number | null
}

export interface SubscriptionPlanRequest {
  name: string
  code: string
  description: string | null
  displayOrder: number
  trialDays: number
  currency: string
  price: number
  setupPrice: number | null
  billingCycle: number
  metadataJson: string | null
  entitlements: PlanEntitlementInput[]
  isActive?: boolean
}

export function useCreateSubscriptionPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: SubscriptionPlanRequest) => {
      const response = await apiClient.post<ApiEnvelope<SubscriptionPlanDto>>('/platform/subscription-plans', payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLATFORM_PLANS_KEY }),
  })
}

export function useUpdateSubscriptionPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: SubscriptionPlanRequest }) => {
      const response = await apiClient.put<ApiEnvelope<SubscriptionPlanDto>>(`/platform/subscription-plans/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLATFORM_PLANS_KEY }),
  })
}

// --- Per-tenant subscription / usage / entitlements ---

export function useOrganizationSubscription(tenantId: string | undefined) {
  return useQuery({
    queryKey: [...PLATFORM_ORGS_KEY, tenantId, 'subscription'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<ApiEnvelope<SubscriptionDto>>(`/platform/organizations/${tenantId}/subscription`)
        return response.data.data
      } catch (error: unknown) {
        if (isNotFound(error)) return null
        throw error
      }
    },
    enabled: !!tenantId,
  })
}

export interface AssignSubscriptionRequest {
  planId: string
  skipTrial: boolean
}

export function useAssignSubscription(tenantId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AssignSubscriptionRequest) => {
      const response = await apiClient.post<ApiEnvelope<SubscriptionDto>>(`/platform/organizations/${tenantId}/subscription`, payload)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PLATFORM_ORGS_KEY, tenantId] })
      queryClient.invalidateQueries({ queryKey: PLATFORM_SUBSCRIPTIONS_KEY })
    },
  })
}

export function useOrganizationUsage(tenantId: string | undefined) {
  return useQuery({
    queryKey: [...PLATFORM_ORGS_KEY, tenantId, 'usage'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<TenantUsageDto>>(`/platform/organizations/${tenantId}/usage`)
      return response.data.data
    },
    enabled: !!tenantId,
  })
}

export function useOrganizationEntitlements(tenantId: string | undefined) {
  return useQuery({
    queryKey: [...PLATFORM_ORGS_KEY, tenantId, 'entitlements'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<TenantEntitlementsDto>>(`/platform/organizations/${tenantId}/entitlements`)
      return response.data.data
    },
    enabled: !!tenantId,
  })
}

export interface EntitlementOverrideRequest {
  code: string
  boolValue?: boolean | null
  numericValue?: number | null
}

export function useSetEntitlementOverride(tenantId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: EntitlementOverrideRequest) => {
      await apiClient.put(`/platform/organizations/${tenantId}/entitlements`, payload)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...PLATFORM_ORGS_KEY, tenantId, 'entitlements'] }),
  })
}

export function useRemoveEntitlementOverride(tenantId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => {
      await apiClient.delete(`/platform/organizations/${tenantId}/entitlements/${code}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...PLATFORM_ORGS_KEY, tenantId, 'entitlements'] }),
  })
}

// --- Cross-tenant subscriptions ---

export function usePlatformSubscriptions() {
  return useQuery({
    queryKey: PLATFORM_SUBSCRIPTIONS_KEY,
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<SubscriptionDto[]>>('/platform/subscriptions')
      return response.data.data
    },
  })
}

export interface TransitionSubscriptionRequest {
  toStatus: SubscriptionStatus
  reason?: string | null
}

export function useTransitionSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: TransitionSubscriptionRequest }) => {
      const response = await apiClient.post<ApiEnvelope<SubscriptionDto>>(`/platform/subscriptions/${id}/transition`, payload)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLATFORM_SUBSCRIPTIONS_KEY })
      queryClient.invalidateQueries({ queryKey: PLATFORM_ORGS_KEY })
    },
  })
}

// --- Invoices & payments ---

export interface PlatformInvoiceFilters {
  tenantId?: string
  status?: InvoiceStatus
}

export function usePlatformInvoices(page: number, filters: PlatformInvoiceFilters, pageSize = 20) {
  return useQuery({
    queryKey: [...PLATFORM_INVOICES_KEY, page, filters, pageSize],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<InvoiceDto[]>>('/platform/invoices', {
        params: { page, pageSize, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function usePlatformInvoice(id: string | undefined) {
  return useQuery({
    queryKey: [...PLATFORM_INVOICES_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<InvoiceDto>>(`/platform/invoices/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface GenerateInvoiceLineItemInput {
  description: string
  quantity: number
  unitPrice: number
}

export interface GenerateInvoiceRequest {
  subscriptionId: string
  taxAmount: number
  lineItems: GenerateInvoiceLineItemInput[] | null
  dueInDays: number
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: GenerateInvoiceRequest) => {
      const response = await apiClient.post<ApiEnvelope<InvoiceDto>>('/platform/invoices/generate', payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLATFORM_INVOICES_KEY }),
  })
}

export function useInvoicePayments(invoiceId: string | undefined) {
  return useQuery({
    queryKey: [...PLATFORM_INVOICES_KEY, invoiceId, 'payments'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<BillingPaymentDto[]>>(`/platform/invoices/${invoiceId}/payments`)
      return response.data.data
    },
    enabled: !!invoiceId,
  })
}

export interface RecordPaymentRequest {
  amount: number
  paymentDate: string
  providerTransactionId?: string | null
  idempotencyKey: string
}

export function useRecordPayment(invoiceId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: RecordPaymentRequest) => {
      const response = await apiClient.post<ApiEnvelope<BillingPaymentDto>>(`/platform/invoices/${invoiceId}/payments`, payload)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PLATFORM_INVOICES_KEY, invoiceId, 'payments'] })
      queryClient.invalidateQueries({ queryKey: PLATFORM_INVOICES_KEY })
    },
  })
}

// --- Milestone 15: Tax profiles (platform-admin-only) ---

export function usePlatformTaxProfiles(countryCode?: string) {
  return useQuery({
    queryKey: [...PLATFORM_TAX_PROFILES_KEY, countryCode],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<TaxProfileDto[]>>('/platform/tax-profiles', {
        params: { countryCode: countryCode || undefined },
      })
      return response.data.data
    },
  })
}

export function usePlatformTaxProfile(id: string | undefined) {
  return useQuery({
    queryKey: [...PLATFORM_TAX_PROFILES_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<TaxProfileDto>>(`/platform/tax-profiles/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface CreateTaxProfileRequest {
  countryCode: string
  code: string
  name: string
  description: string | null
}

export function useCreateTaxProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateTaxProfileRequest) => {
      const response = await apiClient.post<ApiEnvelope<TaxProfileDto>>('/platform/tax-profiles', payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLATFORM_TAX_PROFILES_KEY }),
  })
}

export interface UpdateTaxProfileRequest {
  name: string
  description: string | null
  isActive: boolean
}

export function useUpdateTaxProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateTaxProfileRequest }) => {
      const response = await apiClient.put<ApiEnvelope<TaxProfileDto>>(`/platform/tax-profiles/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLATFORM_TAX_PROFILES_KEY }),
  })
}

export interface CreateTaxRateRequest {
  rateCode: string
  name: string
  percentage: number
  isInclusive: boolean
  effectiveFrom: string
  effectiveTo: string | null
}

export function useCreateTaxRate(taxProfileId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateTaxRateRequest) => {
      const response = await apiClient.post<ApiEnvelope<TaxRateDto>>(`/platform/tax-profiles/${taxProfileId}/rates`, payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLATFORM_TAX_PROFILES_KEY }),
  })
}

export interface UpdateTaxRateRequest {
  name: string
  percentage: number
  isInclusive: boolean
  effectiveFrom: string
  effectiveTo: string | null
  isActive: boolean
}

export function useUpdateTaxRate(taxProfileId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ rateId, payload }: { rateId: string; payload: UpdateTaxRateRequest }) => {
      const response = await apiClient.put<ApiEnvelope<TaxRateDto>>(`/platform/tax-profiles/${taxProfileId}/rates/${rateId}`, payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLATFORM_TAX_PROFILES_KEY }),
  })
}

// --- Milestone 15: per-tenant localization (platform admin sets it directly, e.g. right after
// creating the tenant) ---

export function useUpdateOrganizationLocalization(tenantId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateTenantLocalizationRequest) => {
      const response = await apiClient.put<ApiEnvelope<TenantLocalizationDto>>(`/platform/organizations/${tenantId}/localization`, payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...PLATFORM_ORGS_KEY, tenantId] }),
  })
}

// --- Milestone 15: Exchange rates (stretch goal — list + create only) ---

export function usePlatformExchangeRates(page: number, pageSize = 20) {
  return useQuery({
    queryKey: [...PLATFORM_EXCHANGE_RATES_KEY, page, pageSize],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ExchangeRateDto[]>>('/platform/exchange-rates', { params: { page, pageSize } })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export interface CreateExchangeRateRequest {
  baseCurrency: string
  quoteCurrency: string
  rate: number
  effectiveAt: string
}

export function useCreateExchangeRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateExchangeRateRequest) => {
      const response = await apiClient.post<ApiEnvelope<ExchangeRateDto>>('/platform/exchange-rates', payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLATFORM_EXCHANGE_RATES_KEY }),
  })
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'response' in error && (error as { response?: { status?: number } }).response?.status === 404
}
