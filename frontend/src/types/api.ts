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

// --- CRM ---

export const LeadSource = {
  Website: 0,
  Referral: 1,
  WalkIn: 2,
  SocialMedia: 3,
  ColdCall: 4,
  Advertisement: 5,
  Other: 6,
} as const
export type LeadSource = (typeof LeadSource)[keyof typeof LeadSource]

export const LeadSourceLabel: Record<LeadSource, string> = {
  [LeadSource.Website]: 'Website',
  [LeadSource.Referral]: 'Referral',
  [LeadSource.WalkIn]: 'Walk-in',
  [LeadSource.SocialMedia]: 'Social Media',
  [LeadSource.ColdCall]: 'Cold Call',
  [LeadSource.Advertisement]: 'Advertisement',
  [LeadSource.Other]: 'Other',
}

export const LeadStatus = {
  New: 0,
  Contacted: 1,
  Qualified: 2,
  ProposalSent: 3,
  Negotiation: 4,
  Won: 5,
  Lost: 6,
} as const
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus]

export const LeadStatusLabel: Record<LeadStatus, string> = {
  [LeadStatus.New]: 'New',
  [LeadStatus.Contacted]: 'Contacted',
  [LeadStatus.Qualified]: 'Qualified',
  [LeadStatus.ProposalSent]: 'Proposal Sent',
  [LeadStatus.Negotiation]: 'Negotiation',
  [LeadStatus.Won]: 'Won',
  [LeadStatus.Lost]: 'Lost',
}

export const LeadPriority = {
  Low: 0,
  Medium: 1,
  High: 2,
} as const
export type LeadPriority = (typeof LeadPriority)[keyof typeof LeadPriority]

export const LeadPriorityLabel: Record<LeadPriority, string> = {
  [LeadPriority.Low]: 'Low',
  [LeadPriority.Medium]: 'Medium',
  [LeadPriority.High]: 'High',
}

export interface LeadDto {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  companyName: string | null
  source: LeadSource
  status: LeadStatus
  priority: LeadPriority
  notes: string | null
  assignedToUserId: string | null
  assignedToUserName: string | null
  convertedToCustomerId: string | null
  createdAt: string
  updatedAt: string | null
}

export interface CustomerDto {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  address: string | null
  companyName: string | null
  convertedFromLeadId: string | null
  createdAt: string
  updatedAt: string | null
}

export const ActivityType = {
  Call: 0,
  Meeting: 1,
  Note: 2,
  FollowUp: 3,
} as const
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType]

export const ActivityTypeLabel: Record<ActivityType, string> = {
  [ActivityType.Call]: 'Call',
  [ActivityType.Meeting]: 'Meeting',
  [ActivityType.Note]: 'Note',
  [ActivityType.FollowUp]: 'Follow-up',
}

export const ActivityStatus = {
  Pending: 0,
  Completed: 1,
} as const
export type ActivityStatus = (typeof ActivityStatus)[keyof typeof ActivityStatus]

export interface ActivityDto {
  id: string
  type: ActivityType
  subject: string
  description: string | null
  dueDate: string | null
  status: ActivityStatus
  completedAt: string | null
  leadId: string | null
  customerId: string | null
  assignedToUserId: string | null
  assignedToUserName: string | null
  createdAt: string
}

export interface CrmDashboardDto {
  totalLeads: number
  newLeadsLast30Days: number
  unassignedLeads: number
  assignedLeads: number
  leadsByStatus: Record<string, number>
  totalCustomers: number
  pendingFollowUps: number
  overdueFollowUps: number
  conversionRatePercent: number
}
