# Reporting & Analytics (Milestone 12)

A unified, read-only reporting layer over the existing modules' data — not a new business module.
Every report queries existing tables (or, where one already exists, calls the owning module's own
service — Finance's Profit & Loss/Cash Flow/Balance Sheet, Property's occupancy, CRM's conversion
rate) rather than maintaining a second copy of a calculation. All endpoints live under
`/api/v1/reports/*`, are gated by the single tenant-wide `reports.view` permission (the same
"one permission spans the whole area" precedent as `documents.view`/`approvals.view` from
Milestone 11), and are always implicitly tenant-scoped via the existing `TenantId` global query
filter — no report endpoint accepts or trusts a tenant id from the caller.

## Conventions used by every report below

- **Date range**: unless a report's own definition says otherwise, an omitted `from`/`to` defaults
  to "the current calendar month to date" (`ReportDateRange.Resolve`, in UTC — the same timezone
  convention every other module's `DateOnly` field already uses). Both ends can be overridden
  independently.
- **Two kinds of figure**: a *period figure* is a sum over `[from, to]` against that record's own
  date column (e.g. `BookingDate`, `PaymentDate`). A *snapshot figure* is a balance or count "as of
  now" (today, server UTC), independent of any requested period — the same distinction a Balance
  Sheet line (as-of) vs. a P&L line (over-a-period) already makes. Each KPI below is labeled.
- **Money**: always `decimal`, never floating point; a report never invents a number — a figure
  with no backing data model returns `null`/an empty list rather than a fabricated zero or average
  (e.g. a WorkPackage with no `Budget` set shows `budget: null`, not `0`).
- **Aging buckets**: `Current` (not yet due), `1-30`, `31-60`, `61-90`, `90+` days past due —
  identical bucket boundaries in every aging report in this milestone (`AgingBucket`).
- **Export**: any endpoint accepting `?format=csv` returns the same rows as a downloadable CSV
  (`text/csv`) instead of the JSON envelope; an unrecognized format is a 400. Excel/PDF are
  designed-for extension points (`IReportExporter`) — no dependency was added for a second format
  that isn't implemented yet (see "Export architecture" below).
- **Drill-down**: every entity referenced by a report row (`customerId`, `bookingId`, `projectId`,
  `vendorId`, `propertyId`, `leaseId`, `requestId`, `assignedVendorId`, ...) is that entity's real
  id from its owning table — a frontend can link straight to the existing detail page for it. No
  report invents an id or a link target that doesn't resolve to a real record. Following a
  drill-down link still enforces that entity's own permission (e.g. `crm.customer.view`) — holding
  `reports.view` alone never grants implicit access to the underlying record (see
  `DrillDown_ReceivableAgingRow_...` in `ReportingTests.cs`).

## 1. Executive Dashboard — `GET /reports/executive?from&to`

| KPI | Kind | Definition |
|---|---|---|
| Sales | Period | Sum of `Booking.NetPrice` for `Status = Confirmed`, `BookingDate` in range. Draft/PendingApproval/Cancelled excluded — this is committed sales, not pipeline. |
| Collections | Period | Sum of Sales `Payment.Amount` + Property `RentPayment.Amount` + Facility `FacilityPayment.Amount`, each by its own `PaymentDate`, in range — every cash inflow recorded through a "Payment" entity across all three revenue modules. |
| Revenue / Expenses / Profit | Period | Reused verbatim from `IFinanceReportService.GetProfitAndLossAsync(from, to)` — not recomputed. Profit = Revenue − Expenses (the P&L's own `NetIncome`). |
| Rental Collected | Period | Sum of `RentPayment.Amount` in range. |
| Receivables | Snapshot | Sum of `(Amount − PaidAmount)` across Sales `Installment` rows not `Cancelled`. Sales-installment receivables only — rent/service-charge receivables are reported separately (Property/Facility), never folded in, to avoid conflating three distinct billing models into one number. |
| Payables | Snapshot | Sum of `(Amount − PaidAmount)` across Construction `Expense` rows with `Status = Approved`. Pending/Rejected excluded — no Finance journal has posted for them yet. |
| Cash Position | Snapshot (as of `to`) | `IFinanceReportService.GetCashFlowAsync(null, to).ClosingCash` — reused verbatim. |
| Active Projects | Snapshot | Count of `Project.Status = Active`. |
| Inventory | Snapshot | `InventoryUnit` counts by status: Available; Reserved+Booked (grouped, both mean "not yet sold but spoken for"); Sold; Total. |
| Property Occupancy Rate | Snapshot | Reused from `IPropertyDashboardService.GetAsync().OccupancyRate`. `null` (not `0`) when the tenant has zero units. |
| Rental Outstanding | Snapshot | Sum of `(Amount − PaidAmount)` across `RentSchedule` rows not `Cancelled`. |
| Construction Progress % | Snapshot | Average `WorkPackage.ProgressPercent` across work packages not `Cancelled`. `null` when there are none yet — not 0%. |
| Procurement Exposure | Snapshot | Sum of `PurchaseOrder.Total` for orders in `PendingApproval`/`Approved`/`Sent`/`PartiallyReceived` — committed spend not yet fully received or cancelled. |
| Maintenance Backlog | Snapshot | Count of `MaintenanceRequest` in `Open`/`Assigned`/`InProgress`/`OnHold` — spans both Property and Facility maintenance (one shared entity). |
| Total Leads / Conversion Rate % | Snapshot | Reused from `ICrmDashboardService.GetAsync()` — `WonLeads / TotalLeads * 100`, all-time (a status ratio, not a period figure by nature). |

No "budget vs. actual" figure appears here: `Project` has no `Budget` field in the current domain
model. The Construction report below exposes the figure that *is* backed
(`WorkPackage.Budget`).

## 2. Sales Reports — `GET /reports/sales/*`

Shared filter: `from`, `to` (on `BookingDate` unless noted), `projectId`, `agentUserId`,
`customerId`, `status`. Value totals include `Confirmed` bookings only unless `status` is set
explicitly to something else (same rule as the Executive Dashboard's Sales KPI).

- **by-project / by-period / by-agent**: booking count + `NetPrice` total, grouped accordingly. By-period groups by calendar month.
- **booking-status**: count + `NetPrice` total per `BookingStatus`, no Confirmed-only filter (this one shows the whole pipeline, deliberately).
- **conversion**: CRM Lead funnel over `CreatedAt` in range — counts by `LeadStatus` plus `WonLeads / TotalLeads * 100`. Same formula as the Executive Dashboard's all-time figure, here date-scoped.
- **cancellations**: paged list of `Cancelled` bookings with project/customer/value. `Booking` has no cancellation-reason field, so none is reported — this shows what was lost, not why.
- **collections**: Sales `Payment.Amount` grouped by day, optionally filtered by project/customer.
- **outstanding-installments**: delegates directly to the existing `IReceivableService` — no duplicate logic.
- **receivable-aging**: per-customer aging buckets over Sales `Installment` outstanding balances, days past `DueDate + PaymentPlan.GracePeriodDays` — the same overdue rule `PaymentPlanService.EffectiveStatus` already uses elsewhere, applied here as bucket boundaries instead of a single boolean.

## 3. Finance Reports — `GET /reports/finance/*` (extension only)

Trial Balance / Income Summary / Balance Sheet / P&L / Cash Flow remain at their existing
`/finance/reports/*` routes — **not duplicated here**. Only the reports Finance didn't already have:

- **ar-aging**: identical computation to Sales' `receivable-aging` (same source data, same bucket rule), returned in a Finance-shaped envelope (`{ rows, totalOutstanding }`) for a Finance-module consumer.
- **ap-aging**: per-vendor aging over Construction `Expense` rows with `Status = Approved` and `Amount > PaidAmount`. Aged from `ExpenseDate` directly — `Expense` has no separate due date, so this differs from AR aging's due-date-plus-grace-period basis (documented explicitly, not silently assumed equivalent).
- **revenue-trend / expense-trend**: monthly series using the exact same posted-journal-line classification as Finance's own P&L (Credit−Debit for Revenue accounts, Debit−Credit for Expense accounts), grouped by month instead of summed for one period.
- **collections-trend**: Sales + Rent + Facility payment amounts, by month — the time series behind the Executive Dashboard's Collections KPI.

## 4. Project Reports — `GET /reports/projects/*`

- **inventory-availability**: per-project `InventoryUnit` counts by every status value.
- **sold-vs-available**: the same data collapsed to Sold vs. everything else, plus Sold%.
- **sales-summary**: Confirmed-booking count + `NetPrice` total per project, over `[from, to]`.
- **collection-summary**: collected vs. outstanding across a project's bookings' installments, as of now (a balance, not period-summed).
- **financial-summary**: **project profitability** — Confirmed-booking sales revenue minus Approved Construction Expenses for the same project and period. This is a *direct, gross* margin only: it does **not** allocate shared overhead, corporate costs, or Procurement commitments not yet expensed, since none of those are tracked per-project in the current domain model. Treat it as a directional signal, not a full P&L per project.
- **progress**: average `WorkPackage.ProgressPercent` per project (excluding Cancelled). `null` for a project with zero work packages — Construction hasn't started tracking it yet, not 0%.

## 5. Construction / Procurement Reports

`GET /reports/construction/*`:
- **work-package-progress**: full list (filterable by project/status) of status/progress/budget/actual — the same shape `ConstructionDashboardDto`'s "recent" list already uses, here unpaginated-but-filtered and not capped to "recent".
- **expenses**: Approved-expense totals by category, over a date range.
- **budget-vs-actual**: `WorkPackage.Budget` vs. sum of its Approved expenses. Rows with no `Budget` set show `variance: null`, never `0` — a `0` variance would falsely claim an on-budget outcome. No project- or task-level budget figure exists — `Project` and `ConstructionTask` have no `Budget` field in the current model, so no such report is offered (see PRODUCT_GAP_AUDIT.md's technical-debt register for the domain gap, not fabricated here).

`GET /reports/procurement/*`:
- **purchase-order-exposure**: per-vendor sum of `PurchaseOrder.Total` for orders in the same "open" status set as the Executive Dashboard's Procurement Exposure KPI.
- **received-vs-ordered**: per PO line, `Quantity` vs. `ReceivedQuantity` vs. the remainder.
- **vendor-spend**: per-vendor sum of `PurchaseOrder.Total` by `OrderDate` range, any status — committed order value, not necessarily cash paid yet (Construction Expense/AP tracks actual cash spend separately).
- **status**: PO count + total value per status.

## 6. Property / Rental Reports — `GET /reports/property/*`

- **occupancy**: per-property Occupied/Total `PropertyUnit`, as of now.
- **rent-billed / rent-collected**: `RentSchedule.Amount` due / `RentPayment.Amount` paid, per property, over a date range.
- **overdue-rent**: `RentSchedule` rows not fully paid where `today > DueDate + Lease.GracePeriodDays` — the same rule `RentScheduleService` already applies per-row, exposed here as a cross-lease list.
- **revenue**: same as rent-collected — Property's revenue scope is rent only; Facility/Mall revenue (service charges, parking, coworking) is reported separately under Facility, never mixed in.
- **tenant-aging**: per-`RentalTenant` aging buckets over outstanding `RentSchedule` balances, same bucket rule as AR aging.
- **lease-status**: `Lease` count per status.

## 7. Facility / Mall / Coworking Reports — `GET /reports/facility/*`

- **utilization**: per-facility Occupied/Total `Space`, as of now.
- **mall-occupancy**: the same, narrowed to `Space.Type = Shop` on `ShoppingMall`-type facilities.
- **service-charge-collection**: `ServiceChargeCharge` billed vs. collected, per facility, over a `DueDate` range.
- **revenue**: sum of `FacilityPayment.Amount` per facility over a date range, broken down by `SourceType` (ServiceCharge/Parking/CoworkingMembership/CoworkingBooking/Utility) — resolved back to its owning Facility by following each payment's polymorphic `(SourceType, SourceId)` reference to that subtype's own table, since `FacilityPayment` has no direct `FacilityId`.
- **parking**: `ParkingSpace` Allocated/Total per facility.
- **events**: upcoming vs. past `FacilityEvent` count per facility.
- **coworking-desk-utilization**: `Desk` Occupied/Total per facility.
- **meeting-room-utilization**: booked hours per `MeetingRoom` over a date range, counting Confirmed/Completed bookings only (Pending hasn't happened, Cancelled didn't happen).
- **booking-trends**: Coworking (desk + room) booking counts by day over a date range.
- **maintenance-backlog**: `MaintenanceRequest` rows with `FacilityId` set (the Property half of this shared table — `FacilityId` null — is out of this report's scope; see the Property reports for that half), not yet Resolved/Cancelled, with age-in-days and priority.

## Export architecture

`IReportExporter` (`Api/Common/ReportExport.cs`) is the extension point: `Format`/`ContentType`/
`FileExtension` plus `Export<T>(rows)`. `CsvReportExporter` is the only registered implementation —
a reflection-driven, RFC 4180-compliant CSV writer over any flat DTO's public properties, with
culture-invariant dates/decimals. Adding Excel or PDF later means writing one more class
implementing the same interface and registering it in `Program.cs`; no controller changes required
— each report action already resolves the requested exporter from `IEnumerable<IReportExporter>`
by its `Format` string.

## Performance

Every report is a direct EF Core LINQ query with server-side `GroupBy`/`Sum`/`Count` and
DTO-shaped `Select` projections — no report loads full entity graphs into memory to aggregate in
application code (the one deliberate exception, `ReceivableAgingAsync`/`ArAgingAsync`, materializes
the *already-filtered* outstanding-balance row set because the aging bucket depends on
`PaymentPlan.GracePeriodDays`, a value EF Core cannot join+compute inside a single SQL aggregate
here — the same design `ReceivableService` already used before this milestone). New composite
indexes were added only where a report's own filter predicate justified one (see
`docs/DATABASE.md`); nothing was added speculatively.

## Security

- Every report controller carries `[RequirePermission(Permissions.Reports.View)]` at the class
  level — a single tenant-wide permission, consistent with the `documents.view`/`approvals.view`
  precedent from Milestone 11.
- Every query runs through `AppDbContext`, which applies the tenant global query filter
  automatically — no report endpoint accepts a caller-supplied tenant id.
- Cross-tenant regression coverage: `ReportingTests.Reports_AreTenantIsolated_AcrossSalesFinanceAndProperty`
  creates two tenants and asserts a second tenant's reports never surface the first's rows, across
  Sales, Finance, and Property reports.
- Drill-down authorization coverage: `ReportingTests.DrillDown_ReceivableAgingRow_...` asserts that
  a user holding only `reports.view` (the "Accountant" role) can see a report row's real
  `customerId`, but is still denied (`403`) navigating to that customer's own record without
  `crm.customer.view` — `reports.view` never grants implicit entity-level access.
