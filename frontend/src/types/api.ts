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

// ===== Construction & Procurement =====

export const WorkPackageStatus = {
  Planned: 0,
  InProgress: 1,
  OnHold: 2,
  Completed: 3,
  Cancelled: 4,
} as const
export type WorkPackageStatus = (typeof WorkPackageStatus)[keyof typeof WorkPackageStatus]

export const WorkPackageStatusLabel: Record<WorkPackageStatus, string> = {
  [WorkPackageStatus.Planned]: 'Planned',
  [WorkPackageStatus.InProgress]: 'In Progress',
  [WorkPackageStatus.OnHold]: 'On Hold',
  [WorkPackageStatus.Completed]: 'Completed',
  [WorkPackageStatus.Cancelled]: 'Cancelled',
}

export interface WorkPackageDto {
  id: string
  projectId: string
  projectName: string
  name: string
  code: string
  description: string | null
  plannedStartDate: string | null
  plannedEndDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  status: WorkPackageStatus
  progressPercent: number
  managerUserId: string | null
  managerUserName: string | null
  budget: number | null
  taskCount: number
  createdAt: string
  updatedAt: string | null
}

export const ConstructionTaskStatus = {
  Planned: 0,
  InProgress: 1,
  Blocked: 2,
  Completed: 3,
  Cancelled: 4,
} as const
export type ConstructionTaskStatus = (typeof ConstructionTaskStatus)[keyof typeof ConstructionTaskStatus]

export const ConstructionTaskStatusLabel: Record<ConstructionTaskStatus, string> = {
  [ConstructionTaskStatus.Planned]: 'Planned',
  [ConstructionTaskStatus.InProgress]: 'In Progress',
  [ConstructionTaskStatus.Blocked]: 'Blocked',
  [ConstructionTaskStatus.Completed]: 'Completed',
  [ConstructionTaskStatus.Cancelled]: 'Cancelled',
}

export const ConstructionTaskPriority = {
  Low: 0,
  Medium: 1,
  High: 2,
} as const
export type ConstructionTaskPriority = (typeof ConstructionTaskPriority)[keyof typeof ConstructionTaskPriority]

export const ConstructionTaskPriorityLabel: Record<ConstructionTaskPriority, string> = {
  [ConstructionTaskPriority.Low]: 'Low',
  [ConstructionTaskPriority.Medium]: 'Medium',
  [ConstructionTaskPriority.High]: 'High',
}

export interface ConstructionTaskDto {
  id: string
  workPackageId: string
  workPackageName: string
  title: string
  description: string | null
  assignedToUserId: string | null
  assignedToUserName: string | null
  priority: ConstructionTaskPriority
  plannedStartDate: string | null
  plannedEndDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  status: ConstructionTaskStatus
  progressPercent: number
  dependsOnTaskId: string | null
  dependsOnTaskTitle: string | null
  createdAt: string
  updatedAt: string | null
}

export const ExpenseCategory = {
  Labor: 0,
  Materials: 1,
  Equipment: 2,
  Subcontractor: 3,
  Other: 4,
} as const
export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory]

export const ExpenseCategoryLabel: Record<ExpenseCategory, string> = {
  [ExpenseCategory.Labor]: 'Labor',
  [ExpenseCategory.Materials]: 'Materials',
  [ExpenseCategory.Equipment]: 'Equipment',
  [ExpenseCategory.Subcontractor]: 'Subcontractor',
  [ExpenseCategory.Other]: 'Other',
}

export const ExpenseStatus = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
} as const
export type ExpenseStatus = (typeof ExpenseStatus)[keyof typeof ExpenseStatus]

export const ExpenseStatusLabel: Record<ExpenseStatus, string> = {
  [ExpenseStatus.Pending]: 'Pending',
  [ExpenseStatus.Approved]: 'Approved',
  [ExpenseStatus.Rejected]: 'Rejected',
}

export interface ExpenseDto {
  id: string
  projectId: string
  projectName: string
  workPackageId: string | null
  workPackageName: string | null
  category: ExpenseCategory
  amount: number
  expenseDate: string
  vendorId: string | null
  vendorName: string | null
  referenceNumber: string | null
  notes: string | null
  status: ExpenseStatus
  journalEntryId: string | null
  createdAt: string
}

export interface WorkPackageProgressDto {
  id: string
  name: string
  projectName: string
  status: WorkPackageStatus
  progressPercent: number
  budget: number | null
  actualExpenses: number
}

export interface ConstructionDashboardDto {
  activeProjects: number
  totalWorkPackages: number
  workPackagesInProgress: number
  totalTasks: number
  delayedTasks: number
  completedTasks: number
  purchaseRequestsPendingApproval: number
  openPurchaseOrders: number
  totalBudget: number
  totalExpenses: number
  recentWorkPackages: WorkPackageProgressDto[]
}

export interface VendorDto {
  id: string
  name: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  taxRegistrationNumber: string | null
  isActive: boolean
  notes: string | null
  createdAt: string
  updatedAt: string | null
}

