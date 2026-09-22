using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Documents;

public enum DocumentCategory
{
    General = 0,
    Contract = 1,
    Invoice = 2,
    Receipt = 3,
    Identification = 4,
    Legal = 5,
    Other = 6
}

/// <summary>
/// Known entity types a Document can attach to. A plain string (not an FK) so a new module can attach
/// documents to its own entities by just using a new constant here — no per-module document table, no
/// schema change, no join table. Tenant isolation comes from Document itself being a TenantEntity, not
/// from any relationship to the attached row, so no per-entity-type existence/ownership check is needed
/// for correctness (see docs/ARCHITECTURE.md).
/// </summary>
public static class DocumentEntityTypes
{
    public const string Customer = "Customer";
    public const string Lead = "Lead";
    public const string Booking = "Booking";
    public const string Payment = "Payment";
    public const string Project = "Project";
    public const string Property = "Property";
    public const string PropertyUnit = "PropertyUnit";
    public const string Lease = "Lease";
    public const string RentalTenant = "RentalTenant";
    public const string Vendor = "Vendor";
    public const string PurchaseOrder = "PurchaseOrder";
    public const string PurchaseRequest = "PurchaseRequest";
    public const string Expense = "Expense";
    public const string Facility = "Facility";
    public const string MaintenanceRequest = "MaintenanceRequest";
    public const string Other = "Other";

    public static readonly IReadOnlyCollection<string> All = new[]
    {
        Customer, Lead, Booking, Payment, Project, Property, PropertyUnit, Lease, RentalTenant,
        Vendor, PurchaseOrder, PurchaseRequest, Expense, Facility, MaintenanceRequest, Other
    };
}

/// <summary>
/// The logical document record — metadata only. The actual file bytes for each revision live behind
/// IFileStorageService, addressed by DocumentVersion.StorageKey, never in this table and never in
/// PostgreSQL at all.
/// </summary>
public class Document : TenantEntity
{
    public string EntityType { get; set; } = default!;
    public Guid EntityId { get; set; }
    public DocumentCategory Category { get; set; } = DocumentCategory.General;
    public string Title { get; set; } = default!;
    public string? Description { get; set; }
    public int LatestVersionNumber { get; set; }
    public Guid CreatedByUserId { get; set; }
}

/// <summary>One uploaded file revision of a Document. Never mutated after creation — a re-upload adds
/// a new version rather than overwriting, so version history is a true, immutable audit trail.</summary>
public class DocumentVersion : TenantEntity
{
    public Guid DocumentId { get; set; }
    public int VersionNumber { get; set; }
    public string StorageKey { get; set; } = default!;
    public string OriginalFileName { get; set; } = default!;
    public string ContentType { get; set; } = default!;
    public long SizeBytes { get; set; }
    public string Sha256Hash { get; set; } = default!;
    public Guid UploadedByUserId { get; set; }
}
