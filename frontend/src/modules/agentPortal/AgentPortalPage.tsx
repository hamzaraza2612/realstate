import { CalendarCheck, HandCoins } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { useI18n } from '@/lib/i18n'
import { formatDate } from '@/lib/utils'
import {
  ActivityStatus,
  ActivityTypeLabel,
  BookingStatusLabel,
  InventoryStatusLabel,
  LeadPriorityLabel,
  LeadStatusLabel,
} from '@/types/api'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Pagination } from '@/components/common/Pagination'
import { money, moneyExact, monthLabel } from '@/modules/reports/format'
import {
  useAgentAvailableInventory,
  useAgentBookings,
  useAgentCustomers,
  useAgentFollowUps,
  useAgentLeads,
  useAgentPerformance,
} from './api'

const activityStatusLabel: Record<ActivityStatus, string> = {
  [ActivityStatus.Pending]: 'Pending',
  [ActivityStatus.Completed]: 'Completed',
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
                      <StatusBadge status={lead.status} labels={LeadStatusLabel} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{LeadPriorityLabel[lead.priority]}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(lead.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} totalPages={totalPages} total={data.meta?.total} itemLabel="leads" onPageChange={setPage} />
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
                      <StatusBadge status={unit.status} labels={InventoryStatusLabel} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{unit.areaSize != null ? unit.areaSize : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} totalPages={totalPages} total={data.meta?.total} itemLabel="units" onPageChange={setPage} />
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
                      <StatusBadge status={b.status} labels={BookingStatusLabel} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{moneyExact(b.netPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} totalPages={totalPages} total={data.meta?.total} itemLabel="bookings" onPageChange={setPage} />
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
                      <StatusBadge status={a.status} labels={activityStatusLabel} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} totalPages={totalPages} total={data.meta?.total} itemLabel="follow-ups" onPageChange={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function PerformanceTab() {
  const { t } = useI18n()
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
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard icon={CalendarCheck} label={t('agentPortal.bookingsInRange')} value={data.reduce((sum, r) => sum + r.bookingCount, 0)} />
              <StatCard icon={HandCoins} label={t('agentPortal.netSalesInRange')} value={money(data.reduce((sum, r) => sum + r.totalNetPrice, 0))} />
            </div>
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
                    <TableCell className="font-medium">{monthLabel(row.year, row.month)}</TableCell>
                    <TableCell>{row.bookingCount}</TableCell>
                    <TableCell className="text-right">{money(row.totalNetPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  )
}
