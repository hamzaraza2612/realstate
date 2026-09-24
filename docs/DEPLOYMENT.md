# Deployment

## Production deployment procedure (Docker Compose)
This is the supported production path. The only host dependencies are Docker
and the Docker Compose plugin — no .NET SDK, Node, or PostgreSQL client needs
to be installed on the host.

```bash
git clone <repo-url> && cd realstate
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD, CONNECTION_STRING (same password), JWT_SECRET
# (openssl rand -base64 48), SUPERADMIN_EMAIL/PASSWORD, CORS_ALLOWED_ORIGINS__0
# (your public URL), and HTTP_PORT if 80 is taken. Never commit .env.

docker compose up -d --build
```
That single command builds the API and frontend images and starts Postgres,
Redis, the API, the frontend, and the reverse-proxy Nginx — the only
published port is `HTTP_PORT` (default `80`) on the `nginx` service; every
other service is reachable only from other containers on the internal
`backend-net` network, addressed by Docker service name (`postgres`, `redis`,
`api`, `web`) rather than `localhost` or a hard-coded IP. Open
`http://<host>:${HTTP_PORT}/` — Nginx routes `/api/*` and `/health` to the API
and everything else to the built frontend. On first boot the API container
applies all EF Core migrations and seeds the Super Admin account and full
permission catalog automatically (`DbSeeder`) — there is no separate manual
migration step for a fresh deploy.

Check everything came up healthy:
```bash
docker compose ps          # every service should show "healthy" once start_period elapses
curl -f http://localhost:${HTTP_PORT:-80}/health
```

