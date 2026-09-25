namespace RealEstateErp.Infrastructure.Services.Communication;

/// <summary>Bound from the "Smtp" configuration section — environment variables in production
/// (Smtp__Host, Smtp__Username, Smtp__Password, etc.), appsettings.json locally. Enabled defaults to
/// false, so a deployment that never configures SMTP keeps using LoggingEmailSender automatically;
/// tests never set this to true, so no test ever needs a real mail server. See docs/SAAS_BILLING.md.</summary>
public class SmtpSettings
{
    public const string SectionName = "Smtp";
    public bool Enabled { get; set; }
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string FromAddress { get; set; } = "";
    public string FromName { get; set; } = "Real Estate ERP";
    public int TimeoutSeconds { get; set; } = 15;
    public int MaxRetries { get; set; } = 2;
}
