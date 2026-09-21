import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatDate } from '@/lib/utils'
import { MaintenancePriority, MaintenancePriorityLabel, MaintenanceStatus, MaintenanceStatusLabel, ServiceRequestCategoryLabel } from '@/types/api'
import { useServiceRequest, useUpdateServiceRequestStatus } from './api'
import { ServiceRequestResolveDialog } from './ServiceRequestResolveDialog'

const statusVariant: Record<MaintenanceStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [MaintenanceStatus.Open]: 'outline',
  [MaintenanceStatus.Assigned]: 'default',
  [MaintenanceStatus.InProgress]: 'default',
  [MaintenanceStatus.OnHold]: 'secondary',
  [MaintenanceStatus.Resolved]: 'success',
  [MaintenanceStatus.Cancelled]: 'destructive',
}

const priorityVariant: Record<MaintenancePriority, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [MaintenancePriority.Low]: 'secondary',
  [MaintenancePriority.Medium]: 'outline',
  [MaintenancePriority.High]: 'default',
  [MaintenancePriority.Urgent]: 'destructive',
}

const simpleTransitions: Record<MaintenanceStatus, { status: MaintenanceStatus; label: string; variant?: 'destructive' | 'outline' }[]> = {
  [MaintenanceStatus.Open]: [
    { status: MaintenanceStatus.Assigned, label: 'Mark assigned' },
    { status: MaintenanceStatus.Cancelled, label: 'Cancel', variant: 'destructive' },
  ],
  [MaintenanceStatus.Assigned]: [
    { status: MaintenanceStatus.InProgress, label: 'Start work' },
    { status: MaintenanceStatus.OnHold, label: 'Put on hold', variant: 'outline' },
    { status: MaintenanceStatus.Cancelled, label: 'Cancel', variant: 'destructive' },
  ],
  [MaintenanceStatus.InProgress]: [
    { status: MaintenanceStatus.OnHold, label: 'Put on hold', variant: 'outline' },
    { status: MaintenanceStatus.Cancelled, label: 'Cancel', variant: 'destructive' },
  ],
  [MaintenanceStatus.OnHold]: [
    { status: MaintenanceStatus.InProgress, label: 'Resume' },
    { status: MaintenanceStatus.Cancelled, label: 'Cancel', variant: 'destructive' },
  ],
  [MaintenanceStatus.Resolved]: [],
  [MaintenanceStatus.Cancelled]: [],
}

const canResolveFrom: MaintenanceStatus[] = [MaintenanceStatus.Open, MaintenanceStatus.Assigned, MaintenanceStatus.InProgress, MaintenanceStatus.OnHold]

export function ServiceRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: request, isLoading, isError, refetch } = useServiceRequest(id)
  const updateStatus = useUpdateServiceRequestStatus()
  const [resolveOpen, setResolveOpen] = useState(false)

  async function handleStatus(status: MaintenanceStatus) {
    if (!request) return
    try {
      await updateStatus.mutateAsync({ id: request.id, payload: { status, resolutionNotes: null } })
      toast({ title: `Request moved to ${MaintenanceStatusLabel[status]}`, variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not update status', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState label="Loading service request…" />
  if (isError || !request) return <ErrorState message="Could not load this service request." onRetry={() => refetch()} />

  const transitions = simpleTransitions[request.status]
  const canResolve = canResolveFrom.includes(request.status)

  return (
    <div>
      <PageHeader
        title={request.requestNumber}
        description={`${request.facilityName}${request.spaceCode ? ` · ${request.spaceCode}` : ''}`}
        actions={
          <PermissionGate permission="facility.manage">
            <div className="flex flex-wrap gap-2">
              {canResolve && <Button onClick={() => setResolveOpen(true)}>Mark resolved</Button>}
              {transitions.map((t) => (
                <Button key={t.status} variant={t.variant} onClick={() => handleStatus(t.status)} disabled={updateStatus.isPending}>
                  {t.label}
                </Button>
              ))}
            </div>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Request details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Status">
              <Badge variant={statusVariant[request.status]}>{MaintenanceStatusLabel[request.status]}</Badge>
            </Field>
            <Field label="Priority">
              <Badge variant={priorityVariant[request.priority]}>{MaintenancePriorityLabel[request.priority]}</Badge>
            </Field>
            <Field label="Category">{ServiceRequestCategoryLabel[request.category]}</Field>
            <Field label="Reported date">{formatDate(request.reportedDate)}</Field>
            <Field label="Requester">{request.requestedByUserName ?? request.requesterCustomerName ?? '—'}</Field>
            <Field label="Resolved date">{request.resolvedDate ? formatDate(request.resolvedDate) : '—'}</Field>
            <div className="col-span-2">
              <p className="text-muted-foreground">Description</p>
              <p>{request.description}</p>
            </div>
            {request.resolutionNotes && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Resolution notes</p>
                <p>{request.resolutionNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Field label="Assigned to (user)">{request.assignedToUserName ?? '—'}</Field>
            <Field label="Assigned vendor">{request.assignedVendorName ?? '—'}</Field>
          </CardContent>
        </Card>
      </div>

      <ServiceRequestResolveDialog open={resolveOpen} onOpenChange={setResolveOpen} request={request} />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{children}</p>
    </div>
  )
}
