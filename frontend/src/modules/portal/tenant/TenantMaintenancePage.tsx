import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/portalApiClient'
import { formatDate } from '@/lib/utils'
import {
  LeaseStatus,
  MaintenanceCategory,
  MaintenanceCategoryLabel,
  MaintenancePriority,
  MaintenancePriorityLabel,
  MaintenanceStatus,
  MaintenanceStatusLabel,
} from '@/types/api'
import { useCreateTenantMaintenanceRequest, useTenantLeases, useTenantMaintenanceRequests } from './api'

const statusVariant: Record<MaintenanceStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [MaintenanceStatus.Open]: 'outline',
  [MaintenanceStatus.Assigned]: 'default',
  [MaintenanceStatus.InProgress]: 'default',
  [MaintenanceStatus.OnHold]: 'secondary',
  [MaintenanceStatus.Resolved]: 'success',
  [MaintenanceStatus.Cancelled]: 'destructive',
}

const schema = z.object({
  leaseId: z.string().min(1, 'Select a lease'),
  category: z.number(),
  priority: z.number(),
  description: z.string().min(1, 'Describe the issue'),
})

type FormValues = z.infer<typeof schema>

export function TenantMaintenancePage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useTenantMaintenanceRequests(page)
  const { data: leases } = useTenantLeases(1, 100)
  const activeLeases = (leases?.items ?? []).filter((l) => l.status === LeaseStatus.Active)
  const createRequest = useCreateTenantMaintenanceRequest()
  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { leaseId: activeLeases[0]?.id ?? '', category: MaintenanceCategory.Other, priority: MaintenancePriority.Medium, description: '' },
  })

  async function onSubmit(values: FormValues) {
    try {
      await createRequest.mutateAsync({
        leaseId: values.leaseId,
        category: values.category as MaintenanceCategory,
        priority: values.priority as MaintenancePriority,
        description: values.description,
      })
      toast({ title: 'Maintenance request submitted', variant: 'success' })
      reset({ leaseId: values.leaseId, category: MaintenanceCategory.Other, priority: MaintenancePriority.Medium, description: '' })
    } catch (error) {
      toast({ title: 'Could not submit request', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader title="Maintenance" description="Report an issue and track your open requests." />

      <Card>
        <CardHeader>
          <CardTitle>Report a Maintenance Issue</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Lease</Label>
              <Controller
                control={control}
                name="leaseId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a lease" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeLeases.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.leaseNumber} · {l.propertyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.leaseId && <p className="text-xs text-destructive">{errors.leaseId.message}</p>}
            </div>
            <div />
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MaintenanceCategoryLabel).map(([value, label]) => (
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
                  <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MaintenancePriorityLabel).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="col-span-full flex flex-col gap-1.5">
              <Label>Description</Label>
              <Textarea rows={3} placeholder="Describe the issue…" {...register('description')} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <div className="col-span-full">
              <Button type="submit" disabled={createRequest.isPending || activeLeases.length === 0}>
                {createRequest.isPending ? 'Submitting…' : 'Submit request'}
              </Button>
              {activeLeases.length === 0 && <p className="mt-2 text-xs text-muted-foreground">You need an active lease to report an issue.</p>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Your requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <LoadingState label="Loading requests…" />}
          {isError && <ErrorState message="Could not load your requests." onRetry={() => refetch()} />}
          {!isLoading && !isError && data?.items.length === 0 && <EmptyState title="No requests yet" />}
          {!isLoading && !isError && data && data.items.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request #</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reported</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.requestNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{MaintenanceCategoryLabel[r.category]}</TableCell>
                      <TableCell className="text-muted-foreground">{MaintenancePriorityLabel[r.priority]}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[r.status]}>{MaintenanceStatusLabel[r.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(r.reportedDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Page {page} of {totalPages} · {data.meta?.total} requests
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
