using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Materials;
using RealEstateErp.Domain.Materials;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Materials;

public class MaterialService : IMaterialService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public MaterialService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<MaterialDto>> ListAsync(PagedRequest request, MaterialFilter filter, CancellationToken ct = default)
    {
        var query = _db.Materials.AsQueryable();
        if (filter.IsActive.HasValue) query = query.Where(m => m.IsActive == filter.IsActive);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(m => m.Name.ToLower().Contains(s) || m.Sku.ToLower().Contains(s));
        }
        if (filter.BelowMinimumOnly == true) query = query.Where(m => m.CurrentQuantity < m.MinimumQuantity);

        var total = await query.CountAsync(ct);
        var materials = await query.OrderBy(m => m.Sku).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<MaterialDto>(materials.Select(ToDto).ToList(), request.Page, request.PageSize, total);
    }

    public async Task<Result<MaterialDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var material = await _db.Materials.FirstOrDefaultAsync(m => m.Id == id, ct);
        return material is null ? Result.Failure<MaterialDto>("Material not found.", "not_found") : Result.Success(ToDto(material));
    }

    public async Task<Result<MaterialDto>> CreateAsync(CreateMaterialRequest request, CancellationToken ct = default)
    {
        var skuExists = await _db.Materials.AnyAsync(m => m.Sku == request.Sku, ct);
        if (skuExists) return Result.Failure<MaterialDto>("A material with this SKU already exists.", "duplicate_sku");

        var material = new Material
        {
            Sku = request.Sku,
            Name = request.Name,
            UnitOfMeasure = request.UnitOfMeasure,
            Category = request.Category,
            MinimumQuantity = request.MinimumQuantity,
            CurrentQuantity = 0,
            IsActive = true
        };
        _db.Materials.Add(material);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Materials", "Material", material.Id.ToString(), after: new { material.Sku, material.Name }, ct: ct);
        return Result.Success(ToDto(material));
    }

    public async Task<Result<MaterialDto>> UpdateAsync(Guid id, UpdateMaterialRequest request, CancellationToken ct = default)
    {
        var material = await _db.Materials.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (material is null) return Result.Failure<MaterialDto>("Material not found.", "not_found");

        var before = new { material.Name, material.IsActive };
        material.Name = request.Name;
        material.Category = request.Category;
        material.MinimumQuantity = request.MinimumQuantity;
        material.IsActive = request.IsActive;

        await _db.SaveChangesAsync(ct);
        await _auditLogger.LogAsync("Update", "Materials", "Material", material.Id.ToString(), before, new { material.Name, material.IsActive }, ct: ct);
        return Result.Success(ToDto(material));
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var material = await _db.Materials.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (material is null) return Result.Failure("Material not found.", "not_found");

        var hasMovements = await _db.StockMovements.AnyAsync(m => m.MaterialId == id, ct);
        if (hasMovements) return Result.Failure("Cannot delete a material that has stock movement history.", "conflict");

        _db.Materials.Remove(material);
        await _db.SaveChangesAsync(ct);
        await _auditLogger.LogAsync("Delete", "Materials", "Material", id.ToString(), before: new { material.Sku }, ct: ct);
        return Result.Success();
    }

    public async Task<Result<IReadOnlyList<StockMovementDto>>> ListMovementsAsync(Guid id, CancellationToken ct = default)
    {
        var exists = await _db.Materials.AnyAsync(m => m.Id == id, ct);
        if (!exists) return Result.Failure<IReadOnlyList<StockMovementDto>>("Material not found.", "not_found");

        var movements = await _db.StockMovements.Where(m => m.MaterialId == id).OrderByDescending(m => m.CreatedAt).ToListAsync(ct);
        return Result.Success<IReadOnlyList<StockMovementDto>>(movements.Select(ToMovementDto).ToList());
    }

    public async Task<Result<StockMovementDto>> RecordMovementAsync(Guid id, CreateStockMovementRequest request, CancellationToken ct = default)
    {
        var material = await _db.Materials.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (material is null) return Result.Failure<StockMovementDto>("Material not found.", "not_found");

        if (material.CurrentQuantity + request.Quantity < 0)
            return Result.Failure<StockMovementDto>("This movement would take stock below zero.", "insufficient_stock");

        var movement = new StockMovement
        {
            MaterialId = id,
            Type = request.Type,
            Quantity = request.Quantity,
            Notes = request.Notes
        };
        _db.StockMovements.Add(movement);
        material.CurrentQuantity += request.Quantity;

        await _db.SaveChangesAsync(ct);
        await _auditLogger.LogAsync("RecordMovement", "Materials", "StockMovement", movement.Id.ToString(),
            after: new { material.Sku, movement.Type, movement.Quantity }, ct: ct);
        return Result.Success(ToMovementDto(movement));
    }

    private static MaterialDto ToDto(Material m) => new(
        m.Id, m.Sku, m.Name, m.UnitOfMeasure, m.Category, m.CurrentQuantity, m.MinimumQuantity, m.IsActive,
        m.CurrentQuantity < m.MinimumQuantity, m.CreatedAt, m.UpdatedAt);

    private static StockMovementDto ToMovementDto(StockMovement m) => new(
        m.Id, m.MaterialId, m.Type, m.Quantity, m.ReferenceType, m.ReferenceId, m.Notes, m.CreatedAt);
}
