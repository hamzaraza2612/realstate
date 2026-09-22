import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { TrendLineChart } from '@/modules/reports/components/charts'
import { DateRangeFilter } from '@/modules/reports/components/DateRangeFilter'
import { exportReportCsv } from '@/modules/reports/exportCsv'
import { money, monthLabel } from '@/modules/reports/format'
import { useApAging, useArAging, useCollectionsTrend, useExpenseTrend, useRevenueTrend } from './api'

export function FinanceReportsPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const filters = { from: from || undefined, to: to || undefined }

  return (
    <div>
      <PageHeader
        title="Finance Reports"
        description="Aging, revenue/expense and collections trends. Trial Balance, Profit & Loss, Balance Sheet and Cash Flow already have their own pages — linked below rather than duplicated here."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/finance/trial-balance">Trial Balance</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/finance/profit-and-loss">Profit &amp; Loss</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/finance/balance-sheet">Balance Sheet</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/finance/cash-flow">Cash Flow</Link>
        </Button>
      </div>

      <Tabs defaultValue="ar-aging">
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="ar-aging">AR Aging</TabsTrigger>
          <TabsTrigger value="ap-aging">AP Aging</TabsTrigger>
          <TabsTrigger value="revenue-expense">Revenue vs Expense Trend</TabsTrigger>
          <TabsTrigger value="collections-trend">Collections Trend</TabsTrigger>
        </TabsList>

        <TabsContent value="ar-aging">
          <ArAgingTab />
        </TabsContent>
        <TabsContent value="ap-aging">
          <ApAgingTab />
        </TabsContent>
        <TabsContent value="revenue-expense">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} idPrefix="fin-trend" />
          </div>
          <RevenueExpenseTrendTab filters={filters} />
        </TabsContent>
        <TabsContent value="collections-trend">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} idPrefix="fin-collections" />
          </div>
          <CollectionsTrendTab filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ArAgingTab() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useArAging()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Accounts receivable aging</CardTitle>
          {data && <p className="text-sm text-muted-foreground">Total outstanding: {money(data.totalOutstanding)}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={() => exportReportCsv('/reports/finance/ar-aging', undefined, 'ar-aging.csv')}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load AR aging." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.rows.length ?? 0) === 0 && <EmptyState title="No outstanding receivables" />}
        {!isLoading && !isError && data && data.rows.length > 0 && (
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
              {data.rows.map((row) => (
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

function ApAgingTab() {
  const { data, isLoading, isError, refetch } = useApAging()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Accounts payable aging</CardTitle>
          {data && <p className="text-sm text-muted-foreground">Total outstanding: {money(data.totalOutstanding)}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={() => exportReportCsv('/reports/finance/ap-aging', undefined, 'ap-aging.csv')}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load AP aging." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.rows.length ?? 0) === 0 && <EmptyState title="No outstanding payables" />}
        {!isLoading && !isError && data && data.rows.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>1-30</TableHead>
                <TableHead>31-60</TableHead>
                <TableHead>61-90</TableHead>
                <TableHead>90+</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row.vendorId}>
                  <TableCell className="font-medium">{row.vendorName}</TableCell>
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

function RevenueExpenseTrendTab({ filters }: { filters: { from?: string; to?: string } }) {
  const revenue = useRevenueTrend(filters)
  const expense = useExpenseTrend(filters)
  const isLoading = revenue.isLoading || expense.isLoading
  const isError = revenue.isError || expense.isError

  const byPeriod = new Map<string, { period: string; revenue: number; expenses: number }>()
  for (const row of revenue.data ?? []) {
    const key = `${row.year}-${row.month}`
    byPeriod.set(key, { period: monthLabel(row.year, row.month), revenue: row.amount, expenses: 0 })
  }
  for (const row of expense.data ?? []) {
    const key = `${row.year}-${row.month}`
    const existing = byPeriod.get(key)
    if (existing) existing.expenses = row.amount
    else byPeriod.set(key, { period: monthLabel(row.year, row.month), revenue: 0, expenses: row.amount })
  }
  const chartData = Array.from(byPeriod.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue vs expense trend</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => { revenue.refetch(); expense.refetch() }} />}
        {!isLoading && !isError && chartData.length === 0 && <EmptyState title="No posted activity in range" />}
        {!isLoading && !isError && chartData.length > 0 && (
          <TrendLineChart
            data={chartData}
            xKey="period"
            series={[
              { key: 'revenue', label: 'Revenue', color: 'hsl(var(--success))' },
              { key: 'expenses', label: 'Expenses', color: 'hsl(var(--destructive))' },
            ]}
            valueFormatter={money}
          />
        )}
      </CardContent>
    </Card>
  )
}

function CollectionsTrendTab({ filters }: { filters: { from?: string; to?: string } }) {
  const { data, isLoading, isError, refetch } = useCollectionsTrend(filters)
  const chartData = (data ?? []).map((row) => ({ period: monthLabel(row.year, row.month), amount: row.amount }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collections trend</CardTitle>
        <p className="text-sm text-muted-foreground">Sales + rent + facility payments, by month — the series behind the Executive Dashboard's Collections KPI.</p>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && chartData.length === 0 && <EmptyState title="No collections in range" />}
        {!isLoading && !isError && chartData.length > 0 && (
          <TrendLineChart
            data={chartData}
            xKey="period"
            series={[{ key: 'amount', label: 'Collected', color: 'hsl(var(--primary))' }]}
            valueFormatter={money}
          />
        )}
      </CardContent>
    </Card>
  )
}
