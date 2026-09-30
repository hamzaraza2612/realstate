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
  Sparkles,
  LineChart,
  PieChart,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

/**
 * The single navigation model for the authenticated shell — rendered by the desktop Sidebar, the
 * mobile nav drawer (Topbar) and the Ctrl+K command bar, so all three always show exactly the
 * same, identically-permissioned set of destinations.
 *
 * `section` is purely visual grouping (Milestone 17). Visibility is still decided ONLY by each
 * item's `permission` (see `useVisibleNavigation`), exactly as before the regrouping.
 */

export type NavSection = 'home' | 'commandCenter' | 'erp' | 'reports' | 'administration'

export interface NavItem {
  to: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
  section?: NavSection
  permission?: string
  superAdminOnly?: boolean
}

/** Render order of the tenant sections, with their header label key (`home` has no header). */
export const NAV_SECTIONS: { id: NavSection; labelKey?: string }[] = [
  { id: 'home' },
  { id: 'commandCenter', labelKey: 'nav.section.commandCenter' },
  { id: 'erp', labelKey: 'nav.section.erp' },
  { id: 'reports', labelKey: 'nav.section.reports' },
  { id: 'administration', labelKey: 'nav.section.administration' },
]

export const navItems: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, section: 'home' },
  { to: '/command-center', labelKey: 'nav.commandCenter', icon: Sparkles, section: 'commandCenter', permission: 'ai.view' },
  { to: '/crm', labelKey: 'nav.crmDashboard', icon: LayoutDashboard, section: 'erp', permission: 'crm.lead.view' },
  { to: '/crm/leads', labelKey: 'nav.crmLeads', icon: Contact, section: 'erp', permission: 'crm.lead.view' },
  { to: '/crm/customers', labelKey: 'nav.crmCustomers', icon: UserSquare2, section: 'erp', permission: 'crm.customer.view' },
  { to: '/projects', labelKey: 'nav.projects', icon: FolderKanban, section: 'erp', permission: 'projects.view' },
  { to: '/inventory', labelKey: 'nav.inventory', icon: Boxes, section: 'erp', permission: 'inventory.view' },
  { to: '/sales', labelKey: 'nav.salesDashboard', icon: LayoutDashboard, section: 'erp', permission: 'sales.booking.view' },
  { to: '/sales/bookings', labelKey: 'nav.salesBookings', icon: ReceiptText, section: 'erp', permission: 'sales.booking.view' },
  { to: '/agent-portal', labelKey: 'nav.agentPortal', icon: Briefcase, section: 'erp', permission: 'sales.booking.view' },
  { to: '/construction', labelKey: 'nav.constructionDashboard', icon: LayoutDashboard, section: 'erp', permission: 'construction.view' },
  { to: '/construction/work-packages', labelKey: 'nav.constructionWorkPackages', icon: HardHat, section: 'erp', permission: 'construction.view' },
  { to: '/construction/tasks', labelKey: 'nav.constructionTasks', icon: ClipboardCheck, section: 'erp', permission: 'construction.view' },
  { to: '/construction/expenses', labelKey: 'nav.constructionExpenses', icon: Wrench, section: 'erp', permission: 'construction.view' },
  { to: '/procurement', labelKey: 'nav.procurementDashboard', icon: LayoutDashboard, section: 'erp', permission: 'procurement.view' },
  { to: '/procurement/vendors', labelKey: 'nav.procurementVendors', icon: Truck, section: 'erp', permission: 'procurement.view' },
  { to: '/procurement/purchase-requests', labelKey: 'nav.procurementPurchaseRequests', icon: ClipboardList, section: 'erp', permission: 'procurement.view' },
  { to: '/procurement/purchase-orders', labelKey: 'nav.procurementPurchaseOrders', icon: ShoppingCart, section: 'erp', permission: 'procurement.view' },
  { to: '/procurement/materials', labelKey: 'nav.procurementMaterials', icon: Package, section: 'erp', permission: 'procurement.view' },
  { to: '/property', labelKey: 'nav.propertyDashboard', icon: LayoutDashboard, section: 'erp', permission: 'property.view' },
  { to: '/property/rental-dashboard', labelKey: 'nav.propertyRentalDashboard', icon: Home, section: 'erp', permission: 'property.view' },
  { to: '/property/properties', labelKey: 'nav.propertyProperties', icon: Building, section: 'erp', permission: 'property.view' },
  { to: '/property/units', labelKey: 'nav.propertyUnits', icon: DoorOpen, section: 'erp', permission: 'property.view' },
  { to: '/property/tenants', labelKey: 'nav.propertyTenants', icon: UserRound, section: 'erp', permission: 'property.view' },
  { to: '/property/leases', labelKey: 'nav.propertyLeases', icon: FileSignature, section: 'erp', permission: 'property.view' },
  { to: '/property/maintenance', labelKey: 'nav.propertyMaintenance', icon: Hammer, section: 'erp', permission: 'property.view' },
  { to: '/facility', labelKey: 'nav.facilityDashboard', icon: LayoutDashboard, section: 'erp', permission: 'facility.view' },
  { to: '/facility/facilities', labelKey: 'nav.facilityFacilities', icon: Warehouse, section: 'erp', permission: 'facility.view' },
  { to: '/facility/spaces', labelKey: 'nav.facilitySpaces', icon: LayoutGrid, section: 'erp', permission: 'facility.view' },
  { to: '/facility/service-requests', labelKey: 'nav.facilityServiceRequests', icon: Wrench, section: 'erp', permission: 'facility.view' },
  { to: '/facility/utilities', labelKey: 'nav.facilityUtilities', icon: Zap, section: 'erp', permission: 'facility.view' },
  { to: '/facility/mall', labelKey: 'nav.facilityMallDashboard', icon: LayoutDashboard, section: 'erp', permission: 'facility.view' },
  { to: '/facility/mall/shops', labelKey: 'nav.facilityMallShops', icon: Store, section: 'erp', permission: 'facility.view' },
  {
    to: '/facility/mall/service-charges/definitions',
    labelKey: 'nav.facilityMallServiceChargeDefinitions',
    icon: Receipt,
    section: 'erp',
    permission: 'facility.view',
  },
  { to: '/facility/mall/service-charges', labelKey: 'nav.facilityMallServiceCharges', icon: Receipt, section: 'erp', permission: 'facility.view' },
  { to: '/facility/mall/parking', labelKey: 'nav.facilityMallParking', icon: CircleParking, section: 'erp', permission: 'facility.view' },
  {
    to: '/facility/mall/parking/allocations',
    labelKey: 'nav.facilityMallParkingAllocations',
    icon: CircleParking,
    section: 'erp',
    permission: 'facility.view',
  },
  { to: '/facility/mall/events', labelKey: 'nav.facilityMallEvents', icon: PartyPopper, section: 'erp', permission: 'facility.view' },
  { to: '/facility/mall/notices', labelKey: 'nav.facilityMallNotices', icon: BellRing, section: 'erp', permission: 'facility.view' },
  { to: '/facility/coworking', labelKey: 'nav.facilityCoworkingDashboard', icon: LayoutDashboard, section: 'erp', permission: 'facility.view' },
  { to: '/facility/coworking/members', labelKey: 'nav.facilityCoworkingMembers', icon: Contact2, section: 'erp', permission: 'facility.view' },
  { to: '/facility/coworking/plans', labelKey: 'nav.facilityCoworkingPlans', icon: IdCard, section: 'erp', permission: 'facility.view' },
  { to: '/facility/coworking/memberships', labelKey: 'nav.facilityCoworkingMemberships', icon: BadgeCheck, section: 'erp', permission: 'facility.view' },
  { to: '/facility/coworking/desks', labelKey: 'nav.facilityCoworkingDesks', icon: Armchair, section: 'erp', permission: 'facility.view' },
  { to: '/facility/coworking/rooms', labelKey: 'nav.facilityCoworkingRooms', icon: DoorClosed, section: 'erp', permission: 'facility.view' },
  { to: '/facility/coworking/bookings', labelKey: 'nav.facilityCoworkingBookings', icon: CalendarClock, section: 'erp', permission: 'facility.view' },
  { to: '/finance', labelKey: 'nav.financeDashboard', icon: Wallet, section: 'erp', permission: 'finance.reports.view' },
  { to: '/finance/accounts', labelKey: 'nav.financeAccounts', icon: BookOpen, section: 'erp', permission: 'finance.reports.view' },
  { to: '/finance/journal', labelKey: 'nav.financeJournal', icon: Scale, section: 'erp', permission: 'finance.reports.view' },
  { to: '/finance/receivables', labelKey: 'nav.financeReceivables', icon: HandCoins, section: 'erp', permission: 'finance.reports.view' },
  { to: '/finance/trial-balance', labelKey: 'nav.financeTrialBalance', icon: Scale, section: 'erp', permission: 'finance.reports.view' },
  { to: '/finance/balance-sheet', labelKey: 'nav.financeBalanceSheet', icon: FileBarChart, section: 'erp', permission: 'finance.reports.view' },
  { to: '/finance/profit-and-loss', labelKey: 'nav.financeProfitAndLoss', icon: TrendingUp, section: 'erp', permission: 'finance.reports.view' },
  { to: '/finance/cash-flow', labelKey: 'nav.financeCashFlow', icon: Banknote, section: 'erp', permission: 'finance.reports.view' },
  { to: '/finance/fiscal-periods', labelKey: 'nav.financeFiscalPeriods', icon: CalendarClock, section: 'erp', permission: 'finance.reports.view' },
  { to: '/documents', labelKey: 'nav.documents', icon: FileText, section: 'erp', permission: 'documents.view' },
  { to: '/approvals', labelKey: 'nav.approvals', icon: CheckSquare, section: 'erp' },
  // Reports: the executive report plus its per-module report pages. Each carries the exact same
  // `reports.view` permission as its route guard in App.tsx (these pages previously had routes but
  // no navigation entry at all).
  { to: '/reports', labelKey: 'nav.reportsExecutive', icon: BarChart3, section: 'reports', permission: 'reports.view' },
  { to: '/reports/sales', labelKey: 'nav.reportsSales', icon: TrendingUp, section: 'reports', permission: 'reports.view' },
  { to: '/reports/finance', labelKey: 'nav.reportsFinance', icon: LineChart, section: 'reports', permission: 'reports.view' },
  { to: '/reports/projects', labelKey: 'nav.reportsProjects', icon: FolderKanban, section: 'reports', permission: 'reports.view' },
  { to: '/reports/construction', labelKey: 'nav.reportsConstruction', icon: HardHat, section: 'reports', permission: 'reports.view' },
  { to: '/reports/procurement', labelKey: 'nav.reportsProcurement', icon: ShoppingCart, section: 'reports', permission: 'reports.view' },
  { to: '/reports/property', labelKey: 'nav.reportsProperty', icon: PieChart, section: 'reports', permission: 'reports.view' },
  { to: '/reports/facility', labelKey: 'nav.reportsFacility', icon: Warehouse, section: 'reports', permission: 'reports.view' },
  { to: '/users', labelKey: 'nav.users', icon: Users, section: 'administration', permission: 'users.view' },
  { to: '/roles', labelKey: 'nav.roles', icon: ShieldCheck, section: 'administration', permission: 'roles.view' },
  { to: '/organization', labelKey: 'nav.organization', icon: Building2, section: 'administration', permission: 'organizations.view' },
  { to: '/settings/localization', labelKey: 'nav.localization', icon: Globe, section: 'administration', permission: 'organizations.view' },
  { to: '/audit-logs', labelKey: 'nav.auditLogs', icon: ClipboardList, section: 'administration', permission: 'audit_logs.view' },
  { to: '/billing', labelKey: 'nav.billing', icon: CreditCard, section: 'administration', permission: 'subscription.view' },
]

