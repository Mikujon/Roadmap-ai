# RoadmapAI — Development Changelog

> Documento unico di tracciamento per tutte le versioni, modifiche e stato di sviluppo.  
> Aggiornare ad ogni sessione di sviluppo.

---

## Indice rapido

| Versione | Data | Commit | Descrizione |
|---------|------|--------|-------------|
| [v0.1](#v01--bootstrap) | 13 Mar 2026 | `8828188` | Bootstrap Next.js |
| [v0.2](#v02--core-engine) | 26 Mar 2026 | `c128834` | Engine finanziario, health score, governance |
| [v0.3](#v03--permissions) | 26 Mar 2026 | `d71036a` | Sistema permessi role-based |
| [v0.4](#v04--departments) | 26 Mar 2026 | `9770ea8` | Permessi + badge ruoli + architettura departments |
| [v0.5](#v05--pmo-suite) | 11 Apr 2026 | `fa7ddb4` | Monorepo, UI/UX overhaul, PMO feature suite completa |
| [v0.6](#v06--current) | — | `HEAD` | *(in corso — riorganizzazione root, refactor tab)* |

---

## v0.1 — Bootstrap

**Data:** 13 Marzo 2026  
**Commit:** `8828188`

### Aggiunto
- Scaffolding Next.js (App Router) via `create-next-app`
- Configurazione TypeScript, ESLint, PostCSS, Tailwind
- File statici base (`globals.css`, favicon, `public/`)
- `package.json` iniziale

### Stack iniziale
- Next.js 16 · TypeScript 5 · Tailwind CSS v4

---

## v0.2 — Core Engine

**Data:** 26 Marzo 2026  
**Commit:** `c128834`

### Database
- **Prisma schema** completo (`prisma/schema.prisma`) con 22 modelli:
  - `Organisation`, `User`, `Member`, `Invitation`
  - `Project`, `ProjectDependency`, `ProjectDepartment`
  - `Resource`, `Department`, `ResourceAssignment`
  - `Risk`, `Phase`, `Sprint`, `Feature`, `FeatureDependency`
  - `Activity`, `ProjectStatusLog`, `GuardianReport`
  - `Alert`, `ProjectSnapshot`, `DomainEvent`, `OutboxEvent`
- Connessione Neon Serverless (`src/lib/prisma.ts`) con pool ottimizzato
- Migrations applicate:
  - `20260313164115_init` — schema iniziale
  - `20260319103126_add_dependencies` — dipendenze feature/project
  - `20260319151358_add_financial_resource_risk` — motore finanziario

### Backend / Logica
- `src/lib/health.ts` — calcolo health score progetto (363 righe)
- `src/lib/guardian.ts` — Guardian AI core (291 righe)
- `src/lib/guardian-agent.ts` — agente Claude per analisi progetto (436 righe)
- `src/lib/metrics.ts` — EVM + metriche portfolio (227 righe)
- `src/lib/auth.ts` — `getAuthContext()` server-side via Clerk (74 righe)
- `src/lib/permissions.ts` — sistema permessi (35 righe)
- `src/lib/stripe.ts` — integrazione Stripe
- `src/lib/validations.ts` — schemi Zod

### Frontend — Pages
- `src/app/(app)/dashboard/page.tsx` — Dashboard principale
- `src/app/(app)/layout.tsx` — Layout app con sidebar
- `src/app/(app)/projects/new/page.tsx` — Wizard creazione progetto
- `src/app/(app)/settings/billing/page.tsx` — Gestione abbonamento

### Frontend — Project Views
- `src/app/(app)/projects/[id]/RoadmapClient.tsx` — Shell principale progetto (645 righe)
- `src/app/(app)/projects/[id]/FinancialsView.tsx` — Vista finanziaria (160 righe)
- `src/app/(app)/projects/[id]/GovernanceView.tsx` — Governance (184 righe)
- `src/app/(app)/projects/[id]/page.tsx` — Server page progetto

### Config
- `.neon` — configurazione Neon
- `prisma.config.ts` — config Prisma
- `skills-lock.json` — skills Claude Code

---

## v0.3 — Permissions System

**Data:** 26 Marzo 2026  
**Commit:** `d71036a`

### Modificato
- `src/app/(app)/layout.tsx` — refactor con nuovo sistema permessi
- `src/app/(app)/settings/billing/page.tsx` — riorganizzazione (219 → 199 righe)
- `src/app/(app)/settings/page.tsx` — aggiunta link sezioni settings
- `src/app/(app)/settings/team/page.tsx` — gestione team con ruoli
- `src/lib/permissions.ts` — logica ADMIN/MANAGER/VIEWER espansa

### Logica permessi
```
ADMIN    → canEdit: true  | canManage: true  | canViewFinancials: true
MANAGER  → canEdit: true  | canManage: false | canViewFinancials: true
VIEWER   → canEdit: false | canManage: false | canViewFinancials: false
```

---

## v0.4 — Departments & Role Badges

**Data:** 26 Marzo 2026  
**Commit:** `9770ea8`

### Modificato
- `src/app/(app)/layout.tsx` — cleanup sidebar (9 righe rimosse, semplificazione)

### Database
- Migration `20260326140327_add_project_category`
- Migration `20260326164229_add_department`
- Migration `20260327095347_add_project_department_requester`

---

## v0.5 — PMO Suite Completa

**Data:** 11 Aprile 2026  
**Commit:** `fa7ddb4`  
**Dimensione:** 256 file modificati, +24.644 righe

### Architettura
- Migrazione a **pnpm + Turborepo monorepo** (`apps/web`, `apps/worker`, `packages/*`)
- 7 pacchetti condivisi: `ai`, `core`, `engines`, `events`, `logger`, `metrics`, `queue`
- `turbo.json` con pipeline build/dev/lint
- Worker BullMQ (`apps/worker`) per: Guardian AI, alert sweep, matview refresh, outbox polling

### Design System
- **Font:** DM Sans + DM Mono (da Inter/Plus Jakarta Sans)
- **Palette:** `#006D6B` teal primario · `#F8FAFC` background · slate per testo
- **Animazioni CSS:** `fadeUp`, `kpi-card` hover lift, `decision-fade-out`, `modal-enter`, `section-fade`, `heat-cell`
- Tutti i file di stile aggiornati a DM Sans

### Database — Nuove migrations
| Migration | Data | Contenuto |
|-----------|------|-----------|
| `20260330081929` | 30 Mar | `Feature.assigneeId` |
| `20260401094746` | 1 Apr | Status `CLOSED` per progetti |
| `20260401102152` | 1 Apr | Lifecycle progetto (fasi lifecycle) |
| `20260401123109` | 1 Apr | `ProjectStatusLog` |
| `20260401130314` | 1 Apr | `GuardianReport` model |
| `20260402083824` | 2 Apr | Campi activity |
| `20260402105720` | 2 Apr | `Alert` model |
| `20260403203744` | 3 Apr | `ProjectSnapshot` |
| `20260407151758` | 7 Apr | `Risk.ownerId`, `Risk.category` |
| `20260408082831` | 8 Apr | Indici performance |
| `20260409000001` | 9 Apr | Domain events, RLS |
| `20260409000002` | 9 Apr | Materialized views, partizioni |

### Backend — Nuovi lib
- `src/lib/alert-engine.ts` — motore alert automatici (228 righe)
- `src/lib/closure-report.ts` — report chiusura progetto (109 righe)
- `src/lib/guardian-trigger.ts` — trigger Guardian AI (25 righe)
- `src/lib/activity.ts` — tracking attività (33 righe)
- `src/lib/rate-limit.ts` — rate limiting API (26 righe)
- `src/lib/anthropic.ts` — client Anthropic singleton (4 righe)

### API Routes — Nuove
```
GET/POST   /api/alerts                    — lista alert + mark-read
GET/POST   /api/alerts/[id]               — alert singolo
POST       /api/alerts/mark-all-read      — segna tutti letti
GET/POST   /api/billing/checkout          — checkout Stripe
GET/POST   /api/billing/portal            — portale cliente Stripe
GET        /api/cron/health-check         — cron health check
GET/PUT/DELETE /api/departments/[id]      — department CRUD
GET/POST   /api/departments               — lista departments
GET/POST   /api/dependencies/features     — dipendenze feature
GET/POST   /api/dependencies/projects     — dipendenze progetto
GET/PUT/DELETE /api/features/[id]         — feature CRUD
POST       /api/generate                  — generazione AI progetto
POST       /api/generate/decisions        — generazione decisioni AI
GET/POST   /api/guardian/[projectId]      — report Guardian
POST       /api/guardian/[projectId]/trigger — trigger manuale Guardian
POST       /api/guardian/alert            — crea alert Guardian
GET/POST   /api/guardian/tasks            — task queue Guardian
GET/POST   /api/invitations               — inviti team
GET        /api/metrics                   — metriche globali
GET/PUT    /api/org                       — settings organizzazione
GET        /api/portfolio                 — dati portfolio
GET        /api/portfolio/financials      — EVM portfolio
GET/POST   /api/projects                  — lista/crea progetti
GET/PUT/DELETE /api/projects/[id]         — progetto CRUD
GET/POST   /api/projects/[id]/alerts      — alert progetto
GET/POST   /api/projects/[id]/audit       — audit log
GET/POST   /api/projects/[id]/closure-report — report chiusura
GET/POST   /api/projects/[id]/departments — departments progetto
GET        /api/projects/[id]/export      — export PDF/JSON
GET/POST   /api/projects/[id]/financial   — dati finanziari
GET        /api/projects/[id]/health      — health score
GET/POST   /api/projects/[id]/raci        — matrice RACI
PUT/DELETE /api/projects/[id]/raci/[entryId] — voce RACI
GET/POST   /api/projects/[id]/resources   — risorse progetto
GET/POST   /api/projects/[id]/risks       — rischi
POST       /api/projects/[id]/scope-change — cambio scope
GET/POST   /api/projects/[id]/share       — link condivisione
GET/POST   /api/projects/[id]/snapshots   — snapshot storici
GET/POST   /api/resources                 — risorse globali
GET        /api/search                    — ricerca full-text
GET/PUT    /api/sprints/[id]              — sprint CRUD
GET        /api/users/me                  — profilo utente
POST       /api/webhooks/clerk            — webhook Clerk
POST       /api/webhooks/stripe           — webhook Stripe
```

### Frontend — Pages nuove/modificate
| File | Righe | Descrizione |
|------|-------|-------------|
| `(app)/layout.tsx` | 230 | Sidebar con health-dot, NotificationBell, SidebarNav |
| `(app)/TopbarClient.tsx` | — | ⌘K search, "?" shortcuts, role strip |
| `(app)/dashboard/page.tsx` | 119 | Command Center con AI decision feed |
| `(app)/portfolio/page.tsx` | 216 | EVM metrics, Health Heatmap grid |
| `(app)/archive/page.tsx` | — | Lista progetti archiviati |
| `(app)/archive/ClosureReport.tsx` | — | Report chiusura progetto |
| `(app)/cost/page.tsx` | — | Lista costi |
| `(app)/cost/new/page.tsx` | — | Nuovo costo |
| `(app)/cost/[id]/page.tsx` | — | Dettaglio costo |
| `(app)/onboarding/page.tsx` | — | Flusso onboarding |
| `(app)/settings/page.tsx` | — | Hub settings con link Integrations + Org |
| `(app)/settings/integrations/page.tsx` | — | Gestione integrazioni esterne |
| `(app)/settings/org/page.tsx` | — | Settings organizzazione |
| `(app)/settings/departments/page.tsx` | — | Gestione departments |
| `(app)/settings/team/page.tsx` | — | Gestione team e inviti |
| `(app)/alerts/` | — | Centro notifiche alert |

### Frontend — Project Views (Tabs)
I tab del progetto sono stati **completamente refactorizzati**:

| Tab (id) | Label | Componente | Righe |
|---------|-------|-----------|-------|
| `health` | Health & Decisions | `HealthDecisionsView.tsx` | 330 |
| `execution` | Execution | `BoardView.tsx` + `BacklogView.tsx` | 630 + 377 |
| `plan` | Plan & Roadmap | `TimelineView` (inline RoadmapClient) | ~100 |
| `financial` | Financial Intelligence | `FinancialsView.tsx` | 236 |
| `risks` | Risks & Dependencies | `RisksView` (inline RoadmapClient) | ~100 |
| ~~`history`~~ | ~~Governance~~ | `GovernanceView.tsx` (686 righe, non collegato) | ⚠️ |

> **Nota:** `GovernanceView.tsx` esiste (686 righe, con RACI Matrix + Audit Log) ma il tab `history` non è nell'array `TABS` — da ricollegare.

**Altre views progetto:**
- `OverviewView.tsx` — 385 righe (overview generale)
- `GuardianPanel.tsx` — 396 righe (pannello Guardian AI espanso)
- `ErrorBoundary.tsx` — 50 righe
- `useProject.ts` — hook dati progetto

### UI Components (`src/components/ui/`)
| File | Righe | Descrizione |
|------|-------|-------------|
| `toast.tsx` | 98 | Sistema toast (`toast(msg, variant)`) — success/error/warning/info |
| `global-search.tsx` | 196 | Modal ⌘K ricerca globale con nav frecce + Enter |
| `feature-modal.tsx` | 196 | Modal dettaglio feature (M12) |
| `project-modals.tsx` | 305 | Scope Change, Budget Update, Escalation, Export |
| `inactivity-modal.tsx` | 91 | Auto-logout dopo 30 min inattività |
| `keyboard-shortcuts.tsx` | 121 | Modal "?" con tutti i shortcut, focus trap |
| `kpi-card.tsx` | 59 | Card KPI con hover lift (`kpi-card` CSS class) |
| `status-badge.tsx` | 37 | Badge stato progetto/feature |
| `decision-item.tsx` | 74 | Voce decisione AI nel feed |
| `guardian-bar.tsx` | 55 | Strip Guardian AI in header progetto |
| `validation-inbox.tsx` | 76 | Inbox validazioni pending |

### Keyboard Shortcuts implementati
| Shortcut | Azione |
|----------|--------|
| `⌘K` / `Ctrl+K` | Ricerca globale |
| `?` | Modal shortcut |
| `G D` | Vai a Dashboard |
| `G P` | Vai a Portfolio |
| `N P` | Nuovo Progetto |
| `Esc` | Chiudi modal |
| `Tab` / `Shift+Tab` | Focus trap nei modal |

### Auth & Ruoli
- Clerk v7 con `getAuthContext()` server-side
- `preferredView` in DB: `PMO` / `CEO` / `STK` / `DEV`
- Org role: `ADMIN` / `MANAGER` / `VIEWER`
- `canEdit` = ADMIN || MANAGER — enforced in tutte le views
- Role strip nel Topbar con `CustomEvent("rolechange")` per sync cross-component

---

## v0.7 — API v2 Headless (HEAD)

**Data:** 3 Maggio 2026  
**Commit:** `HEAD`

### Aggiunto
- `src/lib/api/route-handler.ts` — aggiunto `withApiAuth()`: supporto Bearer (org API key) + Clerk session unificati
- `src/lib/api/route-handler.ts` — esportato tipo `ApiAuthCtx`
- `src/app/api/v2/projects/route.ts` — `GET /api/v2/projects` paginato, filtro status
- `src/app/api/v2/projects/[id]/route.ts` — `GET /api/v2/projects/:id` con EVM completo + fasi + team + Guardian
- `src/app/api/v2/projects/[id]/sprints/route.ts` — `GET /api/v2/projects/:id/sprints` con breakdown feature
- `src/app/api/v2/projects/[id]/risks/route.ts` — `GET /api/v2/projects/:id/risks` con score/level, filtro status
- `src/app/api/v2/projects/[id]/health/route.ts` — `GET /api/v2/projects/:id/health` con componenti health + Guardian
- `src/app/api/v2/portfolio/route.ts` — `GET /api/v2/portfolio` KPI portfolio da materialized view
- `src/app/api/v2/alerts/route.ts` — `GET /api/v2/alerts` paginato, filtro read/unread/level/project
- `src/app/api/v2/ingest/route.ts` — `POST /api/v2/ingest` ingestion con Zod (max 50 eventi, 8 sorgenti)
- `src/app/api/v2/README.md` — documentazione completa endpoint, auth, envelope

### Standard envelope v2
Tutti gli endpoint usano `{ data, meta: { timestamp, version } }` via `ok()` / `Errors.*`.
Auth: Bearer org API key **oppure** sessione Clerk.

---

## v0.6 — Current (HEAD)

**Data:** ~12-15 Aprile 2026  
**Commit:** non ancora committato / lavori in corso

### Cambiamenti strutturali
- **Migrazione monorepo → root:** tutti i file da `apps/web/src/` sono stati spostati a `src/` nella root
- `next.config.ts`, `package.json`, `pnpm-workspace.yaml` aggiornati per struttura flat
- `git status` mostra `D apps/web/...` — i file `apps/web/` sono stati rimossi dall'index git, quelli in `src/` sono unstaged/untracked

### Stato file chiave
- `src/app/(app)/projects/[id]/RoadmapClient.tsx` — 716 righe, tab refactorizzati (5 tab invece di 7)
- `GovernanceView.tsx` — presente (686 righe) ma tab `history` non visibile nell'UI
- `HealthDecisionsView.tsx` — nuovo file non presente nelle sessioni precedenti (330 righe)

### Da fare / Pendenti
- [ ] Ricollegare il tab **Governance** (`history`) in `RoadmapClient.tsx`
- [ ] Verificare integrazione `NotificationBell.tsx` nel topbar
- [ ] Verificare `MobileSidebar.tsx` su mobile
- [ ] Committare la migrazione root (tutti i `D apps/web/...` in git status)
- [ ] Aggiornare `MEMORY.md` con stato corrente

---

> **Intervento rapido?** Vedi [ARCHITECTURE.md](./ARCHITECTURE.md) — mappa ogni tipo di errore al file esatto dove intervenire.

---

## Struttura corrente del progetto

```
roadmap-ai/
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── layout.tsx              # Shell app (sidebar + topbar)
│   │   │   ├── TopbarClient.tsx        # Search, shortcuts, ruoli
│   │   │   ├── SidebarNav.tsx          # Nav con health dots
│   │   │   ├── NotificationBell.tsx    # Campanella alert
│   │   │   ├── MobileSidebar.tsx       # Sidebar mobile
│   │   │   ├── dashboard/              # Command Center
│   │   │   ├── portfolio/              # EVM + Heatmap
│   │   │   ├── projects/
│   │   │   │   ├── new/                # Wizard 4-step
│   │   │   │   └── [id]/
│   │   │   │       ├── RoadmapClient.tsx   # Shell tab progetto
│   │   │   │       ├── HealthDecisionsView.tsx
│   │   │   │       ├── BoardView.tsx       # Kanban DnD
│   │   │   │       ├── BacklogView.tsx     # Lista feature
│   │   │   │       ├── FinancialsView.tsx  # EVM + budget
│   │   │   │       ├── GovernanceView.tsx  # RACI + Audit ⚠️ non collegato
│   │   │   │       ├── OverviewView.tsx
│   │   │   │       └── GuardianPanel.tsx
│   │   │   ├── archive/                # Archivio + closure report
│   │   │   ├── cost/                   # Gestione costi
│   │   │   ├── alerts/                 # Centro notifiche
│   │   │   ├── onboarding/
│   │   │   └── settings/
│   │   │       ├── billing/
│   │   │       ├── team/
│   │   │       ├── departments/
│   │   │       ├── integrations/
│   │   │       └── org/
│   │   ├── api/                        # 35+ route groups
│   │   ├── globals.css                 # DM Sans, palette, animazioni
│   │   └── layout.tsx                  # Root layout + ToastProvider
│   ├── components/ui/                  # 11 componenti UI
│   └── lib/                            # 14 moduli backend
├── prisma/
│   ├── schema.prisma                   # 22 modelli
│   └── migrations/                     # 19 migrations
├── docs/
│   ├── CHANGELOG.md                    # ← questo file
│   ├── functional-analysis.md
│   └── technical-documentation.md
├── packages/                           # Monorepo packages (non attivi in root mode)
└── apps/worker/                        # BullMQ worker
```

---

## Come aggiornare questo documento

Ad ogni sessione di sviluppo aggiungere una sezione **vX.Y** con:

```markdown
## vX.Y — Titolo

**Data:** GG Mese AAAA  
**Commit:** `hash`

### Aggiunto
- ...

### Modificato
- `path/file.tsx` — descrizione cambiamento

### Rimosso
- ...

### Database
- Nuove migrations se presenti

### Note / Issues
- ...
```
