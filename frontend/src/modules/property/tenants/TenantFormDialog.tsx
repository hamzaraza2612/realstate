import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { useCustomers } from '@/modules/crm/customers/api'
import type { RentalTenantDto } from '@/types/api'
import { useCreateTenant, useUpdateTenant } from './api'

const schema = z.object({
  customerId: z.string().optional(),
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  isCompany: z.boolean(),
  identificationNumber: z.string().optional(),
  isActive: z.boolean(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function TenantFormDialog({ open, onOpenChange, tenant }: { open: boolean; onOpenChange: (open: boolean) => void; tenant?: RentalTenantDto }) {
  const createTenant = useCreateTenant()
  const updateTenant = useUpdateTenant()
  const [mode, setMode] = useState<'existing' | 'new'>('new')
  const [customerSearch, setCustomerSearch] = useState('')
  const { data: customers } = useCustomers(1, customerSearch)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const customerId = watch('customerId')

  useEffect(() => {
    if (open) {
      setMode('new')
      setCustomerSearch('')
      reset(
        tenant
          ? {
              customerId: tenant.customerId,
              fullName: tenant.customerName,
              email: tenant.email ?? '',
              phone: tenant.phone ?? '',
              address: tenant.address ?? '',
              isCompany: tenant.isCompany,
              identificationNumber: tenant.identificationNumber ?? '',
              isActive: tenant.isActive,
              notes: tenant.notes ?? '',
            }
          : {
              customerId: '',
              fullName: '',
              email: '',
              phone: '',
              address: '',
              isCompany: false,
              identificationNumber: '',
              isActive: true,
              notes: '',
            },
      )
    }
  }, [open, tenant, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (tenant) {
        await updateTenant.mutateAsync({
          id: tenant.id,
          payload: {
            email: values.email || null,
            phone: values.phone || null,
            address: values.address || null,
            isCompany: values.isCompany,
            identificationNumber: values.identificationNumber || null,
            isActive: values.isActive,
            notes: values.notes || null,
          },
        })
        toast({ title: 'Tenant updated', variant: 'success' })
      } else {
        if (mode === 'existing' && !values.customerId) {
          toast({ title: 'Select a customer to link', variant: 'destructive' })
          return
        }
        if (mode === 'new' && !values.fullName) {
          toast({ title: 'Full name is required for a new tenant', variant: 'destructive' })
          return
        }
        await createTenant.mutateAsync({
          customerId: mode === 'existing' ? values.customerId! : null,
          fullName: mode === 'new' ? values.fullName! : null,
          email: values.email || null,
          phone: values.phone || null,
          address: values.address || null,
          isCompany: values.isCompany,
          identificationNumber: values.identificationNumber || null,
          notes: values.notes || null,
        })
        toast({ title: 'Tenant created', variant: 'success' })
      }
      onOpenChange(false)
    } catch (error) {
      toast({ title: `Could not ${tenant ? 'update' : 'create'} tenant`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createTenant.isPending || updateTenant.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{tenant ? 'Edit tenant' : 'New tenant'}</DialogTitle>
          <DialogDescription>Rental tenants are backed by a CRM customer record.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          {!tenant && (
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'existing' | 'new')}>
              <TabsList>
                <TabsTrigger value="new">New tenant</TabsTrigger>
                <TabsTrigger value="existing">Link existing customer</TabsTrigger>
              </TabsList>
              <TabsContent value="new">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" {...register('fullName')} />
                </div>
              </TabsContent>
              <TabsContent value="existing">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="customerSearch">Search customers</Label>
                  <Input id="customerSearch" placeholder="Search by name…" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                  <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border p-1">
                    {(customers?.items ?? []).length === 0 && <p className="p-2 text-xs text-muted-foreground">No customers found.</p>}
                    {(customers?.items ?? []).map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setValue('customerId', c.id)}
                        className={`flex flex-col rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent ${customerId === c.id ? 'bg-accent' : ''}`}
                      >
                        <span className="font-medium">{c.fullName}</span>
                        {c.email && <span className="text-xs text-muted-foreground">{c.email}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {tenant && (
            <div className="flex flex-col gap-1.5">
              <Label>Customer</Label>
              <p className="text-sm font-medium">{tenant.customerName}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register('address')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="identificationNumber">Identification # (optional)</Label>
              <Input id="identificationNumber" {...register('identificationNumber')} />
            </div>
            <label className="mt-6 flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" {...register('isCompany')} />
              Is a company
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>

          {tenant && (
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
              {isPending ? 'Saving…' : tenant ? 'Save changes' : 'Create tenant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
