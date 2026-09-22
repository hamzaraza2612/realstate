import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { useAllProjects } from '@/modules/projects/api'
import { DateRangeFilter } from '@/modules/reports/components/DateRangeFilter'
import { exportReportCsv } from '@/modules/reports/exportCsv'
import { money, percent } from '@/modules/reports/format'
import {
  useInventoryAvailability,
  useProjectCollectionSummary,
  useProjectFinancialSummary,
  useProjectProgress,
  useProjectSalesSummary,
  useSoldVsAvailable,
} from './api'

const ALL = 'all'

export function ProjectReportsPage() {
  const [projectId, setProjectId] = useState(ALL)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data: projects } = useAllProjects()
  const navigate = useNavigate()

  const pid = projectId === ALL ? undefined : projectId
  const dateFilters = { from: from || undefined, to: to || undefined }

  return (
    <div>
      <PageHeader title="Project Reports" description="Inventory, sales, collections and profitability per project." />

      <div className="mb-4 flex flex-wrap items-end gap-2">
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
      </div>

      <Tabs defaultValue="inventory">
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="inventory">Inventory Availability</TabsTrigger>
          <TabsTrigger value="sold-vs-available">Sold vs Available</TabsTrigger>
          <TabsTrigger value="sales-summary">Sales Summary</TabsTrigger>
          <TabsTrigger value="collection-summary">Collection Summary</TabsTrigger>
          <TabsTrigger value="financial-summary">Financial Summary</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <InventoryAvailabilityTab projectId={pid} onNavigate={navigate} />
        </TabsContent>
        <TabsContent value="sold-vs-available">
          <SoldVsAvailableTab projectId={pid} onNavigate={navigate} />
        </TabsContent>
        <TabsContent value="sales-summary">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} idPrefix="proj-sales" />
          </div>
          <SalesSummaryTab filters={{ ...dateFilters, projectId: pid }} onNavigate={navigate} />
        </TabsContent>
        <TabsContent value="collection-summary">
          <CollectionSummaryTab projectId={pid} onNavigate={navigate} />
        </TabsContent>
        <TabsContent value="financial-summary">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} idPrefix="proj-financial" />
          </div>
          <FinancialSummaryTab filters={{ ...dateFilters, projectId: pid }} onNavigate={navigate} />
        </TabsContent>
        <TabsContent value="progress">
          <ProgressTab projectId={pid} onNavigate={navigate} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

type Nav = (path: string) => void

function InventoryAvailabilityTab({ projectId, onNavigate }: { projectId?: string; onNavigate: Nav }) {
  const { data, isLoading, isError, refetch } = useInventoryAvailability(projectId)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Inventory availability</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReportCsv('/reports/projects/inventory-availability', { projectId }, 'inventory-availability.csv')}
        >
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No projects found" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Booked</TableHead>
                <TableHead>Sold</TableHead>
                <TableHead>Blocked</TableHead>
                <TableHead>Under construction</TableHead>
                <TableHead>Handed over</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.projectId} className="cursor-pointer" onClick={() => onNavigate(`/projects/${row.projectId}`)}>
                  <TableCell className="font-medium">{row.projectName}</TableCell>
                  <TableCell>{row.available}</TableCell>
                  <TableCell>{row.reserved}</TableCell>
                  <TableCell>{row.booked}</TableCell>
                  <TableCell>{row.sold}</TableCell>
                  <TableCell>{row.blocked}</TableCell>
                  <TableCell>{row.underConstruction}</TableCell>
                  <TableCell>{row.handedOver}</TableCell>
                  <TableCell className="font-medium">{row.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function SoldVsAvailableTab({ projectId, onNavigate }: { projectId?: string; onNavigate: Nav }) {
  const { data, isLoading, isError, refetch } = useSoldVsAvailable(projectId)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Sold vs available</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReportCsv('/reports/projects/sold-vs-available', { projectId }, 'sold-vs-available.csv')}
        >
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No projects found" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Sold</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Sold %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.projectId} className="cursor-pointer" onClick={() => onNavigate(`/projects/${row.projectId}`)}>
                  <TableCell className="font-medium">{row.projectName}</TableCell>
                  <TableCell>{row.sold}</TableCell>
                  <TableCell>{row.available}</TableCell>
                  <TableCell>{row.total}</TableCell>
                  <TableCell>{percent(row.soldPercent)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function SalesSummaryTab({ filters, onNavigate }: { filters: { from?: string; to?: string; projectId?: string }; onNavigate: Nav }) {
  const { data, isLoading, isError, refetch } = useProjectSalesSummary(filters)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Sales summary</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReportCsv('/reports/projects/sales-summary', filters, 'project-sales-summary.csv')}
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
                <TableRow key={row.projectId} className="cursor-pointer" onClick={() => onNavigate(`/projects/${row.projectId}`)}>
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

function CollectionSummaryTab({ projectId, onNavigate }: { projectId?: string; onNavigate: Nav }) {
  const { data, isLoading, isError, refetch } = useProjectCollectionSummary(projectId)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Collection summary</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReportCsv('/reports/projects/collection-summary', { projectId }, 'project-collection-summary.csv')}
        >
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No projects found" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Installments</TableHead>
                <TableHead>Collected</TableHead>
                <TableHead>Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.projectId} className="cursor-pointer" onClick={() => onNavigate(`/projects/${row.projectId}`)}>
                  <TableCell className="font-medium">{row.projectName}</TableCell>
                  <TableCell>{row.totalInstallments}</TableCell>
                  <TableCell>{money(row.collected)}</TableCell>
                  <TableCell>{money(row.outstanding)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function FinancialSummaryTab({ filters, onNavigate }: { filters: { from?: string; to?: string; projectId?: string }; onNavigate: Nav }) {
  const { data, isLoading, isError, refetch } = useProjectFinancialSummary(filters)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Financial summary (direct/gross margin)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sales revenue minus Approved construction expenses only — not a full P&amp;L. Overhead, corporate costs and
            uncommitted procurement are not allocated per project.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReportCsv('/reports/projects/financial-summary', filters, 'project-financial-summary.csv')}
        >
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No activity in range" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Sales revenue</TableHead>
                <TableHead>Construction expenses</TableHead>
                <TableHead>Gross margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.projectId} className="cursor-pointer" onClick={() => onNavigate(`/projects/${row.projectId}`)}>
                  <TableCell className="font-medium">{row.projectName}</TableCell>
                  <TableCell>{money(row.salesRevenue)}</TableCell>
                  <TableCell>{money(row.constructionExpenses)}</TableCell>
                  <TableCell className="font-medium">{money(row.grossMargin)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function ProgressTab({ projectId, onNavigate }: { projectId?: string; onNavigate: Nav }) {
  const { data, isLoading, isError, refetch } = useProjectProgress(projectId)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Construction progress by project</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportReportCsv('/reports/projects/progress', { projectId }, 'project-progress.csv')}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No projects found" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Work packages</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.projectId} className="cursor-pointer" onClick={() => onNavigate(`/projects/${row.projectId}`)}>
                  <TableCell className="font-medium">{row.projectName}</TableCell>
                  <TableCell>{row.progressPercent == null ? 'N/A' : percent(row.progressPercent)}</TableCell>
                  <TableCell>{row.workPackageCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
