# AI Business Intelligence / Command Center (Milestone 16)

This document covers the AI provider abstraction, the Business Command Center, the controlled
business-data tool layer, the write-action propose/approve/execute pipeline, and the security and
data-privacy boundaries introduced in Milestone 16. It follows the model this milestone is built
around: **UNDERSTAND → ANALYZE → EXPLAIN → RECOMMEND → PREPARE ACTION → USER APPROVAL → EXECUTE →
AUDIT.**

## The one rule everything else follows

**AI is not allowed to bypass the existing application security model.** Every AI request stays
tenant-scoped, authenticated, RBAC-aware, permission-aware, and auditable — the AI is a new *client*
of the ERP's existing services, never a new privilege. Concretely:

- Every AI tool call re-checks the caller's actual permissions at the moment it runs — never once at
  the start of a conversation and never assumed to still hold on a later turn or a later tool call.
- The AI cannot read any data except through a named, permission-gated tool that wraps an existing,
  already-tenant-filtered application/reporting service. There is no "run this query" capability.
- The AI cannot mutate anything directly. A tool call that would change data instead produces an
  `AiActionProposal` — a human must approve it through the existing Approval Inbox before anything
  executes.
- The ERP's own reporting/application services remain the sole source of truth for every number. The
  AI explains, correlates, and recommends; it never computes an authoritative financial figure itself,
  and the frontend can always show the real figure independently of what the model's prose claims
  (see "Fact-first responses" below).

## Provider abstraction (`Application/Ai/AiProviderAbstraction.cs`)

`IAiProvider` is the only seam business logic depends on:

```
IAiProvider.CompleteAsync(AiCompletionRequest) -> Result<AiCompletionResult>
```

`AiContentBlock` is a minimal three-variant union (`AiTextContent`, `AiToolUseContent`,
`AiToolResultContent`) — the smallest shape a manual multi-turn tool-calling loop needs, and every
current major provider's tool-calling protocol can map onto it. `AiConversationService` is written
entirely against these types; it has never seen an Anthropic SDK type.

Two implementations ship this milestone, exactly mirroring the Milestone 14/15
`UnconfiguredBillingPaymentProvider`/`UnconfiguredEInvoiceProvider` pattern:

- **`UnconfiguredAiProvider`** — the default. Always returns
  `Result.Failure("ai_provider_not_configured")`. Never throws.
- **`AnthropicAiProvider`** — a thin, faithful mapping to the Anthropic Messages API. Registered only
  when `Ai:Enabled=true` **and** `Ai:ApiKey` is non-empty (`DependencyInjection.cs`); the model name,
  max tokens, timeout, and rate limit are all configuration (`AiSettings`), never hardcoded. The API
  key comes from configuration/environment only — it is never committed, logged, or hardcoded.

The milestone deliberately ships **one** configurable provider adapter plus the safe unconfigured
default, per spec — not a multi-provider abstraction with several real backends.

## Entitlement and permission (two independent gates)

- **`EntitlementCodes.Ai`** ("ai") — a Feature entitlement in the *existing* Milestone 14
  entitlement system (`ITenantEntitlementService`). Gates the whole Command Center at the plan/billing
  level via `[RequireEntitlement(EntitlementCodes.Ai)]` on every AI controller. No second
  subscription/feature-gating mechanism was created.
- **`Permissions.Ai.View`** ("ai.view") — an RBAC permission gating which users *within* an entitled
  tenant may use AI at all, via `[RequirePermission(Permissions.Ai.View)]` on every action. Seeded onto
  the same role bundles that already carry `Reports.View` (Finance/Sales/Project/Construction/
  Procurement/Property/Facility Manager, Accountant, Organization Owner/Admin) — see `DbSeeder.cs`.
- Each individual AI **tool** additionally declares its own existing module permission (e.g.
  `finance.reports.view` for `finance.receivables_aging`) — see "Tool registry" below. A user who could
  not see Finance's own reports in the ERP UI cannot see them through the AI either.

Disabling the `ai` entitlement blocks only the Command Center (`403 feature_not_entitled` on every
`/api/v1/ai/*` route); the rest of the ERP is unaffected — there is no cascading failure.

## Conversation model (`Domain/Ai/AiConversation.cs`)

`AiConversation` (TenantId, UserId, Title, Status, Messages) and `AiMessage` (ConversationId, Role,
Content, `FactsJson`, `ToolCallsJson`, Provider, Model, InputTokens/OutputTokens, Status,
ErrorMessage). A conversation belongs to exactly one tenant **and** one user —
`AiConversationService` checks both on every read, so one user can never open another user's
conversation even within the same tenant, and the ambient tenant query filter independently blocks
cross-tenant access. No raw provider payloads or secrets are stored — only the rendered text, the
structured tool-derived facts, and token-usage counters.

### Fact-first responses (the hallucination defense)

