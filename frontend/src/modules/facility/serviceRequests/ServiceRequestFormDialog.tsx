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
import { useAllFacilities } from '@/modules/facility/facilities/api'
import { useSpacesByFacility } from '@/modules/facility/spaces/api'
import { useAllVendors } from '@/modules/procurement/vendors/api'
import { useUsers } from '@/modules/users/api'
import { MaintenancePriority, MaintenancePriorityLabel, ServiceRequestCategory, ServiceRequestCategoryLabel } from '@/types/api'
import { useCreateServiceRequest } from './api'

const NONE = 'none'
const today = () => new Date().toISOString().slice(0, 10)

const schema = z.object({
  facilityId: z.string().min(1, 'Facility is required'),
  spaceId: z.string().optional(),
  requesterCustomerId: z.string().optional(),
  category: z.string(),
  priority: z.string(),
  description: z.string().min(1, 'Description is required'),
  reportedDate: z.string().min(1, 'Required'),
  assignedToUserId: z.string().optional(),
  assignedVendorId: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function ServiceRequestFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createRequest = useCreateServiceRequest()
  const navigate = useNavigate()

  const { data: facilities } = useAllFacilities()
  const { data: users } = useUsers(1, '')
  const { data: vendors } = useAllVendors()

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      facilityId: '',
      spaceId: NONE,
      requesterCustomerId: '',
      category: String(ServiceRequestCategory.Other),
      priority: String(MaintenancePriority.Medium),
      description: '',
      reportedDate: today(),
      assignedToUserId: NONE,
      assignedVendorId: NONE,
    },
  })

  const facilityId = watch('facilityId')
  const { data: spaces } = useSpacesByFacility(facilityId || undefined)

  useEffect(() => {
    if (open) {
      reset({
        facilityId: '',
        spaceId: NONE,
        requesterCustomerId: '',
        category: String(ServiceRequestCategory.Other),
        priority: String(MaintenancePriority.Medium),
        description: '',
        reportedDate: today(),
        assignedToUserId: NONE,
        assignedVendorId: NONE,
      })
    }
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      const created = await createRequest.mutateAsync({
        facilityId: values.facilityId,
        spaceId: values.spaceId && values.spaceId !== NONE ? values.spaceId : null,
        requesterCustomerId: values.requesterCustomerId || null,
        category: Number(values.category) as ServiceRequestCategory,
        priority: Number(values.priority) as MaintenancePriority,
        description: values.description,
        reportedDate: values.reportedDate,
        assignedToUserId: values.assignedToUserId && values.assignedToUserId !== NONE ? values.assignedToUserId : null,
        assignedVendorId: values.assignedVendorId && values.assignedVendorId !== NONE ? values.assignedVendorId : null,
      })
      toast({ title: 'Service request created', variant: 'success' })
      onOpenChange(false)
      navigate(`/facility/service-requests/${created.id}`)
    } catch (error) {
      toast({ title: 'Could not create service request', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New service request</DialogTitle>
          <DialogDescription>Log a facility-level service issue such as cleaning, security or front-desk support.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Facility</Label>
              <Controller
                control={control}
                name="facilityId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a facility" />
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
              <Label>Space (optional)</Label>
              <Controller
                control={control}
                name="spaceId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!facilityId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Facility-level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Facility-level</SelectItem>
                      {(spaces ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="requesterCustomerId">Requester customer ID (optional)</Label>
            <Input id="requesterCustomerId" placeholder="Customer GUID, if applicable" {...register('requesterCustomerId')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ServiceRequestCategoryLabel).map(([value, label]) => (
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
              <Label>Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MaintenancePriorityLabel).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reportedDate">Reported date</Label>
            <Input id="reportedDate" type="date" {...register('reportedDate')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Assign to user (optional)</Label>
              <Controller
                control={control}
                name="assignedToUserId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Unassigned</SelectItem>
                      {(users?.items ?? []).map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Assign to vendor (optional)</Label>
              <Controller
                control={control}
                name="assignedVendorId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {(vendors ?? []).map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createRequest.isPending}>
              {createRequest.isPending ? 'Saving…' : 'Create request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
