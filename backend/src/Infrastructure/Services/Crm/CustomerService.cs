using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Crm.Customers;
using RealEstateErp.Domain.Crm;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Crm;

public class CustomerService : ICustomerService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public CustomerService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<CustomerDto>> ListAsync(PagedRequest request, CustomerFilter filter, CancellationToken ct = default)
    {
        var query = _db.Customers.AsQueryable();
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(c =>
                c.FullName.ToLower().Contains(s) ||
                (c.Email != null && c.Email.ToLower().Contains(s)) ||
                (c.Phone != null && c.Phone.Contains(s)));
        }

        var total = await query.CountAsync(ct);
        var customers = await query.OrderByDescending(c => c.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);

        return new PagedResult<CustomerDto>(customers.Select(ToDto).ToList(), request.Page, request.PageSize, total);
    }

    public async Task<Result<CustomerDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (customer is null) return Result.Failure<CustomerDto>("Customer not found.", "not_found");
        return Result.Success(ToDto(customer));
    }

    public async Task<Result<CustomerDto>> CreateAsync(CreateCustomerRequest request, CancellationToken ct = default)
    {
        var customer = new Customer
        {
            FullName = request.FullName,
            Email = request.Email,
            Phone = request.Phone,
            Address = request.Address,
            CompanyName = request.CompanyName
        };

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Crm", "Customer", customer.Id.ToString(), after: new { customer.FullName }, ct: ct);

        return Result.Success(ToDto(customer));
    }

    public async Task<Result<CustomerDto>> UpdateAsync(Guid id, UpdateCustomerRequest request, CancellationToken ct = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (customer is null) return Result.Failure<CustomerDto>("Customer not found.", "not_found");

        var before = new { customer.FullName, customer.Email, customer.Phone, customer.Address, customer.CompanyName };
        customer.FullName = request.FullName;
        customer.Email = request.Email;
        customer.Phone = request.Phone;
        customer.Address = request.Address;
        customer.CompanyName = request.CompanyName;

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Crm", "Customer", customer.Id.ToString(), before,
            new { customer.FullName, customer.Email, customer.Phone, customer.Address, customer.CompanyName }, ct: ct);

        return Result.Success(ToDto(customer));
    }

    private static CustomerDto ToDto(Customer c) => new(
        c.Id, c.FullName, c.Email, c.Phone, c.Address, c.CompanyName, c.ConvertedFromLeadId, c.CreatedAt, c.UpdatedAt);
}
