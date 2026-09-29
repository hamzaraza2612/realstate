using System.Collections.Concurrent;
using System.Text.Json;
using RealEstateErp.Application.Ai;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.IntegrationTests.Ai;

/// <summary>
/// A deterministic, scripted IAiProvider test double — this repository has no ANTHROPIC_API_KEY in
/// its sandbox, so no test here can (or claims to) exercise a real model. Registered as a Singleton
/// in CustomWebApplicationFactory, replacing whatever provider DependencyInjection would otherwise
/// choose, for every integration test. Tests enqueue exactly the completions they need with
/// EnqueueToolUse/EnqueueFinalText before calling the Ask endpoint; AiConversationService dequeues one
/// per model round trip, exactly as it would for a real provider. Deliberately lets a scripted final
/// text claim ANY number it likes (see the hallucination test) — the point is that AiMessage.FactsJson
/// must come from the tool result regardless of what this text says.
/// </summary>
public class FakeAiProvider : IAiProvider
{
    private readonly ConcurrentQueue<Result<AiCompletionResult>> _responses = new();

    public string ProviderName => "fake";
    public bool IsConfigured { get; set; } = true;

    public void Enqueue(Result<AiCompletionResult> response) => _responses.Enqueue(response);

    public void EnqueueToolUse(string toolName, object arguments) =>
        Enqueue(Result.Success(new AiCompletionResult(
            new List<AiContentBlock> { new AiToolUseContent(Guid.NewGuid().ToString("N"), toolName, JsonSerializer.SerializeToElement(arguments)) },
            "tool_use", "fake-model", 10, 10)));

    public void EnqueueFinalText(string text) =>
        Enqueue(Result.Success(new AiCompletionResult(
            new List<AiContentBlock> { new AiTextContent(text) }, "end_turn", "fake-model", 10, 10)));

    public void Reset()
    {
        while (_responses.TryDequeue(out _)) { }
        IsConfigured = true;
    }

    public Task<Result<AiCompletionResult>> CompleteAsync(AiCompletionRequest request, CancellationToken ct = default)
    {
        if (!IsConfigured)
            return Task.FromResult(Result.Failure<AiCompletionResult>("No AI provider is configured for this deployment.", "ai_provider_not_configured"));

        return Task.FromResult(_responses.TryDequeue(out var next)
            ? next
            : Result.Success(new AiCompletionResult(
                new List<AiContentBlock> { new AiTextContent("(fake provider: no more scripted responses)") }, "end_turn", "fake-model", 0, 0)));
    }
}
