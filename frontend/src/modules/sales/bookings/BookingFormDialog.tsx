import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { useCustomers } from '@/modules/crm/customers/api'
import { useAllProjects } from '@/modules/projects/api'
import { useInventory } from '@/modules/inventory/api'
import { useUsers } from '@/modules/users/api'
import { InventoryStatus } from '@/types/api'
import { useCreateBooking } from './api'

const schema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  projectId: z.string().min(1, 'Project is required'),
  inventoryUnitId: z.string().min(1, 'Inventory unit is required'),
  salesAgentUserId: z.string().min(1, 'Sales agent is required'),
  bookingDate: z.string().min(1, 'Booking date is required'),
  totalPrice: z.string().min(1, 'Total price is required'),
  discount: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const today = () => new Date().toISOString().slice(0, 10)

export function BookingFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createBooking = useCreateBooking()
  const navigate = useNavigate()
  const [customerSearch, setCustomerSearch] = useState('')

  const { data: customers } = useCustomers(1, customerSearch)
  const { data: projects } = useAllProjects()
  const { data: users } = useUsers(1, '')

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { bookingDate: today() },
  })

  const selectedProjectId = watch('projectId')
  const { data: units } = useInventory(1, { projectId: selectedProjectId || undefined, status: InventoryStatus.Available }, 100)

  useEffect(() => {
    if (open) {
      reset({ customerId: '', projectId: '', inventoryUnitId: '', salesAgentUserId: '', bookingDate: today(), totalPrice: '', discount: '', notes: '' })
      setCustomerSearch('')
    }
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      const booking = await createBooking.mutateAsync({
        customerId: values.customerId,
        projectId: values.projectId,
        inventoryUnitId: values.inventoryUnitId,
        salesAgentUserId: values.salesAgentUserId,
        bookingDate: values.bookingDate,
        totalPrice: Number(values.totalPrice),
        discount: values.discount ? Number(values.discount) : 0,
        notes: values.notes || null,
      })
      toast({ title: 'Booking created', variant: 'success' })
      onOpenChange(false)
      navigate(`/sales/bookings/${booking.id}`)
    } catch (error) {
      toast({ title: 'Could not create booking', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New booking</DialogTitle>
          <DialogDescription>Link a customer to an available inventory unit.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Customer</Label>
            <Input placeholder="Search customers…" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="mb-1" />
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {(customers?.items ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Project</Label>
              <Controller
                control={control}
                name="projectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {(projects ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.projectId && <p className="text-xs text-destructive">{errors.projectId.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Available unit</Label>
              <Controller
                control={control}
                name="inventoryUnitId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!selectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedProjectId ? 'Select a unit' : 'Pick a project first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(units?.items ?? []).map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.code}
                        </SelectItem>
                      ))}
                      {selectedProjectId && (units?.items.length ?? 0) === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No available units</div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.inventoryUnitId && <p className="text-xs text-destructive">{errors.inventoryUnitId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Sales agent</Label>
              <Controller
                control={control}
                name="salesAgentUserId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {(users?.items ?? []).map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.salesAgentUserId && <p className="text-xs text-destructive">{errors.salesAgentUserId.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bookingDate">Booking date</Label>
              <Input id="bookingDate" type="date" {...register('bookingDate')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="totalPrice">Total price</Label>
              <Input id="totalPrice" type="number" step="0.01" {...register('totalPrice')} />
              {errors.totalPrice && <p className="text-xs text-destructive">{errors.totalPrice.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discount">Discount (optional)</Label>
              <Input id="discount" type="number" step="0.01" {...register('discount')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBooking.isPending}>
              {createBooking.isPending ? 'Creating…' : 'Create booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
