import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Landmark,
  CreditCard,
  Contact,
  UserSquare2,
  FolderKanban,
  Boxes,
  ReceiptText,
  Wallet,
  BookOpen,
  HandCoins,
  Scale,
  HardHat,
  ClipboardCheck,
  Wrench,
  ShoppingCart,
  Truck,
  Package,
  Home,
  Building,
  DoorOpen,
  UserRound,
  FileSignature,
  Hammer,
  Warehouse,
  LayoutGrid,
  Zap,
  Store,
  Receipt,
  CircleParking,
  PartyPopper,
  BellRing,
  Contact2,
  IdCard,
  BadgeCheck,
  Armchair,
  DoorClosed,
  CalendarClock,
  FileBarChart,
  TrendingUp,
  Banknote,
  FileText,
  CheckSquare,
  BarChart3,
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
  { to: '/crm', label: 'CRM Dashboard', icon: LayoutDashboard, permission: 'crm.lead.view' },
  { to: '/crm/leads', label: 'Leads', icon: Contact, permission: 'crm.lead.view' },
  { to: '/crm/customers', label: 'Customers', icon: UserSquare2, permission: 'crm.customer.view' },
  { to: '/projects', label: 'Projects', icon: FolderKanban, permission: 'projects.view' },
  { to: '/inventory', label: 'Inventory', icon: Boxes, permission: 'inventory.view' },
  { to: '/sales', label: 'Sales Dashboard', icon: LayoutDashboard, permission: 'sales.booking.view' },
  { to: '/sales/bookings', label: 'Bookings', icon: ReceiptText, permission: 'sales.booking.view' },
  { to: '/construction', label: 'Construction Dashboard', icon: LayoutDashboard, permission: 'construction.view' },
  { to: '/construction/work-packages', label: 'Work Packages', icon: HardHat, permission: 'construction.view' },
  { to: '/construction/tasks', label: 'Tasks', icon: ClipboardCheck, permission: 'construction.view' },
  { to: '/construction/expenses', label: 'Expenses', icon: Wrench, permission: 'construction.view' },
  { to: '/procurement', label: 'Procurement Dashboard', icon: LayoutDashboard, permission: 'procurement.view' },
  { to: '/procurement/vendors', label: 'Vendors', icon: Truck, permission: 'procurement.view' },
  { to: '/procurement/purchase-requests', label: 'Purchase Requests', icon: ClipboardList, permission: 'procurement.view' },
  { to: '/procurement/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, permission: 'procurement.view' },
  { to: '/procurement/materials', label: 'Materials', icon: Package, permission: 'procurement.view' },
  { to: '/property', label: 'Property Dashboard', icon: LayoutDashboard, permission: 'property.view' },
  { to: '/property/rental-dashboard', label: 'Rental Dashboard', icon: Home, permission: 'property.view' },
  { to: '/property/properties', label: 'Properties', icon: Building, permission: 'property.view' },
  { to: '/property/units', label: 'Units', icon: DoorOpen, permission: 'property.view' },
  { to: '/property/tenants', label: 'Tenants', icon: UserRound, permission: 'property.view' },
  { to: '/property/leases', label: 'Leases', icon: FileSignature, permission: 'property.view' },
  { to: '/property/maintenance', label: 'Maintenance', icon: Hammer, permission: 'property.view' },
  { to: '/facility', label: 'Facility Dashboard', icon: LayoutDashboard, permission: 'facility.view' },
  { to: '/facility/facilities', label: 'Facilities', icon: Warehouse, permission: 'facility.view' },
  { to: '/facility/spaces', label: 'Spaces', icon: LayoutGrid, permission: 'facility.view' },
  { to: '/facility/service-requests', label: 'Service Requests', icon: Wrench, permission: 'facility.view' },
  { to: '/facility/utilities', label: 'Utilities', icon: Zap, permission: 'facility.view' },
  { to: '/facility/mall', label: 'Mall Dashboard', icon: LayoutDashboard, permission: 'facility.view' },
  { to: '/facility/mall/shops', label: 'Mall Shops', icon: Store, permission: 'facility.view' },
  { to: '/facility/mall/service-charges/definitions', label: 'Service Charge Definitions', icon: Receipt, permission: 'facility.view' },
  { to: '/facility/mall/service-charges', label: 'Service Charges', icon: Receipt, permission: 'facility.view' },
  { to: '/facility/mall/parking', label: 'Parking Spaces', icon: CircleParking, permission: 'facility.view' },
  { to: '/facility/mall/parking/allocations', label: 'Parking Allocations', icon: CircleParking, permission: 'facility.view' },
  { to: '/facility/mall/events', label: 'Events', icon: PartyPopper, permission: 'facility.view' },
  { to: '/facility/mall/notices', label: 'Notices', icon: BellRing, permission: 'facility.view' },
  { to: '/facility/coworking', label: 'Coworking Dashboard', icon: LayoutDashboard, permission: 'facility.view' },
  { to: '/facility/coworking/members', label: 'Members', icon: Contact2, permission: 'facility.view' },
  { to: '/facility/coworking/plans', label: 'Membership Plans', icon: IdCard, permission: 'facility.view' },
  { to: '/facility/coworking/memberships', label: 'Memberships', icon: BadgeCheck, permission: 'facility.view' },
  { to: '/facility/coworking/desks', label: 'Desks', icon: Armchair, permission: 'facility.view' },
  { to: '/facility/coworking/rooms', label: 'Meeting Rooms', icon: DoorClosed, permission: 'facility.view' },
  { to: '/facility/coworking/bookings', label: 'Bookings', icon: CalendarClock, permission: 'facility.view' },
  { to: '/finance', label: 'Finance Dashboard', icon: Wallet, permission: 'finance.reports.view' },
  { to: '/finance/accounts', label: 'Chart of Accounts', icon: BookOpen, permission: 'finance.reports.view' },
  { to: '/finance/journal', label: 'Journal', icon: Scale, permission: 'finance.reports.view' },
  { to: '/finance/receivables', label: 'Receivables', icon: HandCoins, permission: 'finance.reports.view' },
  { to: '/finance/trial-balance', label: 'Trial Balance', icon: Scale, permission: 'finance.reports.view' },
  { to: '/finance/balance-sheet', label: 'Balance Sheet', icon: FileBarChart, permission: 'finance.reports.view' },
  { to: '/finance/profit-and-loss', label: 'Profit & Loss', icon: TrendingUp, permission: 'finance.reports.view' },
  { to: '/finance/cash-flow', label: 'Cash Flow', icon: Banknote, permission: 'finance.reports.view' },
  { to: '/finance/fiscal-periods', label: 'Fiscal Periods', icon: CalendarClock, permission: 'finance.reports.view' },
  { to: '/reports', label: 'Reports', icon: BarChart3, permission: 'reports.view' },
  { to: '/documents', label: 'Documents', icon: FileText, permission: 'documents.view' },
  { to: '/approvals', label: 'Approvals', icon: CheckSquare },
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
      end={
        item.to === '/' ||
        item.to === '/crm' ||
        item.to === '/sales' ||
        item.to === '/construction' ||
        item.to === '/procurement' ||
        item.to === '/property' ||
        item.to === '/facility' ||
        item.to === '/facility/mall' ||
        item.to === '/facility/coworking' ||
        item.to === '/finance'
      }
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
