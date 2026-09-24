namespace RealEstateErp.Application.Documents;

public record StoredFile(string StorageKey, long SizeBytes, string Sha256Hash);

/// <summary>
/// Provider-agnostic file storage seam. A storage key is an opaque string the provider assigns and
/// alone understands how to resolve — never a filesystem path the caller constructs, and never derived
/// from a user-supplied filename (that's the original path-traversal vector this design avoids
/// entirely, not just sanitizes). LocalFileStorageService is the only implementation for this
/// deployment; a future S3/Azure Blob provider implements the same three methods and callers never
/// change, since nothing here assumes a local disk.
/// </summary>
public interface IFileStorageService
{
    Task<StoredFile> SaveAsync(Stream content, Guid tenantId, CancellationToken ct = default);
    Task<Stream> OpenReadAsync(string storageKey, CancellationToken ct = default);
    Task DeleteAsync(string storageKey, CancellationToken ct = default);
}
