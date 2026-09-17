FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY backend/RealEstateErp.sln ./backend/
COPY backend/src/Shared/RealEstateErp.Shared.csproj ./backend/src/Shared/
COPY backend/src/Domain/RealEstateErp.Domain.csproj ./backend/src/Domain/
COPY backend/src/Application/RealEstateErp.Application.csproj ./backend/src/Application/
COPY backend/src/Infrastructure/RealEstateErp.Infrastructure.csproj ./backend/src/Infrastructure/
COPY backend/src/Api/RealEstateErp.Api.csproj ./backend/src/Api/
COPY backend/tests/UnitTests/RealEstateErp.UnitTests.csproj ./backend/tests/UnitTests/
COPY backend/tests/IntegrationTests/RealEstateErp.IntegrationTests.csproj ./backend/tests/IntegrationTests/
RUN dotnet restore ./backend/src/Api/RealEstateErp.Api.csproj

COPY backend/. ./backend/
RUN dotnet publish ./backend/src/Api/RealEstateErp.Api.csproj -c Release -o /app --no-restore

# Optional target for running EF Core migrations from inside a container without needing the
# .NET SDK on the host: `docker compose --profile tools run --rm migrate`. Not part of the
# default `up`, since the api container already applies migrations automatically on startup —
# this exists for operators who want migrations as an explicit, separate step.
FROM build AS migrator
RUN dotnet tool install --global dotnet-ef --version 8.*
ENV PATH="${PATH}:/root/.dotnet/tools"
ENTRYPOINT ["dotnet", "ef", "database", "update", "--project", "backend/src/Infrastructure", "--startup-project", "backend/src/Api"]

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
RUN useradd --uid 10001 --user-group appuser \
    && mkdir -p /app/data/uploads \
    && chown -R appuser:appuser /app/data
COPY --from=build /app ./
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
# No curl/wget in this base image — bash (already present) with its /dev/tcp pseudo-device is
# enough for a real HTTP health probe without adding packages to the runtime image.
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
    CMD bash -c 'exec 3<>/dev/tcp/127.0.0.1/8080 && printf "GET /health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n" >&3 && head -n 1 <&3 | grep -q " 200 "' || exit 1
USER appuser
ENTRYPOINT ["dotnet", "RealEstateErp.Api.dll"]
