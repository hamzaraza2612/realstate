using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Crm.Activities;
using RealEstateErp.Application.Crm.Customers;
using RealEstateErp.Application.Crm.Leads;
using RealEstateErp.Application.Inventory;
using RealEstateErp.Application.Portal;
using RealEstateErp.Application.Reporting.Sales;
using RealEstateErp.Application.Sales.Bookings;
using RealEstateErp.Domain.Projects;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Portal;

public class AgentPortalService : IAgentPortalService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ILeadService _leadService;
    private readonly ICustomerService _customerService;
    private readonly IInventoryService _inventoryService;
    private readonly IBookingService _bookingService;
    private readonly IActivityService _activityService;
    private readonly ISalesReportService _salesReportService;

    public AgentPortalService(
        AppDbContext db, ITenantContext tenantContext, ILeadService leadService, ICustomerService customerService,
        IInventoryService inventoryService, IBookingService bookingService, IActivityService activityService,
        ISalesReportService salesReportService)
    {
        _db = db;
        _tenantContext = tenantContext;
        _leadService = leadService;
        _customerService = customerService;
        _inventoryService = inventoryService;
        _bookingService = bookingService;
        _activityService = activityService;
        _salesReportService = salesReportService;
    }

    private Guid AgentUserId => _tenantContext.UserId ?? Guid.Empty;

    public async Task<PagedResult<LeadDto>> ListMyLeadsAsync(PagedRequest request, CancellationToken ct = default) =>
        await _leadService.ListAsync(request, new LeadFilter(null, null, null, AgentUserId, null, null), ct);

    public async Task<IReadOnlyList<CustomerDto>> ListMyCustomersAsync(CancellationToken ct = default)
    {
        var customerIds = await _db.Bookings.Where(b => b.SalesAgentUserId == AgentUserId)
            .Select(b => b.CustomerId).Distinct().ToListAsync(ct);

        var customers = new List<CustomerDto>();
        foreach (var id in customerIds)
        {
            var result = await _customerService.GetAsync(id, ct);
            if (result.Succeeded) customers.Add(result.Value!);
        }
        return customers.OrderBy(c => c.FullName).ToList();
    }

    public async Task<PagedResult<InventoryUnitDto>> ListAvailableInventoryAsync(PagedRequest request, CancellationToken ct = default) =>
        await _inventoryService.ListAsync(request, new InventoryFilter(null, null, null, InventoryStatus.Available, null, null, null), ct);

    public async Task<PagedResult<BookingDto>> ListMyBookingsAsync(PagedRequest request, CancellationToken ct = default) =>
        await _bookingService.ListAsync(request, new BookingFilter(null, null, AgentUserId, null, null), ct);

    public async Task<PagedResult<ActivityDto>> ListMyFollowUpsAsync(PagedRequest request, CancellationToken ct = default) =>
        await _activityService.ListAsync(request, new ActivityFilter(null, null, null, null, AgentUserId), ct);

    public async Task<IReadOnlyList<SalesByPeriodRowDto>> GetMyPerformanceAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default) =>
        await _salesReportService.SalesByPeriodAsync(new SalesReportFilter(from, to, null, AgentUserId, null, null), ct);
}
