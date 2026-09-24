import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { MaintenanceStatus, type ServiceRequestDto } from '@/types/api'
import { useUpdateServiceRequestStatus } from './api'

const schema = z.object({
  resolutionNotes: z.string().min(1, 'Resolution notes are required'),
})

type FormValues = z.infer<typeof schema>

export function ServiceRequestResolveDialog({
  open,
  onOpenChange,
  request,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  request?: ServiceRequestDto
}) {
  const updateStatus = useUpdateServiceRequestStatus()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { resolutionNotes: '' } })

  useEffect(() => {
    if (open) reset({ resolutionNotes: '' })
  }, [open, reset])

  if (!request) return null

  async function onSubmit(values: FormValues) {
    if (!request) return
    try {
      await updateStatus.mutateAsync({ id: request.id, payload: { status: MaintenanceStatus.Resolved, resolutionNotes: values.resolutionNotes } })
      toast({ title: 'Service request resolved', variant: 'success' })
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
          <DialogDescription>Record how the issue was resolved.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resolutionNotes">Resolution notes</Label>
            <Textarea id="resolutionNotes" {...register('resolutionNotes')} />
            {errors.resolutionNotes && <p className="text-xs text-destructive">{errors.resolutionNotes.message}</p>}
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
