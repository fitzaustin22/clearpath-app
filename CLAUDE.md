# ClearPath Pro — Claude Code context
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

## Revenue funnel (four tiers)

| Tier | Product | Price | What it unlocks |
|---|---|---|---|
| Free | Lead magnets: Budget Gap Calculator, M1 content | $0 | Email capture only |
| Essentials | ClearPath Essentials — static toolkit | $97 one-time | Modules 1–3, worksheets, basic calculators |
| Navigator | ClearPath Navigator — AI-powered | $247 / 3mo auto-renew | Modules 1–6, AI knowledge base, advanced tools |
| Signature | Full CDFA engagement | $3,500+ | All 7 modules + live CDFA sessions + Blueprint |

Navigator replaces group coaching. It uses a proprietary AI assistant trained on CDFA curriculum with compliance guardrails and escalation logic to Signature.

---

## Seven-module curriculum

All 7 modules feed a **Cumulative Data Pipeline** (JSON, per user). Data entered in M1 pre-populates M2 tools. M7 assembles everything into the ClearPath Financial Blueprint — the final attorney-ready deliverable.

| Module | Title | Tier gate | Key tools |
|---|---|---|---|
| M1 | Permission to Explore | Free | Life Transition Readiness Assessment, Budget Gap Calculator |
| M2 | Know What You Own | Essentials | Marital Estate Inventory, Asset Classification Wizard |
| M3 | Know What You Spend | Essentials | Budget Modeler, Financial Affidavit Builder |
| M4 | Tax Landscape | Navigator | Filing Status Optimizer, Point-in-Time Tax Discount Calculator |
| M5 | Value What Matters | Navigator | Home Decision Analyzer, Retirement Division Modeler |
| M6 | Negotiate from Strength | Navigator | Priorities Worksheet, Settlement Offer Evaluator |
| M7 | ClearPath Financial Blueprint | Signature | Blueprint Generator (all prior data → attorney-ready PDF) |

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

---

## ClearPath Navigator AI

- Model: Claude API (claude-sonnet-4-20250514)
- RAG knowledge base: CDFA curriculum, DFA Journal articles, IDFA methodology
- System prompt must include: compliance guardrails (no legal advice, no investment advice, no UPL), soft escalation trigger (surfaces Signature CTA when complexity threshold is hit), hard escalation trigger (mandatory for specific topics: QDRO, business valuation, domestic violence)
- Available to: Navigator and Signature tier users only
- Must log: every query + response for compliance audit trail

---

## Phase 1 scope — scaffold these first

1. Project structure and Supabase schema (users, tenants, module_progress, tool_data)
2. Clerk auth (consumer user + practitioner org flows)
3. Stripe: Essentials one-time + Navigator subscription + webhook handler
4. Tier gating middleware (free / essentials / navigator / signature)
5. Root layout with brand token injection (reads tenant config or uses ClearPath defaults)
6. M1 module shell: content display + Budget Gap Calculator + email capture gate
7. Practitioner dashboard stub (auth-gated, ClearPath Pro)

##