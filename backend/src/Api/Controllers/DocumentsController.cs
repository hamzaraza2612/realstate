using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Documents;
using RealEstateErp.Domain.Documents;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

public class UploadDocumentForm
{
    public string EntityType { get; set; } = default!;
    public Guid EntityId { get; set; }
    public DocumentCategory Category { get; set; }
    public string Title { get; set; } = default!;
    public string? Description { get; set; }
    public IFormFile File { get; set; } = default!;
}

public class UploadDocumentVersionForm
{
    public IFormFile File { get; set; } = default!;
}

[Authorize]
[Route("api/v1/documents")]
public class DocumentsController : ApiControllerBase
{
    private readonly IDocumentService _documentService;

    public DocumentsController(IDocumentService documentService)
    {
        _documentService = documentService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Documents.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] DocumentFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _documentService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Documents.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _documentService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Documents.Manage)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(30_000_000)]
    public async Task<IActionResult> Upload([FromForm] UploadDocumentForm form, CancellationToken ct)
    {
        if (form.File is null || form.File.Length == 0)
        {
            return BadRequest(new { title = "A file is required.", status = 400, code = "empty_file" });
        }

        var request = new UploadDocumentRequest(form.EntityType, form.EntityId, form.Category, form.Title, form.Description);
        await using var stream = form.File.OpenReadStream();
        var result = await _documentService.UploadAsync(request, stream, form.File.FileName, form.File.ContentType, form.File.Length, ct);

        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/versions")]
    [RequirePermission(Permissions.Documents.Manage)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(30_000_000)]
    public async Task<IActionResult> AddVersion(Guid id, [FromForm] UploadDocumentVersionForm form, CancellationToken ct)
    {
        if (form.File is null || form.File.Length == 0)
        {
            return BadRequest(new { title = "A file is required.", status = 400, code = "empty_file" });
        }

        await using var stream = form.File.OpenReadStream();
        var result = await _documentService.AddVersionAsync(id, stream, form.File.FileName, form.File.ContentType, form.File.Length, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpGet("{id:guid}/download")]
    [RequirePermission(Permissions.Documents.View)]
    public async Task<IActionResult> Download(Guid id, [FromQuery] int? version, CancellationToken ct)
    {
        var result = await _documentService.DownloadAsync(id, version, ct);
        if (!result.Succeeded) return NotFound(new { title = result.Error, status = 404 });

        var file = result.Value!;
        return File(file.Content, file.ContentType, file.FileName);
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Permissions.Documents.Manage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _documentService.DeleteAsync(id, ct);
        return result.Succeeded ? NoContent() : NotFound(new { title = result.Error, status = 404 });
    }
}
