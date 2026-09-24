namespace RealEstateErp.Application.Notifications;

/// <summary>
/// Reusable, code-defined message templates per notification category — the foundation-scope
/// equivalent of a template system: consistent wording without a database-editable template CMS,
/// which is a reasonable v1 scope for a platform primitive most modules will each use once or twice.
/// </summary>
public static class NotificationTemplates
{
    public static (string Title, string Body) ApprovalRequested(string entityType, string? requestComments) =>
        ($"Approval needed: {entityType}",
         string.IsNullOrWhiteSpace(requestComments)
             ? $"A {entityType} is waiting for your approval."
             : $"A {entityType} is waiting for your approval. Note: {requestComments}");

    public static (string Title, string Body) ApprovalDecided(string entityType, bool approved, string? decisionComments) =>
        ($"{entityType} {(approved ? "approved" : "rejected")}",
         string.IsNullOrWhiteSpace(decisionComments)
             ? $"Your {entityType} request was {(approved ? "approved" : "rejected")}."
             : $"Your {entityType} request was {(approved ? "approved" : "rejected")}. Note: {decisionComments}");

    public static (string Title, string Body) DocumentUploaded(string entityType, string documentTitle) =>
        ($"New document on {entityType}", $"\"{documentTitle}\" was uploaded.");
}
