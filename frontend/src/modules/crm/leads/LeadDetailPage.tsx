import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { LeadPriority, LeadPriorityLabel, LeadSourceLabel, LeadStatus, LeadStatusLabel } from '@/types/api'
import { ActivityFormDialog } from '../activities/ActivityFormDialog'
import { ActivityList } from '../activities/ActivityList'
import { useConvertLead, useDeleteLead, useLead, useUpdateLead } from './api'

const schema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  status: z.string(),
  priority: z.string(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: lead, isLoading, isError, refetch } = useLead(id)
  const updateLead = useUpdateLead()
  const convertLead = useConvertLead()
  const deleteLead = useDeleteLead()
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (lead) {
      reset({
        fullName: lead.fullName,
        email: lead.email ?? '',
        phone: lead.phone ?? '',
        companyName: lead.companyName ?? '',
        status: String(lead.status),
        priority: String(lead.priority),
        notes: lead.notes ?? '',
      })
    }
  }, [lead, reset])

  async function onSubmit(values: FormValues) {
    if (!id) return
    try {
      await updateLead.mutateAsync({
        id,
        payload: {
          fullName: values.fullName,
          email: values.email || null,
          phone: values.phone || null,
          companyName: values.companyName || null,
          status: Number(values.status) as LeadStatus,
          priority: Number(values.priority) as LeadPriority,
          notes: values.notes || null,
        },
      })
      toast({ title: 'Lead updated', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not update lead', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  async function handleConvert() {
    if (!id) return
    try {
      const customer = await convertLead.mutateAsync(id)
      toast({ title: 'Lead converted to customer', variant: 'success' })
      navigate(`/crm/customers/${customer.id}`)
    } catch (error) {
      toast({ title: 'Could not convert lead', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  async function handleDelete() {
    if (!id) return
    try {
      await deleteLead.mutateAsync(id)
      toast({ title: 'Lead deleted', variant: 'success' })
      navigate('/crm/leads')
    } catch (error) {
      toast({ title: 'Could not delete lead', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState label="Loading lead…" />
  if (isError || !lead) return <ErrorState message="Could not load this lead." onRetry={() => refetch()} />

  const isConverted = lead.convertedToCustomerId !== null

  return (
    <div>
      <PageHeader
        title={lead.fullName}
        description={`${LeadSourceLabel[lead.source]} lead${lead.companyName ? ` · ${lead.companyName}` : ''}`}
        actions={
          <div className="flex gap-2">
            {isConverted ? (
              <Button variant="outline" onClick={() => navigate(`/crm/customers/${lead.convertedToCustomerId}`)}>
                View customer
              </Button>
            ) : (
              <PermissionGate permission="crm.customer.manage">
                <Button variant="outline" onClick={handleConvert} disabled={convertLead.isPending}>
                  Convert to customer
                </Button>
              </PermissionGate>
            )}
            <PermissionGate permission="crm.lead.delete">
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                Delete
              </Button>
            </PermissionGate>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lead details</CardTitle>
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
                <Label>Source</Label>
                <Input value={LeadSourceLabel[lead.source]} disabled />
              </div>
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
                        {Object.entries(LeadStatusLabel).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Priority</Label>
                <Controller
                  control={control}
                  name="priority"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LeadPriorityLabel).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" {...register('notes')} />
              </div>
            </CardContent>
            <CardFooter>
              <PermissionGate permission="crm.lead.update">
                <Button type="submit" disabled={!isDirty || updateLead.isPending}>
                  {updateLead.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </PermissionGate>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {lead.assignedToUserName ? (
              <p>
                Assigned to <span className="font-medium text-foreground">{lead.assignedToUserName}</span>
              </p>
            ) : (
              <Badge variant="outline">Unassigned</Badge>
            )}
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
          <ActivityList leadId={id} />
        </CardContent>
      </Card>

      <ActivityFormDialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen} leadId={id} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete lead"
        description={`"${lead.fullName}" and its logged activity will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        loading={deleteLead.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