export const PurchaseRequestStatus = {
  Draft: 0,
  Submitted: 1,
  Approved: 2,
  Rejected: 3,
  Cancelled: 4,
} as const
export type PurchaseRequestStatus = (typeof PurchaseRequestStatus)[keyof typeof PurchaseRequestStatus]

export const PurchaseRequestStatusLabel: Record<PurchaseRequestStatus, string> = {
  [PurchaseRequestStatus.Draft]: 'Draft',
  [PurchaseRequestStatus.Submitted]: 'Submitted',
  [PurchaseRequestStatus.Approved]: 'Approved',
  [PurchaseRequestStatus.Rejected]: 'Rejected',
  [PurchaseRequestStatus.Cancelled]: 'Cancelled',
}

export const PurchasePriority = {
  Low: 0,
  Medium: 1,
  High: 2,
} as const
export type PurchasePriority = (typeof PurchasePriority)[keyof typeof PurchasePriority]

export const PurchasePriorityLabel: Record<PurchasePriority, string> = {
  [PurchasePriority.Low]: 'Low',
  [PurchasePriority.Medium]: 'Medium',
  [PurchasePriority.High]: 'High',
}

export interface PurchaseRequestLineDto {
  id: string
  materialId: string | null
  itemDescription: string
  unitOfMeasure: string
  quantity: number
  estimatedUnitPrice: number
  estimatedTotal: number
}

export interface PurchaseRequestDto {
  id: string
  requestNumber: string
  projectId: string
  projectName: string
  workPackageId: string | null
  workPackageName: string | null
  requestedByUserId: string
  requestedByUserName: string | null
  requiredDate: string | null
  priority: PurchasePriority
  status: PurchaseRequestStatus
  notes: string | null
  estimatedTotal: number
  lines: PurchaseRequestLineDto[]
  createdAt: string
  updatedAt: string | null
}

export const PurchaseOrderStatus = {
  Draft: 0,
  PendingApproval: 1,
  Approved: 2,
  Sent: 3,
  PartiallyReceived: 4,
  Received: 5,
  Cancelled: 6,
} as const
export type PurchaseOrderStatus = (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus]

export const PurchaseOrderStatusLabel: Record<PurchaseOrderStatus, string> = {
  [PurchaseOrderStatus.Draft]: 'Draft',
  [PurchaseOrderStatus.PendingApproval]: 'Pending Approval',
  [PurchaseOrderStatus.Approved]: 'Approved',
  [PurchaseOrderStatus.Sent]: 'Sent',
  [PurchaseOrderStatus.PartiallyReceived]: 'Partially Received',
  [PurchaseOrderStatus.Received]: 'Received',
  [PurchaseOrderStatus.Cancelled]: 'Cancelled',
}

export interface PurchaseOrderLineDto {
  id: string
  materialId: string | null
  itemDescription: string
  unitOfMeasure: string
  quantity: number
  unitPrice: number
  total: number
  receivedQuantity: number
  outstandingQuantity: number
}

export interface PurchaseOrderDto {
  id: string
  poNumber: string
  vendorId: string
  vendorName: string
  projectId: string
  projectName: string
  workPackageId: string | null
  workPackageName: string | null
  purchaseRequestId: string | null
  purchaseRequestNumber: string | null
  orderDate: string
  expectedDeliveryDate: string | null
  status: PurchaseOrderStatus
  subtotal: number
  discount: number
  taxAmount: number
  total: number
  notes: string | null
  lines: PurchaseOrderLineDto[]
  createdAt: string
  updatedAt: string | null
}

export interface MaterialReceiptLineDto {
  id: string
  purchaseOrderLineId: string
  itemDescription: string
  receivedQuantity: number
}

export interface MaterialReceiptDto {
  id: string
  receiptNumber: string
  purchaseOrderId: string
  poNumber: string
  vendorId: string
  vendorName: string
  receivedDate: string
  receivedByUserId: string
  receivedByUserName: string | null
  notes: string | null
  lines: MaterialReceiptLineDto[]
  createdAt: string
}

export interface MaterialDto {
  id: string
  sku: string
  name: string
  unitOfMeasure: string
  category: string | null
  currentQuantity: number
  minimumQuantity: number
  isActive: boolean
  isBelowMinimum: boolean
  createdAt: string
  updatedAt: string | null
}

export const StockMovementType = {
  Receipt: 0,
  Issue: 1,
  Adjustment: 2,
} as const
export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType]

export const StockMovementTypeLabel: Record<StockMovementType, string> = {
  [StockMovementType.Receipt]: 'Receipt',
  [StockMovementType.Issue]: 'Issue',
  [StockMovementType.Adjustment]: 'Adjustment',
}

export interface StockMovementDto {
  id: string
  materialId: string
  type: StockMovementType
  quantity: number
  referenceType: string | null
  referenceId: string | null
  notes: string | null
  createdAt: string
}

