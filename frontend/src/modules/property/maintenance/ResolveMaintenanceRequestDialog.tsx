import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { MaintenanceStatus, type MaintenanceRequestDto } from '@/types/api'
import { useUpdateMaintenanceStatus } from './api'

const today = () => new Date().toISOString().slice(0, 10)

const schema = z.object({
  resolutionNotes: z.string().min(1, 'Resolution notes are required'),
  completionDate: z.string().min(1, 'Required'),
})

type FormValues = z.infer<typeof schema>

export function ResolveMaintenanceRequestDialog({
  open,
  onOpenChange,
  request,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  request?: MaintenanceRequestDto
}) {
  const updateStatus = useUpdateMaintenanceStatus()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { resolutionNotes: '', completionDate: today() } })

  useEffect(() => {
    if (open) reset({ resolutionNotes: '', completionDate: today() })
  }, [open, reset])

  if (!request) return null

  async function onSubmit(values: FormValues) {
    if (!request) return
    try {
      await updateStatus.mutateAsync({
        id: request.id,
        payload: { status: MaintenanceStatus.Resolved, resolutionNotes: values.resolutionNotes, completionDate: values.completionDate },
      })
      toast({ title: 'Maintenance request resolved', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not resolve request', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve request</DialogTitle>
          <DialogDescription>Record how the issue was resolved and when it was completed.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resolutionNotes">Resolution notes</Label>
            <Textarea id="resolutionNotes" {...register('resolutionNotes')} />
            {errors.resolutionNotes && <p className="text-xs text-destructive">{errors.resolutionNotes.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="completionDate">Completion date</Label>
            <Input id="completionDate" type="date" {...register('completionDate')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateStatus.isPending}>
              {updateStatus.isPending ? 'Saving…' : 'Mark resolved'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
