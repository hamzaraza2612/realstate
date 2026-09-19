import { AlertTriangle, Boxes, ClipboardCheck, HardHat, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { WorkPackageStatus, WorkPackageStatusLabel } from '@/types/api'
import { useConstructionDashboard } from './api'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

const statusVariant: Record<WorkPackageStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [WorkPackageStatus.Planned]: 'secondary',
  [WorkPackageStatus.InProgress]: 'default',
  [WorkPackageStatus.OnHold]: 'outline',
  [WorkPackageStatus.Completed]: 'success',
  [WorkPackageStatus.Cancelled]: 'destructive',
}

export function ConstructionDashboardPage() {
  const { data, isLoading, isError, refetch } = useConstructionDashboard()
  const navigate = useNavigate()

  if (isLoading) return <LoadingState label="Loading construction dashboard…" />
  if (isError || !data) return <ErrorState message="Could not load the construction dashboard." onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader title="Construction Dashboard" description="Work packages, tasks and budget performance across active projects." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={HardHat}
          label="Work packages"
          value={data.totalWorkPackages}
          description={`${data.workPackagesInProgress} in progress · ${data.activeProjects} active projects`}
        />
        <StatCard icon={ClipboardCheck} label="Tasks" value={data.totalTasks} description={`${data.completedTasks} completed`} />
        <StatCard
          icon={AlertTriangle}
          label="Delayed tasks"
          value={data.delayedTasks}
          description={`${data.purchaseRequestsPendingApproval} PRs pending approval`}
          alert={data.delayedTasks > 0}
        />
        <StatCard
          icon={Wallet}
          label="Budget vs. expenses"
          value={`$${formatCurrency(data.totalExpenses)}`}
          description={`of $${formatCurrency(data.totalBudget)} budgeted`}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-4 w-4" /> Open purchase orders: {data.openPurchaseOrders}
          </CardTitle>
          <CardDescription>Recent work packages and their progress.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentWorkPackages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No work packages yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Actual expenses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentWorkPackages.map((wp) => (
                  <TableRow key={wp.id} className="cursor-pointer" onClick={() => navigate(`/construction/work-packages/${wp.id}`)}>
                    <TableCell className="font-medium">{wp.name}</TableCell>
                    <TableCell className="text-muted-foreground">{wp.projectName}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[wp.status]}>{WorkPackageStatusLabel[wp.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{wp.progressPercent}%</TableCell>
                    <TableCell className="text-muted-foreground">{wp.budget != null ? `$${formatCurrency(wp.budget)}` : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">${formatCurrency(wp.actualExpenses)}</TableCell>
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

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  alert,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  description: string
  alert?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Icon className={alert ? 'h-5 w-5 text-destructive' : 'h-5 w-5 text-primary'} />
        </div>
        <CardTitle className="mt-2 text-2xl">{value}</CardTitle>
        <CardDescription>{label}</CardDescription>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
    </Card>
  )
}
