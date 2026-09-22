using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Documents;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class DocumentConfiguration : IEntityTypeConfiguration<Document>
{
    public void Configure(EntityTypeBuilder<Document> b)
    {
        b.ToTable("documents");
        b.HasKey(x => x.Id);
        b.Property(x => x.EntityType).HasMaxLength(50).IsRequired();
        b.Property(x => x.Title).HasMaxLength(200).IsRequired();
        b.Property(x => x.Description).HasMaxLength(2000);

        // The lookup every "attachment list" view uses: all documents for a given business entity.
        b.HasIndex(x => new { x.TenantId, x.EntityType, x.EntityId });
        b.HasIndex(x => new { x.TenantId, x.Category });
    }
}

public class DocumentVersionConfiguration : IEntityTypeConfiguration<DocumentVersion>
{
    public void Configure(EntityTypeBuilder<DocumentVersion> b)
    {
        b.ToTable("document_versions");
        b.HasKey(x => x.Id);
        b.Property(x => x.StorageKey).HasMaxLength(300).IsRequired();
        b.Property(x => x.OriginalFileName).HasMaxLength(260).IsRequired();
        b.Property(x => x.ContentType).HasMaxLength(150).IsRequired();
        b.Property(x => x.Sha256Hash).HasMaxLength(64).IsRequired();

        b.HasIndex(x => new { x.TenantId, x.DocumentId, x.VersionNumber }).IsUnique();

        b.HasOne<Document>().WithMany().HasForeignKey(x => x.DocumentId).OnDelete(DeleteBehavior.Cascade);
    }
}
