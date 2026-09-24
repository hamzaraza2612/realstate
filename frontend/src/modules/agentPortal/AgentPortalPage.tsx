import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import {
  ActivityStatus,
  ActivityTypeLabel,
  BookingStatus,
  BookingStatusLabel,
  InventoryStatus,
  InventoryStatusLabel,
  LeadPriorityLabel,
  LeadStatus,
  LeadStatusLabel,
} from '@/types/api'
import {
  useAgentAvailableInventory,
  useAgentBookings,
  useAgentCustomers,
  useAgentFollowUps,
  useAgentLeads,
  useAgentPerformance,
} from './api'

const leadStatusVariant: Record<LeadStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [LeadStatus.New]: 'outline',
  [LeadStatus.Contacted]: 'default',
  [LeadStatus.Qualified]: 'default',
  [LeadStatus.ProposalSent]: 'default',
  [LeadStatus.Negotiation]: 'default',
  [LeadStatus.Won]: 'success',
  [LeadStatus.Lost]: 'destructive',
}

const bookingStatusVariant: Record<BookingStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [BookingStatus.Draft]: 'secondary',
  [BookingStatus.PendingApproval]: 'outline',
  [BookingStatus.Confirmed]: 'success',
  [BookingStatus.Cancelled]: 'destructive',
}

const inventoryStatusVariant: Record<InventoryStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [InventoryStatus.Available]: 'success',
  [InventoryStatus.Reserved]: 'outline',
  [InventoryStatus.Booked]: 'default',
  [InventoryStatus.Sold]: 'secondary',
  [InventoryStatus.Blocked]: 'destructive',
  [InventoryStatus.UnderConstruction]: 'outline',
  [InventoryStatus.HandedOver]: 'secondary',
}

const activityStatusLabel: Record<ActivityStatus, string> = {
  [ActivityStatus.Pending]: 'Pending',
  [ActivityStatus.Completed]: 'Completed',
}

const activityStatusVariant: Record<ActivityStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [ActivityStatus.Pending]: 'outline',
  [ActivityStatus.Completed]: 'success',
}

/**
 * A self-scoped view over data the signed-in agent already has access to — reuses the internal
 * apiClient/useAuthStore session (see `./api.ts`), not the portal auth surface.
 */
export function AgentPortalPage() {
  return (
    <div>
      <PageHeader title="Agent Portal" description="Your leads, customers, inventory, bookings and performance in one place." />
      <Tabs defaultValue="leads">
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="inventory">Available Inventory</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="follow-ups">Follow-ups</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <LeadsTab />
        </TabsContent>
        <TabsContent value="customers">
          <CustomersTab />
        </TabsContent>
        <TabsContent value="inventory">
          <InventoryTab />
        </TabsContent>
        <TabsContent value="bookings">
          <BookingsTab />
        </TabsContent>
        <TabsContent value="follow-ups">
          <FollowUpsTab />
        </TabsContent>
        <TabsContent value="performance">
          <PerformanceTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PagedFooter({ page, setPage, totalPages, total, label }: { page: number; setPage: (fn: (p: number) => number) => void; totalPages: number; total: number; label: string }) {
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Page {page} of {totalPages} · {total} {label}
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
  )
}

function LeadsTab() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useAgentLeads(page)
  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your leads</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load leads." onRetry={() => refetch()} />}
        {!isLoading && !isError && data?.items.length === 0 && <EmptyState title="No leads assigned to you" />}
        {!isLoading && !isError && data && data.items.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((lead) => (
                  <TableRow key={lead.id} className="cursor-pointer" onClick={() => navigate(`/crm/leads/${lead.id}`)}>
                    <TableCell className="font-medium">{lead.fullName}</TableCell>
                    <TableCell>
                      <Badge variant={leadStatusVariant[lead.status]}>{LeadStatusLabel[lead.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{LeadPriorityLabel[lead.priority]}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(lead.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PagedFooter page={page} setPage={setPage} totalPages={totalPages} total={data.meta?.total ?? 0} label="leads" />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CustomersTab() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useAgentCustomers()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your customers</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load customers." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No customers yet" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/crm/customers/${c.id}`)}>
                  <TableCell className="font-medium">{c.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function InventoryTab() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useAgentAvailableInventory(page)
  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available inventory</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load inventory." onRetry={() => refetch()} />}
        {!isLoading && !isError && data?.items.length === 0 && <EmptyState title="No available units" />}
        {!isLoading && !isError && data && data.items.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Area</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((unit) => (
                  <TableRow key={unit.id} className="cursor-pointer" onClick={() => navigate(`/inventory/${unit.id}`)}>
                    <TableCell className="font-medium">{unit.code}</TableCell>
                    <TableCell className="text-muted-foreground">{unit.projectName}</TableCell>
                    <TableCell>
                      <Badge variant={inventoryStatusVariant[unit.status]}>{InventoryStatusLabel[unit.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{unit.areaSize != null ? unit.areaSize : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PagedFooter page={page} setPage={setPage} totalPages={totalPages} total={data.meta?.total ?? 0} label="units" />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function BookingsTab() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useAgentBookings(page)
  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your bookings</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load bookings." onRetry={() => refetch()} />}
        {!isLoading && !isError && data?.items.length === 0 && <EmptyState title="No bookings yet" />}
        {!isLoading && !isError && data && data.items.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Net price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((b) => (
                  <TableRow key={b.id} className="cursor-pointer" onClick={() => navigate(`/sales/bookings/${b.id}`)}>
                    <TableCell className="font-medium">{b.bookingNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{b.customerName}</TableCell>
                    <TableCell>
                      <Badge variant={bookingStatusVariant[b.status]}>{BookingStatusLabel[b.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">${b.netPrice.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PagedFooter page={page} setPage={setPage} totalPages={totalPages} total={data.meta?.total ?? 0} label="bookings" />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function FollowUpsTab() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useAgentFollowUps(page)
  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Follow-ups</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load follow-ups." onRetry={() => refetch()} />}
        {!isLoading && !isError && data?.items.length === 0 && <EmptyState title="No follow-ups" />}
        {!isLoading && !isError && data && data.items.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.subject}</TableCell>
                    <TableCell className="text-muted-foreground">{ActivityTypeLabel[a.type]}</TableCell>
                    <TableCell className="text-muted-foreground">{a.dueDate ? formatDate(a.dueDate) : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={activityStatusVariant[a.status]}>{activityStatusLabel[a.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PagedFooter page={page} setPage={setPage} totalPages={totalPages} total={data.meta?.total ?? 0} label="follow-ups" />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function PerformanceTab() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data, isLoading, isError, refetch } = useAgentPerformance({ from: from || undefined, to: to || undefined })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agent-perf-from">From</Label>
            <Input id="agent-perf-from" type="date" className="w-44" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agent-perf-to">To</Label>
            <Input id="agent-perf-to" type="date" className="w-44" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load performance." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No bookings in range" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead className="text-right">Total net price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={`${row.year}-${row.month}`}>
                  <TableCell className="font-medium">
                    {row.year}-{String(row.month).padStart(2, '0')}
                  </TableCell>
                  <TableCell>{row.bookingCount}</TableCell>
                  <TableCell className="text-right">${row.totalNetPrice.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