export interface RecentPurchaseOrderDto {
  id: string
  poNumber: string
  vendorName: string
  status: PurchaseOrderStatus
  total: number
  createdAt: string
}

export interface ProcurementDashboardDto {
  purchaseRequestsPendingApproval: number
  totalPurchaseOrders: number
  pendingDeliveries: number
  partiallyReceivedOrders: number
  activeVendors: number
  totalProcurementValue: number
  recentPurchaseOrders: RecentPurchaseOrderDto[]
}

// --- Property & Rental Management ---

export const PropertyType = {
  Building: 0,
  ApartmentComplex: 1,
  CommercialProperty: 2,
  OfficeBuilding: 3,
  ShoppingProperty: 4,
  House: 5,
  Other: 6,
} as const
export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType]

export const PropertyTypeLabel: Record<PropertyType, string> = {
  [PropertyType.Building]: 'Building',
  [PropertyType.ApartmentComplex]: 'Apartment Complex',
  [PropertyType.CommercialProperty]: 'Commercial Property',
  [PropertyType.OfficeBuilding]: 'Office Building',
  [PropertyType.ShoppingProperty]: 'Shopping Property',
  [PropertyType.House]: 'House',
  [PropertyType.Other]: 'Other',
}

export const PropertyStatus = {
  Active: 0,
  Inactive: 1,
  UnderRenovation: 2,
} as const
export type PropertyStatus = (typeof PropertyStatus)[keyof typeof PropertyStatus]

export const PropertyStatusLabel: Record<PropertyStatus, string> = {
  [PropertyStatus.Active]: 'Active',
  [PropertyStatus.Inactive]: 'Inactive',
  [PropertyStatus.UnderRenovation]: 'Under Renovation',
}

export interface PropertyDto {
  id: string
  code: string
  name: string
  type: PropertyType
  status: PropertyStatus
  description: string | null
  addressLine: string | null
  city: string | null
  state: string | null
  country: string | null
  postalCode: string | null
  ownerName: string | null
  ownerContact: string | null
  unitCount: number
  createdAt: string
  updatedAt: string | null
}

export const PropertyUnitType = {
  Apartment: 0,
  Office: 1,
  Shop: 2,
  House: 3,
  Commercial: 4,
  Other: 5,
} as const
export type PropertyUnitType = (typeof PropertyUnitType)[keyof typeof PropertyUnitType]

export const PropertyUnitTypeLabel: Record<PropertyUnitType, string> = {
  [PropertyUnitType.Apartment]: 'Apartment',
  [PropertyUnitType.Office]: 'Office',
  [PropertyUnitType.Shop]: 'Shop',
  [PropertyUnitType.House]: 'House',
  [PropertyUnitType.Commercial]: 'Commercial',
  [PropertyUnitType.Other]: 'Other',
}

export const PropertyUnitStatus = {
  Available: 0,
  Reserved: 1,
  Occupied: 2,
  Maintenance: 3,
  Inactive: 4,
} as const
export type PropertyUnitStatus = (typeof PropertyUnitStatus)[keyof typeof PropertyUnitStatus]

export const PropertyUnitStatusLabel: Record<PropertyUnitStatus, string> = {
  [PropertyUnitStatus.Available]: 'Available',
  [PropertyUnitStatus.Reserved]: 'Reserved',
  [PropertyUnitStatus.Occupied]: 'Occupied',
  [PropertyUnitStatus.Maintenance]: 'Maintenance',
  [PropertyUnitStatus.Inactive]: 'Inactive',
}

export interface PropertyUnitDto {
  id: string
  propertyId: string
  propertyName: string
  buildingBlock: string | null
  unitNumber: string
  type: PropertyUnitType
  floor: string | null
  areaSize: number | null
  areaUnit: string | null
  bedrooms: number | null
  status: PropertyUnitStatus
  marketRentRate: number | null
  metadataJson: string | null
  createdAt: string
  updatedAt: string | null
}

export interface RentalTenantDto {
  id: string
  customerId: string
  customerName: string
  email: string | null
  phone: string | null
  address: string | null
  isCompany: boolean
  identificationNumber: string | null
  isActive: boolean
  notes: string | null
  activeLeaseCount: number
  createdAt: string
  updatedAt: string | null
}

export const LeaseStatus = {
  Draft: 0,
  PendingApproval: 1,
  Active: 2,
  Expired: 3,
  Terminated: 4,
  Cancelled: 5,
} as const
export type LeaseStatus = (typeof LeaseStatus)[keyof typeof LeaseStatus]

export const LeaseStatusLabel: Record<LeaseStatus, string> = {
  [LeaseStatus.Draft]: 'Draft',
  [LeaseStatus.PendingApproval]: 'Pending Approval',
  [LeaseStatus.Active]: 'Active',
  [LeaseStatus.Expired]: 'Expired',
  [LeaseStatus.Terminated]: 'Terminated',
  [LeaseStatus.Cancelled]: 'Cancelled',
}

