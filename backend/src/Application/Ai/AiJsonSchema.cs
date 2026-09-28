using System.Text.Json;

namespace RealEstateErp.Application.Ai;

/// <summary>Tiny JSON-Schema builder so every IAiTool implementation declares its input shape as a
/// couple of lines instead of hand-writing JSON — every tool this milestone ships takes only
/// optional flat scalar filters (a date range, an optional project/entity id), so this deliberately
/// doesn't support nested objects/arrays.</summary>
public static class AiJsonSchema
{
    public record Prop(string Name, string Type, string Description, bool Required = false);

    public static JsonElement Object(params Prop[] props)
    {
        var properties = props.ToDictionary(p => p.Name, p => (object)new { type = p.Type, description = p.Description });
        var required = props.Where(p => p.Required).Select(p => p.Name).ToArray();
        return JsonSerializer.SerializeToElement(new { type = "object", properties, required });
    }

    public static readonly JsonElement Empty = JsonSerializer.SerializeToElement(new { type = "object", properties = new { } });

    public static Guid? TryGetGuid(this JsonElement arguments, string name) =>
        arguments.ValueKind == JsonValueKind.Object && arguments.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String && Guid.TryParse(v.GetString(), out var g) ? g : null;

    public static DateOnly? TryGetDate(this JsonElement arguments, string name) =>
        arguments.ValueKind == JsonValueKind.Object && arguments.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String && DateOnly.TryParse(v.GetString(), out var d) ? d : null;

    public static string? TryGetString(this JsonElement arguments, string name) =>
        arguments.ValueKind == JsonValueKind.Object && arguments.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
}