### Redeploying after a code change
```bash
git pull
docker compose up -d --build   # rebuilds only what changed, restarts those services
```
The api container re-applies migrations on every restart (idempotent — a
migration that's already applied is a no-op), so a new schema version rolls
out with the same command.

### What's deliberately not in the production Compose file
No bind-mounted source code, no dev-only ports (Postgres/Redis are not
published to the host), no `dotnet watch`/`npm run dev`, and Swagger and the
Hangfire dashboard stay off (`ASPNETCORE_ENVIRONMENT=Production` in `.env` —
both are gated to `Development` in `Program.cs`). If you want a local dev
override (exposed DB port, live-reloading frontend), add a
`docker-compose.override.yml` of your own rather than editing this file —
keep `docker-compose.yml` production-clean.

## Local development (without Docker, fastest inner loop)
```bash
# 1. Postgres (adjust if you already have one running)
docker run -d --name erp-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine

# 2. Backend
cd backend
dotnet ef database update --project src/Infrastructure --startup-project src/Api
dotnet run --project src/Api   # http://localhost:5080 (appsettings.Development.json)

# 3. Frontend
cd frontend
npm install
npm run dev                    # http://localhost:5173, proxies /api to :5080
```
`appsettings.Development.json` seeds a Super Admin (`superadmin@realestate-erp.local` /
`ChangeMe@123`) and a demo tenant (`SeedDemoData: true`) on first run — change
both before anything resembling production use.

## Database migrations
Always via EF Core — never hand-edit the schema.

**Authoring a new migration** (needs the .NET SDK — a dev-machine/CI step, not
a container-runtime step):
```bash
cd backend
dotnet ef migrations add <Name> --project src/Infrastructure --startup-project src/Api
```
Commit the generated migration under `backend/src/Infrastructure/Persistence/Migrations`.

**Applying migrations** — two supported paths, both run inside a container,
never requiring `dotnet`/`dotnet-ef` on the host:
1. **Automatic (default)**: the `api` container calls `Database.MigrateAsync()`
   on every startup. This is what makes `docker compose up -d --build` alone
   sufficient for a fresh deploy or an upgrade.
2. **Manual/explicit**, for operators who want migrations as their own step
   (e.g. immediately before rolling out a new api image to multiple
   replicas, or to review `dotnet ef`'s output outside the app's own logs):
   ```bash
   docker compose --profile tools run --rm migrate
   ```
   This builds the `migrator` target of `backend/src/Api/Dockerfile` (the SDK
   image with the `dotnet-ef` tool installed) and runs `dotnet ef database
   update` against `CONNECTION_STRING` from `.env`. It is not part of the
   default `up` — it only runs when explicitly invoked.

## Persistent data
Two named Docker volumes, both declared in `docker-compose.yml` and
untouched by `docker compose down` (only `docker compose down -v` removes
them — never run that against a production stack without a fresh backup):
- `postgres-data` → `/var/lib/postgresql/data` on the `postgres` container —
  the entire database.
- `uploads-data` → `/app/data/uploads` on the `api` container (`Storage__LocalPath`)
  — used by the Documents module (Milestone 11); file uploads persist across
  container recreation/redeploys instead of living in the container's
  writable layer. Two more `Storage:` settings are configurable in
  `appsettings.json` (not currently surfaced as `.env` variables, since the
  defaults are sane for most deployments): `MaxFileSizeMb` (default 25) and
  `AllowedContentTypes` (an explicit allow-list). Running more than one `api`
  replica requires either this volume mounted read/write on every replica at
  the same path, or swapping the registered `IFileStorageService` for an
  S3/Blob implementation — a single replica with a local volume is the
  supported configuration today.

## Backup / restore

### PostgreSQL
```bash
# Backup
docker compose exec postgres pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-realestate_erp}" \
  | gzip > backup-db-$(date +%F).sql.gz

# Restore (into an empty database)
gunzip -c backup-db-2026-01-01.sql.gz \
  | docker compose exec -T postgres psql -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-realestate_erp}"
```

### Uploaded files (`uploads-data` volume)
```bash
# Backup — tars the volume's contents via a throwaway Alpine container
docker run --rm -v realstate_uploads-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/backup-uploads-$(date +%F).tar.gz -C /data .

# Restore (into an existing, empty volume)
docker run --rm -v realstate_uploads-data:/data -v "$PWD":/backup alpine \
  tar xzf /backup/backup-uploads-2026-01-01.tar.gz -C /data
```
(The volume name is prefixed with the Compose project name — `realstate_` by
default; run `docker volume ls` to confirm yours if you renamed the project.)

Schedule both backup commands via cron or your platform's managed backup
feature, store them off-host, and **test restores periodically** — an
untested backup is not a backup.

## Health checks & service dependencies
Every long-running service defines a container `HEALTHCHECK`, and dependents
wait on that health via `depends_on: condition: service_healthy` — so
`docker compose up -d` brings services up in the right order and Nginx never
starts routing to an API or frontend that isn't ready yet:

| Service | Health check | Depends on (healthy) |
|---|---|---|
| `postgres` | `pg_isready` | — |
| `redis` | `redis-cli ping` | — |
| `api` | `GET /health` (probed with bash's `/dev/tcp`, no extra packages) | `postgres`, `redis` |
| `web` | `GET /healthz` (via `wget`, bundled with the Alpine image) | `api` |
| `nginx` | `GET /nginx-health` (checks Nginx itself, not just upstreams) | `api`, `web` |

`GET /health` on the public Nginx origin proxies through to the API for
external load-balancer/uptime checks. `GET /hangfire` (background job
dashboard) is intentionally Development-only and not exposed in production.
Serilog writes structured logs to container stdout — ship that to your log
aggregator of choice, no code change needed.

## Restart policies
`postgres`, `redis`, `api`, `web`, and `nginx` all use `restart: unless-stopped`
(auto-recover from a crash or host reboot, but stay down if an operator
explicitly stops them). The one-off `migrate` service uses `restart: "no"` —
a migration job should run once and exit, never loop.

## Frontend → API communication
The frontend calls the API via `VITE_API_BASE_URL` (baked in at image build
time, default `/api/v1` — a same-origin relative path routed by the
reverse-proxy Nginx to the `api` service). It is never hard-coded to
`localhost` or a container IP; override the build arg only if you split the
frontend and API across different public origins.

## Secrets
No secrets are committed. Local dev uses `appsettings.Development.json` with
clearly-fake values; Docker Compose reads everything from `.env` (gitignored,
and every required variable is enforced with `:?` in `docker-compose.yml` —
compose refuses to start with a placeholder missing). A real deployment
should inject `Jwt__Secret`, `ConnectionStrings__Default`, and
`SuperAdmin__Password` via your platform's secret manager rather than a plain
`.env` file on disk.

## Validated in this environment
This session's sandbox blocks two things a normal host/CI runner allows: (1)
pulling images from Docker Hub (`docker.io`) — only `mcr.microsoft.com` is
reachable, so `postgres:16-alpine`, `redis:7-alpine`, `node:20-alpine`, and
`nginx:1.27-alpine` could not be freshly pulled here; and (2) essentially all
outbound network access from *inside* a container's build/run steps (even to
this session's own local proxy), so a truly from-scratch `dotnet restore`/
`npm ci` could not be re-verified here either. Neither is a defect in these
Dockerfiles or in `docker-compose.yml` — both are this sandbox's network
policy, not something to route around.

What *was* verified end-to-end here, against a real PostgreSQL instance:
`docker build` of the API image, running that container with the production
entrypoint (migrations + Super Admin seeding + Hangfire init on startup all
executed for real), its `HEALTHCHECK` reporting `healthy` via `docker
inspect`, a real login over HTTP returning a valid JWT, `GET /health`
returning `200`, and the `uploads-data` volume mounting with correct
non-root (`appuser`) ownership. `docker compose config` (both the default
profile and `--profile tools`) was validated for correct variable
interpolation and the full service/volume/network graph, including the new
`migrate` one-off service staying out of the default `up`.

Re-run `docker compose up -d --build` on a normal machine or CI runner (any
environment with standard internet access) to confirm the full five-service
stack — that command is expected to, and by construction should, work
there without modification.
