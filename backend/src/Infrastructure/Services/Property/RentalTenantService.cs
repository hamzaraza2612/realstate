using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Property.Tenants;
using RealEstateErp.Domain.Crm;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Property;

public class RentalTenantService : IRentalTenantService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public RentalTenantService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<RentalTenantDto>> ListAsync(PagedRequest request, RentalTenantFilter filter, CancellationToken ct = default)
    {
        var query = _db.RentalTenants.AsQueryable();
        if (filter.IsActive.HasValue) query = query.Where(t => t.IsActive == filter.IsActive);

        var total0 = await query.CountAsync(ct);
        var all = await query.OrderByDescending(t => t.CreatedAt).ToListAsync(ct);
        var dtos = await ToDtosAsync(all, ct);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            dtos = dtos.Where(d => d.CustomerName.ToLowerInvariant().Contains(s)).ToList();
        }

        var total = string.IsNullOrWhiteSpace(filter.Search) ? total0 : dtos.Count;
        var page = dtos.Skip(request.Skip).Take(request.PageSize).ToList();
        return new PagedResult<RentalTenantDto>(page, request.Page, request.PageSize, total);
    }

    public async Task<Result<RentalTenantDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var tenant = await _db.RentalTenants.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (tenant is null) return Result.Failure<RentalTenantDto>("Tenant not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { tenant }, ct))[0]);
    }

    public async Task<Result<RentalTenantDto>> CreateAsync(CreateRentalTenantRequest request, CancellationToken ct = default)
    {
        Guid customerId;
        if (request.CustomerId.HasValue)
        {
            var customerExists = await _db.Customers.AnyAsync(c => c.Id == request.CustomerId, ct);
            if (!customerExists) return Result.Failure<RentalTenantDto>("Customer not found.", "not_found");

            var alreadyLinked = await _db.RentalTenants.AnyAsync(t => t.CustomerId == request.CustomerId, ct);
            if (alreadyLinked) return Result.Failure<RentalTenantDto>("This customer is already registered as a rental tenant.", "duplicate_tenant");

            customerId = request.CustomerId.Value;
        }
        else
        {
            var customer = new Customer { FullName = request.FullName!, Email = request.Email, Phone = request.Phone, Address = request.Address };
            _db.Customers.Add(customer);
            await _db.SaveChangesAsync(ct);
            customerId = customer.Id;
        }

        var tenant = new RentalTenant
        {
            CustomerId = customerId,
            IsCompany = request.IsCompany,
            IdentificationNumber = request.IdentificationNumber,
            Notes = request.Notes
        };
        _db.RentalTenants.Add(tenant);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Property", "RentalTenant", tenant.Id.ToString(), after: new { tenant.CustomerId }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { tenant }, ct))[0]);
    }

    public async Task<Result<RentalTenantDto>> UpdateAsync(Guid id, UpdateRentalTenantRequest request, CancellationToken ct = default)
    {
        var tenant = await _db.RentalTenants.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (tenant is null) return Result.Failure<RentalTenantDto>("Tenant not found.", "not_found");

        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == tenant.CustomerId, ct);
        if (customer is not null)
        {
            customer.Email = request.Email;
            customer.Phone = request.Phone;
            customer.Address = request.Address;
        }

        tenant.IsCompany = request.IsCompany;
        tenant.IdentificationNumber = request.IdentificationNumber;
        tenant.IsActive = request.IsActive;
        tenant.Notes = request.Notes;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Property", "RentalTenant", tenant.Id.ToString(), after: new { tenant.IsActive }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { tenant }, ct))[0]);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var tenant = await _db.RentalTenants.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (tenant is null) return Result.Failure("Tenant not found.", "not_found");

        var hasLeases = await _db.Leases.AnyAsync(l => l.RentalTenantId == id, ct);
        if (hasLeases) return Result.Failure("This tenant has lease history and cannot be deleted.", "has_dependents");

        _db.RentalTenants.Remove(tenant);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Delete", "Property", "RentalTenant", id.ToString(), ct: ct);
        return Result.Success();
    }

    private async Task<List<RentalTenantDto>> ToDtosAsync(IReadOnlyCollection<RentalTenant> tenants, CancellationToken ct)
    {
        var customerIds = tenants.Select(t => t.CustomerId).Distinct().ToList();
        var customers = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c, ct);
        var tenantIds = tenants.Select(t => t.Id).ToList();
        var activeLeaseCounts = await _db.Leases
            .Where(l => tenantIds.Contains(l.RentalTenantId) && l.Status == LeaseStatus.Active)
            .GroupBy(l => l.RentalTenantId).Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(g => g.Key, g => g.Count, ct);

        return tenants.Select(t =>
        {
            customers.TryGetValue(t.CustomerId, out var customer);
            return new RentalTenantDto(
                t.Id, t.CustomerId, customer?.FullName ?? "", customer?.Email, customer?.Phone, customer?.Address,
                t.IsCompany, t.IdentificationNumber, t.IsActive, t.Notes, activeLeaseCounts.GetValueOrDefault(t.Id, 0),
                t.CreatedAt, t.UpdatedAt);
        }).ToList();
    }
}
