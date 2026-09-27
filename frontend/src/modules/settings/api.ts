import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import { useLocalizationStore } from '@/stores/localizationStore'
import type {
  ApiEnvelope,
  CountryDto,
  CurrencyDto,
  TaxRateDto,
  TenantLocalizationDto,
  TenantTaxProfileDto,
  UpdateTenantLocalizationRequest,
  UpdateTenantTaxProfileRequest,
} from '@/types/api'

/** Milestone 15 — Localization Settings (tenant-facing). These catalogs (`/localization/countries`,
 * `/localization/currencies`) need no permission and are also reused by platform-admin pages
 * (PlatformTaxProfilesPage, CreateOrganizationDialog) — see docs/SAAS_BILLING.md-style module
 * boundary notes in modules/platform/api.ts for why cross-module api.ts imports are fine here. */

const COUNTRIES_KEY = ['localization', 'countries']
const CURRENCIES_KEY = ['localization', 'currencies']
const TAX_RATES_KEY = ['localization', 'tax-rates']
const CURRENT_LOCALIZATION_KEY = ['localization', 'current']
const CURRENT_TAX_PROFILE_KEY = ['localization', 'tax-profile']

export function useCountries() {
  return useQuery({
    queryKey: COUNTRIES_KEY,
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<CountryDto[]>>('/localization/countries')
      return response.data.data
    },
    staleTime: Infinity,
  })
}

export function useCurrencies() {
  return useQuery({
    queryKey: CURRENCIES_KEY,
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<CurrencyDto[]>>('/localization/currencies')
      return response.data.data
    },
    staleTime: Infinity,
  })
}

export function useTaxRatesByCountry(countryCode: string | undefined) {
  return useQuery({
    queryKey: [...TAX_RATES_KEY, countryCode],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<TaxRateDto[]>>('/localization/tax-rates', { params: { countryCode } })
      return response.data.data
    },
    enabled: !!countryCode,
  })
}

export function useCurrentLocalization() {
  return useQuery({
    queryKey: CURRENT_LOCALIZATION_KEY,
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<TenantLocalizationDto>>('/localization/current')
      return response.data.data
    },
  })
}

export function useUpdateLocalization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateTenantLocalizationRequest) => {
      const response = await apiClient.put<ApiEnvelope<TenantLocalizationDto>>('/localization/current', payload)
      return response.data.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CURRENT_LOCALIZATION_KEY })
      // Keep the app-wide localization store (currency/date formatting everywhere) in sync
      // immediately, without waiting for AppShell's next fetch.
      useLocalizationStore.getState().setData(data)
    },
  })
}

export function useCurrentTaxProfile() {
  return useQuery({
    queryKey: CURRENT_TAX_PROFILE_KEY,
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<TenantTaxProfileDto>>('/localization/tax-profile')
      return response.data.data
    },
  })
}

export function useUpdateTaxProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateTenantTaxProfileRequest) => {
      const response = await apiClient.put<ApiEnvelope<TenantTaxProfileDto>>('/localization/tax-profile', payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CURRENT_TAX_PROFILE_KEY }),
  })
}
