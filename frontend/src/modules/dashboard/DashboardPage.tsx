import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BarChart3,
  Building2,
  CheckSquare,
  CreditCard,
  Hammer,
  HandCoins,
  Landmark,
  Sparkles,
  TrendingUp,
  Wallet,
  Wrench,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { StatCard } from '@/components/common/StatCard'
import { ErrorState } from '@/components/common/StateViews'
import { useI18n } from '@/lib/i18n'
import { useAuthStore } from '@/stores/authStore'
import { useLocalizationStore } from '@/stores/localizationStore'
import { useExecutiveDashboard } from '@/modules/reports/api'
import { money, percent } from '@/modules/reports/format'

/**
 * The root landing page (`/`). For tenant users it leads with real business figures — the same
 * `GET /reports/executive` data the full Executive Report (`/reports`) uses, for the backend's
 * default period — followed by shortcuts into the Command Center, Approvals and Reports. The
 * `/reports` page stays the place to change the date range and see every figure.
 */
export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { t } = useI18n()
  const belongsToTenant = user?.tenantId != null

  return (
    <div>
      <PageHeader
        title={t('dashboard.welcome').replace('{name}', user?.fullName ?? '')}
        description={belongsToTenant ? `${user?.tenantName} · ${user?.roles.join(', ')}` : 'Platform Super Admin workspace'}
      />

      {belongsToTenant ? (
        <div className="flex flex-col gap-8">
          <PermissionGate permission="reports.view">
            <BusinessSnapshot />
          </PermissionGate>

          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">{t('dashboard.shortcuts')}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <PermissionGate permission="ai.view">
                <ShortcutCard
                  to="/command-center"
                  icon={Sparkles}
                  title={t('nav.commandCenter')}
                  description={t('dashboard.shortcutCommandCenter')}
                />
              </PermissionGate>
              <ShortcutCard to="/approvals" icon={CheckSquare} title={t('nav.approvals')} description={t('dashboard.shortcutApprovals')} />
              <PermissionGate permission="reports.view">
                <ShortcutCard to="/reports" icon={BarChart3} title={t('nav.reports')} description={t('dashboard.shortcutReports')} />
              </PermissionGate>
            </div>
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ShortcutCard to="/platform/organizations" icon={Landmark} title="Organizations" description="Onboard, activate, and suspend tenant organizations" />
          <ShortcutCard to="/platform/subscription-plans" icon={CreditCard} title="Subscription Plans" description="Manage the plans sold to your customers" />
        </div>
      )}
    </div>
  )
}

/** KPI row — mounted only for users with `reports.view` (the same permission the endpoint and the
 * `/reports` route require), so nobody else triggers a request that would just be refused. */
function BusinessSnapshot() {
  const { t } = useI18n()
  const { data, isLoading, isError, refetch } = useExecutiveDashboard(undefined, undefined)

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{t('dashboard.snapshotTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {data ? t('dashboard.snapshotPeriod').replace('{from}', formatDay(data.from)).replace('{to}', formatDay(data.to)) : t('dashboard.snapshotDescription')}
          </p>
        </div>
        <Link to="/reports" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          {t('dashboard.fullReport')}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-5 w-5" />
                <Skeleton className="mt-2 h-7 w-28" />
                <Skeleton className="h-4 w-36" />
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
      {isError && <ErrorState message={t('dashboard.snapshotError')} onRetry={() => refetch()} />}

      {!isLoading && !isError && data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={TrendingUp} label="Sales (period)" value={money(data.sales)} description="Confirmed bookings, by booking date" />
          <StatCard icon={HandCoins} label="Collections (period)" value={money(data.collections)} description="Sales + rent + facility payments" />
          <StatCard
            icon={Wallet}
            label="Profit (period)"
            value={money(data.profit)}
            description={`Revenue ${money(data.revenue)} · Expenses ${money(data.expenses)}`}
            alert={data.profit < 0}
          />
          <StatCard icon={Banknote} label="Cash position" value={money(data.cashPosition)} description={`As of ${formatDay(data.to)}`} />
          <StatCard
            icon={AlertTriangle}
            label="Receivables"
            value={money(data.receivables)}
            description={`${money(data.payables)} payables — both as of now`}
            alert={data.receivables > 0}
          />
          <StatCard
            icon={Building2}
            label="Property occupancy"
            value={data.propertyOccupancyRate == null ? 'N/A' : percent(data.propertyOccupancyRate)}
            description={`${money(data.rentalOutstanding)} rent outstanding`}
          />
          <StatCard
            icon={Hammer}
            label="Construction progress"
            value={data.constructionProgressPercent == null ? 'N/A' : percent(data.constructionProgressPercent)}
            description={`${data.activeProjects} active projects`}
          />
          <StatCard
            icon={Wrench}
            label="Maintenance backlog"
            value={data.maintenanceBacklogCount}
            description="Open / Assigned / In Progress / On Hold"
            alert={data.maintenanceBacklogCount > 0}
          />
        </div>
      )}
    </section>
  )
}

/** Formats a `DateOnly` string ("2026-09-01") as a medium date in the tenant's locale, parsed as a
 * local calendar date so it never shifts a day across time zones. */
function formatDay(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  try {
    return new Date(year, month - 1, day).toLocaleDateString(useLocalizationStore.getState().data?.locale, { dateStyle: 'medium' })
  } catch {
    return value
  }
}

function ShortcutCard({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <Link to={to} className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-accent/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Icon className="h-5 w-5 text-primary" />
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 rtl:rotate-180" />
          </div>
          <CardTitle className="mt-2 text-sm">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  )
}
