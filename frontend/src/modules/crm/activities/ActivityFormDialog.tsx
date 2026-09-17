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
import { ActivityType, ActivityTypeLabel } from '@/types/api'
import { useCreateActivity } from './api'

const schema = z.object({
  type: z.string(),
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().optional(),
  dueDate: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function ActivityFormDialog({
  open,
  onOpenChange,
  leadId,
  customerId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId?: string
  customerId?: string
}) {
  const createActivity = useCreateActivity()
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { type: String(ActivityType.Call) } })

  useEffect(() => {
    if (open) reset({ type: String(ActivityType.Call), subject: '', description: '', dueDate: '' })
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      await createActivity.mutateAsync({
        type: Number(values.type) as ActivityType,
        subject: values.subject,
        description: values.description || null,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
        leadId: leadId ?? null,
        customerId: customerId ?? null,
        assignedToUserId: null,
      })
      toast({ title: 'Activity logged', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not log activity', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log activity</DialogTitle>
          <DialogDescription>Record a call, meeting, note, or schedule a follow-up.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ActivityTypeLabel).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dueDate">Due date (optional)</Label>
              <Input id="dueDate" type="datetime-local" {...register('dueDate')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" {...register('subject')} />
            {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" {...register('description')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createActivity.isPending}>
              {createActivity.isPending ? 'Saving…' : 'Log activity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
