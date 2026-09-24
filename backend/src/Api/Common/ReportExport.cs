using System.Globalization;
using System.Reflection;
using System.Text;
using Microsoft.AspNetCore.Mvc;

namespace RealEstateErp.Api.Common;

/// <summary>
/// Export-format abstraction for reporting endpoints. CSV is the only implementation today
/// (Milestone 12's own scope); Excel/PDF are designed-for extension points — add a sibling
/// class implementing <see cref="IReportExporter"/> (e.g. an ExcelReportExporter using a
/// spreadsheet library) and register it in DI. Controllers resolve the requested exporter by
/// its <see cref="Format"/> string from <c>IEnumerable&lt;IReportExporter&gt;</c> via
/// <see cref="ReportExport.TryExport{T}"/> — no controller changes needed when a new format is added.
/// </summary>
public interface IReportExporter
{
    /// <summary>The `?format=` query value this exporter handles (e.g. "csv"), case-insensitive.</summary>
    string Format { get; }
    string ContentType { get; }
    string FileExtension { get; }
    byte[] Export<T>(IReadOnlyList<T> rows);
}

/// <summary>
/// Reflection-driven CSV export over any flat record/DTO: columns are the public readable
/// properties, in declaration order, header row is the property name. Values are culture-invariant
/// (dates as ISO 8601, decimals with '.' separator) so a re-import or another timezone's Excel
/// never misreads them. RFC 4180 quoting: a field containing a comma, quote, or newline is
/// wrapped in quotes with internal quotes doubled.
/// </summary>
public class CsvReportExporter : IReportExporter
{
    public string Format => "csv";
    public string ContentType => "text/csv";
    public string FileExtension => "csv";

    public byte[] Export<T>(IReadOnlyList<T> rows)
    {
        var properties = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(p => p.GetIndexParameters().Length == 0)
            .ToArray();

        var sb = new StringBuilder();
        sb.AppendLine(string.Join(',', properties.Select(p => Escape(p.Name))));

        foreach (var row in rows)
        {
            var values = properties.Select(p => Escape(FormatValue(p.GetValue(row))));
            sb.AppendLine(string.Join(',', values));
        }

        return new UTF8Encoding(encoderShouldEmitUTF8Identifier: true).GetBytes(sb.ToString());
    }

    private static string FormatValue(object? value) => value switch
    {
        null => "",
        DateOnly d => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        DateTimeOffset dto => dto.ToString("O", CultureInfo.InvariantCulture),
        DateTime dt => dt.ToString("O", CultureInfo.InvariantCulture),
        decimal m => m.ToString(CultureInfo.InvariantCulture),
        double d => d.ToString(CultureInfo.InvariantCulture),
        bool b => b ? "true" : "false",
        _ => value.ToString() ?? ""
    };

    private static string Escape(string value)
    {
        if (value.IndexOfAny(['"', ',', '\n', '\r']) < 0) return value;
        return "\"" + value.Replace("\"", "\"\"") + "\"";
    }
}

/// <summary>
/// Shared helper for report controller actions that support `?format=csv` export alongside the
/// normal JSON envelope. Only call this from actions whose result is a flat, tabular row list —
/// a single-object dashboard DTO isn't exported this way.
/// </summary>
public static class ReportExport
{
    /// <summary>Returns a CSV/Excel/PDF <see cref="FileContentResult"/> when <paramref name="format"/>
    /// names a registered exporter, or null when no format was requested (the caller should fall
    /// back to the normal JSON envelope) or the format is unrecognized (the caller should 400).</summary>
    public static FileContentResult? TryExport<T>(
        IEnumerable<IReportExporter> exporters, string? format, IReadOnlyList<T> rows, string fileBaseName)
    {
        if (string.IsNullOrWhiteSpace(format)) return null;

        var exporter = exporters.FirstOrDefault(e => string.Equals(e.Format, format, StringComparison.OrdinalIgnoreCase));
        if (exporter is null) return null;

        var content = exporter.Export(rows);
        return new FileContentResult(content, exporter.ContentType) { FileDownloadName = $"{fileBaseName}.{exporter.FileExtension}" };
    }
}
