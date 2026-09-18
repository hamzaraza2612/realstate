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

// --- Sales: Bookings, Payment Plans, Payments ---

export const BookingStatus = {
  Draft: 0,
  PendingApproval: 1,
  Confirmed: 2,
  Cancelled: 3,
} as const
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus]

export const BookingStatusLabel: Record<BookingStatus, string> = {
  [BookingStatus.Draft]: 'Draft',
  [BookingStatus.PendingApproval]: 'Pending Approval',
  [BookingStatus.Confirmed]: 'Confirmed',
  [BookingStatus.Cancelled]: 'Cancelled',
}

export interface BookingDto {
  id: string
  bookingNumber: string
  customerId: string
  customerName: string
  projectId: string
  projectName: string
  inventoryUnitId: string
  inventoryUnitCode: string
  salesAgentUserId: string
  salesAgentUserName: string | null
  bookingDate: string
  status: BookingStatus
  totalPrice: number
  discount: number
  netPrice: number
  notes: string | null
  hasPaymentPlan: boolean
  createdAt: string
  updatedAt: string | null
}

export const PaymentPlanType = {
  Percentage: 0,
  FixedAmount: 1,
} as const
export type PaymentPlanType = (typeof PaymentPlanType)[keyof typeof PaymentPlanType]

export const PaymentPlanTypeLabel: Record<PaymentPlanType, string> = {
  [PaymentPlanType.Percentage]: 'Percentage-based',
  [PaymentPlanType.FixedAmount]: 'Fixed amount',
}

export const InstallmentFrequency = {
  Monthly: 0,
  Quarterly: 1,
  SemiAnnually: 2,
  Annually: 3,
} as const
export type InstallmentFrequency = (typeof InstallmentFrequency)[keyof typeof InstallmentFrequency]

export const InstallmentFrequencyLabel: Record<InstallmentFrequency, string> = {
  [InstallmentFrequency.Monthly]: 'Monthly',
  [InstallmentFrequency.Quarterly]: 'Quarterly',
  [InstallmentFrequency.SemiAnnually]: 'Semi-annually',
  [InstallmentFrequency.Annually]: 'Annually',
}

export const InstallmentStatus = {
  Pending: 0,
  PartiallyPaid: 1,
  Paid: 2,
  Overdue: 3,
  Cancelled: 4,
} as const
export type InstallmentStatus = (typeof InstallmentStatus)[keyof typeof InstallmentStatus]

export const InstallmentStatusLabel: Record<InstallmentStatus, string> = {
  [InstallmentStatus.Pending]: 'Pending',
  [InstallmentStatus.PartiallyPaid]: 'Partially Paid',
  [InstallmentStatus.Paid]: 'Paid',
  [InstallmentStatus.Overdue]: 'Overdue',
  [InstallmentStatus.Cancelled]: 'Cancelled',
}

export interface InstallmentDto {
  id: string
  bookingId: string
  paymentPlanId: string
  installmentNumber: number
  label: string
  dueDate: string
  amount: number
  paidAmount: number
  remainingAmount: number
  status: InstallmentStatus
  paymentDate: string | null
  notes: string | null
}

export interface PaymentPlanDto {
  id: string
  bookingId: string
  name: string
  bookingAmount: number
  downPayment: number
  planType: PaymentPlanType
  frequency: InstallmentFrequency
  numberOfInstallments: number
  gracePeriodDays: number
  totalScheduled: number
  installments: InstallmentDto[]
}

export const PaymentMethod = {
  Cash: 0,
  BankTransfer: 1,
  Cheque: 2,
  CreditCard: 3,
  Online: 4,
  Other: 5,
} as const
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod]

export const PaymentMethodLabel: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: 'Cash',
  [PaymentMethod.BankTransfer]: 'Bank Transfer',
  [PaymentMethod.Cheque]: 'Cheque',
  [PaymentMethod.CreditCard]: 'Credit Card',
  [PaymentMethod.Online]: 'Online',
  [PaymentMethod.Other]: 'Other',
}

