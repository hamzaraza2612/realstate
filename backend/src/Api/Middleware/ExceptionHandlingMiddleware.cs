using System.Net;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Shared.Exceptions;

namespace RealEstateErp.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleAsync(context, ex);
        }
    }

    private async Task HandleAsync(HttpContext context, Exception ex)
    {
        var problem = ex switch
        {
            ValidationException fv => new ProblemDetails
            {
                Title = "Validation failed",
                Status = (int)HttpStatusCode.BadRequest,
                Extensions = { ["errors"] = fv.Errors.GroupBy(e => e.PropertyName).ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray()) }
            },
            ValidationAppException vae => new ProblemDetails
            {
                Title = "Validation failed",
                Status = (int)HttpStatusCode.BadRequest,
                Extensions = { ["errors"] = vae.Errors }
            },
            NotFoundException nf => new ProblemDetails { Title = nf.Message, Status = (int)HttpStatusCode.NotFound },
            ForbiddenException fb => new ProblemDetails { Title = fb.Message, Status = (int)HttpStatusCode.Forbidden },
            ConflictException cf => new ProblemDetails { Title = cf.Message, Status = (int)HttpStatusCode.Conflict },
            BusinessRuleException br => new ProblemDetails { Title = br.Message, Status = (int)HttpStatusCode.BadRequest },
            UnauthorizedAccessException => new ProblemDetails { Title = "Unauthorized", Status = (int)HttpStatusCode.Forbidden },
            _ => new ProblemDetails { Title = "An unexpected error occurred.", Status = (int)HttpStatusCode.InternalServerError }
        };

        if (problem.Status == (int)HttpStatusCode.InternalServerError)
        {
            _logger.LogError(ex, "Unhandled exception processing {Method} {Path}", context.Request.Method, context.Request.Path);
        }
        else
        {
            _logger.LogWarning(ex, "Handled exception {ExceptionType} processing {Method} {Path}", ex.GetType().Name, context.Request.Method, context.Request.Path);
        }

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = problem.Status ?? 500;
        await context.Response.WriteAsJsonAsync(problem);
    }
}