export const LeasePaymentFrequency = {
  Monthly: 0,
  Quarterly: 1,
  Yearly: 2,
} as const
export type LeasePaymentFrequency = (typeof LeasePaymentFrequency)[keyof typeof LeasePaymentFrequency]

export const LeasePaymentFrequencyLabel: Record<LeasePaymentFrequency, string> = {
  [LeasePaymentFrequency.Monthly]: 'Monthly',
  [LeasePaymentFrequency.Quarterly]: 'Quarterly',
  [LeasePaymentFrequency.Yearly]: 'Yearly',
}

export interface LeaseDto {
  id: string
  leaseNumber: string
  propertyId: string
  propertyName: string
  unitId: string
  unitNumber: string
  rentalTenantId: string
  rentalTenantName: string
  startDate: string
  endDate: string
  rentAmount: number
  securityDeposit: number | null
  paymentFrequency: LeasePaymentFrequency
  gracePeriodDays: number
  status: LeaseStatus
  terms: string | null
  notes: string | null
  createdAt: string
  updatedAt: string | null
}

export const RentScheduleStatus = {
  Pending: 0,
  PartiallyPaid: 1,
  Paid: 2,
  Overdue: 3,
  Cancelled: 4,
} as const
export type RentScheduleStatus = (typeof RentScheduleStatus)[keyof typeof RentScheduleStatus]

export const RentScheduleStatusLabel: Record<RentScheduleStatus, string> = {
  [RentScheduleStatus.Pending]: 'Pending',
  [RentScheduleStatus.PartiallyPaid]: 'Partially Paid',
  [RentScheduleStatus.Paid]: 'Paid',
  [RentScheduleStatus.Overdue]: 'Overdue',
  [RentScheduleStatus.Cancelled]: 'Cancelled',
}

export interface RentScheduleDto {
  id: string
  leaseId: string
  leaseNumber: string
  periodNumber: number
  periodStart: string
  periodEnd: string
  dueDate: string
  amount: number
  paidAmount: number
  status: RentScheduleStatus
  isOverdue: boolean
}

