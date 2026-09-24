import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** The exact from/to date-filter pattern used by `finance/reports/ProfitAndLossPage.tsx`,
 * shared across every date-ranged report in `/reports/*`. An empty value lets the backend
 * apply its own default ("current calendar month to date"). */
export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  idPrefix = 'range',
}: {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  idPrefix?: string
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-from`}>From</Label>
        <Input id={`${idPrefix}-from`} type="date" className="w-44" value={from} onChange={(e) => onFromChange(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-to`}>To</Label>
        <Input id={`${idPrefix}-to`} type="date" className="w-44" value={to} onChange={(e) => onToChange(e.target.value)} />
      </div>
    </>
  )
}
