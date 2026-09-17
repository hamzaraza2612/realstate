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

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
RUN useradd --uid 10001 --user-group appuser
COPY --from=build /app ./
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
USER appuser
ENTRYPOINT ["dotnet", "RealEstateErp.Api.dll"]
