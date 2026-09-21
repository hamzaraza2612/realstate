import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { PermissionRoute, ProtectedRoute, SuperAdminRoute } from '@/app/ProtectedRoute'
import { LoginPage } from '@/modules/auth/LoginPage'
import { DashboardPage } from '@/modules/dashboard/DashboardPage'
import { CrmDashboardPage } from '@/modules/crm/dashboard/CrmDashboardPage'
import { LeadsPage } from '@/modules/crm/leads/LeadsPage'
import { LeadDetailPage } from '@/modules/crm/leads/LeadDetailPage'
import { CustomersPage } from '@/modules/crm/customers/CustomersPage'
import { CustomerDetailPage } from '@/modules/crm/customers/CustomerDetailPage'
import { ProjectsPage } from '@/modules/projects/ProjectsPage'
import { ProjectDetailPage } from '@/modules/projects/ProjectDetailPage'
import { InventoryPage } from '@/modules/inventory/InventoryPage'
import { InventoryDetailPage } from '@/modules/inventory/InventoryDetailPage'
import { SalesDashboardPage } from '@/modules/sales/dashboard/SalesDashboardPage'
import { BookingsPage } from '@/modules/sales/bookings/BookingsPage'
import { BookingDetailPage } from '@/modules/sales/bookings/BookingDetailPage'
import { ConstructionDashboardPage } from '@/modules/construction/dashboard/ConstructionDashboardPage'
import { WorkPackagesPage } from '@/modules/construction/workPackages/WorkPackagesPage'
import { WorkPackageDetailPage } from '@/modules/construction/workPackages/WorkPackageDetailPage'
import { TasksPage } from '@/modules/construction/tasks/TasksPage'
import { TaskDetailPage } from '@/modules/construction/tasks/TaskDetailPage'
import { ExpensesPage } from '@/modules/construction/expenses/ExpensesPage'
import { ProcurementDashboardPage } from '@/modules/procurement/dashboard/ProcurementDashboardPage'
import { VendorsPage } from '@/modules/procurement/vendors/VendorsPage'
import { PurchaseRequestsPage } from '@/modules/procurement/purchaseRequests/PurchaseRequestsPage'
import { PurchaseRequestDetailPage } from '@/modules/procurement/purchaseRequests/PurchaseRequestDetailPage'
import { PurchaseOrdersPage } from '@/modules/procurement/purchaseOrders/PurchaseOrdersPage'
import { PurchaseOrderDetailPage } from '@/modules/procurement/purchaseOrders/PurchaseOrderDetailPage'
import { MaterialsPage } from '@/modules/procurement/materials/MaterialsPage'
import { MaterialDetailPage } from '@/modules/procurement/materials/MaterialDetailPage'
import { PropertyDashboardPage } from '@/modules/property/dashboard/PropertyDashboardPage'
import { RentalDashboardPage } from '@/modules/property/rentalDashboard/RentalDashboardPage'
import { PropertiesPage } from '@/modules/property/properties/PropertiesPage'
import { UnitsPage } from '@/modules/property/units/UnitsPage'
import { TenantsPage } from '@/modules/property/tenants/TenantsPage'
import { LeasesPage } from '@/modules/property/leases/LeasesPage'
import { LeaseDetailPage } from '@/modules/property/leases/LeaseDetailPage'
import { MaintenanceRequestsPage } from '@/modules/property/maintenance/MaintenanceRequestsPage'
import { MaintenanceRequestDetailPage } from '@/modules/property/maintenance/MaintenanceRequestDetailPage'
import { FinanceDashboardPage } from '@/modules/finance/dashboard/FinanceDashboardPage'
import { ChartOfAccountsPage } from '@/modules/finance/accounts/ChartOfAccountsPage'
import { JournalPage } from '@/modules/finance/journal/JournalPage'
import { JournalEntryDetailPage } from '@/modules/finance/journal/JournalEntryDetailPage'
import { ReceivablesPage } from '@/modules/finance/receivables/ReceivablesPage'
import { TrialBalancePage } from '@/modules/finance/reports/TrialBalancePage'
import { BalanceSheetPage } from '@/modules/finance/reports/BalanceSheetPage'
import { ProfitAndLossPage } from '@/modules/finance/reports/ProfitAndLossPage'
import { CashFlowPage } from '@/modules/finance/reports/CashFlowPage'
import { FiscalPeriodsPage } from '@/modules/finance/fiscalPeriods/FiscalPeriodsPage'
import { UsersPage } from '@/modules/users/UsersPage'
import { RolesPage } from '@/modules/roles/RolesPage'
import { OrganizationSettingsPage } from '@/modules/organization/OrganizationSettingsPage'
import { AuditLogPage } from '@/modules/audit/AuditLogPage'
import { PlatformOrganizationsPage } from '@/modules/platform/PlatformOrganizationsPage'
import { PlatformSubscriptionPlansPage } from '@/modules/platform/PlatformSubscriptionPlansPage'
import { FacilityDashboardPage } from '@/modules/facility/dashboard/FacilityDashboardPage'
import { FacilitiesPage } from '@/modules/facility/facilities/FacilitiesPage'
import { SpacesPage } from '@/modules/facility/spaces/SpacesPage'
import { ServiceRequestsPage } from '@/modules/facility/serviceRequests/ServiceRequestsPage'
import { ServiceRequestDetailPage } from '@/modules/facility/serviceRequests/ServiceRequestDetailPage'
import { UtilitiesPage } from '@/modules/facility/utilities/UtilitiesPage'
import { MallDashboardPage } from '@/modules/facility/mall/dashboard/MallDashboardPage'
import { MallShopsPage } from '@/modules/facility/mall/shops/MallShopsPage'
import { MallShopDetailPage } from '@/modules/facility/mall/shops/MallShopDetailPage'
import { ServiceChargeDefinitionsPage } from '@/modules/facility/mall/serviceCharges/ServiceChargeDefinitionsPage'
import { ServiceChargesPage } from '@/modules/facility/mall/serviceCharges/ServiceChargesPage'
import { ParkingSpacesPage } from '@/modules/facility/mall/parking/ParkingSpacesPage'
import { ParkingAllocationsPage } from '@/modules/facility/mall/parking/ParkingAllocationsPage'
import { EventsPage } from '@/modules/facility/mall/events/EventsPage'
import { NoticesPage } from '@/modules/facility/mall/notices/NoticesPage'
import { CoworkingDashboardPage } from '@/modules/facility/coworking/dashboard/CoworkingDashboardPage'
import { MembersPage } from '@/modules/facility/coworking/members/MembersPage'
import { PlansPage } from '@/modules/facility/coworking/plans/PlansPage'
import { MembershipsPage } from '@/modules/facility/coworking/memberships/MembershipsPage'
import { MembershipDetailPage } from '@/modules/facility/coworking/memberships/MembershipDetailPage'
import { DesksPage } from '@/modules/facility/coworking/desks/DesksPage'
import { RoomsPage } from '@/modules/facility/coworking/rooms/RoomsPage'
import { BookingsPage as CoworkingBookingsPage } from '@/modules/facility/coworking/bookings/BookingsPage'
import { BookingDetailPage as CoworkingBookingDetailPage } from '@/modules/facility/coworking/bookings/BookingDetailPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="crm"
          element={
            <PermissionRoute permission="crm.lead.view">
              <CrmDashboardPage />
            </PermissionRoute>
          }
        />
        <Route
          path="crm/leads"
          element={
            <PermissionRoute permission="crm.lead.view">
              <LeadsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="crm/leads/:id"
          element={
            <PermissionRoute permission="crm.lead.view">
              <LeadDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="crm/customers"
          element={
            <PermissionRoute permission="crm.customer.view">
              <CustomersPage />
            </PermissionRoute>
          }
        />
        <Route
          path="crm/customers/:id"
          element={
            <PermissionRoute permission="crm.customer.view">
              <CustomerDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="projects"
          element={
            <PermissionRoute permission="projects.view">
              <ProjectsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="projects/:id"
          element={
            <PermissionRoute permission="projects.view">
              <ProjectDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="inventory"
          element={
            <PermissionRoute permission="inventory.view">
              <InventoryPage />
            </PermissionRoute>
          }
        />
        <Route
          path="inventory/:id"
          element={
            <PermissionRoute permission="inventory.view">
              <InventoryDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="sales"
          element={
            <PermissionRoute permission="sales.booking.view">
              <SalesDashboardPage />
            </PermissionRoute>
          }
        />
        <Route
          path="sales/bookings"
          element={
            <PermissionRoute permission="sales.booking.view">
              <BookingsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="sales/bookings/:id"
          element={
            <PermissionRoute permission="sales.booking.view">
              <BookingDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="construction"
          element={
            <PermissionRoute permission="construction.view">
              <ConstructionDashboardPage />
            </PermissionRoute>
          }
        />
        <Route
          path="construction/work-packages"
          element={
            <PermissionRoute permission="construction.view">
              <WorkPackagesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="construction/work-packages/:id"
          element={
            <PermissionRoute permission="construction.view">
              <WorkPackageDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="construction/tasks"
          element={
            <PermissionRoute permission="construction.view">
              <TasksPage />
            </PermissionRoute>
          }
        />
        <Route
          path="construction/tasks/:id"
          element={
            <PermissionRoute permission="construction.view">
              <TaskDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="construction/expenses"
          element={
            <PermissionRoute permission="construction.view">
              <ExpensesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="procurement"
          element={
            <PermissionRoute permission="procurement.view">
              <ProcurementDashboardPage />
            </PermissionRoute>
          }
        />
        <Route
          path="procurement/vendors"
          element={
            <PermissionRoute permission="procurement.view">
              <VendorsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="procurement/purchase-requests"
          element={
            <PermissionRoute permission="procurement.view">
              <PurchaseRequestsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="procurement/purchase-requests/:id"
          element={
            <PermissionRoute permission="procurement.view">
              <PurchaseRequestDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="procurement/purchase-orders"
          element={
            <PermissionRoute permission="procurement.view">
              <PurchaseOrdersPage />
            </PermissionRoute>
          }
        />
        <Route
          path="procurement/purchase-orders/:id"
          element={
            <PermissionRoute permission="procurement.view">
              <PurchaseOrderDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="procurement/materials"
          element={
            <PermissionRoute permission="procurement.view">
              <MaterialsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="procurement/materials/:id"
          element={
            <PermissionRoute permission="procurement.view">
              <MaterialDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="property"
          element={
            <PermissionRoute permission="property.view">
              <PropertyDashboardPage />
            </PermissionRoute>
          }
        />
        <Route
          path="property/rental-dashboard"
          element={
            <PermissionRoute permission="property.view">
              <RentalDashboardPage />
            </PermissionRoute>
          }
        />
        <Route
          path="property/properties"
          element={
            <PermissionRoute permission="property.view">
              <PropertiesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="property/units"
          element={
            <PermissionRoute permission="property.view">
              <UnitsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="property/tenants"
          element={
            <PermissionRoute permission="property.view">
              <TenantsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="property/leases"
          element={
            <PermissionRoute permission="property.view">
              <LeasesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="property/leases/:id"
          element={
            <PermissionRoute permission="property.view">
              <LeaseDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="property/maintenance"
          element={
            <PermissionRoute permission="property.view">
              <MaintenanceRequestsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="property/maintenance/:id"
          element={
            <PermissionRoute permission="property.view">
              <MaintenanceRequestDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility"
          element={
            <PermissionRoute permission="facility.view">
              <FacilityDashboardPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/facilities"
          element={
            <PermissionRoute permission="facility.view">
              <FacilitiesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/spaces"
          element={
            <PermissionRoute permission="facility.view">
              <SpacesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/service-requests"
          element={
            <PermissionRoute permission="facility.view">
              <ServiceRequestsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/service-requests/:id"
          element={
            <PermissionRoute permission="facility.view">
              <ServiceRequestDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/utilities"
          element={
            <PermissionRoute permission="facility.view">
              <UtilitiesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/mall"
          element={
            <PermissionRoute permission="facility.view">
              <MallDashboardPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/mall/shops"
          element={
            <PermissionRoute permission="facility.view">
              <MallShopsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/mall/shops/:id"
          element={
            <PermissionRoute permission="facility.view">
              <MallShopDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/mall/service-charges/definitions"
          element={
            <PermissionRoute permission="facility.view">
              <ServiceChargeDefinitionsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/mall/service-charges"
          element={
            <PermissionRoute permission="facility.view">
              <ServiceChargesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/mall/parking"
          element={
            <PermissionRoute permission="facility.view">
              <ParkingSpacesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/mall/parking/allocations"
          element={
            <PermissionRoute permission="facility.view">
              <ParkingAllocationsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/mall/events"
          element={
            <PermissionRoute permission="facility.view">
              <EventsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/mall/notices"
          element={
            <PermissionRoute permission="facility.view">
              <NoticesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/coworking"
          element={
            <PermissionRoute permission="facility.view">
              <CoworkingDashboardPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/coworking/members"
          element={
            <PermissionRoute permission="facility.view">
              <MembersPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/coworking/plans"
          element={
            <PermissionRoute permission="facility.view">
              <PlansPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/coworking/memberships"
          element={
            <PermissionRoute permission="facility.view">
              <MembershipsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/coworking/memberships/:id"
          element={
            <PermissionRoute permission="facility.view">
              <MembershipDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/coworking/desks"
          element={
            <PermissionRoute permission="facility.view">
              <DesksPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/coworking/rooms"
          element={
            <PermissionRoute permission="facility.view">
              <RoomsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/coworking/bookings"
          element={
            <PermissionRoute permission="facility.view">
              <CoworkingBookingsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="facility/coworking/bookings/:id"
          element={
            <PermissionRoute permission="facility.view">
              <CoworkingBookingDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="finance"
          element={
            <PermissionRoute permission="finance.reports.view">
              <FinanceDashboardPage />
            </PermissionRoute>
          }
        />
        <Route
          path="finance/accounts"
          element={
            <PermissionRoute permission="finance.reports.view">
              <ChartOfAccountsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="finance/journal"
          element={
            <PermissionRoute permission="finance.reports.view">
              <JournalPage />
            </PermissionRoute>
          }
        />
        <Route
          path="finance/journal/:id"
          element={
            <PermissionRoute permission="finance.reports.view">
              <JournalEntryDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="finance/receivables"
          element={
            <PermissionRoute permission="finance.reports.view">
              <ReceivablesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="finance/trial-balance"
          element={
            <PermissionRoute permission="finance.reports.view">
              <TrialBalancePage />
            </PermissionRoute>
          }
        />
        <Route
          path="finance/balance-sheet"
          element={
            <PermissionRoute permission="finance.reports.view">
              <BalanceSheetPage />
            </PermissionRoute>
          }
        />
        <Route
          path="finance/profit-and-loss"
          element={
            <PermissionRoute permission="finance.reports.view">
              <ProfitAndLossPage />
            </PermissionRoute>
          }
        />
        <Route
          path="finance/cash-flow"
          element={
            <PermissionRoute permission="finance.reports.view">
              <CashFlowPage />
            </PermissionRoute>
          }
        />
        <Route
          path="finance/fiscal-periods"
          element={
            <PermissionRoute permission="finance.reports.view">
              <FiscalPeriodsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="users"
          element={
            <PermissionRoute permission="users.view">
              <UsersPage />
            </PermissionRoute>
          }
        />
        <Route
          path="roles"
          element={
            <PermissionRoute permission="roles.view">
              <RolesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="organization"
          element={
            <PermissionRoute permission="organizations.view">
              <OrganizationSettingsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="audit-logs"
          element={
            <PermissionRoute permission="audit_logs.view">
              <AuditLogPage />
            </PermissionRoute>
          }
        />
        <Route
          path="platform/organizations"
          element={
            <SuperAdminRoute>
              <PlatformOrganizationsPage />
            </SuperAdminRoute>
          }
        />
        <Route
          path="platform/subscription-plans"
          element={
            <SuperAdminRoute>
              <PlatformSubscriptionPlansPage />
            </SuperAdminRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
