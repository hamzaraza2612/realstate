import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, MallShopDto, PageMeta, SpaceStatus } from '@/types/api'

const MALL_SHOPS_KEY = ['facility', 'mall', 'shops']

export interface MallShopFilters {
  facilityId?: string
  status?: SpaceStatus
  search?: string
}

export function useMallShops(page: number, filters: MallShopFilters) {
  return useQuery({
    queryKey: [...MALL_SHOPS_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MallShopDto[]>>('/facility/mall/shops', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useMallShop(spaceId: string | undefined) {
  return useQuery({
    queryKey: [...MALL_SHOPS_KEY, spaceId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MallShopDto>>(`/facility/mall/shops/${spaceId}`)
      return response.data.data
    },
    enabled: !!spaceId,
  })
}

export interface MallShopRequest {
  facilityId: string
  buildingBlock: string | null
  code: string
  areaSize: number | null
  rate: number | null
  tradeCategory: string | null
  storefrontName: string | null
  notes: string | null
}

export interface UpdateMallShopRequest {
  tradeCategory: string | null
  storefrontName: string | null
  notes: string | null
}

function invalidateMallShops(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: MALL_SHOPS_KEY })
  queryClient.invalidateQueries({ queryKey: ['facility', 'spaces'] })
  queryClient.invalidateQueries({ queryKey: ['facility', 'facilities'] })
  queryClient.invalidateQueries({ queryKey: ['facility', 'dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['facility', 'mall-dashboard'] })
}

export function useCreateMallShop() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: MallShopRequest) => {
      const response = await apiClient.post<ApiEnvelope<MallShopDto>>('/facility/mall/shops', payload)
      return response.data.data
    },
    onSuccess: () => invalidateMallShops(queryClient),
  })
}

export function useUpdateMallShop() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ spaceId, payload }: { spaceId: string; payload: UpdateMallShopRequest }) => {
      const response = await apiClient.put<ApiEnvelope<MallShopDto>>(`/facility/mall/shops/${spaceId}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateMallShops(queryClient),
  })
}
