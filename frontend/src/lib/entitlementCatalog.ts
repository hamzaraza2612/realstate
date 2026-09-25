/** Compile-time entitlement catalog mirrored from the backend's `Domain/Subscription/Entitlement.cs`
 * `EntitlementCodes` (see docs/SAAS_BILLING.md). Not a database table on either side — the set of
 * codes a plan can grant is part of the application's own module list, hardcoded the same way any
 * other fixed enum list in this app is. */

export const FEATURE_ENTITLEMENT_CODES = [
  'crm',
  'sales',
  'finance',
  'construction',
  'procurement',
  'rental',
  'facility',
  'mall',
  'coworking',
  'external_portals',
  'documents',
  'approvals',
  'reporting',
  'advanced_reporting',
  'api_access',
] as const

export const LIMIT_ENTITLEMENT_CODES = [
  'max_users',
  'max_properties',
  'max_projects',
  'max_portal_users',
  'max_storage_mb',
] as const

export const FEATURE_ENTITLEMENT_LABELS: Record<string, string> = {
  crm: 'CRM',
  sales: 'Sales',
  finance: 'Finance',
  construction: 'Construction',
  procurement: 'Procurement',
  rental: 'Rental',
  facility: 'Facility Management',
  mall: 'Shopping Mall',
  coworking: 'Coworking',
  external_portals: 'External Portals',
  documents: 'Documents',
  approvals: 'Approvals',
  reporting: 'Reporting',
  advanced_reporting: 'Advanced Reporting',
  api_access: 'API Access',
}

export const LIMIT_ENTITLEMENT_LABELS: Record<string, string> = {
  max_users: 'Max Users',
  max_properties: 'Max Properties',
  max_projects: 'Max Projects',
  max_portal_users: 'Max Portal Users',
  max_storage_mb: 'Max Storage (MB)',
}

export function entitlementLabel(code: string): string {
  return FEATURE_ENTITLEMENT_LABELS[code] ?? LIMIT_ENTITLEMENT_LABELS[code] ?? code
}
