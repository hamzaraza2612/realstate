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
import { useAllProperties } from '@/modules/property/properties/api'
import { useAllTenants } from '@/modules/property/tenants/api'
import { useUnitsByProperty } from '@/modules/property/units/api'
import { useUsers } from '@/modules/users/api'
import { useAllVendors } from '@/modules/procurement/vendors/api'
import { MaintenanceCategory, MaintenanceCategoryLabel, MaintenancePriority, MaintenancePriorityLabel } from '@/types/api'
import { useCreateMaintenanceRequest } from './api'

const NONE = 'none'
const today = () => new Date().toISOString().slice(0, 10)

const schema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  unitId: z.string().optional(),
  rentalTenantId: z.string().optional(),
  category: z.string(),
  priority: z.string(),
  description: z.string().min(1, 'Description is required'),
  reportedDate: z.string().min(1, 'Required'),
  assignedToUserId: z.string().optional(),
  assignedVendorId: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function MaintenanceRequestFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createRequest = useCreateMaintenanceRequest()
  const navigate = useNavigate()

  const { data: properties } = useAllProperties()
  const { data: tenants } = useAllTenants()
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
      propertyId: '',
      unitId: NONE,
      rentalTenantId: NONE,
      category: String(MaintenanceCategory.Other),
      priority: String(MaintenancePriority.Medium),
      description: '',
      reportedDate: today(),
      assignedToUserId: NONE,
      assignedVendorId: NONE,
    },
  })

  const propertyId = watch('propertyId')
  const { data: units } = useUnitsByProperty(propertyId || undefined)

  useEffect(() => {
    if (open) {
      reset({
        propertyId: '',
        unitId: NONE,
        rentalTenantId: NONE,
        category: String(MaintenanceCategory.Other),
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
        propertyId: values.propertyId,
        unitId: values.unitId && values.unitId !== NONE ? values.unitId : null,
        rentalTenantId: values.rentalTenantId && values.rentalTenantId !== NONE ? values.rentalTenantId : null,
        category: Number(values.category) as MaintenanceCategory,
        priority: Number(values.priority) as MaintenancePriority,
        description: values.description,
        reportedDate: values.reportedDate,
        assignedToUserId: values.assignedToUserId && values.assignedToUserId !== NONE ? values.assignedToUserId : null,
        assignedVendorId: values.assignedVendorId && values.assignedVendorId !== NONE ? values.assignedVendorId : null,
      })
      toast({ title: 'Maintenance request created', variant: 'success' })
      onOpenChange(false)
      navigate(`/property/maintenance/${created.id}`)
    } catch (error) {
      toast({ title: 'Could not create maintenance request', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New maintenance request</DialogTitle>
          <DialogDescription>Log a maintenance issue against a property, optionally scoped to a unit and tenant.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Property</Label>
              <Controller
                control={control}
                name="propertyId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a property" />
                    </SelectTrigger>
                    <SelectContent>
                      {(properties ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code} · {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.propertyId && <p className="text-xs text-destructive">{errors.propertyId.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Unit (optional)</Label>
              <Controller
                control={control}
                name="unitId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!propertyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Property-level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Property-level</SelectItem>
                      {(units ?? []).map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.unitNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tenant (optional)</Label>
            <Controller
              control={control}
              name="rentalTenantId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
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
                      {Object.entries(MaintenanceCategoryLabel).map(([value, label]) => (
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
