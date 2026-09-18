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
import { UsersPage } from '@/modules/users/UsersPage'
import { RolesPage } from '@/modules/roles/RolesPage'
import { OrganizationSettingsPage } from '@/modules/organization/OrganizationSettingsPage'
import { AuditLogPage } from '@/modules/audit/AuditLogPage'
import { PlatformOrganizationsPage } from '@/modules/platform/PlatformOrganizationsPage'
import { PlatformSubscriptionPlansPage } from '@/modules/platform/PlatformSubscriptionPlansPage'

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
