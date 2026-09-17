import { Building2, ClipboardList, CreditCard, Landmark, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { useAuthStore } from '@/stores/authStore'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const belongsToTenant = user?.tenantId != null

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.fullName ?? ''}`}
        description={
          belongsToTenant
            ? `${user?.tenantName} · ${user?.roles.join(', ')}`
            : 'Platform Super Admin workspace'
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {belongsToTenant ? (
          <>
            <PermissionGate permission="users.view">
              <ShortcutCard to="/users" icon={Users} title="Users" description="Manage staff accounts and role assignments" />
            </PermissionGate>
            <PermissionGate permission="roles.view">
              <ShortcutCard to="/roles" icon={ShieldCheck} title="Roles & Permissions" description="Configure access control for your organization" />
            </PermissionGate>
            <PermissionGate permission="organizations.view">
              <ShortcutCard to="/organization" icon={Building2} title="Organization" description="View and update your company profile" />
            </PermissionGate>
            <PermissionGate permission="audit_logs.view">
              <ShortcutCard to="/audit-logs" icon={ClipboardList} title="Audit Logs" description="Review recent activity across your organization" />
            </PermissionGate>
          </>
        ) : (
          <>
            <ShortcutCard to="/platform/organizations" icon={Landmark} title="Organizations" description="Onboard, activate, and suspend tenant organizations" />
            <ShortcutCard to="/platform/subscription-plans" icon={CreditCard} title="Subscription Plans" description="Manage the plans sold to your customers" />
          </>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>What's next</CardTitle>
          <CardDescription>
            This is the Milestone 1 foundation release: multi-tenancy, authentication, RBAC, organization
            management, and audit logging are live end-to-end. CRM, sales, inventory, finance, construction,
            property management, and reporting dashboards ship in the milestones that follow — this page will
            grow real KPI cards (bookings, collections, occupancy, etc.) as those modules land, rather than
            showing placeholder numbers today.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
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
    <Link to={to}>
      <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/50">
        <CardHeader>
          <Icon className="h-5 w-5 text-primary" />
          <CardTitle className="mt-2 text-sm">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  )
}
