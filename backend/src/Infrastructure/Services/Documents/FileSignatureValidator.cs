namespace RealEstateErp.Infrastructure.Services.Documents;

/// <summary>
/// A declared Content-Type header is caller-supplied and untrustworthy on its own (a client can label
/// anything "application/pdf"). This checks the file's actual leading bytes against the signature
/// expected for the declared type, for every type in the configured allow-list that has a reliable
/// magic number — a lightweight, dependency-free mitigation, not a full file-type-detection library.
/// Plain-text types (text/plain, text/csv) have no reliable signature and are allowed through as long
/// as the declared type itself is in the configured allow-list (checked separately by the caller).
/// </summary>
public static class FileSignatureValidator
{
    private static readonly Dictionary<string, byte[][]> Signatures = new()
    {
        ["application/pdf"] = new[] { "%PDF"u8.ToArray() },
        ["image/png"] = new[] { new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A } },
        ["image/jpeg"] = new[] { new byte[] { 0xFF, 0xD8, 0xFF } },
        ["image/webp"] = new[] { "RIFF"u8.ToArray() },
        // Office Open XML formats (.docx/.xlsx/.pptx) and plain .zip are all ZIP containers (PK\x03\x04).
        ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"] = new[] { new byte[] { 0x50, 0x4B, 0x03, 0x04 } },
        ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] = new[] { new byte[] { 0x50, 0x4B, 0x03, 0x04 } },
        ["application/vnd.openxmlformats-officedocument.presentationml.presentation"] = new[] { new byte[] { 0x50, 0x4B, 0x03, 0x04 } },
        ["application/zip"] = new[] { new byte[] { 0x50, 0x4B, 0x03, 0x04 } },
    };

    public static bool MatchesDeclaredType(byte[] header, string declaredContentType)
    {
        if (!Signatures.TryGetValue(declaredContentType, out var candidates)) return true; // no known signature (e.g. text/plain) — allow-list membership is the only check
        return candidates.Any(sig => header.Length >= sig.Length && header.AsSpan(0, sig.Length).SequenceEqual(sig));
    }
}
