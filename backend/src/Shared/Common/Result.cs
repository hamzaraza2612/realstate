namespace RealEstateErp.Shared.Common;

/// <summary>Application-layer outcome type so handlers can express expected failures (not-found, conflict, business-rule) without throwing for control flow.</summary>
public class Result
{
    public bool Succeeded { get; }
    public string? Error { get; }
    public string? ErrorCode { get; }

    protected Result(bool succeeded, string? error, string? errorCode)
    {
        Succeeded = succeeded;
        Error = error;
        ErrorCode = errorCode;
    }

    public static Result Success() => new(true, null, null);
    public static Result Failure(string error, string errorCode = "error") => new(false, error, errorCode);

    public static Result<T> Success<T>(T value) => new(value, true, null, null);
    public static Result<T> Failure<T>(string error, string errorCode = "error") => new(default, false, error, errorCode);
}

public class Result<T> : Result
{
    public T? Value { get; }

    internal Result(T? value, bool succeeded, string? error, string? errorCode) : base(succeeded, error, errorCode)
    {
        Value = value;
    }

    public static implicit operator Result<T>(T value) => Success(value);
}
