using FluentValidation;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Portal;

public record PortalAccountDto(
    Guid Id, string Email, string ActorType, Guid ActorId, string DisplayName,
    bool IsActive, DateTimeOffset? LastLoginAt, DateTimeOffset CreatedAt);

public record InvitePortalAccountRequest(string ActorType, Guid ActorId, string? Email);

public record PortalAccountFilter(string? ActorType, Guid? ActorId);

/// <summary>
/// Internal-staff-facing management of portal logins — who gets one, and whether it's currently
/// active. Gated by the tenant-wide Portal.ManageAccounts permission (same "one permission spans a
/// cross-cutting foundation" precedent as Documents.View/Approvals.View/Reports.View), not by each
/// actor type's own manage permission, so inviting a Vendor and inviting a Customer go through one
/// consistent surface.
/// </summary>
public interface IPortalAccountService
{
    Task<PagedResult<PortalAccountDto>> ListAsync(PagedRequest request, PortalAccountFilter filter, CancellationToken ct = default);

    /// <summary>Creates the PortalUser row (no usable password yet) and a password-reset token in the
    /// same call, then emails the reset link via IEmailSender directly (portal users have no AppUser
    /// row for ICommunicationService's AppUser-email lookup to resolve — see docs/PORTAL_ARCHITECTURE.md).
    /// Fails if the actor already has a portal account, or the actor id doesn't resolve to a real,
    /// same-tenant row of the given type.</summary>
    Task<Result<PortalAccountDto>> InviteAsync(InvitePortalAccountRequest request, CancellationToken ct = default);

    Task<Result<PortalAccountDto>> DeactivateAsync(Guid id, CancellationToken ct = default);
    Task<Result<PortalAccountDto>> ReactivateAsync(Guid id, CancellationToken ct = default);
}

public class InvitePortalAccountRequestValidator : AbstractValidator<InvitePortalAccountRequest>
{
    public InvitePortalAccountRequestValidator()
    {
        RuleFor(x => x.ActorType).NotEmpty().Must(t => Domain.Portal.PortalActorTypes.All.Contains(t))
            .WithMessage("Unknown or unsupported actor type.");
        RuleFor(x => x.ActorId).NotEmpty();
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email));
    }
}
