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
import { useAllTenants } from '@/modules/property/tenants/api'
import { FacilityType } from '@/types/api'
import { useCreateTenantNotice } from './api'

const NONE = 'none'
const today = () => new Date().toISOString().slice(0, 10)

const schema = z.object({
  facilityId: z.string().min(1, 'Facility is required'),
  rentalTenantId: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  content: z.string().min(1, 'Content is required'),
  noticeDate: z.string().min(1, 'Required'),
})

type FormValues = z.infer<typeof schema>

export function NoticeFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createNotice = useCreateTenantNotice()
  const { data: facilities } = useAllFacilities(FacilityType.ShoppingMall)
  const { data: tenants } = useAllTenants()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { facilityId: '', rentalTenantId: NONE, subject: '', content: '', noticeDate: today() },
  })

  useEffect(() => {
    if (open) reset({ facilityId: '', rentalTenantId: NONE, subject: '', content: '', noticeDate: today() })
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      await createNotice.mutateAsync({
        facilityId: values.facilityId,
        rentalTenantId: values.rentalTenantId && values.rentalTenantId !== NONE ? values.rentalTenantId : null,
        subject: values.subject,
        content: values.content,
        noticeDate: values.noticeDate,
      })
      toast({ title: 'Notice created', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not create notice', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New tenant notice</DialogTitle>
          <DialogDescription>Send a facility-wide notice, or target a specific tenant.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
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
              <Label>Tenant (optional)</Label>
              <Controller
                control={control}
                name="rentalTenantId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Facility-wide" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Facility-wide</SelectItem>
                      {(tenants ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.customerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" {...register('subject')} />
            {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="content">Content</Label>
            <Textarea id="content" {...register('content')} />
            {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="noticeDate">Notice date</Label>
            <Input id="noticeDate" type="date" {...register('noticeDate')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createNotice.isPending}>
              {createNotice.isPending ? 'Saving…' : 'Create notice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
