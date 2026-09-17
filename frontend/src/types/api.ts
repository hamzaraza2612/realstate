export interface ApiEnvelope<T> {
  data: T
  error: string | null
  meta: PageMeta | null
}

export interface PageMeta {
  page: number
  pageSize: number
  total: number
}

export interface UserProfile {
  id: string
  email: string
  fullName: string
  tenantId: string | null
  tenantName: string | null
  isSuperAdmin: boolean
  roles: string[]
  permissions: string[]
}

export interface AuthResult {
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  user: UserProfile
}

export interface UserDto {
  id: string
  email: string
  fullName: string
  phoneNumber: string | null
  isActive: boolean
  tenantId: string | null
  roles: string[]
  createdAt: string
  lastLoginAt: string | null
}

export interface PermissionDto {
  id: string
  code: string
  module: string
  description: string | null
}

export interface RoleDto {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  isTenantSpecific: boolean
  permissions: string[]
}

export interface OrganizationDto {
  id: string
  name: string
  slug: string
  status: TenantStatus
  timezone: string
  contactEmail: string | null
  contactPhone: string | null
  subscriptionPlanId: string | null
  trialEndsAt: string | null
  createdAt: string
}

export const TenantStatus = {
  Trial: 0,
  Active: 1,
  Suspended: 2,
  Cancelled: 3,
} as const

export type TenantStatus = (typeof TenantStatus)[keyof typeof TenantStatus]

export const TenantStatusLabel: Record<TenantStatus, string> = {
  [TenantStatus.Trial]: 'Trial',
  [TenantStatus.Active]: 'Active',
  [TenantStatus.Suspended]: 'Suspended',
  [TenantStatus.Cancelled]: 'Cancelled',
}

export interface AuditLogDto {
  id: string
  tenantId: string | null
  userId: string | null
  userEmail: string | null
  action: string
  module: string
  entityType: string
  entityId: string | null
  beforeJson: string | null
  afterJson: string | null
  ipAddress: string | null
  createdAt: string
}

export interface SubscriptionPlanDto {
  id: string
  name: string
  price: number
  billingCycle: number
  userLimit: number
  projectLimit: number
  storageLimitMb: number
  isActive: boolean
  features: string[]
}
