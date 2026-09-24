using System.Security.Cryptography;
using Microsoft.Extensions.Configuration;
using RealEstateErp.Application.Documents;

namespace RealEstateErp.Infrastructure.Services.Documents;

/// <summary>
/// Stores files on local disk under Storage:LocalPath. The storage key is
/// "{tenantId:N}/{Guid.NewGuid():N}" — never the caller's filename, never an extension derived from
/// caller input — so there is nothing in the key an attacker could use for path traversal (no "..",
/// no separators, no extension to smuggle behavior through). The original filename/content-type are
/// metadata in the Document/DocumentVersion rows, applied only at download time via response headers,
/// never used to build a path.
/// </summary>
public class LocalFileStorageService : IFileStorageService
{
    private readonly string _rootPath;

    public LocalFileStorageService(IConfiguration configuration)
    {
        _rootPath = Path.GetFullPath(configuration["Storage:LocalPath"] ?? "./data/uploads");
        Directory.CreateDirectory(_rootPath);
    }

    public async Task<StoredFile> SaveAsync(Stream content, Guid tenantId, CancellationToken ct = default)
    {
        var relativeKey = $"{tenantId:N}/{Guid.NewGuid():N}";
        var fullPath = ResolvePath(relativeKey);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        using var sha256 = SHA256.Create();
        long size = 0;
        await using (var fileStream = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write))
        await using (var hashingStream = new CryptoStream(fileStream, sha256, CryptoStreamMode.Write, leaveOpen: true))
        {
            await content.CopyToAsync(hashingStream, ct);
            size = fileStream.Length;
        }

        var hash = Convert.ToHexString(sha256.Hash!).ToLowerInvariant();
        return new StoredFile(relativeKey, size, hash);
    }

    public Task<Stream> OpenReadAsync(string storageKey, CancellationToken ct = default)
    {
        var fullPath = ResolvePath(storageKey);
        if (!File.Exists(fullPath)) throw new FileNotFoundException("Stored file not found.", fullPath);
        Stream stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult(stream);
    }

    public Task DeleteAsync(string storageKey, CancellationToken ct = default)
    {
        var fullPath = ResolvePath(storageKey);
        if (File.Exists(fullPath)) File.Delete(fullPath);
        return Task.CompletedTask;
    }

    /// <summary>Resolves a storage key to an absolute path and verifies the result is still inside the
    /// storage root — defense in depth in case a future storage key ever stops being a
    /// service-generated GUID pair (e.g. a bug, or a future migration importing external keys).</summary>
    private string ResolvePath(string storageKey)
    {
        var fullPath = Path.GetFullPath(Path.Combine(_rootPath, storageKey));
        if (!fullPath.StartsWith(_rootPath + Path.DirectorySeparatorChar, StringComparison.Ordinal))
        {
            throw new UnauthorizedAccessException("Resolved storage path escapes the storage root.");
        }
        return fullPath;
    }
}
