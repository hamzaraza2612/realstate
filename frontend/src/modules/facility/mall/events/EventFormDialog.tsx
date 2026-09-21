import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { useAllFacilities } from '@/modules/facility/facilities/api'
import { FacilityType } from '@/types/api'
import { useCreateFacilityEvent } from './api'

const schema = z
  .object({
    facilityId: z.string().min(1, 'Facility is required'),
    title: z.string().min(1, 'Title is required'),
    startAt: z.string().min(1, 'Required'),
    endAt: z.string().min(1, 'Required'),
    location: z.string().optional(),
    organizer: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((v) => v.endAt > v.startAt, { message: 'End must be after start', path: ['endAt'] })

type FormValues = z.infer<typeof schema>

export function EventFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createEvent = useCreateFacilityEvent()
  const { data: facilities } = useAllFacilities(FacilityType.ShoppingMall)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { facilityId: '', title: '', startAt: '', endAt: '', location: '', organizer: '', notes: '' },
  })

  useEffect(() => {
    if (open) reset({ facilityId: '', title: '', startAt: '', endAt: '', location: '', organizer: '', notes: '' })
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      await createEvent.mutateAsync({
        facilityId: values.facilityId,
        title: values.title,
        startAt: values.startAt,
        endAt: values.endAt,
        location: values.location || null,
        organizer: values.organizer || null,
        notes: values.notes || null,
      })
      toast({ title: 'Event created', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not create event', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New event</DialogTitle>
          <DialogDescription>Schedule a mall event, promotion or activation.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label>Facility</Label>
            <Controller
              control={control}
              name="facilityId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a mall facility" />
                  </SelectTrigger>
                  <SelectContent>
                    {(facilities ?? []).map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.code} · {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.facilityId && <p className="text-xs text-destructive">{errors.facilityId.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location">Location (optional)</Label>
              <Input id="location" {...register('location')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="organizer">Organizer (optional)</Label>
              <Input id="organizer" {...register('organizer')} />
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
            <Button type="submit" disabled={createEvent.isPending}>
              {createEvent.isPending ? 'Saving…' : 'Create event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
