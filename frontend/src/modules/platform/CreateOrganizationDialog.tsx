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
import { useCreatePlatformOrganization } from './api'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  timezone: z.string().min(1, 'Timezone is required'),
  contactEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
  ownerFullName: z.string().min(1, "Owner's name is required"),
  ownerEmail: z.string().min(1, 'Owner email is required').email('Enter a valid email'),
  ownerPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormValues = z.infer<typeof schema>

export function CreateOrganizationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createOrg = useCreatePlatformOrganization()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { timezone: 'UTC' } })

  useEffect(() => {
    if (open) reset({ name: '', slug: '', timezone: 'UTC', contactEmail: '', ownerFullName: '', ownerEmail: '', ownerPassword: '' })
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      await createOrg.mutateAsync({
        name: values.name,
        slug: values.slug,
        timezone: values.timezone,
        contactEmail: values.contactEmail || null,
        contactPhone: null,
        subscriptionPlanId: null,
        ownerFullName: values.ownerFullName,
        ownerEmail: values.ownerEmail,
        ownerPassword: values.ownerPassword,
      })
      toast({ title: 'Organization created', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not create organization', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>Onboard a new tenant and its first Organization Owner account.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Organization name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" placeholder="acme-builders" {...register('slug')} />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" {...register('timezone')} />
              {errors.timezone && <p className="text-xs text-destructive">{errors.timezone.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contactEmail">Contact email (optional)</Label>
              <Input id="contactEmail" type="email" {...register('contactEmail')} />
              {errors.contactEmail && <p className="text-xs text-destructive">{errors.contactEmail.message}</p>}
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="mb-3 text-sm font-medium">Organization Owner</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ownerFullName">Full name</Label>
                <Input id="ownerFullName" {...register('ownerFullName')} />
                {errors.ownerFullName && <p className="text-xs text-destructive">{errors.ownerFullName.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ownerEmail">Email</Label>
                <Input id="ownerEmail" type="email" {...register('ownerEmail')} />
                {errors.ownerEmail && <p className="text-xs text-destructive">{errors.ownerEmail.message}</p>}
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-1.5">
              <Label htmlFor="ownerPassword">Temporary password</Label>
              <Input id="ownerPassword" type="password" {...register('ownerPassword')} />
              {errors.ownerPassword && <p className="text-xs text-destructive">{errors.ownerPassword.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createOrg.isPending}>
              {createOrg.isPending ? 'Creating…' : 'Create organization'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
