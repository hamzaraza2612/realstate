import { AlertTriangle, Banknote, Scale, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { JournalEntryStatusLabel } from '@/types/api'
import { useFinanceDashboard } from './api'

function fmt(value: number) {
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`
}

export function FinanceDashboardPage() {
  const { data, isLoading, isError, refetch } = useFinanceDashboard()
  const navigate = useNavigate()

  if (isLoading) return <LoadingState label="Loading finance dashboard…" />
  if (isError || !data) return <ErrorState message="Could not load the finance dashboard." onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader title="Finance Dashboard" description="Revenue, collections, receivables and the balance sheet at a glance." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label="Total revenue" value={fmt(data.totalRevenue)} description={`${fmt(data.totalCollected)} collected`} />
        <StatCard
          icon={AlertTriangle}
          label="Receivable"
          value={fmt(data.totalReceivable)}
          description={`${fmt(data.overdueReceivable)} overdue`}
          alert={data.overdueReceivable > 0}
        />
        <StatCard icon={Banknote} label="Expenses" value={fmt(data.totalExpenses)} description="Posted expense entries" />
        <StatCard icon={Scale} label="Assets / Liabilities / Equity" value={fmt(data.totalAssets)} description={`${fmt(data.totalLiabilities)} / ${fmt(data.totalEquity)}`} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent journal entries</CardTitle>
          <CardDescription>The latest postings across all modules.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentJournalEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No journal entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentJournalEntries.map((e) => (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => navigate(`/finance/journal/${e.id}`)}>
                    <TableCell className="font-medium">{e.entryNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(e.entryDate)}</TableCell>
                    <TableCell className="text-muted-foreground">{e.referenceType}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{JournalEntryStatusLabel[e.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fmt(e.total)}</TableCell>
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
