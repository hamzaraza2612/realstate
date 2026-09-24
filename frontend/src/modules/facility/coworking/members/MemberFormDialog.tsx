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
import type { CoworkingMemberDto } from '@/types/api'
import { useCreateMember, useUpdateMember } from './api'

const schema = z.object({
  customerId: z.string().optional(),
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function MemberFormDialog({ open, onOpenChange, member }: { open: boolean; onOpenChange: (open: boolean) => void; member?: CoworkingMemberDto }) {
  const createMember = useCreateMember()
  const updateMember = useUpdateMember()
  const [mode, setMode] = useState<'existing' | 'new'>('new')
  const [customerSearch, setCustomerSearch] = useState('')
  const { data: customers } = useCustomers(1, customerSearch)

  const { register, handleSubmit, reset, watch, setValue } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const customerId = watch('customerId')

  useEffect(() => {
    if (open) {
      setMode('new')
      setCustomerSearch('')
      reset(
        member
          ? { customerId: member.customerId, fullName: member.customerName, email: member.email ?? '', phone: member.phone ?? '', isActive: member.isActive, notes: member.notes ?? '' }
          : { customerId: '', fullName: '', email: '', phone: '', isActive: true, notes: '' },
      )
    }
  }, [open, member, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (member) {
        await updateMember.mutateAsync({ id: member.id, payload: { isActive: values.isActive, notes: values.notes || null } })
        toast({ title: 'Member updated', variant: 'success' })
      } else {
        if (mode === 'existing' && !values.customerId) {
          toast({ title: 'Select a customer to link', variant: 'destructive' })
          return
        }
        if (mode === 'new' && !values.fullName) {
          toast({ title: 'Full name is required for a new member', variant: 'destructive' })
          return
        }
        await createMember.mutateAsync({
          customerId: mode === 'existing' ? values.customerId! : null,
          fullName: mode === 'new' ? values.fullName! : null,
          email: values.email || null,
          phone: values.phone || null,
          notes: values.notes || null,
        })
        toast({ title: 'Member created', variant: 'success' })
      }
      onOpenChange(false)
    } catch (error) {
      toast({ title: `Could not ${member ? 'update' : 'create'} member`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createMember.isPending || updateMember.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{member ? 'Edit member' : 'New member'}</DialogTitle>
          <DialogDescription>Coworking members are backed by a CRM customer record.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          {!member && (
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'existing' | 'new')}>
              <TabsList>
                <TabsTrigger value="new">New member</TabsTrigger>
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

          {member && (
            <div className="flex flex-col gap-1.5">
              <Label>Customer</Label>
              <p className="text-sm font-medium">{member.customerName}</p>
            </div>
          )}

          {!member && (
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
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>

          {member && (
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
              {isPending ? 'Saving…' : member ? 'Save changes' : 'Create member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
