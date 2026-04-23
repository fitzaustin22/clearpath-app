# ClearPath — Claude Code context

## What this project is

ClearPath Divorce Financial LLC is a consumer-facing divorce financial education and planning practice owned by a CDFA® practitioner in Chantilly, Virginia. This codebase powers the **full ClearPath platform** — not just one brand.

### Three-brand architecture

| Brand | Audience | Purpose |
|---|---|---|
| **ClearPath for Women** | Women in financial transition (pre-divorce contemplation) | Consumer-facing curriculum, tools, and coaching |
| **ClearPath Pro** | CDFA practitioners nationwide | B2B white-label SaaS licensing of this platform |
| **ClearPath Divorce Financial LLC** | Legal, court, compliance contexts | Entity name only — not a consumer-facing brand |

The **consumer marketing site** (ClearPath for Women) is built on Google Stitch and lives at a separate domain. This Next.js app powers everything behind the marketing site: the interactive curriculum, calculator tools, AI assistant, client data pipeline, and the Pro licensing portal.

---

## Revenue funnel (three tiers)

| Tier | Product | Price | What it unlocks |
|---|---|---|---|
| Free | Lead magnets: Budget Gap Calculator, M1 content | $0 | Email capture only |
| Essentials | ClearPath Essentials — static toolkit | $97 one-time | Modules 1–3, worksheets, basic calculators |
| Full Access | ClearPath Full Access — AI-powered | $247 / 3mo auto-renew | All 7 modules, all interactive tools, Theo AI assistant, all PDF exports, Blueprint |

**Internal tier names (Supabase `public.users.tier`):** `free`, `essentials`, `navigator`. The DB value `navigator` represents Full Access — retained as the internal name per `Tier-Architecture-and-Gating-Map.md §3` migration note. Any legacy `signature` values are treated as Full Access equivalent. Clean rename to `full_access` is a post-launch task.

**Canonical reference:** `ClearPath LLC/Curriculum/Tier-Architecture-and-Gating-Map.md` (in the Obsidian vault) is the single source of truth for tier structure. This document mirrors it.

### Future add-ons (deferred, not v1)
- **CDFA 1:1 consulting** — $3,500+ per engagement; separate service layer, launches post-traction
- **Attorney Blueprint export** — one-time $499 add-on to Full Access; V2 post-launch; Harvey / LegalShield integration planned for V3
- **Monthly webinars** — community/retention feature, post-launch
- **ClearPath Pro** — B2B white-label licensing to other CDFAs, separate product roadmap

---

## Seven-module curriculum

All 7 modules feed a **Cumulative Data Pipeline** (JSON, per user). Data entered in M1 pre-populates M2 tools. M7 assembles everything into the ClearPath Financial Blueprint — the final consumer-ready deliverable.

| Module | Title | Tier gate | Key tools |
|---|---|---|---|
| M1 | Permission to Explore | Free | Life Transition Readiness Assessment, Budget Gap Calculator |
| M2 | Know What You Own | Essentials | Marital Estate Inventory, Asset Classification Wizard |
| M3 | Know What You Spend | Essentials | Budget Modeler, Financial Affidavit Builder |
| M4 | Tax Landscape | Full Access | Filing Status Optimizer, Point-in-Time Tax Discount Calculator, Tax-Adjusted Asset View |
| M5 | Value What Matters | Full Access | State-Configurable Support Estimator (VA/MD/DC/CA/NY), Marital Home Decision Analyzer, QDRO / Retirement Division Modeler |
| M6 | Negotiate from Strength | Full Access | Priorities Worksheet, Trade-Off Analyzer, Settlement Offer Evaluator |
| M7 | ClearPath Financial Blueprint | Full Access | Client Blueprint Generator (consumer-ready PDF, all 12 sections). Attorney Blueprint variant ($499 one-time add-on) deferred to V2. |

**Gating model:** Two render states per module — **Locked** or **Full**. The "conceptual/preview" state (sample-data read-only mode under the old Navigator tier) has been removed per the 2026-04-20 tier simplification. See `Tier-Architecture-and-Gating-Map.md §3` for the full gating matrix.

**Canonical data schema:** `curriculum-data.schema.v2.json` (in vault). Every tool reads and writes this schema. Never break the contract between modules.

---