export const platformNavItems: NavItem[] = [
  { to: '/platform/dashboard', labelKey: 'nav.platformSaasDashboard', icon: LayoutDashboard, superAdminOnly: true },
  { to: '/platform/organizations', labelKey: 'nav.platformOrganizations', icon: Landmark, superAdminOnly: true },
  { to: '/platform/subscription-plans', labelKey: 'nav.platformSubscriptionPlans', icon: CreditCard, superAdminOnly: true },
  { to: '/platform/subscriptions', labelKey: 'nav.platformSubscriptions', icon: Repeat, superAdminOnly: true },
  { to: '/platform/tax-profiles', labelKey: 'nav.platformTaxProfiles', icon: Percent, superAdminOnly: true },
  { to: '/platform/invoices', labelKey: 'nav.platformInvoices', icon: Receipt, superAdminOnly: true },
  { to: '/platform/audit-logs', labelKey: 'nav.platformAuditLogs', icon: ClipboardList, superAdminOnly: true },
]

/** Paths whose NavLink must match exactly — a module dashboard shouldn't stay highlighted while
 * the user is on one of that module's sub-pages that has its own nav entry. */
export const EXACT_MATCH_PATHS: ReadonlySet<string> = new Set([
  '/',
  '/crm',
  '/sales',
  '/construction',
  '/procurement',
  '/property',
  '/facility',
  '/facility/mall',
  '/facility/coworking',
  '/finance',
  '/reports',
])

/** The nav items the current user may see, grouped for rendering. The filtering here is the exact
 * logic the Sidebar has always used — grouping into sections happens only afterwards. */
export function useVisibleNavigation() {
  const { hasPermission, user } = useAuthStore()

  // A platform-only Super Admin has no tenantId and therefore no organization context —
  // tenant-scoped pages (Users, Roles, Organization, Audit Logs) don't apply to that account.
  const belongsToTenant = user?.tenantId != null
  const visibleItems = belongsToTenant
    ? navItems.filter((item) => !item.permission || hasPermission(item.permission))
    : navItems.filter((item) => item.to === '/')
  const visiblePlatformItems = user?.isSuperAdmin ? platformNavItems : []

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: visibleItems.filter((item) => (item.section ?? 'erp') === section.id),
  })).filter((section) => section.items.length > 0)

  return { visibleItems, visiblePlatformItems, sections }
}