`AiMessage.FactsJson` is populated **directly from tool execution results by application code** —
never parsed out of the model's own text. This is the concrete, testable form of "the AI must never
invent a number that did not come from an authorized business-data tool": the frontend renders
`FactsJson` as a structured, separate block from the assistant's prose, so even if a scripted/faulty
model claims a wrong figure in its narrative, the authoritative number shown to the user still comes
from the tool's real return value. `AiCommandCenterTests.AskResponse_Facts_ReflectToolResult_...`
proves this with a fake model that narrates a fabricated number while the tool returns the real one.

## Business Health and What Needs Attention

Both reuse **existing Milestone 12 reporting/application services exclusively** — neither computes a
parallel analytics pipeline, and neither ever queries a table directly that isn't already exposed by
an existing service.

- **`IBusinessHealthService`** (`BusinessHealthService.cs`) — six dimensions (Sales, Receivables,
  Payables, Finance/Cash, Construction, Rental), each a plain, deterministic, documented rule
  (`HealthStatus`: Healthy/Attention/Critical — never a fabricated numeric score). Every threshold is a
  **ratio, percentage, or sign comparison**, never a fixed currency amount, so the same rule is
  meaningful for a tenant billing in AED, PKR, or any other Milestone-15 currency without a
  currency-specific magic number. `Reasons` are pre-formatted sentences citing the actual numbers a
  rule evaluated (e.g. "17 invoices are overdue totalling AED 184,000"), generated by the ERP, never by
  the model.
- **`IAttentionEngineService`** (`AttentionEngineService.cs`) — up to eight itemized alerts (overdue
  receivables/payables, stale leads, cancelled bookings, over-budget work packages, overdue rent,
  expiring leases, maintenance backlog), each produced by a plain business rule over the same
  reporting data. Never an AI-generated alert.

## Tool registry — the AI's only door into business data (`Application/Ai/AiToolRegistry.cs`)

`IAiTool` (Name, Description, `Access` [Read/Write], `RequiredPermission`, `InputSchema`,
`ExecuteAsync(AiToolContext, arguments)`) is the **entire** surface the model can act through — there
is no "arbitrary internal method" exposure and no direct database access. `IAiToolRegistry` resolves
every registered `IAiTool` from DI; `GetAvailableTools(userPermissions)` is what filters which tools
the model is even told exist (a UX/token-efficiency optimization), while `ExecuteAsync` independently
re-verifies `RequiredPermission` against the caller every single time it runs — the real security
boundary, never assumed to already hold because the model was "only offered" authorized tools.

**14 READ tools** (`Infrastructure/Services/Ai/Tools/ReportingAiTools.cs`), each wrapping one existing
reporting/application service and returning a compact, minimized projection:
`executive.dashboard`, `finance.receivables_aging`, `finance.payables_aging`, `finance.cash_position`,
`finance.profit_and_loss`, `sales.summary`, `sales.collections`, `crm.lead_funnel`,
`projects.performance`, `construction.progress`, `procurement.exposure`, `rental.performance`,
`facility.maintenance_backlog`, `tenant.usage`.

**1 WRITE tool** ships this milestone (`Tools/WriteAiTools.cs`): `crm.create_follow_up` — a
deliberately low-risk mutation (a CRM follow-up activity: no money, no external communication, no
destructive effect), chosen to prove the full propose→approve→execute pipeline end to end. Destructive
or high-blast-radius actions (delete, cancel, refund, close-period, change-subscription,
change-tenant-status) are **not** exposed as tools at all this milestone — per spec, they must never be
directly executable through a generic AI command; future write tools (send reminder, prepare invoice,
create maintenance request) are a later-milestone addition, not a gap in this one's security model.

A WRITE tool is **never** executed directly from a conversation turn. `AiConversationService` always
routes a WRITE tool call into `IAiActionProposalService.CreateAsync` instead of calling
`ExecuteAsync` itself.

## Action proposal & approval (`Domain/Ai/AiActionProposal.cs`)

`AiActionProposal` — ActionType, TargetEntityType/Id, ParametersJson (frozen at proposal time),
Explanation, ExpectedEffect, RiskLevel, Status, ApprovalRequestId, ResultJson/ErrorMessage,
ExpiresAt/ExecutedAt — with a 7-status lifecycle (`AiActionProposalStatusRules.CanTransition`):
`PendingApproval → {Approved, Rejected, Expired, Cancelled}`, `Approved → {Executed, Failed}`.

**This reuses the existing generic Milestone 11 approval architecture rather than a second approval
engine.** `AiActionProposalService.CreateAsync` calls the existing
`IApprovalService.CreateRequestAsync(EntityType: "AiActionProposal", EntityId: proposal.Id,
RequiredPermission: <the tool's own RequiredPermission>)`. A human decides it through the **same**
`POST /api/v1/approvals/{id}/decide` endpoint every other approvable module action uses — there is no
separate "approve an AI action" API. `AiActionProposalApprovalHandler` (an `IApprovalLinkedEntityHandler`,
the exact extension point Expense/PurchaseOrder/Booking already use) is what `ApprovalService.DecideAsync`
calls after an approval decision commits: on approve, it calls `ExecuteInternalAsync`; on reject, it
calls `MarkRejectedAsync`.

