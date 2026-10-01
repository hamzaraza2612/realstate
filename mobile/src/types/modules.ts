/**
 * Module DTOs and enums the Phase 2 module screens consume (CRM, Sales, Projects, Property,
 * Construction, Procurement, Facility, Documents). Copied verbatim from `frontend/src/types/api.ts`
 * (same enum numbering, same camelCase wire names) per this app's convention in `./api.ts` — kept
 * in a separate file only so `api.ts` stays readable. Hand-kept in sync; not generated.
 */

// --- CRM (backend/src/Application/Crm) ---

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

// --- Projects (backend/src/Application/Projects) ---

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

// --- Sales (backend/src/Application/Sales) ---

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

// --- Construction (backend/src/Application/Construction) ---

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
  paidAmount: number
  createdAt: string
}

export interface ExpensePaymentDto {
  id: string
  receiptNumber: string
  expenseId: string
  amount: number
  paymentDate: string
  referenceNumber: string | null
  notes: string | null
  recordedByUserId: string
  recordedByUserName: string | null
  journalEntryId: string | null
  createdAt: string
}

// --- Procurement (backend/src/Application/Procurement) ---

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

// --- Property & Rental (backend/src/Application/Property) ---

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

// --- Facility (backend/src/Application/Facility) ---

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

// --- Documents (backend/src/Application/Documents) ---

export const DocumentEntityTypes = {
  Customer: 'Customer',
  Lead: 'Lead',
  Booking: 'Booking',
  Payment: 'Payment',
  Project: 'Project',
  Property: 'Property',
  PropertyUnit: 'PropertyUnit',
  Lease: 'Lease',
  RentalTenant: 'RentalTenant',
  Vendor: 'Vendor',
  PurchaseOrder: 'PurchaseOrder',
  PurchaseRequest: 'PurchaseRequest',
  Expense: 'Expense',
  Facility: 'Facility',
  MaintenanceRequest: 'MaintenanceRequest',
  Other: 'Other',
} as const
export type DocumentEntityType = (typeof DocumentEntityTypes)[keyof typeof DocumentEntityTypes]

export const DocumentCategory = {
  General: 0,
  Contract: 1,
  Invoice: 2,
  Receipt: 3,
  Identification: 4,
  Legal: 5,
  Other: 6,
} as const
export type DocumentCategory = (typeof DocumentCategory)[keyof typeof DocumentCategory]

export const DocumentCategoryLabel: Record<DocumentCategory, string> = {
  [DocumentCategory.General]: 'General',
  [DocumentCategory.Contract]: 'Contract',
  [DocumentCategory.Invoice]: 'Invoice',
  [DocumentCategory.Receipt]: 'Receipt',
  [DocumentCategory.Identification]: 'Identification',
  [DocumentCategory.Legal]: 'Legal',
  [DocumentCategory.Other]: 'Other',
}

export interface DocumentDto {
  id: string
  entityType: string
  entityId: string
  category: DocumentCategory
  title: string
  description: string | null
  latestVersionNumber: number
  createdByUserId: string
  createdByUserName: string | null
  createdAt: string
}

export interface DocumentVersionDto {
  id: string
  documentId: string
  versionNumber: number
  originalFileName: string
  contentType: string
  sizeBytes: number
  uploadedByUserId: string
  uploadedByUserName: string | null
  createdAt: string
}
