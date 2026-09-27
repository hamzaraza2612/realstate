using RealEstateErp.Domain.Localization;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Localization;

public record EInvoiceSubmissionDto(
    Guid Id, Guid InvoiceId, EInvoiceDocumentType DocumentType, EInvoiceSubmissionStatus Status,
    string Provider, string? ExternalReference, string? ErrorDetails, int RetryCount,
    DateTimeOffset? SubmittedAt, DateTimeOffset? LastAttemptAt);

public record EInvoiceSubmissionRequest(Guid InvoiceId, EInvoiceDocumentType DocumentType);

public record EInvoiceProviderResult(bool Succeeded, string? ExternalReference, string? ProviderResponseJson, string? ErrorDetails);

/// <summary>
/// The UAE/Saudi structured e-invoicing extension seam. One generic interface (not one per country)
/// so a future UAE Accredited Service Provider adapter and a future Saudi ZATCA/FATOORA adapter are
/// both just implementations of this — the ERP core never branches on country to decide how to submit.
/// This milestone registers only UnconfiguredEInvoiceProvider (see that class), which every method
/// here fails cleanly from; nothing calls a real government/ASP API. Deliberately separate from
/// ordinary PDF invoice generation (IInvoiceService) — see docs/TAX_ENGINE.md.
/// </summary>
public interface IEInvoiceProvider
{
    string ProviderName { get; }
    Task<Result<EInvoiceProviderResult>> SubmitAsync(EInvoiceSubmissionRequest request, CancellationToken ct = default);
    Task<Result<EInvoiceProviderResult>> ValidateAsync(EInvoiceSubmissionRequest request, CancellationToken ct = default);
}

/// <summary>Orchestrates IEInvoiceProvider calls and persists the EInvoiceSubmission audit trail —
/// the seam a tenant-facing "Submit to tax authority" action (not built this milestone) would call.</summary>
public interface IEInvoiceSubmissionService
{
    Task<IReadOnlyList<EInvoiceSubmissionDto>> ListForInvoiceAsync(Guid invoiceId, CancellationToken ct = default);
    Task<Result<EInvoiceSubmissionDto>> SubmitAsync(EInvoiceSubmissionRequest request, CancellationToken ct = default);
}
