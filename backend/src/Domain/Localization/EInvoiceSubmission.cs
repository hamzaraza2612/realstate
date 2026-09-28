using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Localization;

public enum EInvoiceDocumentType
{
    Invoice = 0,
    CreditNote = 1,
    DebitNote = 2
}

public enum EInvoiceSubmissionStatus
{
    Pending = 0,
    Submitted = 1,
    Accepted = 2,
    Rejected = 3,
    Failed = 4,
    Retrying = 5
}

/// <summary>
/// A record of one attempt to submit a Billing Invoice as a structured electronic invoice to a
/// country's accredited provider (a UAE ASP, Saudi ZATCA/FATOORA, or a future equivalent) — the
/// audit trail/status tracking half of the IEInvoiceProvider seam (see that interface for the
/// submission call itself). This milestone creates no real submissions: nothing calls
/// IEInvoiceProvider except tests, and the only registered implementation
/// (UnconfiguredEInvoiceProvider) always fails cleanly. Deliberately separate from the ordinary PDF
/// invoice generation path (InvoiceService) — a PDF rendering of an invoice and a structured
/// eInvoice submission to a government-accredited provider are not the same concept, and must not be
/// conflated. See docs/TAX_ENGINE.md.
/// </summary>
public class EInvoiceSubmission : TenantEntity
{
    public Guid InvoiceId { get; set; }
    public EInvoiceDocumentType DocumentType { get; set; } = EInvoiceDocumentType.Invoice;
    public EInvoiceSubmissionStatus Status { get; set; } = EInvoiceSubmissionStatus.Pending;

    /// <summary>e.g. "uae_asp", "saudi_zatca" — which provider adapter this submission targets.
    /// "unconfigured" for every submission this milestone can actually produce.</summary>
    public string Provider { get; set; } = "unconfigured";

    public string? ExternalReference { get; set; }
    public string? ProviderResponseJson { get; set; }
    public string? ErrorDetails { get; set; }
    public int RetryCount { get; set; }

    public DateTimeOffset? SubmittedAt { get; set; }
    public DateTimeOffset? LastAttemptAt { get; set; }
}
