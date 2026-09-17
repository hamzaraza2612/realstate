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
import type { SubscriptionPlanDto } from '@/types/api'
import { useCreateSubscriptionPlan, useUpdateSubscriptionPlan } from './api'

const numeric = (message: string) =>
  z
    .string()
    .min(1, message)
    .refine((v) => !Number.isNaN(Number(v)), message)

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: numeric('Must be 0 or more'),
  userLimit: numeric('Must be at least 1'),
  projectLimit: numeric('Must be at least 1'),
  storageLimitMb: numeric('Must be at least 1'),
  features: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function SubscriptionPlanFormDialog({
  plan,
  onOpenChange,
}: {
  plan: SubscriptionPlanDto | 'new' | null
  onOpenChange: (open: boolean) => void
}) {
  const createPlan = useCreateSubscriptionPlan()
  const updatePlan = useUpdateSubscriptionPlan()
  const isEditing = plan !== null && plan !== 'new'
  const open = plan !== null

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (isEditing) {
      reset({
        name: plan.name,
        price: String(plan.price),
        userLimit: String(plan.userLimit),
        projectLimit: String(plan.projectLimit),
        storageLimitMb: String(plan.storageLimitMb),
        features: plan.features.join(', '),
      })
    } else if (plan === 'new') {
      reset({ name: '', price: '0', userLimit: '5', projectLimit: '3', storageLimitMb: '1024', features: '' })
    }
  }, [plan, isEditing, reset])

  async function onSubmit(values: FormValues) {
    const features = (values.features ?? '')
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean)

    try {
      if (isEditing) {
        await updatePlan.mutateAsync({
          id: plan.id,
          payload: {
            name: values.name,
            price: Number(values.price),
            billingCycle: 0,
            userLimit: Number(values.userLimit),
            projectLimit: Number(values.projectLimit),
            storageLimitMb: Number(values.storageLimitMb),
            isActive: plan.isActive,
            features,
          },
        })
      } else {
        await createPlan.mutateAsync({
          name: values.name,
          price: Number(values.price),
          billingCycle: 0,
          userLimit: Number(values.userLimit),
          projectLimit: Number(values.projectLimit),
          storageLimitMb: Number(values.storageLimitMb),
          features,
        })
      }
      toast({ title: isEditing ? 'Plan updated' : 'Plan created', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not save plan', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createPlan.isPending || updatePlan.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${plan.name}` : 'Create subscription plan'}</DialogTitle>
          <DialogDescription>Define limits and included feature modules for this plan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-name">Name</Label>
              <Input id="plan-name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Price / month</Label>
              <Input id="price" type="number" step="0.01" {...register('price')} />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="userLimit">User limit</Label>
              <Input id="userLimit" type="number" {...register('userLimit')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="projectLimit">Project limit</Label>
              <Input id="projectLimit" type="number" {...register('projectLimit')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="storageLimitMb">Storage (MB)</Label>
              <Input id="storageLimitMb" type="number" {...register('storageLimitMb')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="features">Feature codes (comma-separated)</Label>
            <Input id="features" placeholder="crm, sales, construction" {...register('features')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
