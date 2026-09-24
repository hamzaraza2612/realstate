import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { useSpaces } from '@/modules/facility/spaces/api'
import { MeetingRoomStatus, MeetingRoomStatusLabel, SpaceType, type MeetingRoomDto } from '@/types/api'
import { useCreateRoom, useUpdateRoom } from './api'

function toNumberOrNull(value: string | undefined) {
  if (!value) return null
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

const schema = z.object({
  spaceId: z.string().min(1, 'Space is required'),
  name: z.string().min(1, 'Name is required'),
  capacity: z.string().optional(),
  hourlyRate: z.string().optional(),
  dailyRate: z.string().optional(),
  status: z.string(),
})

type FormValues = z.infer<typeof schema>

export function RoomFormDialog({ open, onOpenChange, room }: { open: boolean; onOpenChange: (open: boolean) => void; room?: MeetingRoomDto }) {
  const createRoom = useCreateRoom()
  const updateRoom = useUpdateRoom()
  const { data: spacesPage } = useSpaces(1, { type: SpaceType.CoworkingArea })

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) {
      reset(
        room
          ? {
              spaceId: room.spaceId,
              name: room.name,
              capacity: room.capacity != null ? String(room.capacity) : '',
              hourlyRate: room.hourlyRate != null ? String(room.hourlyRate) : '',
              dailyRate: room.dailyRate != null ? String(room.dailyRate) : '',
              status: String(room.status),
            }
          : { spaceId: '', name: '', capacity: '', hourlyRate: '', dailyRate: '', status: String(MeetingRoomStatus.Available) },
      )
    }
  }, [open, room, reset])

  async function onSubmit(values: FormValues) {
    const shared = {
      name: values.name,
      capacity: toNumberOrNull(values.capacity),
      hourlyRate: toNumberOrNull(values.hourlyRate),
      dailyRate: toNumberOrNull(values.dailyRate),
    }
    try {
      if (room) {
        await updateRoom.mutateAsync({ id: room.id, payload: { ...shared, status: Number(values.status) as MeetingRoomStatus } })
        toast({ title: 'Meeting room updated', variant: 'success' })
      } else {
        await createRoom.mutateAsync({ spaceId: values.spaceId, ...shared })
        toast({ title: 'Meeting room created', variant: 'success' })
      }
      onOpenChange(false)
    } catch (error) {
      toast({ title: `Could not ${room ? 'update' : 'create'} meeting room`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createRoom.isPending || updateRoom.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{room ? 'Edit meeting room' : 'New meeting room'}</DialogTitle>
          <DialogDescription>Meeting rooms belong to a coworking area space and can be booked by the hour or day.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {!room && (
            <div className="flex flex-col gap-1.5">
              <Label>Space</Label>
              <Controller
                control={control}
                name="spaceId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a coworking area" />
                    </SelectTrigger>
                    <SelectContent>
                      {(spacesPage?.items ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.code} · {s.facilityName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.spaceId && <p className="text-xs text-destructive">{errors.spaceId.message}</p>}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="capacity">Capacity (optional)</Label>
              <Input id="capacity" type="number" step="1" {...register('capacity')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hourlyRate">Hourly rate (optional)</Label>
              <Input id="hourlyRate" type="number" step="0.01" {...register('hourlyRate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dailyRate">Daily rate (optional)</Label>
              <Input id="dailyRate" type="number" step="0.01" {...register('dailyRate')} />
            </div>
          </div>

          {room && (
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MeetingRoomStatusLabel).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : room ? 'Save changes' : 'Create room'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
