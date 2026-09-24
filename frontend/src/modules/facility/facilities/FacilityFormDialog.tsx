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
import { useAllProperties } from '@/modules/property/properties/api'
import { useUsers } from '@/modules/users/api'
import { FacilityOperatingStatus, FacilityOperatingStatusLabel, FacilityType, FacilityTypeLabel, type FacilityDto } from '@/types/api'
import { useCreateFacility, useUpdateFacility } from './api'

const NONE = 'none'

const schema = z.object({
  code: z.string().min(1, 'Code is required'),
  propertyId: z.string().min(1, 'Property is required'),
  type: z.string(),
  status: z.string(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  addressLine: z.string().optional(),
  city: z.string().optional(),
  managerUserId: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function FacilityFormDialog({ open, onOpenChange, facility }: { open: boolean; onOpenChange: (open: boolean) => void; facility?: FacilityDto }) {
  const createFacility = useCreateFacility()
  const updateFacility = useUpdateFacility()
  const { data: properties } = useAllProperties()
  const { data: users } = useUsers(1, '')

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
        facility
          ? {
              code: facility.code,
              propertyId: facility.propertyId,
              type: String(facility.type),
              status: String(facility.status),
              name: facility.name,
              description: facility.description ?? '',
              addressLine: facility.addressLine ?? '',
              city: facility.city ?? '',
              managerUserId: facility.managerUserId ?? NONE,
            }
          : {
              code: '',
              propertyId: '',
              type: String(FacilityType.ShoppingMall),
              status: String(FacilityOperatingStatus.Active),
              name: '',
              description: '',
              addressLine: '',
              city: '',
              managerUserId: NONE,
            },
      )
    }
  }, [open, facility, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (facility) {
        await updateFacility.mutateAsync({
          id: facility.id,
          payload: {
            name: values.name,
            status: Number(values.status) as FacilityOperatingStatus,
            description: values.description || null,
            addressLine: values.addressLine || null,
            city: values.city || null,
            managerUserId: values.managerUserId && values.managerUserId !== NONE ? values.managerUserId : null,
          },
        })
        toast({ title: 'Facility updated', variant: 'success' })
      } else {
        await createFacility.mutateAsync({
          code: values.code,
          propertyId: values.propertyId,
          type: Number(values.type) as FacilityType,
          name: values.name,
          description: values.description || null,
          addressLine: values.addressLine || null,
          city: values.city || null,
          managerUserId: values.managerUserId && values.managerUserId !== NONE ? values.managerUserId : null,
        })
        toast({ title: 'Facility created', variant: 'success' })
      }
      onOpenChange(false)
    } catch (error) {
      toast({ title: `Could not ${facility ? 'update' : 'create'} facility`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createFacility.isPending || updateFacility.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{facility ? 'Edit facility' : 'New facility'}</DialogTitle>
          <DialogDescription>Facilities specialize a property for mall, coworking or other shared-space operations.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" {...register('code')} disabled={!!facility} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Property</Label>
            <Controller
              control={control}
              name="propertyId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!!facility}>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!!facility}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FacilityTypeLabel).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {facility && (
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
                        {Object.entries(FacilityOperatingStatusLabel).map(([value, label]) => (
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
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" {...register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addressLine">Address</Label>
              <Input id="addressLine" {...register('addressLine')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register('city')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Manager (optional)</Label>
            <Controller
              control={control}
              name="managerUserId"
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : facility ? 'Save changes' : 'Create facility'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
