import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { PermissionRoute, ProtectedRoute, SuperAdminRoute } from '@/app/ProtectedRoute'
import { LoginPage } from '@/modules/auth/LoginPage'
import { DashboardPage } from '@/modules/dashboard/DashboardPage'
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