## Tech stack (decided — do not deviate)

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Charts:** Recharts
- **Auth:** Clerk (multi-tenant, supports both consumer users and Pro practitioner orgs)
- **Billing:** Stripe Billing (one-time + recurring subscriptions)
- **Database:** Supabase (Postgres) with Row Level Security for user and tenant isolation
- **AI assistant:** Anthropic Claude API (claude-sonnet-4-20250514), RAG via Dify or custom pipeline
- **Deployment:** Vercel
- **Email/CRM:** ConvertKit or ActiveCampaign (API integration for drip sequences)
- **PDF generation:** React-PDF or Puppeteer (for Blueprint export)

---

## Multi-tenant architecture (ClearPath Pro)

Every licensed practitioner is a "tenant." Tenants are isolated at the DB layer via Row Level Security. Each tenant gets:

- Their own subdomain (e.g., `smith-cdfa.clearpath-pro.com`) or custom domain
- Brand config: logo URL, primary color, accent color, firm name, contact info
- Their own client roster — fully isolated from other tenants
- A Stripe subscription tied to their tenant ID
- The ability to swap the instructor video and firm branding without touching core logic

Brand tokens are injected via CSS variables at runtime from the tenant config. No separate codebase per tenant.

---

## Brand tokens (ClearPath default / fallback)

```
--color-primary:    #1B2A4A   /* Deep Ink Navy */
--color-accent:     #C8A96E   /* Warm Antique Gold */
--color-bg:         #FAF8F2   /* Soft Parchment */
--font-heading:     'Playfair Display', serif
--font-body:        'Source Sans Pro', sans-serif
```

---

## Cumulative Data Pipeline

Every tool writes structured output to a per-user JSON object keyed by module. Shape is defined in `curriculum-data.schema.v2.json`. Rules:

- **Never overwrite** prior module data when a later module saves
- **Pre-populate** later module inputs from earlier module outputs where mapped
- **Persist to Supabase** on every tool save — not just on module completion
- **Blueprint Generator** (M7) reads the entire object and renders all 12 sections
- **Forward-compatibility for V2 Attorney Blueprint:** Every calculation tool must persist its formula identifier, calculation assumptions, statutory/legal citations, and data-source attribution alongside the output values — not just the output numbers. Examples: PIT Calculator persists `{ formula: 'Sutherland PIT', TR, i, n, years_to_withdrawal_midpoint, citation: 'DJ Q2 2025' }` alongside the discount dollar amount; FSO persists the Dec 31 filing-status determination rule and governing IRS publication reference; M5 Support Estimator persists state statute citation, schedule version, and any income-imputation rules applied. The V1 Client Blueprint will not render these fields, but they must be present in the pipeline from day one so the V2 Attorney Blueprint ($499 add-on) can extract them without retrofitting tools. The schema may need an optional `metadata` object per tool output to accommodate this — audit `curriculum-data.schema.v2.json` and extend as part of M5 build; retrofit M1–M4 tools on their next touch.

---

## Theo — AI Teaching Assistant

- **Model:** Claude API (claude-sonnet-4-20250514)
- **RAG knowledge base:** CDFA curriculum, DFA Journal articles, IDFA methodology
- **System prompt must include:**
  - Compliance guardrails: no legal advice, no investment advice, no UPL
  - **Soft escalation trigger** — when a question exceeds curricular scope, Theo responds with a message along the lines of "this question is beyond the scope of my current capabilities" rather than speculating or upselling. Phrasing to be finalized in Theo spec.
  - **Hard escalation trigger** — mandatory for specific topics: QDRO, business valuation, domestic violence. Theo must decline and redirect.
- **Available to:** Full Access tier users only
- **Must log:** every query + response for compliance audit trail
- **Canonical spec:** `ClearPath LLC/Curriculum/Theo-AI-Assistant-Spec.md` (vault)

---

## Phase 1 scope — scaffold these first

1. Project structure and Supabase schema (users, tenants, module_progress, tool_data)
2. Clerk auth (consumer user + practitioner org flows)
3. Stripe: Essentials one-time + Navigator subscription + webhook handler
4. Tier gating middleware — 2 states (locked / full), 3 tiers (free / essentials / navigator-as-full-access)
5. Root layout with brand token injection (reads tenant config or uses ClearPath defaults)
6. M1 module shell: content display + Budget Gap Calculator + email capture gate
7. Practitioner dashboard stub (auth-gated, ClearPath Pro)

##
