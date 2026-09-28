using System.Text.Json;
using Anthropic;
using Anthropic.Exceptions;
using Anthropic.Models.Messages;
using Microsoft.Extensions.Options;
using RealEstateErp.Application.Ai;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Ai;

/// <summary>
/// The one real IAiProvider implementation this milestone ships — a thin, faithful mapping between
/// the provider-neutral Application.Ai types and the Anthropic Messages API, with no business logic
/// of its own (that all lives in AiConversationService). Registered only when Ai:Enabled=true and an
/// ApiKey is configured (see DependencyInjection); never called with a hardcoded key. See
/// docs/AI_ARCHITECTURE.md for the full provider-abstraction rationale.
/// </summary>
public class AnthropicAiProvider : IAiProvider
{
    private readonly AiSettings _settings;
    private readonly AnthropicClient _client;

    public AnthropicAiProvider(IOptions<AiSettings> settings)
    {
        _settings = settings.Value;
        _client = new AnthropicClient { ApiKey = _settings.ApiKey };
    }

    public string ProviderName => "anthropic";
    public bool IsConfigured => true;

    public async Task<Result<AiCompletionResult>> CompleteAsync(AiCompletionRequest request, CancellationToken ct = default)
    {
        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(_settings.TimeoutSeconds));

            var parameters = new MessageCreateParams
            {
                Model = _settings.Model,
                MaxTokens = _settings.MaxOutputTokens,
                Messages = request.Turns.Select(ToMessageParam).ToList(),
                Tools = request.Tools.Select(spec => (ToolUnion)ToTool(spec)).ToList(),
                System = string.IsNullOrWhiteSpace(request.System) ? null : request.System,
            };

            var response = await _client.Messages.Create(parameters, cancellationToken: timeoutCts.Token);

            var content = new List<AiContentBlock>();
            foreach (var block in response.Content)
            {
                switch (block.Value)
                {
                    case TextBlock text:
                        content.Add(new AiTextContent(text.Text));
                        break;
                    case ToolUseBlock toolUse:
                        var inputJson = JsonSerializer.SerializeToElement(toolUse.Input);
                        content.Add(new AiToolUseContent(toolUse.ID, toolUse.Name, inputJson));
                        break;
                }
            }

            var stopReason = response.StopReason.ToString() switch
            {
                "tool_use" => "tool_use",
                "end_turn" => "end_turn",
                _ => "other"
            };

            return Result.Success(new AiCompletionResult(
                content, stopReason, response.Model.ToString(),
                (int)response.Usage.InputTokens, (int)response.Usage.OutputTokens));
        }
        catch (OperationCanceledException)
        {
            return Result.Failure<AiCompletionResult>("The AI provider timed out.", "ai_provider_timeout");
        }
        catch (AnthropicRateLimitException)
        {
            return Result.Failure<AiCompletionResult>("The AI provider is rate-limiting requests. Please try again shortly.", "ai_rate_limited");
        }
        catch (Anthropic5xxException)
        {
            return Result.Failure<AiCompletionResult>("The AI provider is temporarily unavailable.", "ai_provider_unavailable");
        }
        catch (AnthropicApiException)
        {
            return Result.Failure<AiCompletionResult>("The AI provider rejected the request.", "ai_provider_error");
        }
        catch (Exception)
        {
            return Result.Failure<AiCompletionResult>("The AI provider could not complete the request.", "ai_provider_error");
        }
    }

    private static MessageParam ToMessageParam(AiMessageTurn turn) => new()
    {
        Role = turn.Role == "assistant" ? Role.Assistant : Role.User,
        Content = turn.Content.Select(ToContentBlockParam).ToList(),
    };

    private static ContentBlockParam ToContentBlockParam(AiContentBlock block) => block switch
    {
        AiTextContent text => new TextBlockParam { Text = text.Text },
        AiToolUseContent toolUse => new ToolUseBlockParam
        {
            ID = toolUse.Id,
            Name = toolUse.Name,
            Input = ToInputDictionary(toolUse.Input),
        },
        AiToolResultContent toolResult => new ToolResultBlockParam
        {
            ToolUseID = toolResult.ToolUseId,
            Content = toolResult.Content,
            IsError = toolResult.IsError,
        },
        _ => throw new NotSupportedException($"Unsupported content block type: {block.GetType().Name}")
    };

    private static IReadOnlyDictionary<string, JsonElement> ToInputDictionary(JsonElement input)
    {
        var dict = new Dictionary<string, JsonElement>();
        if (input.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in input.EnumerateObject())
            {
                dict[property.Name] = property.Value;
            }
        }
        return dict;
    }

    private static Tool ToTool(AiToolSpec spec)
    {
        var properties = new Dictionary<string, JsonElement>();
        var required = new List<string>();

        if (spec.InputSchema.TryGetProperty("properties", out var propsElement))
        {
            foreach (var property in propsElement.EnumerateObject())
            {
                properties[property.Name] = property.Value;
            }
        }
        if (spec.InputSchema.TryGetProperty("required", out var requiredElement))
        {
            required.AddRange(requiredElement.EnumerateArray().Select(e => e.GetString()!));
        }

        return new Tool
        {
            Name = spec.Name,
            Description = spec.Description,
            InputSchema = new() { Properties = properties, Required = required },
        };
    }
}
