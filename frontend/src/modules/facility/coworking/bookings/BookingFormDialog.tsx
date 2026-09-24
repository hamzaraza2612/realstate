import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { useAllMembers } from '@/modules/facility/coworking/members/api'
import { useDesks } from '@/modules/facility/coworking/desks/api'
import { useRooms } from '@/modules/facility/coworking/rooms/api'
import { BookingResourceType } from '@/types/api'
import { useCreateCoworkingBooking } from './api'

const schema = z
  .object({
    memberId: z.string().min(1, 'Member is required'),
    resourceType: z.string(),
    resourceId: z.string().min(1, 'Resource is required'),
    startAt: z.string().min(1, 'Required'),
    endAt: z.string().min(1, 'Required'),
    notes: z.string().optional(),
  })
  .refine((v) => v.endAt > v.startAt, { message: 'End must be after start', path: ['endAt'] })

type FormValues = z.infer<typeof schema>

export function BookingFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createBooking = useCreateCoworkingBooking()
  const navigate = useNavigate()
  const { data: members } = useAllMembers()
  const { data: desks } = useDesks({})
  const { data: rooms } = useRooms({})

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { memberId: '', resourceType: String(BookingResourceType.Desk), resourceId: '', startAt: '', endAt: '', notes: '' },
  })

  const resourceType = watch('resourceType')
  const resources = Number(resourceType) === BookingResourceType.Desk ? (desks ?? []).map((d) => ({ id: d.id, label: `${d.code} · ${d.spaceCode}` })) : (rooms ?? []).map((r) => ({ id: r.id, label: `${r.name} · ${r.spaceCode}` }))

  useEffect(() => {
    if (open) reset({ memberId: '', resourceType: String(BookingResourceType.Desk), resourceId: '', startAt: '', endAt: '', notes: '' })
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      const created = await createBooking.mutateAsync({
        memberId: values.memberId,
        resourceType: Number(values.resourceType) as BookingResourceType,
        resourceId: values.resourceId,
        startAt: values.startAt,
        endAt: values.endAt,
        notes: values.notes || null,
      })
      toast({ title: 'Booking created', variant: 'success' })
      onOpenChange(false)
      navigate(`/facility/coworking/bookings/${created.id}`)
    } catch (error) {
      toast({ title: 'Could not create booking', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New booking</DialogTitle>
          <DialogDescription>Price is calculated automatically from the desk's space rate or the room's hourly/daily rate.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label>Member</Label>
            <Controller
              control={control}
              name="memberId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {(members ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.customerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.memberId && <p className="text-xs text-destructive">{errors.memberId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Resource type</Label>
              <Controller
                control={control}
                name="resourceType"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v)
                      setValue('resourceId', '')
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={String(BookingResourceType.Desk)}>Desk</SelectItem>
                      <SelectItem value={String(BookingResourceType.MeetingRoom)}>Meeting Room</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Resource</Label>
              <Controller
                control={control}
                name="resourceId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a resource" />
                    </SelectTrigger>
                    <SelectContent>
                      {resources.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.resourceId && <p className="text-xs text-destructive">{errors.resourceId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startAt">Starts</Label>
              <Input id="startAt" type="datetime-local" {...register('startAt')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endAt">Ends</Label>
              <Input id="endAt" type="datetime-local" {...register('endAt')} />
              {errors.endAt && <p className="text-xs text-destructive">{errors.endAt.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBooking.isPending}>
              {createBooking.isPending ? 'Saving…' : 'Create booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
