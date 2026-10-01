using FluentValidation;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Notifications;

public record RegisterDeviceTokenRequest(string Platform, string PushToken);

/// <summary>
/// The device-registration half of the Milestone 18 push-notification seam — stores "notify this
/// device" tokens only, never sends a push. Reused identically by the internal
/// (NotificationsController) and portal (PortalDeviceRegistrationController) endpoints; the caller
/// passes which owner kind it is, the service itself does not know or care about tenant context
/// internals beyond the ambient tenant filter every other service already relies on.
/// </summary>
public interface IDeviceRegistrationService
{
    Task<Result> RegisterAsync(Guid ownerId, bool isPortalOwner, RegisterDeviceTokenRequest request, CancellationToken ct = default);
}

public class RegisterDeviceTokenRequestValidator : AbstractValidator<RegisterDeviceTokenRequest>
{
    private static readonly string[] AllowedPlatforms = { "ios", "android", "web" };

    public RegisterDeviceTokenRequestValidator()
    {
        RuleFor(x => x.Platform).NotEmpty().Must(p => AllowedPlatforms.Contains(p.ToLowerInvariant()))
            .WithMessage("Platform must be one of: ios, android, web.");
        RuleFor(x => x.PushToken).NotEmpty().MaximumLength(500);
    }
}
