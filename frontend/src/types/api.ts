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

// --- Projects & Inventory ---

export const ProjectType = {
  Society: 0,
  Building: 1,
  TownPlanning: 2,
  ConstructionProject: 3,
  CommercialProperty: 4,
  Other: 5,
} as const
export type ProjectType = (typeof ProjectType)[keyof typeof ProjectType]

export const ProjectTypeLabel: Record<ProjectType, string> = {
  [ProjectType.Society]: 'Society',
  [ProjectType.Building]: 'Building',
  [ProjectType.TownPlanning]: 'Town Planning',
  [ProjectType.ConstructionProject]: 'Construction Project',
  [ProjectType.CommercialProperty]: 'Commercial Property',
  [ProjectType.Other]: 'Other',
}

export const ProjectStatus = {
  Planning: 0,
  Active: 1,
  OnHold: 2,
  Completed: 3,
  Cancelled: 4,
} as const
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus]

export const ProjectStatusLabel: Record<ProjectStatus, string> = {
  [ProjectStatus.Planning]: 'Planning',
  [ProjectStatus.Active]: 'Active',
  [ProjectStatus.OnHold]: 'On Hold',
  [ProjectStatus.Completed]: 'Completed',
  [ProjectStatus.Cancelled]: 'Cancelled',
}

export interface ProjectDto {
  id: string
  name: string
  code: string
  type: ProjectType
  status: ProjectStatus
  description: string | null
  addressLine: string | null
  city: string | null
  state: string | null
  country: string | null
  postalCode: string | null
  startDate: string | null
  endDate: string | null
  latitude: number | null
  longitude: number | null
  geoJson: string | null
  nodeCount: number
  inventoryCount: number
  createdAt: string
  updatedAt: string | null
}

export const ProjectNodeType = {
  Phase: 0,
  Zone: 1,
  Block: 2,
  Building: 3,
  Floor: 4,
} as const
export type ProjectNodeType = (typeof ProjectNodeType)[keyof typeof ProjectNodeType]

export const ProjectNodeTypeLabel: Record<ProjectNodeType, string> = {
  [ProjectNodeType.Phase]: 'Phase',
  [ProjectNodeType.Zone]: 'Zone',
  [ProjectNodeType.Block]: 'Block',
  [ProjectNodeType.Building]: 'Building',
  [ProjectNodeType.Floor]: 'Floor',
}

export interface ProjectNodeDto {
  id: string
  projectId: string
  parentNodeId: string | null
  nodeType: ProjectNodeType
  name: string
  code: string
  sortOrder: number
  latitude: number | null
  longitude: number | null
  geoJson: string | null
  metadataJson: string | null
  childNodeCount: number
  inventoryCount: number
  createdAt: string
  updatedAt: string | null
}

export const InventoryUnitType = {
  Plot: 0,
  Apartment: 1,
  Office: 2,
  Shop: 3,
  House: 4,
  CommercialUnit: 5,
  Other: 6,
} as const
export type InventoryUnitType = (typeof InventoryUnitType)[keyof typeof InventoryUnitType]

export const InventoryUnitTypeLabel: Record<InventoryUnitType, string> = {
  [InventoryUnitType.Plot]: 'Plot',
  [InventoryUnitType.Apartment]: 'Apartment',
  [InventoryUnitType.Office]: 'Office',
  [InventoryUnitType.Shop]: 'Shop',
  [InventoryUnitType.House]: 'House',
  [InventoryUnitType.CommercialUnit]: 'Commercial Unit',
  [InventoryUnitType.Other]: 'Other',
}

export const InventoryAreaUnit = {
  SqFt: 0,
  SqYd: 1,
  SqM: 2,
  Marla: 3,
  Kanal: 4,
  Acre: 5,
} as const
export type InventoryAreaUnit = (typeof InventoryAreaUnit)[keyof typeof InventoryAreaUnit]

export const InventoryAreaUnitLabel: Record<InventoryAreaUnit, string> = {
  [InventoryAreaUnit.SqFt]: 'Sq. Ft.',
  [InventoryAreaUnit.SqYd]: 'Sq. Yd.',
  [InventoryAreaUnit.SqM]: 'Sq. M.',
  [InventoryAreaUnit.Marla]: 'Marla',
  [InventoryAreaUnit.Kanal]: 'Kanal',
  [InventoryAreaUnit.Acre]: 'Acre',
}

export const InventoryStatus = {
  Available: 0,
  Reserved: 1,
  Booked: 2,
  Sold: 3,
  Blocked: 4,
  UnderConstruction: 5,
  HandedOver: 6,
} as const
export type InventoryStatus = (typeof InventoryStatus)[keyof typeof InventoryStatus]

export const InventoryStatusLabel: Record<InventoryStatus, string> = {
  [InventoryStatus.Available]: 'Available',
  [InventoryStatus.Reserved]: 'Reserved',
  [InventoryStatus.Booked]: 'Booked',
  [InventoryStatus.Sold]: 'Sold',
  [InventoryStatus.Blocked]: 'Blocked',
  [InventoryStatus.UnderConstruction]: 'Under Construction',
  [InventoryStatus.HandedOver]: 'Handed Over',
}

export interface InventoryUnitDto {
  id: string
  projectId: string
  projectName: string
  nodeId: string | null
  nodePath: string | null
  code: string
  type: InventoryUnitType
  status: InventoryStatus
  areaSize: number | null
  areaUnit: InventoryAreaUnit | null
  latitude: number | null
  longitude: number | null
  geoJson: string | null
  metadataJson: string | null
  createdAt: string
  updatedAt: string | null
}
