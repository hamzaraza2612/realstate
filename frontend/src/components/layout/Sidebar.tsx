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
  Briefcase,
  Repeat,
  Globe,
  Percent,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useI18n } from '@/lib/i18n'

interface NavItem {
  to: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
  superAdminOnly?: boolean
}

const navItems: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/crm', labelKey: 'nav.crmDashboard', icon: LayoutDashboard, permission: 'crm.lead.view' },
  { to: '/crm/leads', labelKey: 'nav.crmLeads', icon: Contact, permission: 'crm.lead.view' },
  { to: '/crm/customers', labelKey: 'nav.crmCustomers', icon: UserSquare2, permission: 'crm.customer.view' },
  { to: '/projects', labelKey: 'nav.projects', icon: FolderKanban, permission: 'projects.view' },
  { to: '/inventory', labelKey: 'nav.inventory', icon: Boxes, permission: 'inventory.view' },
  { to: '/sales', labelKey: 'nav.salesDashboard', icon: LayoutDashboard, permission: 'sales.booking.view' },
  { to: '/sales/bookings', labelKey: 'nav.salesBookings', icon: ReceiptText, permission: 'sales.booking.view' },
  { to: '/agent-portal', labelKey: 'nav.agentPortal', icon: Briefcase, permission: 'sales.booking.view' },
  { to: '/construction', labelKey: 'nav.constructionDashboard', icon: LayoutDashboard, permission: 'construction.view' },
  { to: '/construction/work-packages', labelKey: 'nav.constructionWorkPackages', icon: HardHat, permission: 'construction.view' },
  { to: '/construction/tasks', labelKey: 'nav.constructionTasks', icon: ClipboardCheck, permission: 'construction.view' },
  { to: '/construction/expenses', labelKey: 'nav.constructionExpenses', icon: Wrench, permission: 'construction.view' },
  { to: '/procurement', labelKey: 'nav.procurementDashboard', icon: LayoutDashboard, permission: 'procurement.view' },
  { to: '/procurement/vendors', labelKey: 'nav.procurementVendors', icon: Truck, permission: 'procurement.view' },
  { to: '/procurement/purchase-requests', labelKey: 'nav.procurementPurchaseRequests', icon: ClipboardList, permission: 'procurement.view' },
  { to: '/procurement/purchase-orders', labelKey: 'nav.procurementPurchaseOrders', icon: ShoppingCart, permission: 'procurement.view' },
  { to: '/procurement/materials', labelKey: 'nav.procurementMaterials', icon: Package, permission: 'procurement.view' },
  { to: '/property', labelKey: 'nav.propertyDashboard', icon: LayoutDashboard, permission: 'property.view' },
  { to: '/property/rental-dashboard', labelKey: 'nav.propertyRentalDashboard', icon: Home, permission: 'property.view' },
  { to: '/property/properties', labelKey: 'nav.propertyProperties', icon: Building, permission: 'property.view' },
  { to: '/property/units', labelKey: 'nav.propertyUnits', icon: DoorOpen, permission: 'property.view' },
  { to: '/property/tenants', labelKey: 'nav.propertyTenants', icon: UserRound, permission: 'property.view' },
  { to: '/property/leases', labelKey: 'nav.propertyLeases', icon: FileSignature, permission: 'property.view' },
  { to: '/property/maintenance', labelKey: 'nav.propertyMaintenance', icon: Hammer, permission: 'property.view' },
  { to: '/facility', labelKey: 'nav.facilityDashboard', icon: LayoutDashboard, permission: 'facility.view' },
  { to: '/facility/facilities', labelKey: 'nav.facilityFacilities', icon: Warehouse, permission: 'facility.view' },
  { to: '/facility/spaces', labelKey: 'nav.facilitySpaces', icon: LayoutGrid, permission: 'facility.view' },
  { to: '/facility/service-requests', labelKey: 'nav.facilityServiceRequests', icon: Wrench, permission: 'facility.view' },
  { to: '/facility/utilities', labelKey: 'nav.facilityUtilities', icon: Zap, permission: 'facility.view' },
  { to: '/facility/mall', labelKey: 'nav.facilityMallDashboard', icon: LayoutDashboard, permission: 'facility.view' },
  { to: '/facility/mall/shops', labelKey: 'nav.facilityMallShops', icon: Store, permission: 'facility.view' },
  {
    to: '/facility/mall/service-charges/definitions',
    labelKey: 'nav.facilityMallServiceChargeDefinitions',
    icon: Receipt,
    permission: 'facility.view',
  },
  { to: '/facility/mall/service-charges', labelKey: 'nav.facilityMallServiceCharges', icon: Receipt, permission: 'facility.view' },
  { to: '/facility/mall/parking', labelKey: 'nav.facilityMallParking', icon: CircleParking, permission: 'facility.view' },
  { to: '/facility/mall/parking/allocations', labelKey: 'nav.facilityMallParkingAllocations', icon: CircleParking, permission: 'facility.view' },
  { to: '/facility/mall/events', labelKey: 'nav.facilityMallEvents', icon: PartyPopper, permission: 'facility.view' },
  { to: '/facility/mall/notices', labelKey: 'nav.facilityMallNotices', icon: BellRing, permission: 'facility.view' },
  { to: '/facility/coworking', labelKey: 'nav.facilityCoworkingDashboard', icon: LayoutDashboard, permission: 'facility.view' },
  { to: '/facility/coworking/members', labelKey: 'nav.facilityCoworkingMembers', icon: Contact2, permission: 'facility.view' },
  { to: '/facility/coworking/plans', labelKey: 'nav.facilityCoworkingPlans', icon: IdCard, permission: 'facility.view' },
  { to: '/facility/coworking/memberships', labelKey: 'nav.facilityCoworkingMemberships', icon: BadgeCheck, permission: 'facility.view' },
  { to: '/facility/coworking/desks', labelKey: 'nav.facilityCoworkingDesks', icon: Armchair, permission: 'facility.view' },
  { to: '/facility/coworking/rooms', labelKey: 'nav.facilityCoworkingRooms', icon: DoorClosed, permission: 'facility.view' },
  { to: '/facility/coworking/bookings', labelKey: 'nav.facilityCoworkingBookings', icon: CalendarClock, permission: 'facility.view' },
  { to: '/finance', labelKey: 'nav.financeDashboard', icon: Wallet, permission: 'finance.reports.view' },
  { to: '/finance/accounts', labelKey: 'nav.financeAccounts', icon: BookOpen, permission: 'finance.reports.view' },
  { to: '/finance/journal', labelKey: 'nav.financeJournal', icon: Scale, permission: 'finance.reports.view' },
  { to: '/finance/receivables', labelKey: 'nav.financeReceivables', icon: HandCoins, permission: 'finance.reports.view' },
  { to: '/finance/trial-balance', labelKey: 'nav.financeTrialBalance', icon: Scale, permission: 'finance.reports.view' },
  { to: '/finance/balance-sheet', labelKey: 'nav.financeBalanceSheet', icon: FileBarChart, permission: 'finance.reports.view' },
  { to: '/finance/profit-and-loss', labelKey: 'nav.financeProfitAndLoss', icon: TrendingUp, permission: 'finance.reports.view' },
  { to: '/finance/cash-flow', labelKey: 'nav.financeCashFlow', icon: Banknote, permission: 'finance.reports.view' },
  { to: '/finance/fiscal-periods', labelKey: 'nav.financeFiscalPeriods', icon: CalendarClock, permission: 'finance.reports.view' },
  { to: '/reports', labelKey: 'nav.reports', icon: BarChart3, permission: 'reports.view' },
  { to: '/documents', labelKey: 'nav.documents', icon: FileText, permission: 'documents.view' },
  { to: '/approvals', labelKey: 'nav.approvals', icon: CheckSquare },
  { to: '/users', labelKey: 'nav.users', icon: Users, permission: 'users.view' },
  { to: '/roles', labelKey: 'nav.roles', icon: ShieldCheck, permission: 'roles.view' },
  { to: '/organization', labelKey: 'nav.organization', icon: Building2, permission: 'organizations.view' },
  { to: '/settings/localization', labelKey: 'nav.localization', icon: Globe, permission: 'organizations.view' },
  { to: '/audit-logs', labelKey: 'nav.auditLogs', icon: ClipboardList, permission: 'audit_logs.view' },
  { to: '/billing', labelKey: 'nav.billing', icon: CreditCard, permission: 'subscription.view' },
]

