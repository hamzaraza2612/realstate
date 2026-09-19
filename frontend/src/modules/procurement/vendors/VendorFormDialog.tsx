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
import type { VendorDto } from '@/types/api'
import { useCreateVendor, useUpdateVendor } from './api'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactPerson: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxRegistrationNumber: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function VendorFormDialog({ open, onOpenChange, vendor }: { open: boolean; onOpenChange: (open: boolean) => void; vendor?: VendorDto }) {
  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) {
      reset(
        vendor
          ? {
              name: vendor.name,
              contactPerson: vendor.contactPerson ?? '',
              email: vendor.email ?? '',
              phone: vendor.phone ?? '',
              address: vendor.address ?? '',
              taxRegistrationNumber: vendor.taxRegistrationNumber ?? '',
              notes: vendor.notes ?? '',
              isActive: vendor.isActive,
            }
          : { name: '', contactPerson: '', email: '', phone: '', address: '', taxRegistrationNumber: '', notes: '', isActive: true },
      )
    }
  }, [open, vendor, reset])

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      contactPerson: values.contactPerson || null,
      email: values.email || null,
      phone: values.phone || null,
      address: values.address || null,
      taxRegistrationNumber: values.taxRegistrationNumber || null,
      notes: values.notes || null,
    }
    try {
      if (vendor) {
        await updateVendor.mutateAsync({ id: vendor.id, payload: { ...payload, isActive: values.isActive } })
        toast({ title: 'Vendor updated', variant: 'success' })
      } else {
        await createVendor.mutateAsync(payload)
        toast({ title: 'Vendor created', variant: 'success' })
      }
      onOpenChange(false)
    } catch (error) {
      toast({ title: `Could not ${vendor ? 'update' : 'create'} vendor`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createVendor.isPending || updateVendor.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{vendor ? 'Edit vendor' : 'New vendor'}</DialogTitle>
          <DialogDescription>Suppliers used for purchase orders and expenses.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contactPerson">Contact person</Label>
              <Input id="contactPerson" {...register('contactPerson')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="taxRegistrationNumber">Tax registration #</Label>
              <Input id="taxRegistrationNumber" {...register('taxRegistrationNumber')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register('address')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>

          {vendor && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" {...register('isActive')} />
              Active
            </label>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : vendor ? 'Save changes' : 'Create vendor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
