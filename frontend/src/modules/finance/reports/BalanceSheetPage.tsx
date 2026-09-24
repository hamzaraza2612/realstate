import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import type { FinancialStatementLineDto } from '@/types/api'
import { useBalanceSheet } from './api'

const today = () => new Date().toISOString().slice(0, 10)

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

export function BalanceSheetPage() {
  const [asOf, setAsOf] = useState(today())
  const { data, isLoading, isError, refetch } = useBalanceSheet(asOf)

  const reconciles = !!data && Math.abs(data.totalAssets - data.totalLiabilitiesAndEquity) < 0.01

  return (
    <div>
      <PageHeader title="Balance Sheet" description="Assets, liabilities and equity as of a point in time." />

      <div className="mb-4 flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="asOf">As of</Label>
          <Input id="asOf" type="date" className="w-44" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </div>
      </div>

      {isLoading && <LoadingState label="Loading balance sheet…" />}
      {isError && <ErrorState message="Could not load the balance sheet." onRetry={() => refetch()} />}

      {!isLoading && !isError && data && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Balance sheet as of {data.asOf}</CardTitle>
            <Badge variant={reconciles ? 'success' : 'destructive'}>{reconciles ? 'Reconciles' : 'Does not reconcile'}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Assets</h3>
              <LineTable lines={data.assets} emptyLabel="No asset activity." />
              <div className="mt-2 flex justify-end text-sm font-medium">Total assets: ${data.totalAssets.toLocaleString()}</div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Liabilities</h3>
              <LineTable lines={data.liabilities} emptyLabel="No liability activity." />
              <div className="mt-2 flex justify-end text-sm font-medium">
                Total liabilities: ${data.totalLiabilities.toLocaleString()}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Equity</h3>
              <LineTable lines={data.equity} emptyLabel="No equity activity." />
              <div className="mt-2 flex justify-end text-sm font-medium">Total equity: ${data.totalEquity.toLocaleString()}</div>
            </div>

            <Table>
              <TableFooter>
                <TableRow>
                  <TableCell>Net income</TableCell>
                  <TableCell className="text-right">${data.netIncome.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Total liabilities and equity</TableCell>
                  <TableCell className="text-right font-medium">${data.totalLiabilitiesAndEquity.toLocaleString()}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
