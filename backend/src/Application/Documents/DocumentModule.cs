using RealEstateErp.Domain.Documents;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Documents;

public record DocumentDto(
    Guid Id,
    string EntityType,
    Guid EntityId,
    DocumentCategory Category,
    string Title,
    string? Description,
    int LatestVersionNumber,
    Guid CreatedByUserId,
    string? CreatedByUserName,
    DateTimeOffset CreatedAt);

public record DocumentVersionDto(
    Guid Id,
    Guid DocumentId,
    int VersionNumber,
    string OriginalFileName,
    string ContentType,
    long SizeBytes,
    Guid UploadedByUserId,
    string? UploadedByUserName,
    DateTimeOffset CreatedAt);

public record DocumentDetailDto(DocumentDto Document, IReadOnlyList<DocumentVersionDto> Versions);

public record DocumentFilter(string? EntityType, Guid? EntityId, DocumentCategory? Category, string? Search);

/// <summary>Scalar fields for a document upload; the file itself is bound separately as an IFormFile
/// by the controller (multipart/form-data can't be a plain JSON record).</summary>
public record UploadDocumentRequest(string EntityType, Guid EntityId, DocumentCategory Category, string Title, string? Description);

public record DownloadedFile(Stream Content, string FileName, string ContentType);

public interface IDocumentService
{
    Task<PagedResult<DocumentDto>> ListAsync(PagedRequest request, DocumentFilter filter, CancellationToken ct = default);
    Task<Result<DocumentDetailDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<DocumentDto>> UploadAsync(UploadDocumentRequest request, Stream fileContent, string fileName, string contentType, long sizeBytes, CancellationToken ct = default);
    Task<Result<DocumentVersionDto>> AddVersionAsync(Guid documentId, Stream fileContent, string fileName, string contentType, long sizeBytes, CancellationToken ct = default);
    Task<Result<DownloadedFile>> DownloadAsync(Guid documentId, int? version, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
}
