using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Documents;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Domain.Documents;
using RealEstateErp.Domain.Notifications;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Documents;

public class DocumentService : IDocumentService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;
    private readonly IFileStorageService _storage;
    private readonly INotificationService _notificationService;
    private readonly long _maxFileSizeBytes;
    private readonly HashSet<string> _allowedContentTypes;

    public DocumentService(AppDbContext db, ITenantContext tenantContext, IAuditLogger auditLogger,
        IFileStorageService storage, INotificationService notificationService, IConfiguration configuration)
    {
        _db = db;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
        _storage = storage;
        _notificationService = notificationService;
        _maxFileSizeBytes = configuration.GetValue("Storage:MaxFileSizeMb", 25) * 1024L * 1024L;
        _allowedContentTypes = configuration.GetSection("Storage:AllowedContentTypes").Get<string[]>()?.ToHashSet()
            ?? new HashSet<string> { "application/pdf" };
    }

    public async Task<PagedResult<DocumentDto>> ListAsync(PagedRequest request, DocumentFilter filter, CancellationToken ct = default)
    {
        var query = _db.Documents.AsQueryable();
        if (!string.IsNullOrWhiteSpace(filter.EntityType)) query = query.Where(d => d.EntityType == filter.EntityType);
        if (filter.EntityId.HasValue) query = query.Where(d => d.EntityId == filter.EntityId);
        if (filter.Category.HasValue) query = query.Where(d => d.Category == filter.Category);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(d => d.Title.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var documents = await query.OrderByDescending(d => d.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<DocumentDto>(await ToDtosAsync(documents, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<DocumentDetailDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var document = await _db.Documents.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (document is null) return Result.Failure<DocumentDetailDto>("Document not found.", "not_found");

        var versions = await _db.DocumentVersions.Where(v => v.DocumentId == id).OrderByDescending(v => v.VersionNumber).ToListAsync(ct);
        var versionDtos = await ToVersionDtosAsync(versions, ct);
        var documentDto = (await ToDtosAsync(new[] { document }, ct))[0];

        return Result.Success(new DocumentDetailDto(documentDto, versionDtos));
    }

    public async Task<Result<DocumentDto>> UploadAsync(
        UploadDocumentRequest request, Stream fileContent, string fileName, string contentType, long sizeBytes, CancellationToken ct = default)
    {
        // FluentValidation's action filter only runs against the controller's bound parameter
        // (the multipart form model), not this manually-constructed request, so entity-type
        // allow-list membership is re-checked here as the real enforcement point.
        if (!DocumentEntityTypes.All.Contains(request.EntityType))
        {
            return Result.Failure<DocumentDto>("Unknown entity type.", "unknown_entity_type");
        }
        if (request.EntityId == Guid.Empty || string.IsNullOrWhiteSpace(request.Title))
        {
            return Result.Failure<DocumentDto>("Entity id and title are required.", "validation_failed");
        }

        var validation = await ValidateFileAsync(fileContent, contentType, sizeBytes, ct);
        if (validation is not null) return Result.Failure<DocumentDto>(validation.Value.Message, validation.Value.Code);

        var stored = await _storage.SaveAsync(fileContent, _tenantContext.TenantId ?? Guid.Empty, ct);

        var document = new Document
        {
            EntityType = request.EntityType,
            EntityId = request.EntityId,
            Category = request.Category,
            Title = request.Title,
            Description = request.Description,
            LatestVersionNumber = 1,
            CreatedByUserId = _tenantContext.UserId ?? Guid.Empty
        };
        _db.Documents.Add(document);

        var version = new DocumentVersion
        {
            DocumentId = document.Id,
            VersionNumber = 1,
            StorageKey = stored.StorageKey,
            OriginalFileName = SanitizeDisplayFileName(fileName),
            ContentType = contentType,
            SizeBytes = stored.SizeBytes,
            Sha256Hash = stored.Sha256Hash,
            UploadedByUserId = _tenantContext.UserId ?? Guid.Empty
        };
        _db.DocumentVersions.Add(version);

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Upload", "Documents", "Document", document.Id.ToString(),
            after: new { document.EntityType, document.EntityId, document.Title, version.OriginalFileName, version.SizeBytes }, ct: ct);

        await NotifyLinkedPortalUserAsync(document.EntityType, document.EntityId, document.Title, ct);

        return Result.Success((await ToDtosAsync(new[] { document }, ct))[0]);
    }

    /// <summary>The one Milestone 13 notification trigger wired into an existing service: if the
    /// entity a document was just attached to has a portal login (Customer/RentalTenant/Vendor/
    /// PropertyOwner/CoworkingMember — the same five DocumentEntityTypes values a PortalUser's
    /// ActorType can be), it gets an in-app notification. Every DocumentEntityTypes value not in that
    /// set (Booking, Lease, Project, ...) simply finds no matching PortalUser and no-ops — this works
    /// uniformly across every portal actor type without a switch statement.</summary>
    private async Task NotifyLinkedPortalUserAsync(string entityType, Guid entityId, string documentTitle, CancellationToken ct)
    {
        var portalUser = await _db.PortalUsers
            .FirstOrDefaultAsync(u => u.IsActive && u.ActorType == entityType && u.ActorId == entityId, ct);
        if (portalUser is null) return;

        var (title, body) = NotificationTemplates.DocumentUploaded(entityType, documentTitle);
        await _notificationService.CreateAsync(portalUser.Id, NotificationCategory.DocumentUploaded, title, body, entityType, entityId, ct);
    }

    public async Task<Result<DocumentVersionDto>> AddVersionAsync(
        Guid documentId, Stream fileContent, string fileName, string contentType, long sizeBytes, CancellationToken ct = default)
    {
        var document = await _db.Documents.FirstOrDefaultAsync(d => d.Id == documentId, ct);
        if (document is null) return Result.Failure<DocumentVersionDto>("Document not found.", "not_found");

        var validation = await ValidateFileAsync(fileContent, contentType, sizeBytes, ct);
        if (validation is not null) return Result.Failure<DocumentVersionDto>(validation.Value.Message, validation.Value.Code);

        var stored = await _storage.SaveAsync(fileContent, _tenantContext.TenantId ?? Guid.Empty, ct);

        document.LatestVersionNumber += 1;
        var version = new DocumentVersion
        {
            DocumentId = document.Id,
            VersionNumber = document.LatestVersionNumber,
            StorageKey = stored.StorageKey,
            OriginalFileName = SanitizeDisplayFileName(fileName),
            ContentType = contentType,
            SizeBytes = stored.SizeBytes,
            Sha256Hash = stored.Sha256Hash,
            UploadedByUserId = _tenantContext.UserId ?? Guid.Empty
        };
        _db.DocumentVersions.Add(version);

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("AddVersion", "Documents", "Document", document.Id.ToString(),
            after: new { version.VersionNumber, version.OriginalFileName, version.SizeBytes }, ct: ct);

        return Result.Success((await ToVersionDtosAsync(new[] { version }, ct))[0]);
    }

    public async Task<Result<DownloadedFile>> DownloadAsync(Guid documentId, int? version, CancellationToken ct = default)
    {
        var document = await _db.Documents.FirstOrDefaultAsync(d => d.Id == documentId, ct);
        if (document is null) return Result.Failure<DownloadedFile>("Document not found.", "not_found");

        var targetVersion = version ?? document.LatestVersionNumber;
        var documentVersion = await _db.DocumentVersions
            .FirstOrDefaultAsync(v => v.DocumentId == documentId && v.VersionNumber == targetVersion, ct);
        if (documentVersion is null) return Result.Failure<DownloadedFile>("Document version not found.", "not_found");

        Stream content;
        try
        {
            content = await _storage.OpenReadAsync(documentVersion.StorageKey, ct);
        }
        catch (FileNotFoundException)
        {
            return Result.Failure<DownloadedFile>("The stored file is missing.", "file_missing");
        }

        await _auditLogger.LogAsync("Download", "Documents", "Document", document.Id.ToString(),
            after: new { documentVersion.VersionNumber }, ct: ct);

        return Result.Success(new DownloadedFile(content, documentVersion.OriginalFileName, documentVersion.ContentType));
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var document = await _db.Documents.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (document is null) return Result.Failure("Document not found.", "not_found");

        var versions = await _db.DocumentVersions.Where(v => v.DocumentId == id).ToListAsync(ct);
        foreach (var version in versions)
        {
            await _storage.DeleteAsync(version.StorageKey, ct);
        }

        _db.DocumentVersions.RemoveRange(versions);
        _db.Documents.Remove(document);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Delete", "Documents", "Document", id.ToString(),
            before: new { document.EntityType, document.EntityId, document.Title }, ct: ct);

        return Result.Success();
    }

    private async Task<(string Message, string Code)?> ValidateFileAsync(Stream fileContent, string contentType, long sizeBytes, CancellationToken ct)
    {
        if (sizeBytes <= 0) return ("The uploaded file is empty.", "empty_file");
        if (sizeBytes > _maxFileSizeBytes) return ($"The file exceeds the maximum allowed size of {_maxFileSizeBytes / (1024 * 1024)} MB.", "file_too_large");
        if (!_allowedContentTypes.Contains(contentType)) return ($"File type '{contentType}' is not allowed.", "unsupported_file_type");

        var header = new byte[8];
        var originalPosition = fileContent.CanSeek ? fileContent.Position : 0;
        var read = await fileContent.ReadAsync(header, 0, header.Length, ct);
        if (fileContent.CanSeek) fileContent.Position = originalPosition;

        if (!FileSignatureValidator.MatchesDeclaredType(header[..read], contentType))
        {
            return ("The file's content does not match its declared type.", "content_type_mismatch");
        }

        return null;
    }

    /// <summary>Strips any path segments from a client-supplied filename before storing it as display
    /// metadata — it is never used to build a filesystem path, but a browser will offer it back to the
    /// user verbatim on download, so it must not carry directory components either.</summary>
    private static string SanitizeDisplayFileName(string fileName)
    {
        var name = Path.GetFileName(fileName.Replace('\\', '/'));
        return string.IsNullOrWhiteSpace(name) ? "file" : name;
    }

    private async Task<List<DocumentDto>> ToDtosAsync(IReadOnlyCollection<Document> documents, CancellationToken ct)
    {
        var userIds = documents.Select(d => d.CreatedByUserId).Distinct().ToList();
        var userNames = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);

        return documents.Select(d => new DocumentDto(
            d.Id, d.EntityType, d.EntityId, d.Category, d.Title, d.Description, d.LatestVersionNumber,
            d.CreatedByUserId, userNames.GetValueOrDefault(d.CreatedByUserId), d.CreatedAt)).ToList();
    }

    private async Task<List<DocumentVersionDto>> ToVersionDtosAsync(IReadOnlyCollection<DocumentVersion> versions, CancellationToken ct)
    {
        var userIds = versions.Select(v => v.UploadedByUserId).Distinct().ToList();
        var userNames = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);

        return versions.Select(v => new DocumentVersionDto(
            v.Id, v.DocumentId, v.VersionNumber, v.OriginalFileName, v.ContentType, v.SizeBytes,
            v.UploadedByUserId, userNames.GetValueOrDefault(v.UploadedByUserId), v.CreatedAt)).ToList();
    }
}
