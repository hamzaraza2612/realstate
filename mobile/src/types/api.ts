/**
 * Mobile-side mirror of the subset of `frontend/src/types/api.ts` this app consumes. Hand-kept in
 * sync with the backend DTOs exactly the way the web app's own file is (not code-generated — that
 * is this repo's existing convention). Field names are the camelCase wire names ASP.NET Core's
 * default System.Text.Json serializer produces from the C# records (`AccessToken` → `accessToken`).
 *
 * Only add types here when a mobile screen actually needs them; copy them verbatim from the web
 * file (including the enum value numbering) so the two can be diffed against each other.
 */

// --- Envelope (backend/src/Api/Common/ApiResponse.cs) ---

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

export interface Paged<T> {
  items: T[]
  meta: PageMeta
}

// --- Internal auth (backend/src/Application/Auth/AuthDtos.cs) ---

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

// --- Portal auth (backend/src/Application/Portal/PortalAuthModule.cs) ---

export const PortalActorType = {
  Customer: 'Customer',
  RentalTenant: 'RentalTenant',
  PropertyOwner: 'PropertyOwner',
  Vendor: 'Vendor',
  CoworkingMember: 'CoworkingMember',
} as const
export type PortalActorType = (typeof PortalActorType)[keyof typeof PortalActorType]

export interface PortalProfile {
  id: string
  email: string
  actorType: PortalActorType
  actorId: string
  displayName: string
  tenantId: string
  tenantName: string
}

export interface PortalAuthResult {
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  profile: PortalProfile
}

export interface PortalLoginRequest {
  tenantSlug: string
  email: string
  password: string
}

// --- Localization (Milestone 15) ---

/** .NET `DayOfWeek`: Sunday = 0 .. Saturday = 6. */
export type FirstDayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const MeasurementSystem = {
  Metric: 0,
  Imperial: 1,
} as const
export type MeasurementSystem = (typeof MeasurementSystem)[keyof typeof MeasurementSystem]

export interface TenantLocalizationDto {
  countryCode: string | null
  currency: string
  locale: string
  timezone: string
  dateFormat: string
  firstDayOfWeek: FirstDayOfWeek
  defaultLanguage: string
  secondaryLanguages: string[]
  measurementSystem: MeasurementSystem
}

// --- Notifications ---

export const NotificationCategory = {
  General: 0,
  ApprovalRequested: 1,
  ApprovalDecided: 2,
  DocumentUploaded: 3,
  Other: 4,
} as const
export type NotificationCategory = (typeof NotificationCategory)[keyof typeof NotificationCategory]

export interface NotificationDto {
  id: string
  category: NotificationCategory
  title: string
  body: string
  entityType: string | null
  entityId: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

// --- Approvals ---

export const ApprovalStatus = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
  Cancelled: 3,
} as const
export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus]

export const ApprovalStatusLabel: Record<ApprovalStatus, string> = {
  [ApprovalStatus.Pending]: 'Pending',
  [ApprovalStatus.Approved]: 'Approved',
  [ApprovalStatus.Rejected]: 'Rejected',
  [ApprovalStatus.Cancelled]: 'Cancelled',
}

export interface ApprovalRequestDto {
  id: string
  entityType: string
  entityId: string
  requestedByUserId: string
  requestedByUserName: string | null
  approverUserId: string | null
  approverUserName: string | null
  requiredPermission: string | null
  requestComments: string | null
  status: ApprovalStatus
  decisionComments: string | null
  decidedByUserId: string | null
  decidedByUserName: string | null
  decidedAt: string | null
  createdAt: string
}

// --- Reporting (Milestone 12) — only the executive figures the Management Home shows ---

export interface ExecutiveDashboardDto {
  from: string
  to: string
  sales: number
  collections: number
  revenue: number
  expenses: number
  profit: number
  rentalCollected: number
  receivables: number
  payables: number
  cashPosition: number
  activeProjects: number
  inventory: {
    available: number
    reserved: number
    sold: number
    total: number
  }
  propertyOccupancyRate: number | null
  rentalOutstanding: number
  constructionProgressPercent: number | null
  procurementExposure: number
  maintenanceBacklogCount: number
  totalLeads: number
  leadConversionRatePercent: number
}

