using System.Net;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public class LocalizationTaxTests : TestBase
{
    public LocalizationTaxTests(CustomWebApplicationFactory factory) : base(factory) { }

    private async Task<Guid> CreatePlanAsync(string superAdminToken, string codeSuffix, decimal price = 100m)
    {
        var (success, body, status) = await PostAsync("/api/v1/platform/subscription-plans", new
        {
            name = $"Plan {codeSuffix}", code = $"plan-{codeSuffix}", description = (string?)null, displayOrder = 0,
            trialDays = 14, currency = "USD", price, setupPrice = (decimal?)null, billingCycle = 0, metadataJson = (string?)null,
            entitlements = Array.Empty<object>()
        }, superAdminToken);
        success.Should().BeTrue($"plan creation should succeed: {status} {body}");
        return Guid.Parse(body.GetProperty("data").GetProperty("id").GetString()!);
    }

    private async Task<Guid> AssignPlanAndGetSubscriptionIdAsync(string superAdminToken, Guid tenantId, Guid planId)
    {
        var (success, body, status) = await PostAsync($"/api/v1/platform/organizations/{tenantId}/subscription", new { planId, skipTrial = true }, superAdminToken);
        success.Should().BeTrue($"assign plan should succeed: {status} {body}");
        return Guid.Parse(body.GetProperty("data").GetProperty("id").GetString()!);
    }

    // ---- country/currency catalogs ----

    [Fact]
    public async Task Catalogs_ListCountriesAndCurrencies_IncludeUaeSaudiAndPakistan()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("loc-catalog");

        var (countriesOk, countriesBody, _) = await GetAsync("/api/v1/localization/countries", ownerToken);
        countriesOk.Should().BeTrue();
        var countries = countriesBody.GetProperty("data").EnumerateArray().Select(c => c.GetProperty("alpha2").GetString()).ToList();
        countries.Should().Contain(new[] { "AE", "SA", "PK", "GB", "US" });

        var (currenciesOk, currenciesBody, _) = await GetAsync("/api/v1/localization/currencies", ownerToken);
        currenciesOk.Should().BeTrue();
        var currencies = currenciesBody.GetProperty("data").EnumerateArray().Select(c => c.GetProperty("code").GetString()).ToList();
        currencies.Should().Contain(new[] { "AED", "SAR", "PKR", "USD", "EUR", "GBP" });
    }

    // ---- tenant localization profile ----

    [Fact]
    public async Task CreateOrganization_WithCountryCode_DefaultsCurrencyAndLocaleFromCatalog()
    {
        var (ownerToken, _, _) = await CreateOrganizationWithCountryAsync("loc-uae-create", "AE");

        var (ok, body, _) = await GetAsync("/api/v1/localization/current", ownerToken);
        ok.Should().BeTrue();
        body.GetProperty("data").GetProperty("countryCode").GetString().Should().Be("AE");
        body.GetProperty("data").GetProperty("currency").GetString().Should().Be("AED");
        body.GetProperty("data").GetProperty("locale").GetString().Should().Be("en-AE");
    }

    [Fact]
    public async Task UpdateCurrentLocalization_ChangesOwnTenantOnly_NeverAnotherTenants()
    {
        var (ownerTokenA, _, _) = await CreateOrganizationAsync("loc-update-a");
        var (ownerTokenB, _, _) = await CreateOrganizationAsync("loc-update-b");

        var update = new
        {
            countryCode = "SA", currency = "SAR", locale = "ar-SA", timezone = "Asia/Riyadh",
            dateFormat = "dd/MM/yyyy", firstDayOfWeek = 0, defaultLanguage = "ar",
            secondaryLanguages = new[] { "en" }, measurementSystem = 0
        };
        var (updateOk, updateBody, _) = await PutAsync("/api/v1/localization/current", update, ownerTokenA);
        updateOk.Should().BeTrue();
        updateBody.GetProperty("data").GetProperty("currency").GetString().Should().Be("SAR");

        var (_, bodyA, _) = await GetAsync("/api/v1/localization/current", ownerTokenA);
        bodyA.GetProperty("data").GetProperty("currency").GetString().Should().Be("SAR");
        bodyA.GetProperty("data").GetProperty("defaultLanguage").GetString().Should().Be("ar");

        // Tenant B's own profile is completely unaffected by A's update.
        var (_, bodyB, _) = await GetAsync("/api/v1/localization/current", ownerTokenB);
        bodyB.GetProperty("data").GetProperty("currency").GetString().Should().Be("USD");
        bodyB.GetProperty("data").GetProperty("countryCode").GetString().Should().Be("US");
    }

    [Fact]
    public async Task PlatformUpdateLocalization_RequiresSuperAdmin_NotReachableByTenantToken()
    {
        var (ownerToken, tenantId, _) = await CreateOrganizationAsync("loc-platform-auth");

        var (success, _, status) = await PutAsync($"/api/v1/platform/organizations/{tenantId}/localization", new
        {
            countryCode = "AE", currency = "AED", locale = "en-AE", timezone = "Asia/Dubai",
            dateFormat = "dd/MM/yyyy", firstDayOfWeek = 6, defaultLanguage = "en",
            secondaryLanguages = Array.Empty<string>(), measurementSystem = 0
        }, ownerToken);

        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.Forbidden);
    }

    // ---- platform tax catalog authorization ----

    [Fact]
    public async Task PlatformTaxProfiles_NeverReachableByTenantToken()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("tax-platform-auth");
        (await GetAsync("/api/v1/platform/tax-profiles", ownerToken)).Status.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PlatformTaxProfiles_SuperAdmin_CanCreateProfileAndRate()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        var (createOk, createBody, status) = await PostAsync("/api/v1/platform/tax-profiles", new
        {
            countryCode = "GB", code = $"GB_VAT_{suffix}", name = "UK VAT", description = (string?)null
        }, superAdmin);
        createOk.Should().BeTrue($"{status}");
        var profileId = createBody.GetProperty("data").GetProperty("id").GetString();

        var (rateOk, rateBody, _) = await PostAsync($"/api/v1/platform/tax-profiles/{profileId}/rates", new
        {
            rateCode = "STANDARD", name = "Standard Rate", percentage = 20.0m, isInclusive = false,
            effectiveFrom = new DateOnly(2011, 1, 4), effectiveTo = (DateOnly?)null
        }, superAdmin);
        rateOk.Should().BeTrue();
        rateBody.GetProperty("data").GetProperty("percentage").GetDecimal().Should().Be(20.0m);
    }

    // ---- tax calculation + invoice snapshot ----

    [Fact]
    public async Task GenerateInvoice_ForUaeTenant_AppliesConfiguredFivePercentVat_AndSnapshotsIt()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var (_, tenantId, _) = await CreateOrganizationWithCountryAsync("tax-uae", "AE");
        var planId = await CreatePlanAsync(superAdmin, Guid.NewGuid().ToString("N")[..8], price: 1000m);
        var subscriptionId = await AssignPlanAndGetSubscriptionIdAsync(superAdmin, tenantId, planId);

        var (success, body, status) = await PostAsync("/api/v1/platform/invoices/generate", new
        {
            subscriptionId, taxAmount = 0m, lineItems = (object?)null, dueInDays = 14, taxRateCode = "STANDARD"
        }, superAdmin);

        success.Should().BeTrue($"{status} {body}");
        var data = body.GetProperty("data");
        data.GetProperty("subtotal").GetDecimal().Should().Be(1000m);
        data.GetProperty("taxAmount").GetDecimal().Should().Be(50m); // 5% of 1000
        data.GetProperty("total").GetDecimal().Should().Be(1050m);
        data.GetProperty("taxPercentage").GetDecimal().Should().Be(5.0m);
        data.GetProperty("taxCode").GetString().Should().Be("STANDARD");
    }

    [Fact]
    public async Task GenerateInvoice_ForSaudiTenant_AppliesConfiguredFifteenPercentVat()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var (_, tenantId, _) = await CreateOrganizationWithCountryAsync("tax-sa", "SA");
        var planId = await CreatePlanAsync(superAdmin, Guid.NewGuid().ToString("N")[..8], price: 2000m);
        var subscriptionId = await AssignPlanAndGetSubscriptionIdAsync(superAdmin, tenantId, planId);

        var (success, body, status) = await PostAsync("/api/v1/platform/invoices/generate", new
        {
            subscriptionId, taxAmount = 0m, lineItems = (object?)null, dueInDays = 14, taxRateCode = "STANDARD"
        }, superAdmin);

        success.Should().BeTrue($"{status} {body}");
        var data = body.GetProperty("data");
        data.GetProperty("taxAmount").GetDecimal().Should().Be(300m); // 15% of 2000
        data.GetProperty("total").GetDecimal().Should().Be(2300m);
    }

    [Fact]
    public async Task GenerateInvoice_ForCountryWithNoConfiguredTaxProfile_AppliesNoTax()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var (_, tenantId, _) = await CreateOrganizationWithCountryAsync("tax-pk", "PK");
        var planId = await CreatePlanAsync(superAdmin, Guid.NewGuid().ToString("N")[..8], price: 500m);
        var subscriptionId = await AssignPlanAndGetSubscriptionIdAsync(superAdmin, tenantId, planId);

        var (success, body, status) = await PostAsync("/api/v1/platform/invoices/generate", new
        {
            subscriptionId, taxAmount = 0m, lineItems = (object?)null, dueInDays = 14, taxRateCode = "STANDARD"
        }, superAdmin);

        success.Should().BeTrue($"{status} {body}");
        var data = body.GetProperty("data");
        data.GetProperty("taxAmount").GetDecimal().Should().Be(0m);
        data.GetProperty("total").GetDecimal().Should().Be(500m);
        data.GetProperty("taxCode").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);
    }

    [Fact]
    public async Task ChangingTaxRatePercentage_NeverChangesAnAlreadyIssuedInvoicesSnapshot()
    {
        var superAdmin = await LoginSuperAdminAsync();

        // A dedicated, uniquely-coded profile/rate — never the shared AE_VAT/SA_VAT seed data, so
        // this test can freely mutate its own rate's Percentage without racing other tests that
        // assume the seeded 5%/15% standard rates.
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var (_, tenantId, _) = await CreateOrganizationWithCountryAsync("tax-snapshot", "GB");
        var (profileCreateOk, profileCreateBody, _) = await PostAsync("/api/v1/platform/tax-profiles", new
        {
            countryCode = "GB", code = $"GB_SNAP_{suffix}", name = "Snapshot Test VAT", description = (string?)null
        }, superAdmin);
        profileCreateOk.Should().BeTrue();
        var profileId = profileCreateBody.GetProperty("data").GetProperty("id").GetString();

        var (rateCreateOk, rateCreateBody, _) = await PostAsync($"/api/v1/platform/tax-profiles/{profileId}/rates", new
        {
            rateCode = "STANDARD", name = "Standard Rate", percentage = 5.0m, isInclusive = false,
            effectiveFrom = new DateOnly(2018, 1, 1), effectiveTo = (DateOnly?)null
        }, superAdmin);
        rateCreateOk.Should().BeTrue();
        var rateId = rateCreateBody.GetProperty("data").GetProperty("id").GetString();

        var planId = await CreatePlanAsync(superAdmin, Guid.NewGuid().ToString("N")[..8], price: 1000m);
        var subscriptionId = await AssignPlanAndGetSubscriptionIdAsync(superAdmin, tenantId, planId);

        var (_, invoiceBody, _) = await PostAsync("/api/v1/platform/invoices/generate", new
        {
            subscriptionId, taxAmount = 0m, lineItems = (object?)null, dueInDays = 14, taxRateCode = "STANDARD"
        }, superAdmin);
        var invoiceId = invoiceBody.GetProperty("data").GetProperty("id").GetString();
        invoiceBody.GetProperty("data").GetProperty("taxAmount").GetDecimal().Should().Be(50m);

        var (changeOk, _, _) = await PutAsync($"/api/v1/platform/tax-profiles/{profileId}/rates/{rateId}", new
        {
            name = "Standard Rate", percentage = 9.0m, isInclusive = false,
            effectiveFrom = new DateOnly(2018, 1, 1), effectiveTo = (DateOnly?)null, isActive = true
        }, superAdmin);
        changeOk.Should().BeTrue();

        // The already-issued invoice's tax snapshot must be completely unchanged.
        var (_, invoiceAfter, _) = await GetAsync($"/api/v1/platform/invoices/{invoiceId}", superAdmin);
        invoiceAfter.GetProperty("data").GetProperty("taxAmount").GetDecimal().Should().Be(50m);
        invoiceAfter.GetProperty("data").GetProperty("taxPercentage").GetDecimal().Should().Be(5.0m);
        invoiceAfter.GetProperty("data").GetProperty("total").GetDecimal().Should().Be(1050m);

        // A NEW invoice generated now, however, must reflect the new rate.
        var (_, newInvoiceBody, _) = await PostAsync("/api/v1/platform/invoices/generate", new
        {
            subscriptionId, taxAmount = 0m, lineItems = (object?)null, dueInDays = 14, taxRateCode = "STANDARD"
        }, superAdmin);
        newInvoiceBody.GetProperty("data").GetProperty("taxPercentage").GetDecimal().Should().Be(9.0m);
        newInvoiceBody.GetProperty("data").GetProperty("taxAmount").GetDecimal().Should().Be(90m);
    }

    // ---- exchange rates ----

    [Fact]
    public async Task ExchangeRate_ConvertAsync_SameCurrency_IsAlwaysIdentity_NoLookupNeeded()
    {
        // No AED/AED row is ever stored — ConvertAsync must still succeed via the identity
        // short-circuit rather than requiring (or inventing) a same-currency rate.
        using var scope = Factory.Services.CreateScope();
        var exchangeRateService = scope.ServiceProvider.GetRequiredService<RealEstateErp.Application.Localization.IExchangeRateService>();

        var result = await exchangeRateService.ConvertAsync(1234.56m, "AED", "AED");
        result.Succeeded.Should().BeTrue();
        result.Value.Should().Be(1234.56m);
    }

    [Fact]
    public async Task ExchangeRate_NoConfiguredRate_FailsClearly_NeverInventsOne()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var (ok, body, status) = await GetAsync($"/api/v1/platform/exchange-rates/latest?baseCurrency=AED&quoteCurrency=PKR&_r={Guid.NewGuid():N}", superAdmin);
        ok.Should().BeFalse();
        status.Should().Be(HttpStatusCode.NotFound);
        body.GetProperty("code").GetString().Should().Be("exchange_rate_not_found");
    }

    [Fact]
    public async Task ExchangeRate_SetThenGetLatest_RoundTrips_AndInverseIsExact()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var baseCode = $"X{Guid.NewGuid():N}"[..3].ToUpperInvariant();
        var quoteCode = $"Y{Guid.NewGuid():N}"[..3].ToUpperInvariant();

        var (setOk, setBody, _) = await PostAsync("/api/v1/platform/exchange-rates", new
        {
            baseCurrency = baseCode, quoteCurrency = quoteCode, rate = 3.6725m, effectiveAt = (DateTimeOffset?)null
        }, superAdmin);
        setOk.Should().BeTrue();

        var (getOk, getBody, _) = await GetAsync($"/api/v1/platform/exchange-rates/latest?baseCurrency={baseCode}&quoteCurrency={quoteCode}", superAdmin);
        getOk.Should().BeTrue();
        getBody.GetProperty("data").GetProperty("rate").GetDecimal().Should().Be(3.6725m);

        // No direct QUOTE->BASE row was ever set — the inverse is derived exactly (1/rate), not invented.
        var (inverseOk, inverseBody, _) = await GetAsync($"/api/v1/platform/exchange-rates/latest?baseCurrency={quoteCode}&quoteCurrency={baseCode}", superAdmin);
        inverseOk.Should().BeTrue();
        inverseBody.GetProperty("data").GetProperty("rate").GetDecimal().Should().Be(1m / 3.6725m);
    }

    // ---- reporting: no cross-currency mixing ----

    [Fact]
    public async Task Invoices_AcrossDifferentCurrencyTenants_EachKeepTheirOwnCurrency_NeverMixed()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var (_, tenantUae, _) = await CreateOrganizationWithCountryAsync("mix-uae", "AE");
        var (_, tenantPk, _) = await CreateOrganizationWithCountryAsync("mix-pk", "PK");

        var planAed = await CreatePlanAsync(superAdmin, Guid.NewGuid().ToString("N")[..8], price: 100m);
        var planUsd = await CreatePlanAsync(superAdmin, Guid.NewGuid().ToString("N")[..8], price: 100m);
        var subUae = await AssignPlanAndGetSubscriptionIdAsync(superAdmin, tenantUae, planAed);
        var subPk = await AssignPlanAndGetSubscriptionIdAsync(superAdmin, tenantPk, planUsd);

        var invUae = await PostAsync("/api/v1/platform/invoices/generate", new { subscriptionId = subUae, taxAmount = 0m, lineItems = (object?)null, dueInDays = 14 }, superAdmin);
        var invPk = await PostAsync("/api/v1/platform/invoices/generate", new { subscriptionId = subPk, taxAmount = 0m, lineItems = (object?)null, dueInDays = 14 }, superAdmin);

        // Plans in this fixture are all priced in USD (subscription currency is a snapshot of the
        // PLAN's currency, not the tenant's) — this test's point is tenant isolation: each invoice
        // keeps exactly its own subscription's currency, and the platform list never coalesces or
        // sums amounts across tenants into a single combined figure.
        invUae.Body.GetProperty("data").GetProperty("currency").GetString().Should().Be("USD");
        invPk.Body.GetProperty("data").GetProperty("currency").GetString().Should().Be("USD");

        var (_, listBody, _) = await GetAsync("/api/v1/platform/invoices", superAdmin);
        listBody.GetProperty("data").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Array);
        listBody.GetProperty("meta").GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(2);
    }
}