`ExecuteInternalAsync`:
- Is **idempotent** — a proposal already `Executed` or `Failed` returns its stored result unchanged
  rather than re-running the tool, so a retried/duplicated approval decision can never double-mutate.
- Re-checks the *executing* user's (the approver's) permissions against the tool's `RequiredPermission`
  independently — never assumes "an ApprovalRequest was approved" implies authorization for the
  underlying tool.
- Rejects execution of an expired proposal (`ExpiresAt < now`), transitioning it to `Expired` instead.
- Never executes on malformed stored parameters — a `JsonException` while deserializing
  `ParametersJson` fails the proposal (`Failed`) rather than throwing.

## Audit (`IAuditLogger`, existing generic `AuditLog` table)

Every propose/execute/reject and every "Ask Your Business" turn writes to the **existing** generic
audit log (`Module: "Ai"`) — a fifth `AiAuditEvent` table was deliberately not created, since the
existing audit infrastructure cleanly represents this need. The question text logged for an "Ask" is
truncated to 200 characters (it may reference customer/tenant names); the full facts/answer payload and
any provider secrets are never logged.

## Rate limiting (`IAiRateLimiter` / `AiUsageRecord`)

`AiRateLimiter` counts `AiUsageRecord` rows in the last rolling minute per tenant (a real COUNT query
against the database, not in-memory state — correct across multiple API instances) against
`AiSettings.RequestsPerMinutePerTenant` (default 20). Every completed or failed "Ask" turn writes one
`AiUsageRecord` (tenant, user, conversation, provider, model, token counts, succeeded, error code),
which is also the tenant's AI cost/usage audit trail.

## Data privacy

The system prompt built in `AiConversationService.BuildSystemPromptAsync` sends only: static business
rules text, the tenant's name and reporting currency, and the list of tool *names* the caller is
authorized to use. No passwords, tokens, payment credentials, or database dumps are ever sent to the
provider — data only reaches the model as a tool's own minimized, already-authorized return value, on
demand, never as a bulk context dump.

## Failure handling

- Provider not configured → `ai_provider_not_configured` (frontend shows a clear unavailable state;
  Business Health/Attention Items still work, since they don't depend on the AI provider at all).
- Provider timeout/rate-limited/5xx/other → `ai_provider_timeout` / `ai_rate_limited` /
  `ai_provider_unavailable` / `ai_provider_error` (see `AnthropicAiProvider`'s exception mapping).
- Tenant-level AI rate limit exceeded → `ai_rate_limited` (429).
- Unknown/unauthorized tool call, or malformed tool output → the tool call fails with an explanit tool
  result, the conversation continues, and the turn never crashes; **nothing is ever executed** off the
  back of malformed model output — see `MalformedToolCall_...` test.
- A conversation/proposal from another tenant or another user in the same tenant → `404 not_found`,
  deliberately indistinguishable from "doesn't exist."

## What this milestone does NOT implement

Per spec, deliberately out of scope:
- A full autonomous agent that executes multi-step plans without approval.
- Unrestricted AI database access of any kind ("SELECT * FROM ..." is not, and will never be, possible).
- Live destructive autonomous actions (delete/cancel/refund/etc. are not exposed as AI tools at all).
- A financial "what-if" simulator (no architectural seam was even added this milestone beyond the
  existing reporting services being reusable).
- Unrestricted AI memory about users beyond ordinary conversation history.
- Document intelligence / OCR.
- A mobile AI UI (the API is mobile-ready, per the same REST/JSON shape every other module uses).
- Live external provider verification in this environment: **this sandbox has no `ANTHROPIC_API_KEY`
  configured**, so no external model call has been, or is claimed to have been, made. All AI-loop
  behavior (tool calling, hallucination defense, write-action pipeline, security boundaries) is
  verified with a deterministic `FakeAiProvider` test double
  (`tests/IntegrationTests/Ai/FakeAiProvider.cs`) wired into the integration test host in place of
  `UnconfiguredAiProvider`/`AnthropicAiProvider`. `AnthropicAiProvider`'s wiring to the real Anthropic
  Messages API is implemented and compiles against the real SDK, but has not been exercised against a
  live endpoint.

## Frontend

`/command-center` (gated by the `ai.view` nav permission) renders the five Command Center sections —
Business Health, What Needs Attention, Ask Your Business, Recommended Actions, Recent AI Insights — as
a native page of this ERP (existing shell, Tailwind, shadcn/ui, TanStack Query), not a generic chat
clone. Approving/rejecting a proposed action reuses the existing Approval Inbox's decide call. See the
module at `frontend/src/modules/commandCenter/`.

## Next milestone

Milestone 17 remains **Premium UI/UX + Complete Application Polish** — this milestone's frontend work
is intentionally a working, correct implementation of the Command Center's functionality, not a visual
redesign pass.