export interface RentPaymentDto {
  id: string
  receiptNumber: string
  leaseId: string
  leaseNumber: string
  rentScheduleId: string
  rentSchedulePeriodNumber: number
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

export const SecurityDepositStatus = {
  Pending: 0,
  Held: 1,
  PartiallyRefunded: 2,
  Refunded: 3,
  Forfeited: 4,
} as const
export type SecurityDepositStatus = (typeof SecurityDepositStatus)[keyof typeof SecurityDepositStatus]

export const SecurityDepositStatusLabel: Record<SecurityDepositStatus, string> = {
  [SecurityDepositStatus.Pending]: 'Pending',
  [SecurityDepositStatus.Held]: 'Held',
  [SecurityDepositStatus.PartiallyRefunded]: 'Partially Refunded',
  [SecurityDepositStatus.Refunded]: 'Refunded',
  [SecurityDepositStatus.Forfeited]: 'Forfeited',
}

export interface SecurityDepositDto {
  id: string
  leaseId: string
  leaseNumber: string
  amount: number
  status: SecurityDepositStatus
  receivedDate: string | null
  refundedAmount: number
  refundDate: string | null
  notes: string | null
}

export const MaintenanceCategory = {
  Plumbing: 0,
  Electrical: 1,
  Hvac: 2,
  Structural: 3,
  Appliance: 4,
  Other: 5,
} as const
export type MaintenanceCategory = (typeof MaintenanceCategory)[keyof typeof MaintenanceCategory]

export const MaintenanceCategoryLabel: Record<MaintenanceCategory, string> = {
  [MaintenanceCategory.Plumbing]: 'Plumbing',
  [MaintenanceCategory.Electrical]: 'Electrical',
  [MaintenanceCategory.Hvac]: 'HVAC',
  [MaintenanceCategory.Structural]: 'Structural',
  [MaintenanceCategory.Appliance]: 'Appliance',
  [MaintenanceCategory.Other]: 'Other',
}

export const MaintenancePriority = {
  Low: 0,
  Medium: 1,
  High: 2,
  Urgent: 3,
} as const
export type MaintenancePriority = (typeof MaintenancePriority)[keyof typeof MaintenancePriority]

export const MaintenancePriorityLabel: Record<MaintenancePriority, string> = {
  [MaintenancePriority.Low]: 'Low',
  [MaintenancePriority.Medium]: 'Medium',
  [MaintenancePriority.High]: 'High',
  [MaintenancePriority.Urgent]: 'Urgent',
}

export const MaintenanceStatus = {
  Open: 0,
  Assigned: 1,
  InProgress: 2,
  OnHold: 3,
  Resolved: 4,
  Cancelled: 5,
} as const
export type MaintenanceStatus = (typeof MaintenanceStatus)[keyof typeof MaintenanceStatus]

export const MaintenanceStatusLabel: Record<MaintenanceStatus, string> = {
  [MaintenanceStatus.Open]: 'Open',
  [MaintenanceStatus.Assigned]: 'Assigned',
  [MaintenanceStatus.InProgress]: 'In Progress',
  [MaintenanceStatus.OnHold]: 'On Hold',
  [MaintenanceStatus.Resolved]: 'Resolved',
  [MaintenanceStatus.Cancelled]: 'Cancelled',
}

export interface MaintenanceRequestDto {
  id: string
  requestNumber: string
  propertyId: string
  propertyName: string
  unitId: string | null
  unitNumber: string | null
  rentalTenantId: string | null
  rentalTenantName: string | null
  facilityId: string | null
  facilityName: string | null
  spaceId: string | null
  spaceCode: string | null
  slaHours: number | null
  slaDueAt: string | null
  category: MaintenanceCategory
  priority: MaintenancePriority
  description: string
  reportedDate: string
  assignedToUserId: string | null
  assignedToUserName: string | null
  assignedVendorId: string | null
  assignedVendorName: string | null
  status: MaintenanceStatus
  resolutionNotes: string | null
  completionDate: string | null
  createdAt: string
}

export interface PropertyPerformanceDto {
  propertyId: string
  propertyName: string
  totalUnits: number
  occupiedUnits: number
  monthlyRentalIncome: number
  outstandingRent: number
}

export interface PropertyDashboardDto {
  totalProperties: number
  totalUnits: number
  occupiedUnits: number
  availableUnits: number
  occupancyRate: number
  activeLeases: number
  expiringLeases: number
  monthlyRentalIncome: number
  outstandingRent: number
  overdueRent: number
  openMaintenanceRequests: number
  propertyPerformance: PropertyPerformanceDto[]
}

export interface UpcomingLeaseExpirationDto {
  leaseId: string
  leaseNumber: string
  unitNumber: string
  tenantName: string
  endDate: string
}

export interface RecentRentPaymentDto {
  id: string
  receiptNumber: string
  leaseNumber: string
  amount: number
  paymentDate: string
}

export interface RentalDashboardDto {
  activeLeases: number
  upcomingExpirations: UpcomingLeaseExpirationDto[]
  rentDue: number
  collectedRent: number
  outstandingRent: number
  overdueObligations: number
  totalUnits: number
  occupiedUnits: number
  recentPayments: RecentRentPaymentDto[]
}

// --- Facility Management, Shopping Mall & Coworking ---

export const FacilityType = {
  ShoppingMall: 0,
  Coworking: 1,
  OfficeBuilding: 2,
  CommercialBuilding: 3,
  MixedUse: 4,
  Other: 5,
} as const
export type FacilityType = (typeof FacilityType)[keyof typeof FacilityType]

export const FacilityTypeLabel: Record<FacilityType, string> = {
  [FacilityType.ShoppingMall]: 'Shopping Mall',
  [FacilityType.Coworking]: 'Coworking',
  [FacilityType.OfficeBuilding]: 'Office Building',
  [FacilityType.CommercialBuilding]: 'Commercial Building',
  [FacilityType.MixedUse]: 'Mixed Use',
  [FacilityType.Other]: 'Other',
}

export const FacilityOperatingStatus = {
  Active: 0,
  Inactive: 1,
  UnderMaintenance: 2,
} as const
export type FacilityOperatingStatus = (typeof FacilityOperatingStatus)[keyof typeof FacilityOperatingStatus]

export const FacilityOperatingStatusLabel: Record<FacilityOperatingStatus, string> = {
  [FacilityOperatingStatus.Active]: 'Active',
  [FacilityOperatingStatus.Inactive]: 'Inactive',
  [FacilityOperatingStatus.UnderMaintenance]: 'Under Maintenance',
}

export interface FacilityDto {
  id: string
  code: string
  propertyId: string
  propertyName: string
  type: FacilityType
  name: string
  status: FacilityOperatingStatus
  description: string | null
  addressLine: string | null
  city: string | null
  managerUserId: string | null
  managerUserName: string | null
  spaceCount: number
  createdAt: string
  updatedAt: string | null
}

export const SpaceType = {
  Shop: 0,
  Office: 1,
  CoworkingArea: 2,
  ParkingArea: 3,
  CommonArea: 4,
  Other: 5,
} as const
export type SpaceType = (typeof SpaceType)[keyof typeof SpaceType]

export const SpaceTypeLabel: Record<SpaceType, string> = {
  [SpaceType.Shop]: 'Shop',
  [SpaceType.Office]: 'Office',
  [SpaceType.CoworkingArea]: 'Coworking Area',
  [SpaceType.ParkingArea]: 'Parking Area',
  [SpaceType.CommonArea]: 'Common Area',
  [SpaceType.Other]: 'Other',
}

export const SpaceStatus = {
  Available: 0,
  Reserved: 1,
  Occupied: 2,
  Maintenance: 3,
  Inactive: 4,
} as const
export type SpaceStatus = (typeof SpaceStatus)[keyof typeof SpaceStatus]

export const SpaceStatusLabel: Record<SpaceStatus, string> = {
  [SpaceStatus.Available]: 'Available',
  [SpaceStatus.Reserved]: 'Reserved',
  [SpaceStatus.Occupied]: 'Occupied',
  [SpaceStatus.Maintenance]: 'Maintenance',
  [SpaceStatus.Inactive]: 'Inactive',
}

export interface SpaceDto {
  id: string
  facilityId: string
  facilityName: string
  propertyUnitId: string | null
  buildingBlock: string | null
  code: string
  type: SpaceType
  areaSize: number | null
  capacity: number | null
  status: SpaceStatus
  rate: number | null
  metadataJson: string | null
  createdAt: string
  updatedAt: string | null
}

export interface MallShopDto {
  spaceId: string
  facilityId: string
  facilityName: string
  propertyUnitId: string
  buildingBlock: string | null
  code: string
  areaSize: number | null
  rate: number | null
  status: SpaceStatus
  tradeCategory: string | null
  storefrontName: string | null
  notes: string | null
  currentLeaseId: string | null
  currentLeaseStatus: LeaseStatus | null
  currentTenantName: string | null
}

export const ServiceChargeCalculationType = {
  FixedAmount: 0,
  PerAreaUnit: 1,
} as const
export type ServiceChargeCalculationType = (typeof ServiceChargeCalculationType)[keyof typeof ServiceChargeCalculationType]

export const ServiceChargeCalculationTypeLabel: Record<ServiceChargeCalculationType, string> = {
  [ServiceChargeCalculationType.FixedAmount]: 'Fixed Amount',
  [ServiceChargeCalculationType.PerAreaUnit]: 'Per Area Unit',
}

export const ServiceChargeStatus = {
  Pending: 0,
  PartiallyPaid: 1,
  Paid: 2,
  Cancelled: 3,
} as const
export type ServiceChargeStatus = (typeof ServiceChargeStatus)[keyof typeof ServiceChargeStatus]

export const ServiceChargeStatusLabel: Record<ServiceChargeStatus, string> = {
  [ServiceChargeStatus.Pending]: 'Pending',
  [ServiceChargeStatus.PartiallyPaid]: 'Partially Paid',
  [ServiceChargeStatus.Paid]: 'Paid',
  [ServiceChargeStatus.Cancelled]: 'Cancelled',
}

export interface ServiceChargeDefinitionDto {
  id: string
  facilityId: string
  facilityName: string
  name: string
  calculationType: ServiceChargeCalculationType
  amount: number
  billingFrequency: LeasePaymentFrequency
  isActive: boolean
  createdAt: string
}

export interface ServiceChargeChargeDto {
  id: string
  serviceChargeDefinitionId: string
  serviceChargeDefinitionName: string
  leaseId: string
  leaseNumber: string
  periodStart: string
  periodEnd: string
  dueDate: string
  amount: number
  paidAmount: number
  status: ServiceChargeStatus
}

export const ParkingSpaceStatus = {
  Available: 0,
  Allocated: 1,
  Inactive: 2,
} as const
export type ParkingSpaceStatus = (typeof ParkingSpaceStatus)[keyof typeof ParkingSpaceStatus]

export const ParkingSpaceStatusLabel: Record<ParkingSpaceStatus, string> = {
  [ParkingSpaceStatus.Available]: 'Available',
  [ParkingSpaceStatus.Allocated]: 'Allocated',
  [ParkingSpaceStatus.Inactive]: 'Inactive',
}

export const ParkingAllocationStatus = {
  Active: 0,
  Ended: 1,
} as const
export type ParkingAllocationStatus = (typeof ParkingAllocationStatus)[keyof typeof ParkingAllocationStatus]

export const ParkingAllocationStatusLabel: Record<ParkingAllocationStatus, string> = {
  [ParkingAllocationStatus.Active]: 'Active',
  [ParkingAllocationStatus.Ended]: 'Ended',
}

export interface ParkingSpaceDto {
  id: string
  facilityId: string
  code: string
  status: ParkingSpaceStatus
}

export interface ParkingAllocationDto {
  id: string
  parkingSpaceId: string
  parkingSpaceCode: string
  rentalTenantId: string | null
  rentalTenantName: string | null
  vehicleReference: string | null
  startDate: string
  endDate: string | null
  amount: number
  paidAmount: number
  status: ParkingAllocationStatus
  notes: string | null
}

export const FacilityEventStatus = {
  Planned: 0,
  Ongoing: 1,
  Completed: 2,
  Cancelled: 3,
} as const
export type FacilityEventStatus = (typeof FacilityEventStatus)[keyof typeof FacilityEventStatus]

export const FacilityEventStatusLabel: Record<FacilityEventStatus, string> = {
  [FacilityEventStatus.Planned]: 'Planned',
  [FacilityEventStatus.Ongoing]: 'Ongoing',
  [FacilityEventStatus.Completed]: 'Completed',
  [FacilityEventStatus.Cancelled]: 'Cancelled',
}

export interface FacilityEventDto {
  id: string
  facilityId: string
  facilityName: string
  title: string
  startAt: string
  endAt: string
  location: string | null
  organizer: string | null
  status: FacilityEventStatus
  notes: string | null
}

export const TenantNoticeStatus = {
  Draft: 0,
  Sent: 1,
  Acknowledged: 2,
} as const
export type TenantNoticeStatus = (typeof TenantNoticeStatus)[keyof typeof TenantNoticeStatus]

export const TenantNoticeStatusLabel: Record<TenantNoticeStatus, string> = {
  [TenantNoticeStatus.Draft]: 'Draft',
  [TenantNoticeStatus.Sent]: 'Sent',
  [TenantNoticeStatus.Acknowledged]: 'Acknowledged',
}

export interface TenantNoticeDto {
  id: string
  facilityId: string
  facilityName: string
  rentalTenantId: string | null
  rentalTenantName: string | null
  subject: string
  content: string
  noticeDate: string
  status: TenantNoticeStatus
}

export const UtilityType = {
  Electricity: 0,
  Water: 1,
  Gas: 2,
  Other: 3,
} as const
export type UtilityType = (typeof UtilityType)[keyof typeof UtilityType]

export const UtilityTypeLabel: Record<UtilityType, string> = {
  [UtilityType.Electricity]: 'Electricity',
  [UtilityType.Water]: 'Water',
  [UtilityType.Gas]: 'Gas',
  [UtilityType.Other]: 'Other',
}

export interface UtilityReadingDto {
  id: string
  facilityId: string | null
  facilityName: string | null
  propertyId: string | null
  propertyName: string | null
  type: UtilityType
  meterReference: string
  readingValue: number
  readingDate: string
  consumption: number | null
  ratePerUnit: number | null
  amount: number | null
  paidAmount: number
  createdAt: string
}

export const ServiceRequestCategory = {
  Cleaning: 0,
  Security: 1,
  ItSupport: 2,
  FrontDesk: 3,
  Other: 4,
} as const
export type ServiceRequestCategory = (typeof ServiceRequestCategory)[keyof typeof ServiceRequestCategory]

export const ServiceRequestCategoryLabel: Record<ServiceRequestCategory, string> = {
  [ServiceRequestCategory.Cleaning]: 'Cleaning',
  [ServiceRequestCategory.Security]: 'Security',
  [ServiceRequestCategory.ItSupport]: 'IT Support',
  [ServiceRequestCategory.FrontDesk]: 'Front Desk',
  [ServiceRequestCategory.Other]: 'Other',
}

export interface ServiceRequestDto {
  id: string
  requestNumber: string
  facilityId: string
  facilityName: string
  spaceId: string | null
  spaceCode: string | null
  requestedByUserId: string | null
  requestedByUserName: string | null
  requesterCustomerId: string | null
  requesterCustomerName: string | null
  category: ServiceRequestCategory
  priority: MaintenancePriority
  description: string
  reportedDate: string
  assignedToUserId: string | null
  assignedToUserName: string | null
  assignedVendorId: string | null
  assignedVendorName: string | null
  status: MaintenanceStatus
  resolutionNotes: string | null
  resolvedDate: string | null
  createdAt: string
}

export const FacilityPaymentSourceType = {
  ServiceCharge: 0,
  Parking: 1,
  CoworkingMembership: 2,
  CoworkingBooking: 3,
  Utility: 4,
} as const
export type FacilityPaymentSourceType = (typeof FacilityPaymentSourceType)[keyof typeof FacilityPaymentSourceType]

export const FacilityPaymentSourceTypeLabel: Record<FacilityPaymentSourceType, string> = {
  [FacilityPaymentSourceType.ServiceCharge]: 'Service Charge',
  [FacilityPaymentSourceType.Parking]: 'Parking',
  [FacilityPaymentSourceType.CoworkingMembership]: 'Coworking Membership',
  [FacilityPaymentSourceType.CoworkingBooking]: 'Coworking Booking',
  [FacilityPaymentSourceType.Utility]: 'Utility',
}

export interface FacilityPaymentDto {
  id: string
  receiptNumber: string
  sourceType: FacilityPaymentSourceType
  sourceId: string
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

export interface UtilityConsumptionSummaryDto {
  type: UtilityType
  totalConsumption: number
  totalAmount: number
}

export interface UpcomingFacilityEventDto {
  id: string
  title: string
  facilityId: string
  facilityName: string
  startAt: string
}

export interface FacilityDashboardDto {
  totalFacilities: number
  totalSpaces: number
  occupiedSpaces: number
  availableSpaces: number
  occupancyRate: number
  activeTenantsOrMembers: number
  openMaintenanceRequests: number
  openServiceRequests: number
  totalRevenue: number
  outstandingReceivables: number
  utilitySummary: UtilityConsumptionSummaryDto[]
  upcomingEvents: UpcomingFacilityEventDto[]
}

export interface MallDashboardDto {
  totalShops: number
  occupiedShops: number
  vacantShops: number
  occupancyRate: number
  activeTenants: number
  rentDue: number
  rentCollected: number
  serviceChargesOutstanding: number
  parkingOccupied: number
  parkingTotal: number
  openMaintenanceRequests: number
  upcomingEvents: number
  unacknowledgedNotices: number
  revenueSummary: number
}

export interface CoworkingMemberDto {
  id: string
  customerId: string
  customerName: string
  email: string | null
  phone: string | null
  isActive: boolean
  notes: string | null
  activeMembershipCount: number
  createdAt: string
}

export interface MembershipPlanDto {
  id: string
  facilityId: string
  facilityName: string
  name: string
  durationDays: number
  price: number
  includedHoursCredits: number | null
  isActive: boolean
}

export const MembershipStatus = {
  Active: 0,
  Expired: 1,
  Cancelled: 2,
} as const
export type MembershipStatus = (typeof MembershipStatus)[keyof typeof MembershipStatus]

export const MembershipStatusLabel: Record<MembershipStatus, string> = {
  [MembershipStatus.Active]: 'Active',
  [MembershipStatus.Expired]: 'Expired',
  [MembershipStatus.Cancelled]: 'Cancelled',
}

export interface MembershipDto {
  id: string
  memberId: string
  memberName: string
  planId: string
  planName: string
  startDate: string
  endDate: string
  status: MembershipStatus
  amount: number
  paidAmount: number
  createdAt: string
}

export const DeskType = {
  Hot: 0,
  Dedicated: 1,
} as const
export type DeskType = (typeof DeskType)[keyof typeof DeskType]

export const DeskTypeLabel: Record<DeskType, string> = {
  [DeskType.Hot]: 'Hot Desk',
  [DeskType.Dedicated]: 'Dedicated Desk',
}

export const DeskStatus = {
  Available: 0,
  Occupied: 1,
  Maintenance: 2,
  Inactive: 3,
} as const
export type DeskStatus = (typeof DeskStatus)[keyof typeof DeskStatus]

export const DeskStatusLabel: Record<DeskStatus, string> = {
  [DeskStatus.Available]: 'Available',
  [DeskStatus.Occupied]: 'Occupied',
  [DeskStatus.Maintenance]: 'Maintenance',
  [DeskStatus.Inactive]: 'Inactive',
}

export interface DeskDto {
  id: string
  spaceId: string
  spaceCode: string
  code: string
  type: DeskType
  status: DeskStatus
}

export const MeetingRoomStatus = {
  Available: 0,
  Maintenance: 1,
  Inactive: 2,
} as const
export type MeetingRoomStatus = (typeof MeetingRoomStatus)[keyof typeof MeetingRoomStatus]

export const MeetingRoomStatusLabel: Record<MeetingRoomStatus, string> = {
  [MeetingRoomStatus.Available]: 'Available',
  [MeetingRoomStatus.Maintenance]: 'Maintenance',
  [MeetingRoomStatus.Inactive]: 'Inactive',
}

export interface MeetingRoomDto {
  id: string
  spaceId: string
  spaceCode: string
  name: string
  capacity: number | null
  hourlyRate: number | null
  dailyRate: number | null
  status: MeetingRoomStatus
}

export const BookingResourceType = {
  Desk: 0,
  MeetingRoom: 1,
} as const
export type BookingResourceType = (typeof BookingResourceType)[keyof typeof BookingResourceType]

export const BookingResourceTypeLabel: Record<BookingResourceType, string> = {
  [BookingResourceType.Desk]: 'Desk',
  [BookingResourceType.MeetingRoom]: 'Meeting Room',
}

export const CoworkingBookingStatus = {
  Pending: 0,
  Confirmed: 1,
  Completed: 2,
  Cancelled: 3,
} as const
export type CoworkingBookingStatus = (typeof CoworkingBookingStatus)[keyof typeof CoworkingBookingStatus]

export const CoworkingBookingStatusLabel: Record<CoworkingBookingStatus, string> = {
  [CoworkingBookingStatus.Pending]: 'Pending',
  [CoworkingBookingStatus.Confirmed]: 'Confirmed',
  [CoworkingBookingStatus.Completed]: 'Completed',
  [CoworkingBookingStatus.Cancelled]: 'Cancelled',
}

export interface CoworkingBookingDto {
  id: string
  memberId: string
  memberName: string
  resourceType: BookingResourceType
  resourceId: string
  resourceLabel: string
  startAt: string
  endAt: string
  status: CoworkingBookingStatus
  price: number
  paidAmount: number
  notes: string | null
  createdAt: string
}

export interface UpcomingCoworkingBookingDto {
  id: string
  memberName: string
  resourceLabel: string
  startAt: string
  endAt: string
}

export interface CoworkingDashboardDto {
  totalDesks: number
  occupiedDesks: number
  availableDesks: number
  occupancy: number
  activeMembers: number
  membershipRevenue: number
  meetingRoomBookings: number
  upcomingBookings: UpcomingCoworkingBookingDto[]
  utilizationSummary: number
  openMaintenanceOrServiceRequests: number
}
