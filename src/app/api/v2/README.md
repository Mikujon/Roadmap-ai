# API v2 — Public Headless API

This directory will host the next generation of the RoadmapAI public API.

**Status:** Not yet implemented. Use `/api/v1/` for external integrations.

---

## Design Goals vs v1

| Concern | v1 (current) | v2 (planned) |
|---------|-------------|--------------|
| Response envelope | Inconsistent — some routes use `{ data, meta }`, others return raw | Standard `{ data, meta }` everywhere via `src/lib/api/response.ts` |
| Auth | `getApiAuth()` — Bearer token only | Bearer token + optional Clerk session (unified) |
| Validation | Ad-hoc `req.json()` casts | Zod schemas via `validateBody()` / `validateQuery()` |
| Error format | `{ error: string }` | `{ error: { code, message, status, details }, meta }` |
| Pagination | None | `PaginationSchema` — cursor-based on all list endpoints |
| Rate limiting | None | Per-org token bucket |
| Versioning | Path prefix `/api/v1/` | Path prefix `/api/v2/` |

---

## Planned Endpoints

```
GET  /api/v2/projects              — list projects (paginated)
GET  /api/v2/projects/:id          — single project with EVM
GET  /api/v2/projects/:id/sprints  — sprint breakdown
GET  /api/v2/projects/:id/risks    — risk registry
GET  /api/v2/projects/:id/health   — health report
GET  /api/v2/portfolio             — portfolio summary KPIs
GET  /api/v2/alerts                — org alerts (paginated)
POST /api/v2/ingest                — event ingestion (replaces /api/mcp/ingest)
```

---

## Infrastructure Already Available

The following utilities in `src/lib/api/` are ready to use:

- `response.ts` — `ok()`, `created()`, `noContent()`, `err()`, `Errors.*`
- `validate.ts` — `validateBody()`, `validateQuery()`, `PaginationSchema`, `IdParamSchema`
- `route-handler.ts` — `withAuth()`, `guard()`
- `client.ts` — type-safe frontend fetch wrapper

---

## Migration Path

When implementing a v2 endpoint:

1. Create `src/app/api/v2/<resource>/route.ts`
2. Import from `@/lib/api/response`, `@/lib/api/route-handler`, `@/lib/api/validate`
3. Use `withAuth()` wrapper for all handlers
4. Use Zod schema for body/query validation
5. Return `ok()` / `created()` / `Errors.*` — never raw `NextResponse.json()`

Reference implementations (v1 routes migrated to the new standard):
- `src/app/api/projects/route.ts`
- `src/app/api/projects/[id]/route.ts`
- `src/app/api/projects/[id]/health/route.ts`