const platformNavItems: NavItem[] = [
  { to: '/platform/dashboard', labelKey: 'nav.platformSaasDashboard', icon: LayoutDashboard, superAdminOnly: true },
  { to: '/platform/organizations', labelKey: 'nav.platformOrganizations', icon: Landmark, superAdminOnly: true },
  { to: '/platform/subscription-plans', labelKey: 'nav.platformSubscriptionPlans', icon: CreditCard, superAdminOnly: true },
  { to: '/platform/subscriptions', labelKey: 'nav.platformSubscriptions', icon: Repeat, superAdminOnly: true },
  { to: '/platform/tax-profiles', labelKey: 'nav.platformTaxProfiles', icon: Percent, superAdminOnly: true },
  { to: '/platform/invoices', labelKey: 'nav.platformInvoices', icon: Receipt, superAdminOnly: true },
  { to: '/platform/audit-logs', labelKey: 'nav.platformAuditLogs', icon: ClipboardList, superAdminOnly: true },
]

export function Sidebar() {
  const { hasPermission, user } = useAuthStore()
  const { t } = useI18n()

  // A platform-only Super Admin has no tenantId and therefore no organization context —
  // tenant-scoped pages (Users, Roles, Organization, Audit Logs) don't apply to that account.
  const belongsToTenant = user?.tenantId != null
  const visibleItems = belongsToTenant
    ? navItems.filter((item) => !item.permission || hasPermission(item.permission))
    : navItems.filter((item) => item.to === '/')
  const visiblePlatformItems = user?.isSuperAdmin ? platformNavItems : []

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-e bg-card md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          E
        </div>
        <span className="text-sm font-semibold">Estatery ERP</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {visibleItems.map((item) => (
          <SidebarLink key={item.to} item={item} label={t(item.labelKey)} />
        ))}

        {visiblePlatformItems.length > 0 && (
          <>
            <div className="mt-4 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('nav.platformAdminSection')}
            </div>
            {visiblePlatformItems.map((item) => (
              <SidebarLink key={item.to} item={item} label={t(item.labelKey)} />
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}

function SidebarLink({ item, label }: { item: NavItem; label: string }) {
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
      {label}
    </NavLink>
  )
}
