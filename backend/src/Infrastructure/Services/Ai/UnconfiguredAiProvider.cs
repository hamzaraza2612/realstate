using RealEstateErp.Application.Ai;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Ai;

/// <summary>The safe default when no AI provider is configured — always fails cleanly rather than
/// throwing, mirroring Milestone 14's UnconfiguredBillingPaymentProvider and Milestone 15's
/// UnconfiguredEInvoiceProvider exactly. The rest of the application (Command Center, "Ask Your
/// Business") checks IsConfigured to show a clear unavailable state rather than attempting a call
/// that would just fail — see docs/AI_ARCHITECTURE.md.</summary>
public class UnconfiguredAiProvider : IAiProvider
{
    public string ProviderName => "unconfigured";
    public bool IsConfigured => false;

    public Task<Result<AiCompletionResult>> CompleteAsync(AiCompletionRequest request, CancellationToken ct = default) =>
        Task.FromResult(Result.Failure<AiCompletionResult>(
            "No AI provider is configured for this deployment.", "ai_provider_not_configured"));
}
