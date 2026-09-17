import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Landmark,
  CreditCard,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
  superAdminOnly?: boolean
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/users', label: 'Users', icon: Users, permission: 'users.view' },
  { to: '/roles', label: 'Roles & Permissions', icon: ShieldCheck, permission: 'roles.view' },
  { to: '/organization', label: 'Organization', icon: Building2, permission: 'organizations.view' },
  { to: '/audit-logs', label: 'Audit Logs', icon: ClipboardList, permission: 'audit_logs.view' },
]

const platformNavItems: NavItem[] = [
  { to: '/platform/organizations', label: 'Organizations', icon: Landmark, superAdminOnly: true },
  { to: '/platform/subscription-plans', label: 'Subscription Plans', icon: CreditCard, superAdminOnly: true },
]

export function Sidebar() {
  const { hasPermission, user } = useAuthStore()

  // A platform-only Super Admin has no tenantId and therefore no organization context —
  // tenant-scoped pages (Users, Roles, Organization, Audit Logs) don't apply to that account.
  const belongsToTenant = user?.tenantId != null
  const visibleItems = belongsToTenant
    ? navItems.filter((item) => !item.permission || hasPermission(item.permission))
    : navItems.filter((item) => item.to === '/')
  const visiblePlatformItems = user?.isSuperAdmin ? platformNavItems : []

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          E
        </div>
        <span className="text-sm font-semibold">Estatery ERP</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {visibleItems.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}

        {visiblePlatformItems.length > 0 && (
          <>
            <div className="mt-4 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Platform Admin
            </div>
            {visiblePlatformItems.map((item) => (
              <SidebarLink key={item.to} item={item} />
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
          isActive && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
        )
      }
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  )
}
