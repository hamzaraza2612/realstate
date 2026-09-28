using System.Text.Json;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Ai;

public enum AiToolAccess
{
    Read = 0,
    Write = 1
}

/// <summary>Everything a tool call needs to enforce authorization and tenant scoping — deliberately
/// carries the caller's already-resolved permission set (not just a user id) so a tool never has to
/// re-query roles/permissions itself; IAiToolRegistry.GetAvailableTools already filtered on this same
/// set before the model ever saw the tool existed, and ExecuteAsync re-checks it independently (never
/// trusting that "the model was only offered authorized tools" holds across a multi-turn
/// conversation) — see docs/AI_ARCHITECTURE.md's tool-authorization section.</summary>
public record AiToolContext(Guid TenantId, Guid UserId, IReadOnlySet<string> UserPermissions);

/// <summary>
/// The controlled boundary between the AI and the ERP — the ONLY way a tool call can touch business
/// data or state. A tool is never a raw database query: every implementation calls into an existing,
/// already-tenant-filtered, already-permission-checked application/reporting service (see
/// docs/AI_ARCHITECTURE.md "AI + Reporting Reuse") and returns a compact, minimized projection, never
/// a full entity graph. ExecuteAsync must itself re-verify RequiredPermission against the given
/// context before doing anything — registry-level filtering is a UX/token-efficiency optimization
/// (don't even offer the model a tool the user can't use), not the security boundary.
/// </summary>
public interface IAiTool
{
    /// <summary>Dot-namespaced, stable identifier, e.g. "finance.receivables_aging" — this is what
    /// both the model's tool_use.name and AiActionProposal.ActionType reference.</summary>
    string Name { get; }
    string Description { get; }
    AiToolAccess Access { get; }

    /// <summary>Null means any authenticated tenant user may invoke it (still tenant-scoped, just no
    /// additional permission gate) — used sparingly, only for tools with no sensitive module behind
    /// them (e.g. a tenant's own usage summary).</summary>
    string? RequiredPermission { get; }

    /// <summary>JSON Schema (as a JsonElement) describing the tool's input — sent to the provider
    /// verbatim as the tool's input_schema.</summary>
    JsonElement InputSchema { get; }

    Task<Result<object>> ExecuteAsync(AiToolContext context, JsonElement arguments, CancellationToken ct = default);
}

public interface IAiToolRegistry
{
    /// <summary>Every tool a caller with this permission set is allowed to see/invoke — the
    /// registry's whole reason to exist: the model is never even told a prohibited tool exists,
    /// let alone able to call it. Includes tools with RequiredPermission == null unconditionally.</summary>
    IReadOnlyList<IAiTool> GetAvailableTools(IReadOnlySet<string> userPermissions);

    /// <summary>Looks up a tool by name regardless of authorization — callers (AiConversationService,
    /// the AiActionProposal executor) must independently confirm the caller/approver is authorized
    /// before invoking ExecuteAsync; Find() itself performs no authorization check.</summary>
    IAiTool? Find(string name);

    IReadOnlyList<IAiTool> All { get; }
}
