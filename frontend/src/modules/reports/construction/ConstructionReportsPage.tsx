import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
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
import { ExpenseCategoryLabel, WorkPackageStatus, WorkPackageStatusLabel } from '@/types/api'
import { useBudgetVsActual, useConstructionExpensesByCategory, useWorkPackageProgress } from './api'

const ALL = 'all'

export function ConstructionReportsPage() {
  const [projectId, setProjectId] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data: projects } = useAllProjects()
  const navigate = useNavigate()

  const pid = projectId === ALL ? undefined : projectId

  return (
    <div>
      <PageHeader title="Construction Reports" description="Work package progress, expenses by category and budget vs actual." />

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

      <Tabs defaultValue="progress">
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="progress">Work Package Progress</TabsTrigger>
          <TabsTrigger value="expenses">Expenses by Category</TabsTrigger>
          <TabsTrigger value="budget-vs-actual">Budget vs Actual</TabsTrigger>
        </TabsList>

        <TabsContent value="progress">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All statuses</SelectItem>
                  {Object.entries(WorkPackageStatusLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <WorkPackageProgressTab
            filters={{ projectId: pid, status: status === ALL ? undefined : (Number(status) as WorkPackageStatus) }}
            onNavigate={navigate}
          />
        </TabsContent>
        <TabsContent value="expenses">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} idPrefix="con-expenses" />
          </div>
          <ExpensesByCategoryTab filters={{ from: from || undefined, to: to || undefined, projectId: pid }} />
        </TabsContent>
        <TabsContent value="budget-vs-actual">
          <BudgetVsActualTab projectId={pid} onNavigate={navigate} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

type Nav = (path: string) => void

const workPackageStatusVariant: Record<WorkPackageStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [WorkPackageStatus.Planned]: 'outline',
  [WorkPackageStatus.InProgress]: 'default',
  [WorkPackageStatus.OnHold]: 'secondary',
  [WorkPackageStatus.Completed]: 'success',
  [WorkPackageStatus.Cancelled]: 'destructive',
}

function WorkPackageProgressTab({
  filters,
  onNavigate,
}: {
  filters: { projectId?: string; status?: WorkPackageStatus }
  onNavigate: Nav
}) {
  const { data, isLoading, isError, refetch } = useWorkPackageProgress(filters)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Work package progress</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReportCsv('/reports/construction/work-package-progress', filters, 'work-package-progress.csv')}
        >
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No work packages found" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work package</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Actual expenses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => onNavigate(`/construction/work-packages/${row.id}`)}>
                  <TableCell className="font-medium">
                    {row.code} · {row.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.projectName}</TableCell>
                  <TableCell>
                    <Badge variant={workPackageStatusVariant[row.status]}>{WorkPackageStatusLabel[row.status]}</Badge>
                  </TableCell>
                  <TableCell>{percent(row.progressPercent)}</TableCell>
                  <TableCell>{row.budget == null ? 'N/A' : money(row.budget)}</TableCell>
                  <TableCell>{money(row.actualExpenses)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function ExpensesByCategoryTab({ filters }: { filters: { from?: string; to?: string; projectId?: string } }) {
  const { data, isLoading, isError, refetch } = useConstructionExpensesByCategory(filters)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Approved expenses by category</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportReportCsv('/reports/construction/expenses', filters, 'construction-expenses.csv')}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No approved expenses in range" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.category}>
                  <TableCell>
                    <Badge variant="secondary">{ExpenseCategoryLabel[row.category]}</Badge>
                  </TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell>{money(row.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function BudgetVsActualTab({ projectId, onNavigate }: { projectId?: string; onNavigate: Nav }) {
  const { data, isLoading, isError, refetch } = useBudgetVsActual(projectId)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Budget vs actual</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReportCsv('/reports/construction/budget-vs-actual', { projectId }, 'budget-vs-actual.csv')}
        >
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No work packages found" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work package</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow
                  key={row.workPackageId}
                  className="cursor-pointer"
                  onClick={() => onNavigate(`/construction/work-packages/${row.workPackageId}`)}
                >
                  <TableCell className="font-medium">{row.workPackageName}</TableCell>
                  <TableCell className="text-muted-foreground">{row.projectName}</TableCell>
                  <TableCell>{row.budget == null ? 'N/A' : money(row.budget)}</TableCell>
                  <TableCell>{money(row.actual)}</TableCell>
                  <TableCell className={row.variance != null && row.variance < 0 ? 'text-destructive' : undefined}>
                    {row.variance == null ? 'N/A' : money(row.variance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
