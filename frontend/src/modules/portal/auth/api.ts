import { useMutation } from '@tanstack/react-query'
import { portalApiClient } from '@/lib/portalApiClient'
import type { ApiEnvelope, PortalAuthResult } from '@/types/api'

export interface PortalLoginRequest {
  tenantSlug: string
  email: string
  password: string
}

export function usePortalLogin() {
  return useMutation({
    mutationFn: async (payload: PortalLoginRequest) => {
      const response = await portalApiClient.post<ApiEnvelope<PortalAuthResult>>('/portal/auth/login', payload)
      return response.data.data
    },
  })
}
