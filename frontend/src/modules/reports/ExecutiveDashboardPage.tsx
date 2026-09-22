import { useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  Boxes,
  Building2,
  Contact,
  HandCoins,
  Hammer,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Wrench,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { DateRangeFilter } from '@/modules/reports/components/DateRangeFilter'
import { StatCard } from '@/modules/reports/components/StatCard'
import { money, percent } from '@/modules/reports/format'
import { useExecutiveDashboard } from './api'

export function ExecutiveDashboardPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data, isLoading, isError, refetch } = useExecutiveDashboard(from || undefined, to || undefined)

  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        description="A cross-module snapshot of sales, collections, receivables and operations. Period figures use the range below; snapshot figures are as of now."
      />

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} idPrefix="exec" />
      </div>

      {isLoading && <LoadingState label="Loading executive dashboard…" />}
      {isError && <ErrorState message="Could not load the executive dashboard." onRetry={() => refetch()} />}

      {!isLoading && !isError && data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={TrendingUp}
            label="Sales (period)"
            value={money(data.sales)}
            description="Confirmed bookings, by booking date"
          />
          <StatCard
            icon={HandCoins}
            label="Collections (period)"
            value={money(data.collections)}
            description="Sales + rent + facility payments"
          />
          <StatCard
            icon={Wallet}
            label="Revenue / Expenses / Profit"
            value={money(data.profit)}
            description={
              <>
                Revenue {money(data.revenue)} · Expenses {money(data.expenses)}
              </>
            }
          />
          <StatCard
            icon={Building2}
            label="Rental collected / outstanding"
            value={money(data.rentalCollected)}
            description={`${money(data.rentalOutstanding)} outstanding (snapshot)`}
          />

          <StatCard
            icon={AlertTriangle}
            label="Receivables / Payables"
            value={money(data.receivables)}
            description={`${money(data.payables)} payables — both as of now`}
            alert={data.receivables > 0}
          />
          <StatCard
            icon={Banknote}
            label="Cash position"
            value={money(data.cashPosition)}
            description={`As of ${data.to}`}
          />
          <StatCard
            icon={Building2}
            label="Active projects"
            value={data.activeProjects}
            description="Snapshot count"
          />
          <StatCard
            icon={Boxes}
            label="Inventory"
            value={data.inventory.total}
            description={
              <>
                {data.inventory.available} available · {data.inventory.reserved} reserved/booked · {data.inventory.sold} sold
              </>
            }
          />

          <StatCard
            icon={Building2}
            label="Property occupancy rate"
            value={data.propertyOccupancyRate == null ? 'N/A' : percent(data.propertyOccupancyRate)}
            description="Snapshot — null when the tenant has zero units"
          />
          <StatCard
            icon={Hammer}
            label="Construction progress"
            value={data.constructionProgressPercent == null ? 'N/A' : percent(data.constructionProgressPercent)}
            description="Average across work packages not cancelled"
          />
          <StatCard
            icon={ShoppingCart}
            label="Procurement exposure"
            value={money(data.procurementExposure)}
            description="Committed spend, not yet fully received or cancelled"
          />
          <StatCard
            icon={Wrench}
            label="Maintenance backlog"
            value={data.maintenanceBacklogCount}
            description="Open / Assigned / In Progress / On Hold"
          />

          <StatCard
            icon={Contact}
            label="Leads / conversion rate"
            value={`${data.totalLeads} leads`}
            description={`${percent(data.leadConversionRatePercent)} won, all-time`}
          />
        </div>
      )}
    </div>
  )
}
