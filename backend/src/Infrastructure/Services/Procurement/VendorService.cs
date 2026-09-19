using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Procurement.Vendors;
using RealEstateErp.Domain.Procurement;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Procurement;

public class VendorService : IVendorService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public VendorService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<VendorDto>> ListAsync(PagedRequest request, VendorFilter filter, CancellationToken ct = default)
    {
        var query = _db.Vendors.AsQueryable();
        if (filter.IsActive.HasValue) query = query.Where(v => v.IsActive == filter.IsActive);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(v => v.Name.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var vendors = await query.OrderBy(v => v.Name).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<VendorDto>(vendors.Select(ToDto).ToList(), request.Page, request.PageSize, total);
    }

    public async Task<Result<VendorDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var vendor = await _db.Vendors.FirstOrDefaultAsync(v => v.Id == id, ct);
        return vendor is null ? Result.Failure<VendorDto>("Vendor not found.", "not_found") : Result.Success(ToDto(vendor));
    }

    public async Task<Result<VendorDto>> CreateAsync(CreateVendorRequest request, CancellationToken ct = default)
    {
        var vendor = new Vendor
        {
            Name = request.Name,
            ContactPerson = request.ContactPerson,
            Email = request.Email,
            Phone = request.Phone,
            Address = request.Address,
            TaxRegistrationNumber = request.TaxRegistrationNumber,
            Notes = request.Notes,
            IsActive = true
        };
        _db.Vendors.Add(vendor);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Procurement", "Vendor", vendor.Id.ToString(), after: new { vendor.Name }, ct: ct);
        return Result.Success(ToDto(vendor));
    }

    public async Task<Result<VendorDto>> UpdateAsync(Guid id, UpdateVendorRequest request, CancellationToken ct = default)
    {
        var vendor = await _db.Vendors.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (vendor is null) return Result.Failure<VendorDto>("Vendor not found.", "not_found");

        var before = new { vendor.Name, vendor.IsActive };
        vendor.Name = request.Name;
        vendor.ContactPerson = request.ContactPerson;
        vendor.Email = request.Email;
        vendor.Phone = request.Phone;
        vendor.Address = request.Address;
        vendor.TaxRegistrationNumber = request.TaxRegistrationNumber;
        vendor.IsActive = request.IsActive;
        vendor.Notes = request.Notes;

        await _db.SaveChangesAsync(ct);
        await _auditLogger.LogAsync("Update", "Procurement", "Vendor", vendor.Id.ToString(), before, new { vendor.Name, vendor.IsActive }, ct: ct);
        return Result.Success(ToDto(vendor));
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var vendor = await _db.Vendors.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (vendor is null) return Result.Failure("Vendor not found.", "not_found");

        var hasOrders = await _db.PurchaseOrders.AnyAsync(o => o.VendorId == id, ct);
        if (hasOrders) return Result.Failure("Cannot delete a vendor that has purchase orders.", "conflict");

        _db.Vendors.Remove(vendor);
        await _db.SaveChangesAsync(ct);
        await _auditLogger.LogAsync("Delete", "Procurement", "Vendor", id.ToString(), before: new { vendor.Name }, ct: ct);
        return Result.Success();
    }

    private static VendorDto ToDto(Vendor v) => new(
        v.Id, v.Name, v.ContactPerson, v.Email, v.Phone, v.Address, v.TaxRegistrationNumber, v.IsActive, v.Notes, v.CreatedAt, v.UpdatedAt);
}
