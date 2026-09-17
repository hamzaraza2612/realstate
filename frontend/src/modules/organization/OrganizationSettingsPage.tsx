import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { PermissionGate } from '@/components/common/PermissionGate'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { TenantStatusLabel } from '@/types/api'
import { useCurrentOrganization, useUpdateCurrentOrganization } from './api'

const schema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  contactEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  timezone: z.string().min(1, 'Timezone is required'),
})

type FormValues = z.infer<typeof schema>

export function OrganizationSettingsPage() {
  const { data: org, isLoading, isError, refetch } = useCurrentOrganization()
  const updateOrg = useUpdateCurrentOrganization()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (org) {
      reset({
        name: org.name,
        contactEmail: org.contactEmail ?? '',
        contactPhone: org.contactPhone ?? '',
        timezone: org.timezone,
      })
    }
  }, [org, reset])

  async function onSubmit(values: FormValues) {
    try {
      await updateOrg.mutateAsync({
        name: values.name,
        contactEmail: values.contactEmail || null,
        contactPhone: values.contactPhone || null,
        timezone: values.timezone,
      })
      toast({ title: 'Organization updated', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not update organization', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader title="Organization" description="Your company's profile as seen across the platform." />

      {isLoading && <LoadingState label="Loading organization…" />}
      {isError && <ErrorState message="Could not load organization." onRetry={() => refetch()} />}

      {org && (
        <Card className="max-w-2xl">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{org.name}</CardTitle>
              <CardDescription>/{org.slug}</CardDescription>
            </div>
            <Badge variant={org.status === 1 ? 'success' : 'secondary'}>{TenantStatusLabel[org.status]}</Badge>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="name">Organization name</Label>
                <Input id="name" {...register('name')} disabled={!org} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input id="contactEmail" type="email" {...register('contactEmail')} />
                {errors.contactEmail && <p className="text-xs text-destructive">{errors.contactEmail.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contactPhone">Contact phone</Label>
                <Input id="contactPhone" {...register('contactPhone')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" {...register('timezone')} />
                {errors.timezone && <p className="text-xs text-destructive">{errors.timezone.message}</p>}
              </div>
            </CardContent>
            <CardFooter>
              <PermissionGate permission="organizations.manage">
                <Button type="submit" disabled={!isDirty || updateOrg.isPending}>
                  {updateOrg.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </PermissionGate>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  )
}
