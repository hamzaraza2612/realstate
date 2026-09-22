import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { useAllProjects } from '@/modules/projects/api'
import { CategoryBarChart, TrendLineChart } from '@/modules/reports/components/charts'
import { DateRangeFilter } from '@/modules/reports/components/DateRangeFilter'
import { exportReportCsv } from '@/modules/reports/exportCsv'
import { labelForEnumName, money, monthLabel, percent } from '@/modules/reports/format'
import { BookingStatus, BookingStatusLabel, InstallmentStatus, InstallmentStatusLabel, LeadStatus, LeadStatusLabel } from '@/types/api'
import {
  useBookingStatusReport,
  useOutstandingInstallments,
  useReceivableAging,
  useSalesByAgent,
  useSalesByPeriod,
  useSalesByProject,
  useSalesCancellations,
  useSalesCollections,
  useSalesConversion,
  type SalesReportFilters,
} from './api'

const ALL = 'all'

export function SalesReportsPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [projectId, setProjectId] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const { data: projects } = useAllProjects()

  const filters: SalesReportFilters = {
    from: from || undefined,
    to: to || undefined,
    projectId: projectId === ALL ? undefined : projectId,
    status: status === ALL ? undefined : (Number(status) as BookingStatus),
  }

  return (
    <div>
      <PageHeader
        title="Sales Reports"
        description="Booking volume and value across projects, periods and agents, plus the CRM pipeline, cancellations and receivables behind them."
      />

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} idPrefix="sales" />
        <div className="flex flex-col gap-1.5">
          <Label>Project</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All projects</SelectItem>
              {(projects ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Confirmed only" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Confirmed only (default)</SelectItem>
              {Object.entries(BookingStatusLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="ml-2 max-w-sm text-xs text-muted-foreground">
          Value totals include Confirmed bookings only, unless a different status is chosen explicitly.
        </p>
      </div>

      <Tabs defaultValue="by-project">
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="by-project">By Project</TabsTrigger>
          <TabsTrigger value="by-period">By Period</TabsTrigger>
          <TabsTrigger value="by-agent">By Agent</TabsTrigger>
          <TabsTrigger value="booking-status">Booking Status</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
          <TabsTrigger value="cancellations">Cancellations</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding Installments</TabsTrigger>
          <TabsTrigger value="aging">Receivable Aging</TabsTrigger>
        </TabsList>

        <TabsContent value="by-project">
          <ByProjectTab filters={filters} />
        </TabsContent>
        <TabsContent value="by-period">
          <ByPeriodTab filters={filters} />
        </TabsContent>
        <TabsContent value="by-agent">
          <ByAgentTab filters={filters} />
        </TabsContent>
        <TabsContent value="booking-status">
          <BookingStatusTab filters={{ from: filters.from, to: filters.to, projectId: filters.projectId }} />
        </TabsContent>
        <TabsContent value="conversion">
          <ConversionTab from={filters.from} to={filters.to} />
        </TabsContent>
        <TabsContent value="cancellations">
          <CancellationsTab filters={filters} />
        </TabsContent>
        <TabsContent value="collections">
          <CollectionsTab filters={{ from: filters.from, to: filters.to, projectId: filters.projectId }} />
        </TabsContent>
        <TabsContent value="outstanding">
          <OutstandingInstallmentsTab />
        </TabsContent>
        <TabsContent value="aging">
          <ReceivableAgingTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ByProjectTab({ filters }: { filters: SalesReportFilters }) {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useSalesByProject(filters)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Sales by project</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReportCsv('/reports/sales/by-project', filters, 'sales-by-project.csv')}
        >
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No bookings in range" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Total net price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.projectId} className="cursor-pointer" onClick={() => navigate(`/projects/${row.projectId}`)}>
                  <TableCell className="font-medium">{row.projectName}</TableCell>
                  <TableCell>{row.bookingCount}</TableCell>
                  <TableCell>{money(row.totalNetPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function ByPeriodTab({ filters }: { filters: SalesReportFilters }) {
  const { data, isLoading, isError, refetch } = useSalesByPeriod(filters)
  const chartData = (data ?? []).map((row) => ({ period: monthLabel(row.year, row.month), totalNetPrice: row.totalNetPrice }))

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Sales by period</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReportCsv('/reports/sales/by-period', filters, 'sales-by-period.csv')}
        >
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No bookings in range" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <div className="flex flex-col gap-4">
            <TrendLineChart
              data={chartData}
              xKey="period"
              series={[{ key: 'totalNetPrice', label: 'Net price', color: 'hsl(var(--primary))' }]}
              valueFormatter={money}
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Total net price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={`${row.year}-${row.month}`}>
                    <TableCell className="font-medium">{monthLabel(row.year, row.month)}</TableCell>
                    <TableCell>{row.bookingCount}</TableCell>
                    <TableCell>{money(row.totalNetPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ByAgentTab({ filters }: { filters: SalesReportFilters }) {
  const { data, isLoading, isError, refetch } = useSalesByAgent(filters)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Sales by agent</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportReportCsv('/reports/sales/by-agent', filters, 'sales-by-agent.csv')}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No bookings in range" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Total net price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.agentUserId}>
                  <TableCell className="font-medium">{row.agentName}</TableCell>
                  <TableCell>{row.bookingCount}</TableCell>
                  <TableCell>{money(row.totalNetPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function BookingStatusTab({ filters }: { filters: Pick<SalesReportFilters, 'from' | 'to' | 'projectId'> }) {
  const { data, isLoading, isError, refetch } = useBookingStatusReport(filters)
  const chartData = (data ?? []).map((row) => ({ status: BookingStatusLabel[row.status], count: row.count }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookings by status</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No bookings in range" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <div className="flex flex-col gap-4">
            <CategoryBarChart data={chartData} xKey="status" yKey="count" />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Total net price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.status}>
                    <TableCell>
                      <Badge variant="secondary">{BookingStatusLabel[row.status]}</Badge>
                    </TableCell>
                    <TableCell>{row.count}</TableCell>
                    <TableCell>{money(row.totalNetPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ConversionTab({ from, to }: { from?: string; to?: string }) {
  const { data, isLoading, isError, refetch } = useSalesConversion(from, to)

  if (isLoading) return <LoadingState label="Loading…" />
  if (isError || !data) return <ErrorState message="Could not load the conversion report." onRetry={() => refetch()} />

  const statusEntries = Object.entries(data.leadsByStatus)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{data.totalLeads}</CardTitle>
            <p className="text-sm text-muted-foreground">Total leads</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{data.wonLeads}</CardTitle>
            <p className="text-sm text-muted-foreground">Won leads</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{percent(data.conversionRatePercent)}</CardTitle>
            <p className="text-sm text-muted-foreground">Conversion rate</p>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leads by status</CardTitle>
        </CardHeader>
        <CardContent>
          {statusEntries.length === 0 ? (
            <EmptyState title="No leads created in range" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statusEntries.map(([name, value]) => (
                  <TableRow key={name}>
                    <TableCell>
                      <Badge variant="secondary">{labelForEnumName(LeadStatus, LeadStatusLabel, name)}</Badge>
                    </TableCell>
                    <TableCell>{value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CancellationsTab({ filters }: { filters: SalesReportFilters }) {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useSalesCancellations(page, filters)
  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cancelled bookings</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load cancellations." onRetry={() => refetch()} />}
        {!isLoading && !isError && data?.items.length === 0 && (
          <EmptyState title="No cancellations" description="No booking was cancelled in this range." />
        )}
        {!isLoading && !isError && data && data.items.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking #</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Net price</TableHead>
                  <TableHead>Booking date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={row.bookingId} className="cursor-pointer" onClick={() => navigate(`/sales/bookings/${row.bookingId}`)}>
                    <TableCell className="font-medium">{row.bookingNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{row.projectName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.customerName}</TableCell>
                    <TableCell>{money(row.netPrice)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(row.bookingDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages} · {data.meta?.total} cancellations
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
  )
}

function CollectionsTab({ filters }: { filters: { from?: string; to?: string; projectId?: string } }) {
  const { data, isLoading, isError, refetch } = useSalesCollections(filters)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Sales collections over time</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReportCsv('/reports/sales/collections', filters, 'sales-collections.csv')}
        >
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No payments in range" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <div className="flex flex-col gap-4">
            <TrendLineChart
              data={data}
              xKey="date"
              series={[{ key: 'amount', label: 'Amount collected', color: 'hsl(var(--success))' }]}
              valueFormatter={money}
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell className="font-medium">{formatDate(row.date)}</TableCell>
                    <TableCell>{money(row.amount)}</TableCell>
                    <TableCell>{row.paymentCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const installmentStatusVariant: Record<InstallmentStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [InstallmentStatus.Pending]: 'outline',
  [InstallmentStatus.PartiallyPaid]: 'default',
  [InstallmentStatus.Paid]: 'success',
  [InstallmentStatus.Overdue]: 'destructive',
  [InstallmentStatus.Cancelled]: 'secondary',
}

function OutstandingInstallmentsTab() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(ALL)
  const [overdueOnly, setOverdueOnly] = useState(false)

  const { data, isLoading, isError, refetch } = useOutstandingInstallments(page, {
    search: search || undefined,
    status: status === ALL ? undefined : (Number(status) as InstallmentStatus),
    overdueOnly: overdueOnly || undefined,
  })
  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outstanding installments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customer or booking…"
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {Object.entries(InstallmentStatusLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={overdueOnly}
              onCheckedChange={(v) => {
                setOverdueOnly(v === true)
                setPage(1)
              }}
            />
            Overdue only
          </label>
        </div>

        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load outstanding installments." onRetry={() => refetch()} />}
        {!isLoading && !isError && data?.items.length === 0 && <EmptyState title="No outstanding installments" />}
        {!isLoading && !isError && data && data.items.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={row.installmentId} className="cursor-pointer" onClick={() => navigate(`/sales/bookings/${row.bookingId}`)}>
                    <TableCell className="font-medium">{row.customerName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.bookingNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{row.reference}</TableCell>
                    <TableCell>{money(row.outstandingAmount)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(row.dueDate)}</TableCell>
                    <TableCell>
                      <Badge variant={installmentStatusVariant[row.status]}>{InstallmentStatusLabel[row.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages} · {data.meta?.total} installments
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
  )
}

function ReceivableAgingTab() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useReceivableAging()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Receivable aging (by customer)</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportReportCsv('/reports/sales/receivable-aging', undefined, 'receivable-aging.csv')}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load receivable aging." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No outstanding installments" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>1-30</TableHead>
                <TableHead>31-60</TableHead>
                <TableHead>61-90</TableHead>
                <TableHead>90+</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.customerId} className="cursor-pointer" onClick={() => navigate(`/crm/customers/${row.customerId}`)}>
                  <TableCell className="font-medium">{row.customerName}</TableCell>
                  <TableCell>{money(row.current)}</TableCell>
                  <TableCell>{money(row.days1To30)}</TableCell>
                  <TableCell>{money(row.days31To60)}</TableCell>
                  <TableCell>{money(row.days61To90)}</TableCell>
                  <TableCell>{money(row.days90Plus)}</TableCell>
                  <TableCell className="font-medium">{money(row.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
