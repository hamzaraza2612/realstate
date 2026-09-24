import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import type { CashFlowCategoryDto } from '@/types/api'
import { useCashFlow } from './api'

function labelize(referenceType: string) {
  return referenceType.replace(/([a-z])([A-Z])/g, '$1 $2')
}

function CategoryTable({ categories, emptyLabel }: { categories: CashFlowCategoryDto[]; emptyLabel: string }) {
  if (categories.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">{emptyLabel}</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <TableRow key={category.referenceType}>
            <TableCell className="font-medium">{labelize(category.referenceType)}</TableCell>
            <TableCell className="text-right">${category.amount.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function CashFlowPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data, isLoading, isError, refetch } = useCashFlow(from || undefined, to || undefined)

  return (
    <div>
      <PageHeader title="Cash Flow" description="Cash inflows and outflows for a date range." />

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

      {isLoading && <LoadingState label="Loading cash flow…" />}
      {isError && <ErrorState message="Could not load the cash flow statement." onRetry={() => refetch()} />}

      {!isLoading && !isError && data && (
        <Card>
          <CardHeader>
            <CardTitle>
              {data.from ? data.from : 'Inception'} – {data.to ? data.to : 'now'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex justify-end text-sm font-medium">Opening cash: ${data.openingCash.toLocaleString()}</div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Inflows</h3>
              <CategoryTable categories={data.inflows} emptyLabel="No cash inflows in this range." />
              <div className="mt-2 flex justify-end text-sm font-medium">Total inflows: ${data.totalInflows.toLocaleString()}</div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Outflows</h3>
              <CategoryTable categories={data.outflows} emptyLabel="No cash outflows in this range." />
              <div className="mt-2 flex justify-end text-sm font-medium">Total outflows: ${data.totalOutflows.toLocaleString()}</div>
            </div>

            <Table>
              <TableFooter>
                <TableRow>
                  <TableCell>Net change</TableCell>
                  <TableCell className="text-right">${data.netChange.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Closing cash</TableCell>
                  <TableCell className="text-right font-medium">${data.closingCash.toLocaleString()}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
