import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { useCreateCustomer } from './api'

const schema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  companyName: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function CustomerFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createCustomer = useCreateCustomer()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) reset({ fullName: '', email: '', phone: '', address: '', companyName: '' })
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      await createCustomer.mutateAsync({
        fullName: values.fullName,
        email: values.email || null,
        phone: values.phone || null,
        address: values.address || null,
        companyName: values.companyName || null,
      })
      toast({ title: 'Customer created', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not create customer', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
          <DialogDescription>Onboard a customer directly, without going through the lead pipeline.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" {...register('fullName')} />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="companyName">Company (optional)</Label>
              <Input id="companyName" {...register('companyName')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email (optional)</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" {...register('phone')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Address (optional)</Label>
            <Input id="address" {...register('address')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCustomer.isPending}>
              {createCustomer.isPending ? 'Creating…' : 'Create customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
