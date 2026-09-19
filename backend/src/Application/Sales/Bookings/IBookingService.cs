using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Sales.Bookings;

public interface IBookingService
{
    Task<PagedResult<BookingDto>> ListAsync(PagedRequest request, BookingFilter filter, CancellationToken ct = default);
    Task<Result<BookingDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<BookingDto>> CreateAsync(CreateBookingRequest request, CancellationToken ct = default);
    Task<Result<BookingDto>> UpdateAsync(Guid id, UpdateBookingRequest request, CancellationToken ct = default);
    Task<Result<BookingDto>> SubmitForApprovalAsync(Guid id, CancellationToken ct = default);
    Task<Result<BookingDto>> ApproveAsync(Guid id, CancellationToken ct = default);
    Task<Result<BookingDto>> CancelAsync(Guid id, CancellationToken ct = default);
}
