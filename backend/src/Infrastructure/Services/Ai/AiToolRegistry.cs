using RealEstateErp.Application.Ai;

namespace RealEstateErp.Infrastructure.Services.Ai;

/// <summary>Resolves every registered IAiTool from DI (see DependencyInjection.cs) — adding a tool is
/// a one-line `services.AddScoped&lt;IAiTool, XTool&gt;()`, never a change here.</summary>
public class AiToolRegistry : IAiToolRegistry
{
    private readonly IReadOnlyList<IAiTool> _tools;

    public AiToolRegistry(IEnumerable<IAiTool> tools)
    {
        _tools = tools.ToList();
    }

    public IReadOnlyList<IAiTool> All => _tools;

    public IReadOnlyList<IAiTool> GetAvailableTools(IReadOnlySet<string> userPermissions) =>
        _tools.Where(t => t.RequiredPermission is null || userPermissions.Contains(t.RequiredPermission)).ToList();

    public IAiTool? Find(string name) => _tools.FirstOrDefault(t => t.Name == name);
}