export interface PaymentDto {
  id: string
  receiptNumber: string
  bookingId: string
  installmentId: string
  installmentLabel: string
  amount: number
  paymentDate: string
  method: PaymentMethod
  referenceNumber: string | null
  notes: string | null
  recordedByUserId: string
  recordedByUserName: string | null
  journalEntryId: string | null
  createdAt: string
}

export interface RecentBookingDto {
  id: string
  bookingNumber: string
  customerName: string
  projectName: string
  inventoryUnitCode: string
  status: BookingStatus
  netPrice: number
  createdAt: string
}

export interface SalesDashboardDto {
  totalBookings: number
  draftBookings: number
  pendingApprovalBookings: number
  confirmedBookings: number
  cancelledBookings: number
  availableInventory: number
  reservedOrBookedInventory: number
  soldInventory: number
  totalBookingValue: number
  collectedAmount: number
  outstandingAmount: number
  overdueInstallments: number
  recentBookings: RecentBookingDto[]
}

// --- Finance: Chart of Accounts, Journal, Receivables ---

export const AccountType = {
  Asset: 0,
  Liability: 1,
  Equity: 2,
  Revenue: 3,
  Expense: 4,
} as const
export type AccountType = (typeof AccountType)[keyof typeof AccountType]

export const AccountTypeLabel: Record<AccountType, string> = {
  [AccountType.Asset]: 'Asset',
  [AccountType.Liability]: 'Liability',
  [AccountType.Equity]: 'Equity',
  [AccountType.Revenue]: 'Revenue',
  [AccountType.Expense]: 'Expense',
}

export interface AccountDto {
  id: string
  code: string
  name: string
  type: AccountType
  parentAccountId: string | null
  parentAccountName: string | null
  isActive: boolean
  isSystem: boolean
  balance: number
  childAccountCount: number
  createdAt: string
  updatedAt: string | null
}

export const JournalEntryStatus = {
  Draft: 0,
  Posted: 1,
  Cancelled: 2,
} as const
export type JournalEntryStatus = (typeof JournalEntryStatus)[keyof typeof JournalEntryStatus]

export const JournalEntryStatusLabel: Record<JournalEntryStatus, string> = {
  [JournalEntryStatus.Draft]: 'Draft',
  [JournalEntryStatus.Posted]: 'Posted',
  [JournalEntryStatus.Cancelled]: 'Cancelled',
}

export interface JournalLineDto {
  id: string
  accountId: string
  accountCode: string
  accountName: string
  debit: number
  credit: number
  description: string | null
}

export interface JournalEntryDto {
  id: string
  entryNumber: string
  entryDate: string
  description: string | null
  referenceType: string
  referenceId: string | null
  status: JournalEntryStatus
  createdBy: string | null
  createdByName: string | null
  totalDebit: number
  totalCredit: number
  lines: JournalLineDto[]
  createdAt: string
}

export interface ReceivableDto {
  bookingId: string
  bookingNumber: string
  customerId: string
  customerName: string
  installmentId: string
  reference: string
  amount: number
  paidAmount: number
  outstandingAmount: number
  dueDate: string
  status: InstallmentStatus
}

export interface RecentJournalEntryDto {
  id: string
  entryNumber: string
  entryDate: string
  description: string | null
  referenceType: string
  status: JournalEntryStatus
  total: number
  createdAt: string
}

export interface FinanceDashboardDto {
  totalRevenue: number
  totalCollected: number
  totalReceivable: number
  overdueReceivable: number
  totalExpenses: number
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  recentJournalEntries: RecentJournalEntryDto[]
}

export interface TrialBalanceLineDto {
  accountId: string
  code: string
  name: string
  type: AccountType
  totalDebit: number
  totalCredit: number
}

export interface TrialBalanceDto {
  lines: TrialBalanceLineDto[]
  totalDebit: number
  totalCredit: number
}
