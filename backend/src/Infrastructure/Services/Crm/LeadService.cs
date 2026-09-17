using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Crm.Customers;
using RealEstateErp.Application.Crm.Leads;
using RealEstateErp.Domain.Crm;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Crm;

public class LeadService : ILeadService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public LeadService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<LeadDto>> ListAsync(PagedRequest request, LeadFilter filter, CancellationToken ct = default)
    {
        var query = _db.Leads.AsQueryable();

        if (filter.Status.HasValue) query = query.Where(l => l.Status == filter.Status);
        if (filter.Priority.HasValue) query = query.Where(l => l.Priority == filter.Priority);
        if (filter.Source.HasValue) query = query.Where(l => l.Source == filter.Source);
        if (filter.AssignedToUserId.HasValue) query = query.Where(l => l.AssignedToUserId == filter.AssignedToUserId);
        if (filter.UnassignedOnly == true) query = query.Where(l => l.AssignedToUserId == null);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(l =>
                l.FullName.ToLower().Contains(s) ||
                (l.Email != null && l.Email.ToLower().Contains(s)) ||
                (l.Phone != null && l.Phone.Contains(s)));
        }

        var total = await query.CountAsync(ct);
        var leads = await query.OrderByDescending(l => l.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);

        var dtos = await ToDtosAsync(leads, ct);
        return new PagedResult<LeadDto>(dtos, request.Page, request.PageSize, total);
    }

    public async Task<Result<LeadDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var lead = await _db.Leads.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lead is null) return Result.Failure<LeadDto>("Lead not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { lead }, ct))[0]);
    }

    public async Task<Result<LeadDto>> CreateAsync(CreateLeadRequest request, CancellationToken ct = default)
    {
        var lead = new Lead
        {
            FullName = request.FullName,
            Email = request.Email,
            Phone = request.Phone,
            CompanyName = request.CompanyName,
            Source = request.Source,
            Priority = request.Priority,
            Notes = request.Notes,
            AssignedToUserId = request.AssignedToUserId,
            Status = LeadStatus.New
        };

        _db.Leads.Add(lead);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Crm", "Lead", lead.Id.ToString(),
            after: new { lead.FullName, lead.Source, lead.Priority, request.AssignedToUserId }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { lead }, ct))[0]);
    }

    public async Task<Result<LeadDto>> UpdateAsync(Guid id, UpdateLeadRequest request, CancellationToken ct = default)
    {
        var lead = await _db.Leads.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lead is null) return Result.Failure<LeadDto>("Lead not found.", "not_found");

        var before = new { lead.FullName, lead.Status, lead.Priority };
        lead.FullName = request.FullName;
        lead.Email = request.Email;
        lead.Phone = request.Phone;
        lead.CompanyName = request.CompanyName;
        lead.Status = request.Status;
        lead.Priority = request.Priority;
        lead.Notes = request.Notes;

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Crm", "Lead", lead.Id.ToString(), before,
            new { lead.FullName, lead.Status, lead.Priority }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { lead }, ct))[0]);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var lead = await _db.Leads.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lead is null) return Result.Failure("Lead not found.", "not_found");

        _db.Leads.Remove(lead);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Delete", "Crm", "Lead", id.ToString(), before: new { lead.FullName }, ct: ct);

        return Result.Success();
    }

    public async Task<Result<LeadDto>> AssignAsync(Guid id, AssignLeadRequest request, CancellationToken ct = default)
    {
        var lead = await _db.Leads.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lead is null) return Result.Failure<LeadDto>("Lead not found.", "not_found");

        var before = lead.AssignedToUserId;
        lead.AssignedToUserId = request.AssignedToUserId;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Assign", "Crm", "Lead", lead.Id.ToString(),
            new { AssignedToUserId = before }, new { lead.AssignedToUserId }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { lead }, ct))[0]);
    }

    public async Task<Result<CustomerDto>> ConvertToCustomerAsync(Guid id, CancellationToken ct = default)
    {
        var lead = await _db.Leads.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lead is null) return Result.Failure<CustomerDto>("Lead not found.", "not_found");
        if (lead.ConvertedToCustomerId.HasValue) return Result.Failure<CustomerDto>("Lead has already been converted.", "already_converted");

        await using var transaction = await _db.Database.BeginTransactionAsync(ct);

        var customer = new Customer
        {
            FullName = lead.FullName,
            Email = lead.Email,
            Phone = lead.Phone,
            CompanyName = lead.CompanyName,
            ConvertedFromLeadId = lead.Id
        };
        _db.Customers.Add(customer);

        lead.Status = LeadStatus.Won;
        lead.ConvertedToCustomerId = customer.Id;

        await _db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        await _auditLogger.LogAsync("Convert", "Crm", "Lead", lead.Id.ToString(),
            after: new { CustomerId = customer.Id }, ct: ct);

        return Result.Success(new CustomerDto(customer.Id, customer.FullName, customer.Email, customer.Phone,
            customer.Address, customer.CompanyName, customer.ConvertedFromLeadId, customer.CreatedAt, customer.UpdatedAt));
    }

    private async Task<List<LeadDto>> ToDtosAsync(IReadOnlyCollection<Lead> leads, CancellationToken ct)
    {
        var userIds = leads.Where(l => l.AssignedToUserId.HasValue).Select(l => l.AssignedToUserId!.Value).Distinct().ToList();
        var userNames = userIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);

        return leads.Select(l => new LeadDto(
            l.Id, l.FullName, l.Email, l.Phone, l.CompanyName, l.Source, l.Status, l.Priority, l.Notes,
            l.AssignedToUserId,
            l.AssignedToUserId.HasValue && userNames.TryGetValue(l.AssignedToUserId.Value, out var name) ? name : null,
            l.ConvertedToCustomerId, l.CreatedAt, l.UpdatedAt)).ToList();
    }
}
