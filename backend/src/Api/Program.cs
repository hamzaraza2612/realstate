using AspNetCoreRateLimit;
using Hangfire;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi.Models;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Api.Middleware;
using RealEstateErp.Application;
using RealEstateErp.Infrastructure;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Infrastructure.Services;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .Enrich.FromLogContext()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console());

    builder.Services.AddControllers(options =>
    {
        options.Filters.Add<ValidationActionFilter>();
    });

    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "Real Estate ERP API", Version = "v1" });
        var jwtScheme = new OpenApiSecurityScheme
        {
            Scheme = "bearer",
            BearerFormat = "JWT",
            Name = "Authorization",
            In = ParameterLocation.Header,
            Type = SecuritySchemeType.Http,
            Description = "Enter your JWT access token."
        };
        c.AddSecurityDefinition("Bearer", jwtScheme);
        c.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() }
        });
    });

    builder.Services.AddApplication();
    builder.Services.AddInfrastructure(builder.Configuration);
    builder.Services.AddSingleton<IReportExporter, CsvReportExporter>();

    builder.Services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer();
    builder.Services.ConfigureOptions<JwtBearerOptionsSetup>();

    builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
    builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();
    builder.Services.AddSingleton<IAuthorizationHandler, NotPortalAuthorizationHandler>();
    builder.Services.AddSingleton<IAuthorizationHandler, PortalOnlyAuthorizationHandler>();
    builder.Services.AddAuthorization(options =>
    {
        options.AddPolicy("SuperAdminOnly", policy => policy.RequireClaim("is_super_admin", "true"));
        // Every bare [Authorize] on an internal controller (Notifications, the Approval inbox, etc.)
        // uses this policy — excluding a portal-issued token here closes the same gap
        // PermissionAuthorizationHandler closes for [RequirePermission] endpoints, so a portal session
        // can never reach ANY internal endpoint, permission-gated or not. See docs/PORTAL_ARCHITECTURE.md.
        options.DefaultPolicy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .AddRequirements(new NotPortalRequirement())
            .Build();
        options.AddPolicy("PortalOnly", policy => policy.RequireAuthenticatedUser().AddRequirements(new PortalOnlyRequirement()));
    });

    var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("Default", policy =>
        {
            if (corsOrigins.Length > 0)
            {
                policy.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
            }
        });
    });

    builder.Services.AddHealthChecks();

    builder.Services.AddMemoryCache();
    builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));
    builder.Services.AddInMemoryRateLimiting();
    builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

    var app = builder.Build();

    app.UseSerilogRequestLogging();
    app.UseMiddleware<ExceptionHandlingMiddleware>();

    // Skipped under the in-process "Testing" host (WebApplicationFactory): integration tests
    // legitimately issue far more requests per IP than any real client would in the same window.
    if (!app.Environment.IsEnvironment("Testing"))
    {
        app.UseIpRateLimiting();
    }

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseHttpsRedirection();
    app.UseCors("Default");
    app.UseAuthentication();
    app.UseMiddleware<TenantStatusMiddleware>();
    app.UseAuthorization();

    app.MapControllers();
    app.MapHealthChecks("/health");

    if (app.Environment.IsDevelopment())
    {
        app.UseHangfireDashboard("/hangfire");
    }

    // Skipped under "Testing" for the same reason as UseIpRateLimiting above: an hourly recurring
    // job registered against the test database has no business running mid-test-suite, and
    // Hangfire's own scheduler polling could otherwise introduce test flakiness. See
    // RealEstateErp.Infrastructure.Jobs.SubscriptionLifecycleJob and docs/SAAS_BILLING.md.
    if (!app.Environment.IsEnvironment("Testing"))
    {
        RecurringJob.AddOrUpdate<RealEstateErp.Infrastructure.Jobs.SubscriptionLifecycleJob>(
            "subscription-lifecycle", job => job.RunAsync(CancellationToken.None), Cron.Hourly);
    }

    await DbSeeder.SeedAsync(app.Services);

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

/// <summary>Exposed for WebApplicationFactory in integration tests.</summary>
public partial class Program { }
