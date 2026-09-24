import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, MeetingRoomDto, MeetingRoomStatus } from '@/types/api'

const ROOMS_KEY = ['facility', 'coworking', 'rooms']

export interface RoomFilters {
  spaceId?: string
  status?: MeetingRoomStatus
}

export function useRooms(filters: RoomFilters) {
  return useQuery({
    queryKey: [...ROOMS_KEY, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MeetingRoomDto[]>>('/facility/coworking/rooms', {
        params: { page: 1, pageSize: 200, ...filters },
      })
      return response.data.data
    },
  })
}

export interface RoomRequest {
  spaceId: string
  name: string
  capacity: number | null
  hourlyRate: number | null
  dailyRate: number | null
}

export interface UpdateRoomRequest {
  name: string
  capacity: number | null
  hourlyRate: number | null
  dailyRate: number | null
  status: MeetingRoomStatus
}

function invalidateRooms(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ROOMS_KEY })
  queryClient.invalidateQueries({ queryKey: ['facility', 'coworking-dashboard'] })
}

export function useCreateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: RoomRequest) => {
      const response = await apiClient.post<ApiEnvelope<MeetingRoomDto>>('/facility/coworking/rooms', payload)
      return response.data.data
    },
    onSuccess: () => invalidateRooms(queryClient),
  })
}

export function useUpdateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateRoomRequest }) => {
      const response = await apiClient.put<ApiEnvelope<MeetingRoomDto>>(`/facility/coworking/rooms/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateRooms(queryClient),
  })
}
