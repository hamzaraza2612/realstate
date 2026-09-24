import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { DocumentsPanel } from '@/modules/documents/DocumentsPanel'
import { ActivityFormDialog } from '../activities/ActivityFormDialog'
import { ActivityList } from '../activities/ActivityList'
import { useCustomer, useUpdateCustomer } from './api'

const schema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  companyName: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: customer, isLoading, isError, refetch } = useCustomer(id)
  const updateCustomer = useUpdateCustomer()
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (customer) {
      reset({
        fullName: customer.fullName,
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        address: customer.address ?? '',
        companyName: customer.companyName ?? '',
      })
    }
  }, [customer, reset])

  async function onSubmit(values: FormValues) {
    if (!id) return
    try {
      await updateCustomer.mutateAsync({
        id,
        payload: {
          fullName: values.fullName,
          email: values.email || null,
          phone: values.phone || null,
          address: values.address || null,
          companyName: values.companyName || null,
        },
      })
      toast({ title: 'Customer updated', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not update customer', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState label="Loading customer…" />
  if (isError || !customer) return <ErrorState message="Could not load this customer." onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        title={customer.fullName}
        description={customer.companyName ?? 'Customer profile'}
        actions={
          customer.convertedFromLeadId ? (
            <Button variant="outline" onClick={() => navigate(`/crm/leads/${customer.convertedFromLeadId}`)}>
              View originating lead
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Customer profile</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" {...register('fullName')} />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register('phone')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="companyName">Company</Label>
                <Input id="companyName" {...register('companyName')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register('address')} />
              </div>
            </CardContent>
            <CardFooter>
              <PermissionGate permission="crm.customer.manage">
                <Button type="submit" disabled={!isDirty || updateCustomer.isPending}>
                  {updateCustomer.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </PermissionGate>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Origin</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={customer.convertedFromLeadId ? 'secondary' : 'outline'}>
              {customer.convertedFromLeadId ? 'Converted from lead' : 'Direct customer'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Activity</CardTitle>
          <PermissionGate permission="crm.activity.manage">
            <Button size="sm" onClick={() => setActivityDialogOpen(true)}>
              Log activity
            </Button>
          </PermissionGate>
        </CardHeader>
        <CardContent>
          <ActivityList customerId={id} />
        </CardContent>
      </Card>

      <ActivityFormDialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen} customerId={id} />

      {id && (
        <div className="mt-6">
          <DocumentsPanel entityType="Customer" entityId={id} />
        </div>
      )}
    </div>
  )
}
