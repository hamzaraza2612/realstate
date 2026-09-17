# Deployment

## Local development (without Docker)
Fastest inner loop — run Postgres via Docker (or a local install) and the two
apps directly with their own tooling.

```bash
# 1. Postgres (adjust if you already have one running)
docker run -d --name erp-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine

# 2. Backend
cd backend
dotnet ef database update --project src/Infrastructure --startup-project src/Api
dotnet run --project src/Api   # https://localhost:5080 (appsettings.Development.json)

# 3. Frontend
cd frontend
npm install
npm run dev                    # http://localhost:5173, proxies /api to :5080
```
`appsettings.Development.json` seeds a Super Admin (`superadmin@realestate-erp.local` /
`ChangeMe@123`) and a demo tenant (`SeedDemoData: true`) on first run — change
both before anything resembling production use.

## Docker Compose (full stack)
```bash
cp .env.example .env   # fill in real secrets — see comments in the file
docker compose build
docker compose up -d
```
This starts Postgres, Redis, the API, the built frontend (served by its own
Nginx), and a reverse-proxy Nginx on port 80 that routes `/api/*` and `/health`
to the API and everything else to the frontend. The API runs its EF Core
migrations and seeds the Super Admin/permission catalog automatically on
startup (`DbSeeder`) — no separate migration step needed.

Required `.env` values: `POSTGRES_PASSWORD`, `CONNECTION_STRING` (must match
the Postgres credentials), `JWT_SECRET` (32+ random chars — `openssl rand
-base64 48`), `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`. Never commit `.env`.

### Validated in this environment
The API's multi-stage Docker build was built and run end-to-end against a real
Postgres instance in this session (migrations, seeding, login, and `/health`
all verified over HTTP from inside the container). The `docker-compose.yml`
was validated with `docker compose config` (correct interpolation and service
graph). The frontend image and full `docker compose up` could not be built in
this sandboxed session specifically because its network policy blocks Docker
Hub (`docker.io`) — only `mcr.microsoft.com` is reachable here — so
`node:20-alpine`, `nginx:1.27-alpine`, `postgres:16-alpine`, and `redis:7-alpine`
could not be pulled. This is a restriction of the sandbox, not of the
Dockerfiles: a normal CI runner or workstation with standard internet access
pulls these images without issue. Re-run `docker compose build && docker
compose up` in such an environment to confirm the full stack before shipping.

## Database migrations
Always via EF Core — never hand-edit the schema.
```bash
cd backend
dotnet ef migrations add <Name> --project src/Infrastructure --startup-project src/Api
dotnet ef database update --project src/Infrastructure --startup-project src/Api
```
Migrations live in `backend/src/Infrastructure/Persistence/Migrations` and run
automatically on API startup in every environment (`DbSeeder.SeedAsync` calls
`Database.MigrateAsync()`), so a deploy only needs the new image — no manual
migration step in the pipeline.

## Backup / restore (PostgreSQL)
```bash
# Backup
docker compose exec postgres pg_dump -U postgres realestate_erp | gzip > backup-$(date +%F).sql.gz

# Restore (into an empty database)
gunzip -c backup-2026-01-01.sql.gz | docker compose exec -T postgres psql -U postgres realestate_erp
```
Schedule the backup command via cron/your platform's managed backup feature;
test restores periodically — an untested backup is not a backup.

## Health checks & monitoring readiness
- `GET /health` — liveness (used by the reverse proxy and can be wired to a
  load balancer / orchestrator health check).
- `GET /hangfire` (Development only) — background job dashboard.
- Serilog writes structured JSON-friendly logs to console; ship container
  stdout to your log aggregator of choice (no code change needed).
- `docker compose ps` / container health checks cover Postgres and Redis
  readiness; the API waits on both via `depends_on: condition: service_healthy`.

## Secrets
No secrets are committed. Local dev uses `appsettings.Development.json` with
clearly-fake values; Docker Compose reads everything from `.env` (gitignored);
a real deployment should inject `Jwt__Secret`, `ConnectionStrings__Default`,
and `SuperAdmin__Password` via your platform's secret manager rather than a
plain `.env` file on disk.
