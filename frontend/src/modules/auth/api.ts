import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, AuthResult } from '@/types/api'

export function useLogin() {
  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const response = await apiClient.post<ApiEnvelope<AuthResult>>('/auth/login', payload)
      return response.data.data
    },
  })
}
