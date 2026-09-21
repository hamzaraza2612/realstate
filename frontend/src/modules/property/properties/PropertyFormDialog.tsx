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
import { PropertyStatus, PropertyStatusLabel, PropertyType, PropertyTypeLabel, type PropertyDto } from '@/types/api'
import { useCreateProperty, useUpdateProperty } from './api'

const schema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  type: z.string(),
  status: z.string(),
  description: z.string().optional(),
  addressLine: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  ownerName: z.string().optional(),
  ownerContact: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function PropertyFormDialog({ open, onOpenChange, property }: { open: boolean; onOpenChange: (open: boolean) => void; property?: PropertyDto }) {
  const createProperty = useCreateProperty()
  const updateProperty = useUpdateProperty()

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
        property
          ? {
              code: property.code,
              name: property.name,
              type: String(property.type),
              status: String(property.status),
              description: property.description ?? '',
              addressLine: property.addressLine ?? '',
              city: property.city ?? '',
              state: property.state ?? '',
              country: property.country ?? '',
              postalCode: property.postalCode ?? '',
              ownerName: property.ownerName ?? '',
              ownerContact: property.ownerContact ?? '',
            }
          : {
              code: '',
              name: '',
              type: String(PropertyType.Building),
              status: String(PropertyStatus.Active),
              description: '',
              addressLine: '',
              city: '',
              state: '',
              country: '',
              postalCode: '',
              ownerName: '',
              ownerContact: '',
            },
      )
    }
  }, [open, property, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (property) {
        await updateProperty.mutateAsync({
          id: property.id,
          payload: {
            name: values.name,
            status: Number(values.status) as PropertyStatus,
            description: values.description || null,
            addressLine: values.addressLine || null,
            city: values.city || null,
            state: values.state || null,
            country: values.country || null,
            postalCode: values.postalCode || null,
            ownerName: values.ownerName || null,
            ownerContact: values.ownerContact || null,
          },
        })
        toast({ title: 'Property updated', variant: 'success' })
      } else {
        await createProperty.mutateAsync({
          code: values.code,
          name: values.name,
          type: Number(values.type) as PropertyType,
          description: values.description || null,
          addressLine: values.addressLine || null,
          city: values.city || null,
          state: values.state || null,
          country: values.country || null,
          postalCode: values.postalCode || null,
          ownerName: values.ownerName || null,
          ownerContact: values.ownerContact || null,
        })
        toast({ title: 'Property created', variant: 'success' })
      }
      onOpenChange(false)
    } catch (error) {
      toast({ title: `Could not ${property ? 'update' : 'create'} property`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createProperty.isPending || updateProperty.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{property ? 'Edit property' : 'New property'}</DialogTitle>
          <DialogDescription>Properties managed under the Property & Rental module.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" {...register('code')} disabled={!!property} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!!property}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PropertyTypeLabel).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {property && (
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
                        {Object.entries(PropertyStatusLabel).map(([value, label]) => (
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

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" {...register('state')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register('country')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="postalCode">Postal code</Label>
              <Input id="postalCode" {...register('postalCode')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ownerName">Owner name</Label>
              <Input id="ownerName" {...register('ownerName')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ownerContact">Owner contact</Label>
              <Input id="ownerContact" {...register('ownerContact')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : property ? 'Save changes' : 'Create property'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