// --- AI Business Intelligence / Command Center (Milestone 16) ---
// `facts`, `toolCalls`, `parameters` and `result` are opaque, tool-sourced JSON blobs (never a
// fixed DTO shape) — render them generically rather than assuming particular keys.

export const HealthStatus = {
  Healthy: 0,
  Attention: 1,
  Critical: 2,
} as const
export type HealthStatus = (typeof HealthStatus)[keyof typeof HealthStatus]

export const HealthStatusLabel: Record<HealthStatus, string> = {
  [HealthStatus.Healthy]: 'Healthy',
  [HealthStatus.Attention]: 'Attention',
  [HealthStatus.Critical]: 'Critical',
}

/** Reasons are plain, pre-formatted sentences generated by the backend's deterministic rules —
 * display them as-is, never re-derive or reformat the numbers on the client. */
export interface BusinessHealthDimensionDto {
  dimension: string
  status: HealthStatus
  summary: string
  reasons: string[]
}

export interface BusinessHealthDto {
  overall: HealthStatus
  dimensions: BusinessHealthDimensionDto[]
  generatedAt: string
}

export interface AttentionItemDto {
  category: string
  title: string
  summary: string
  severity: HealthStatus
  entityType: string | null
  entityId: string | null
  facts: string[]
  suggestedAction: string | null
}

export const AiConversationStatus = {
  Active: 0,
  Archived: 1,
} as const
export type AiConversationStatus = (typeof AiConversationStatus)[keyof typeof AiConversationStatus]

export const AiMessageRole = {
  User: 0,
  Assistant: 1,
  System: 2,
  Tool: 3,
} as const
export type AiMessageRole = (typeof AiMessageRole)[keyof typeof AiMessageRole]

export const AiMessageStatus = {
  Completed: 0,
  Failed: 1,
} as const
export type AiMessageStatus = (typeof AiMessageStatus)[keyof typeof AiMessageStatus]

export interface AiMessageDto {
  id: string
  role: AiMessageRole
  content: string
  facts: unknown | null
  toolCalls: unknown | null
  provider: string | null
  model: string | null
  status: AiMessageStatus
  errorMessage: string | null
  createdAt: string
}

export interface AiConversationSummaryDto {
  id: string
  title: string
  status: AiConversationStatus
  updatedAt: string
  createdAt: string
}

export interface AiConversationDto {
  id: string
  title: string
  status: AiConversationStatus
  messages: AiMessageDto[]
  createdAt: string
}

export const AiActionProposalStatus = {
  PendingApproval: 0,
  Approved: 1,
  Rejected: 2,
  Executed: 3,
  Failed: 4,
  Expired: 5,
  Cancelled: 6,
} as const
export type AiActionProposalStatus = (typeof AiActionProposalStatus)[keyof typeof AiActionProposalStatus]

export const AiActionProposalStatusLabel: Record<AiActionProposalStatus, string> = {
  [AiActionProposalStatus.PendingApproval]: 'Pending approval',
  [AiActionProposalStatus.Approved]: 'Approved',
  [AiActionProposalStatus.Rejected]: 'Rejected',
  [AiActionProposalStatus.Executed]: 'Executed',
  [AiActionProposalStatus.Failed]: 'Failed',
  [AiActionProposalStatus.Expired]: 'Expired',
  [AiActionProposalStatus.Cancelled]: 'Cancelled',
}

export interface AiActionProposalDto {
  id: string
  conversationId: string | null
  actionType: string
  targetEntityType: string | null
  targetEntityId: string | null
  parameters: unknown
  explanation: string
  expectedEffect: string
  riskLevel: string
  status: AiActionProposalStatus
  approvalRequestId: string | null
  result: unknown | null
  errorMessage: string | null
  expiresAt: string
  executedAt: string | null
  createdAt: string
}

export interface CommandCenterSummaryDto {
  health: BusinessHealthDto
  attentionItems: AttentionItemDto[]
  recentConversations: AiConversationSummaryDto[]
  aiProviderConfigured: boolean
}
