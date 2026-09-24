import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import type { FinancialStatementLineDto } from '@/types/api'
import { useProfitAndLoss } from './api'

function LineTable({ lines, emptyLabel }: { lines: FinancialStatementLineDto[]; emptyLabel: string }) {
  if (lines.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">{emptyLabel}</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Account</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((line) => (
          <TableRow key={line.accountId}>
            <TableCell className="font-medium">{line.code}</TableCell>
            <TableCell>{line.name}</TableCell>
            <TableCell className="text-right">${line.amount.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function ProfitAndLossPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data, isLoading, isError, refetch } = useProfitAndLoss(from || undefined, to || undefined)

  return (
    <div>
      <PageHeader title="Profit & Loss" description="Revenue and expenses for a date range." />

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" className="w-44" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" className="w-44" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {isLoading && <LoadingState label="Loading profit and loss…" />}
      {isError && <ErrorState message="Could not load the profit and loss statement." onRetry={() => refetch()} />}

      {!isLoading && !isError && data && (
        <Card>
          <CardHeader>
            <CardTitle>
              {data.from ? data.from : 'Inception'} – {data.to ? data.to : 'now'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Revenue</h3>
              <LineTable lines={data.revenueLines} emptyLabel="No revenue activity." />
              <div className="mt-2 flex justify-end text-sm font-medium">Total revenue: ${data.totalRevenue.toLocaleString()}</div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Expenses</h3>
              <LineTable lines={data.expenseLines} emptyLabel="No expense activity." />
              <div className="mt-2 flex justify-end text-sm font-medium">Total expenses: ${data.totalExpenses.toLocaleString()}</div>
            </div>

            <Table>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-medium">Net income</TableCell>
                  <TableCell className="text-right font-medium">${data.netIncome.toLocaleString()}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
