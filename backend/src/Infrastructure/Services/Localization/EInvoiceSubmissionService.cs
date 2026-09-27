using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Localization;
using RealEstateErp.Domain.Localization;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Localization;

public class EInvoiceSubmissionService : IEInvoiceSubmissionService
{
    private readonly AppDbContext _db;
    private readonly IEInvoiceProvider _provider;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;

    public EInvoiceSubmissionService(AppDbContext db, IEInvoiceProvider provider, ITenantContext tenantContext, IAuditLogger auditLogger)
    {
        _db = db;
        _provider = provider;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
    }

    public async Task<IReadOnlyList<EInvoiceSubmissionDto>> ListForInvoiceAsync(Guid invoiceId, CancellationToken ct = default)
    {
        var submissions = await _db.EInvoiceSubmissions.Where(s => s.InvoiceId == invoiceId).OrderByDescending(s => s.CreatedAt).ToListAsync(ct);
        return submissions.Select(ToDto).ToList();
    }

    public async Task<Result<EInvoiceSubmissionDto>> SubmitAsync(EInvoiceSubmissionRequest request, CancellationToken ct = default)
    {
        var invoice = await _db.Invoices.IgnoreQueryFilters().FirstOrDefaultAsync(i => i.Id == request.InvoiceId, ct);
        if (invoice is null) return Result.Failure<EInvoiceSubmissionDto>("Invoice not found.", "not_found");

        var submission = new Domain.Localization.EInvoiceSubmission
        {
            TenantId = invoice.TenantId,
            InvoiceId = invoice.Id,
            DocumentType = request.DocumentType,
            Provider = _provider.ProviderName,
            Status = EInvoiceSubmissionStatus.Pending,
            LastAttemptAt = DateTimeOffset.UtcNow
        };
        _db.EInvoiceSubmissions.Add(submission);
        await _db.SaveChangesAsync(ct);

        var result = await _provider.SubmitAsync(request, ct);
        submission.Status = result.Succeeded ? EInvoiceSubmissionStatus.Submitted : EInvoiceSubmissionStatus.Failed;
        submission.ExternalReference = result.Value?.ExternalReference;
        submission.ProviderResponseJson = result.Value?.ProviderResponseJson;
        submission.ErrorDetails = result.Succeeded ? null : result.Error;
        submission.SubmittedAt = result.Succeeded ? DateTimeOffset.UtcNow : null;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Submit", "Localization", "EInvoiceSubmission", submission.Id.ToString(),
            after: new { submission.Status, submission.Provider }, tenantIdOverride: invoice.TenantId, ct: ct);

        return Result.Success(ToDto(submission));
    }

    private static EInvoiceSubmissionDto ToDto(Domain.Localization.EInvoiceSubmission s) => new(
        s.Id, s.InvoiceId, s.DocumentType, s.Status, s.Provider, s.ExternalReference, s.ErrorDetails,
        s.RetryCount, s.SubmittedAt, s.LastAttemptAt);
}
