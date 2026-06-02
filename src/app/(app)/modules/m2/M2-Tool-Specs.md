---
type: build-prompt
module: m2
status: ready-to-build
tool: Claude Code
created: 2026-04-08
revenue_stream: essentials-tier, navigator-tier, signature-tier
clearpath_pro_licensable: true
tags:
  - inventory
  - checklist
  - asset-classification
  - personal-property
  - m2
  - essentials
  - navigator
  - signature
---
# M2: Know What You Own — Tool Specifications

> **Module context:** M2 is the first paid module in the ClearPath for Women curriculum. It serves women who have moved past contemplation and into active preparation — she has either paid for Essentials ($97), subscribed to Navigator ($247/3mo), or is in a Signature engagement ($3,500+). The three tools below live at **Essentials tier and above** (see [[Tier-Architecture-and-Gating-Map]]). At Essentials, the tools function as interactive worksheets. At Navigator, the AI layer adds classification guidance and commingling prompts. At Signature, M2 data feeds the Marital Balance Sheet deliverable.
>
> **Brand voice:** Apply ClearPath voice per `Frameworks/Brand Voice.md`. All four attributes — Clear, Steady, Expert, Warm — are active. For M2 specifically, dial up **Clear** and **Expert**, dial down **Warm** slightly. The user at M2 has committed (she paid). She's past the hand-holding stage and ready for structured work. See §5 "By situation: Curriculum/education" — teach like a patient professor. Define terms on first use.
>
> **Data contract:** All three tools write to `curriculum-data.schema.v2.json` under `modules.m2`. Never break the contract between modules. Downstream consumers include M5 (Value What Matters), M7 (Blueprint), the AI Navigator, and the Signature-tier Marital Balance Sheet.
>
> **Grounded in:** IDFA Asset and Liability Comparison Worksheet (11 pages, full asset/liability taxonomy), IDFA Charting Assets Worksheet (classification fields: date acquired, titleholder, cost, source of payment), IDFA Household Inventory Worksheet (room-by-room personal property), CDFA Coursework — Property and Related Tax Issues (marital vs. separate property, commingling, equitable distribution, hidden assets, IRC §1041, Martha and Tom case study).
>
> **Font dependencies:** All three tools require Playfair Display (700 weight) and Source Sans Pro (400, 600 weights). Load via Google Fonts in the app's `<head>` with `font-display: swap` to prevent invisible text during load. This is an app-level dependency — confirm fonts are loaded before building these components.
>
> **Loading state (all three tools):** On initial load, display a centered Gold (#C8A96E) spinner on Parchment (#FAF8F2) background while the Zustand store hydrates from Supabase. Minimum 300ms display to prevent layout flash. This matches the M1 loading pattern. Apply the same loading state when navigating between M2 tools if the store needs to re-hydrate.

---

## M2 Module Page and Navigation

### Module Landing Page (`/modules/m2`)

The M2 landing page is the entry point for all three tools. It provides orientation, shows progress across all three tools, and guides the user through the recommended sequence.

**Layout:**
- Module title: "Know What You Own" (Playfair Display, 28px, Navy)
- Module description (Source Sans Pro, 16px, Navy): "Before you can make good decisions about dividing assets, you need a complete picture of what exists. This module walks you through three steps: gathering your documents, building your asset inventory, and cataloging your personal property."
- Three tool cards, stacked vertically (max-width 700px centered; on desktop > 1024px, display as a 3-column row instead), each containing:
  - Tool name (Playfair Display, 20px, Navy)
  - One-line description (Source Sans Pro, 14px, Navy at 70%):
    - Tool 1: "Track every document you need — tax returns, account statements, deeds, and more."
    - Tool 2: "Map every asset and debt, classify them, and see the full picture of your marital estate."
    - Tool 3: "Go room by room through your household and catalog what's there."
  - Progress indicator: mini progress bar + percentage (overallProgress for Tool 1, completenessScore for Tool 2, inventoryCompleteness for Tool 3). Show "Not started" if the tool has no `startedAt` value.
  - Status chip: "Not started" (Navy at 20% opacity) / "In progress" (Gold) / "Complete" (Surplus green). Complete = 100% overallProgress for Tool 1, completenessScore > 90% for Tool 2, inventoryCompleteness > 80% for Tool 3.
  - Click navigates to the tool's sub-route.

- Recommended flow displayed above the cards as a horizontal stepper: three numbered circles (32px diameter, Navy border, Parchment fill, Navy number) connected by a 2px Navy-at-20%-opacity horizontal line. Labels below each circle: "Gather documents", "Build inventory", "Personal property" (Source Sans Pro, 13px, Navy at 70%). On mobile (< 640px), the stepper stacks vertically with a vertical connecting line.

**Tier indicator:** Below the module description, show the user's current tier and what it includes:
- Essentials: "You have access to all three worksheets. Upgrade to Navigator for AI-guided classification and education. [Learn about Navigator →]"
- Navigator: "You have full access including AI-powered classification and education."
- Signature: "You have full access. Your CDFA practitioner will use your inventory data to build your Marital Balance Sheet."

### Tool Routing

Each tool lives at its own sub-route:
- `/modules/m2/checklist` → Documentation Checklist (Tool 1)
- `/modules/m2/inventory` → Marital Estate Inventory (Tool 2)
- `/modules/m2/personal-property` → Personal Property Inventory (Tool 3)

Each tool page includes:
- A back link at the top left: "← Back to Know What You Own" → navigates to `/modules/m2`
- The tool component fills the main content area
- Cross-tool CTAs (e.g., "Start the Marital Estate Inventory →") navigate to the target tool's sub-route

**File structure:**
```
src/app/modules/m2/
  page.jsx                    // M2 landing page
  checklist/page.jsx          // Tool 1
  inventory/page.jsx          // Tool 2
  personal-property/page.jsx  // Tool 3

src/components/m2/
  DocumentationChecklist.jsx  // Tool 1 component
  MaritalEstateInventory.jsx  // Tool 2 component
  PersonalPropertyInventory.jsx // Tool 3 component
  M2ModulePage.jsx            // Landing page component
  M2ToolCard.jsx              // Reusable card for landing page

src/stores/
  m2Store.js                  // Shared Zustand store for all M2 tools
```

---

## Tool 1: Documentation Checklist

### Purpose

A progress-tracked checklist of every document a woman needs to gather before she can build a complete financial picture. This is the "homework assignment" — the structured starting point that transforms an overwhelming task ("get all your financial documents") into a finite, checkable list. The checklist answers the question: "What exactly do I need, and how do I find it?"

Available at **Essentials tier** and above. No email gate (user is already authenticated and paid).

### Instructions

Build a professional React component (.jsx) called "Documentation Checklist" for the ClearPath for Women curriculum app. This is the first tool a user encounters in M2 and the simplest of the three — designed as the build warm-up.

> **Grounded in:** CDFA Coursework — Property and Related Tax Issues, Lesson 2 ("How to Inventory Assets"), which specifies the document categories a client needs to collect. Also informed by the IDFA Asset and Liability Comparison Worksheet categories (which define WHAT documents correspond to which asset types) and the CDFA Getting Started Checklist (practitioner-facing, adapted here for client-facing use).

---

### THE CHECKLIST MODEL

**8 categories, 42 document items total.**

Each item has:
- `id`: string, format `doc-{category}-{nn}` (e.g., `doc-tax-01`)
- `category`: one of 8 category keys
- `label`: display name of the document
- `helperText`: one-sentence explanation of what this document is and why it matters (shown on expand/tap)
- `status`: enum `"not-started" | "located" | "collected" | "not-applicable"`
- `notes`: optional free-text field (user can add where the document is, who to contact, etc.)

**Status definitions (displayed in a legend at the top of the checklist):**
| Status | Icon | Color | Meaning |
|---|---|---|---|
| Not started | ○ (empty circle) | Navy at 40% opacity | Haven't looked for this yet |
| Located | ◐ (half circle) | Gold (#C8A96E) | Know where it is but don't have a copy |
| Collected | ● (filled circle) | Surplus green (#2D8A4E) | Have a copy in hand |
| Not applicable | — (dash) | Navy at 30% opacity | Doesn't apply to my situation |

---

### CATEGORY 1 — Tax Returns (6 items)

| ID | Document | Helper Text |
|---|---|---|
| doc-tax-01 | Federal income tax returns (last 3 years) | "Your tax returns are the single most important financial document in divorce. They show income sources, deductions, and investments — and they're the first place a CDFA looks for hidden assets." |
| doc-tax-02 | State income tax returns (last 3 years) | "State returns may show income or deductions not visible on the federal return, especially if you or your spouse have income in multiple states." |
| doc-tax-03 | All W-2s (last 3 years) | "W-2s confirm salary, bonuses, and employer benefits. Compare them to the tax return to make sure nothing was left off." |
| doc-tax-04 | All 1099s (last 3 years) | "1099s reveal investment income, freelance income, rental income, and interest — income sources that may not show up on a pay stub." |
| doc-tax-05 | Business tax returns — Schedule C, Form 1065, 1120/1120S (last 3 years, if applicable) | "If your spouse owns a business, these returns show revenue, expenses, depreciation, and distributions. Depreciation is not a cash expense — it can mask real income." |
| doc-tax-06 | Any amended returns (last 5 years) | "Amended returns can reveal changes to income or deductions that were made after the original filing. Review these carefully." |

---

### CATEGORY 2 — Income Documentation (5 items)

| ID | Document | Helper Text |
|---|---|---|
| doc-inc-01 | Most recent pay stubs (both spouses) | "Pay stubs show current salary, deductions, retirement contributions, and year-to-date earnings. Get the most recent available." |
| doc-inc-02 | Bonus and commission documentation | "Bonuses and commissions can be a significant portion of income. Get documentation of the schedule, formula, and amounts for the last 2–3 years." |
| doc-inc-03 | Stock option and RSU grant documentation | "If either spouse has stock options or restricted stock units, you need the grant agreements, vesting schedules, and current values. These can be among the most valuable marital assets." |
| doc-inc-04 | Rental income documentation | "If you own rental property, gather lease agreements, rental income records, and expense documentation for each property." |
| doc-inc-05 | Any other income documentation (Social Security statements, pension estimates, deferred compensation) | "Include anything that generates or will generate income: Social Security statements (available at ssa.gov), pension benefit estimates, deferred compensation agreements." |

---

### CATEGORY 3 — Bank and Cash Accounts (5 items)

| ID | Document | Helper Text |
|---|---|---|
| doc-bank-01 | Checking account statements (all accounts, last 12 months) | "Review for recurring deposits, automatic transfers, and large withdrawals. Don't forget accounts used for specific purposes — holiday funds, property tax escrow, etc." |
| doc-bank-02 | Savings account statements (all accounts, last 12 months) | "Include money market accounts, CDs, and any 'special purpose' savings accounts funded by payroll deduction." |
| doc-bank-03 | Children's bank accounts (custodial accounts, 529 plans) | "Check whether your spouse has recently opened custodial accounts in a child's name. These are sometimes used to move assets out of the marital estate." |
| doc-bank-04 | Safety deposit box inventory | "Visit the bank and document every item in the box. Note anything that should be there but isn't." |
| doc-bank-05 | Most recent mortgage application | "Your mortgage application required full disclosure of all assets, liabilities, and income sources. It's a snapshot of your household's financial picture at that point in time." |

---

### CATEGORY 4 — Investment Accounts (5 items)

| ID | Document | Helper Text |
|---|---|---|
| doc-inv-01 | Brokerage account statements (all accounts, last 12 months) | "Individual stocks, bonds, mutual funds, and ETFs. Include any margin account balances (loans against the brokerage account)." |
| doc-inv-02 | Mutual fund statements | "Include any mutual fund accounts held directly (not through a brokerage). Quarterly statements are typical." |
| doc-inv-03 | Treasury bills, savings bonds, and CDs | "These are often forgotten because they don't generate monthly statements. Check for paper bonds in the safety deposit box and electronic bonds at TreasuryDirect.gov." |
| doc-inv-04 | Annuity contracts and statements | "Annuities have surrender charges and tax implications that affect their real value. Gather the original contract and the most recent statement." |
| doc-inv-05 | Cash value life insurance policies | "Whole life and universal life policies accumulate cash value that is a marital asset. Request an 'in-force illustration' from the insurance company showing the current cash value and any loans against the policy." |

---

### CATEGORY 5 — Retirement Accounts (5 items)

| ID | Document | Helper Text |
|---|---|---|
| doc-ret-01 | 401(k), 403(b), 457 plan statements (all accounts, last 12 months) | "Include accounts from current and previous employers. Many people leave old 401(k)s behind when they change jobs — those are still marital assets." |
| doc-ret-02 | IRA and Roth IRA statements (all accounts) | "Traditional IRAs and Roth IRAs have different tax treatment when divided. Gather statements for every IRA either spouse holds." |
| doc-ret-03 | Pension plan documents and benefit estimates | "If either spouse has a defined benefit pension, request the plan's Summary Plan Description and a current benefit estimate. Pensions can be among the most valuable — and most overlooked — marital assets." |
| doc-ret-04 | Thrift Savings Plan (TSP) statements (if applicable) | "For federal employees and military members. The TSP functions like a 401(k) but has its own rules for division in divorce." |
| doc-ret-05 | Stock option plan documents and vesting schedules | "Unvested stock options may still be marital property depending on when they were granted. Gather the grant agreement, vesting schedule, and exercise history." |

---

### CATEGORY 6 — Real Estate (5 items)

| ID | Document | Helper Text |
|---|---|---|
| doc-re-01 | Deed(s) to all real property | "The deed shows legal ownership — whose name is on the title. This matters for classification as marital or separate property." |
| doc-re-02 | Most recent mortgage statements (all properties) | "Shows current balance, interest rate, payment amount, and escrow. Include first and second mortgages, HELOCs, and any other liens." |
| doc-re-03 | Most recent property tax assessments | "Property tax records show the assessed value (which may differ from market value) and can reveal property you didn't know about." |
| doc-re-04 | Homeowner's insurance declarations page | "The declarations page shows coverage amounts and listed personal property, which can help with the personal property inventory." |
| doc-re-05 | Recent appraisal or comparative market analysis (if available) | "If the home was recently appraised (for a refinance, HELOC, or sale), that value is a useful starting point. A CMA from a real estate agent provides a current estimate." |

---

### CATEGORY 7 — Debt and Liabilities (6 items)

| ID | Document | Helper Text |
|---|---|---|
| doc-debt-01 | Credit card statements (all cards, last 12 months) | "List every credit card — joint and individual. Statements reveal spending patterns, cash advances, and balances that are part of the marital estate." |
| doc-debt-02 | Personal loan documentation | "Include personal loans, lines of credit, student loans, and promissory notes. Note whether each is joint or individual." |
| doc-debt-03 | Auto loan documentation | "Gather loan statements for all vehicles. The loan balance plus the vehicle's current value determines net equity." |
| doc-debt-04 | Credit reports for both spouses | "Pull your free annual credit report at annualcreditreport.com. It may reveal accounts or debts you didn't know about — credit cards, loans, or collections in your spouse's name." |
| doc-debt-05 | Business liabilities documentation (if applicable) | "If either spouse owns a business, gather documentation of business debts, lease obligations, and any personal guarantees on business loans." |
| doc-debt-06 | Back taxes owed (federal or state) | "Any outstanding tax liabilities — including penalties and interest — are marital debts that need to be allocated in the settlement." |

---

### CATEGORY 8 — Legal and Insurance (5 items)

| ID | Document | Helper Text |
|---|---|---|
| doc-legal-01 | Prenuptial or postnuptial agreement (if applicable) | "If one exists, it may override default state property division rules. Your attorney needs to review this first." |
| doc-legal-02 | Life insurance policies (all) | "Include term and permanent policies. Note the owner, insured, beneficiary, and death benefit. Permanent policies may have cash value that is a marital asset." |
| doc-legal-03 | Health insurance policy documents | "If you're on your spouse's employer plan, you need to plan for coverage after divorce. Gather the plan summary and COBRA information." |
| doc-legal-04 | Estate planning documents (wills, trusts, powers of attorney) | "These will need to be updated after divorce. Gather current versions to understand what exists." |
| doc-legal-05 | Any existing court orders (temporary support, protective orders) | "If any temporary orders are in place, gather copies. These affect current financial obligations." |

---

### SCORING AND PROGRESS

```
// Per-category progress
categoryProgress = items.filter(status !== "not-started").length / items.length × 100

// Overall progress
overallProgress = allItems.filter(status !== "not-started").length / 42 × 100

// Completion score (weighted toward "collected")
completionScore = (
  (collectedCount × 3) +
  (locatedCount × 1) +
  (notApplicableCount × 2)
) / (totalItems × 3) × 100
```

**Scoring rationale:** "Collected" is worth 3x because it means the document is actually in hand. "Not applicable" is worth 2x because it represents a conscious decision, not inaction. "Located" is 1x because the work isn't done yet.

**Progress display:** Show both metrics:
- Progress bar: based on `overallProgress` (how many items have been touched)
- Completion percentage: based on `completionScore` (how close to fully collected)

**Milestone messages (displayed when thresholds are crossed):**

| Threshold | Message |
|---|---|
| First item changed from "not-started" | "You've started. That's the hardest part." |
| 25% overallProgress | "A quarter of your documents are accounted for. Keep going — each one makes the picture clearer." |
| 50% overallProgress | "Halfway there. You're building a foundation that most women never have when they walk into a settlement." |
| 75% overallProgress | "Almost there. The gaps you see now are the gaps that matter most — focus on those." |
| 100% overallProgress (all items touched) | "Every document accounted for. You're ready to build your complete asset picture in the Marital Estate Inventory." |

**Voice note:** Milestones follow Brand Voice §2 — Steady and Expert. No exclamation marks. No "you go girl." The tone is: competent acknowledgment, then forward direction.

---

### NAVIGATOR AI INTEGRATION (Tier 2+)

At Navigator tier and above, each checklist category has an AI prompt trigger. When the user has marked all items in a category, a contextual prompt appears:

| Category | AI Prompt |
|---|---|
| Tax Returns | "You've gathered your tax returns. Want me to walk you through what a CDFA looks for in a tax return — and how to spot income or assets that might be missing?" |
| Income Documentation | "Your income documents are in hand. Want to understand how pay frequency, bonuses, and stock options affect your monthly income calculation?" |
| Bank and Cash Accounts | "Bank statements collected. Want me to explain what to look for in the transaction history — transfers, large withdrawals, and patterns that might matter?" |
| Investment Accounts | "Investment documents gathered. Want a walkthrough of how different account types (brokerage, annuity, life insurance) are valued and taxed differently in divorce?" |
| Retirement Accounts | "Retirement documents collected. Want to understand the difference between a 401(k) and a pension — and why a QDRO matters for dividing them?" |
| Real Estate | "Real estate documents in hand. Want me to explain how home equity is calculated and what the Section 121 exclusion means for your situation?" |
| Debt and Liabilities | "Debt documents gathered. Want to understand how debts are classified — marital vs. separate — and who is responsible for what?" |
| Legal and Insurance | "Legal documents collected. Want a walkthrough of how prenuptial agreements and life insurance interact with property division?" |

**Display logic:** The prompt appears as a collapsible card below the completed category (Gold (#C8A96E) left border, 4px, Parchment background, Source Sans Pro 15px). Clicking the card opens the Navigator AI in a right-side slide-over panel: width 480px on desktop, full-screen on mobile (< 640px). The panel slides in from the right with a 300ms ease-out transition. It has a close button (× icon, top-right) and a semi-transparent overlay behind it (Navy at 30% opacity). The AI prompt is pre-loaded in the panel's input field and M2 checklist context (category name, item statuses) is injected into the Navigator AI system prompt. **v1 implementation note:** If the Navigator AI panel component does not yet exist, render the AI prompt card as a static display with a "Coming soon" label and a link to the Clarity Call scheduler instead. Do not block Tool 1 launch on the AI panel.

**Gating:** AI prompts are hidden at Essentials tier. The category-complete state still triggers, but instead of the AI prompt, show an upsell card: "Want to understand what these documents reveal? ClearPath Navigator gives you AI-guided education on every aspect of your financial picture. [Upgrade to Navigator →]"

---

### CTA LOGIC

**Bottom of checklist — adaptive CTA:**

| Completion State | CTA |
|---|---|
| < 50% overallProgress | "Keep gathering. The more complete your documentation, the stronger your position." (No forward CTA — she's not ready for the next tool.) |
| 50–99% overallProgress | "Ready to start building your asset picture? The Marital Estate Inventory uses the documents you've gathered to map everything you own and owe." → [Start the Marital Estate Inventory →] |
| 100% overallProgress | "Your documentation is complete. Now let's turn those documents into a clear picture of your marital estate." → [Build Your Marital Estate Inventory →] (stronger CTA language) |

**Secondary CTA (always visible):** "Not sure where to find a document? Check the notes field — or ask your attorney. Many of these documents are available through the discovery process."

---

### DATA PIPELINE

Write to `curriculum-data.schema.v2.json` at:

```json
{
  "modules": {
    "m2": {
      "documentChecklist": {
        "startedAt": "2026-04-08T16:00:00Z",
        "lastUpdatedAt": "2026-04-09T10:30:00Z",
        "overallProgress": 64.3,
        "completionScore": 52.4,
        "categoryProgress": {
          "taxReturns": { "progress": 100, "collected": 4, "located": 1, "notApplicable": 1, "notStarted": 0 },
          "incomeDocumentation": { "progress": 80, "collected": 3, "located": 1, "notApplicable": 0, "notStarted": 1 },
          "bankAndCash": { "progress": 60, "collected": 2, "located": 1, "notApplicable": 0, "notStarted": 2 },
          "investmentAccounts": { "progress": 40, "collected": 1, "located": 1, "notApplicable": 0, "notStarted": 3 },
          "retirementAccounts": { "progress": 60, "collected": 2, "located": 0, "notApplicable": 1, "notStarted": 2 },
          "realEstate": { "progress": 80, "collected": 3, "located": 1, "notApplicable": 0, "notStarted": 1 },
          "debtAndLiabilities": { "progress": 50, "collected": 2, "located": 1, "notApplicable": 0, "notStarted": 3 },
          "legalAndInsurance": { "progress": 40, "collected": 1, "located": 0, "notApplicable": 1, "notStarted": 3 }
        },
        "items": [
          { "id": "doc-tax-01", "category": "taxReturns", "status": "collected", "notes": "In the filing cabinet, bottom drawer" },
          { "id": "doc-tax-02", "category": "taxReturns", "status": "collected", "notes": "" }
        ]
      }
    }
  }
}
```

**Schema field definitions:**
- `startedAt`: ISO 8601 datetime, set when the first item status changes from "not-started."
- `lastUpdatedAt`: ISO 8601 datetime, updated on every status change.
- `overallProgress`: number, 0–100, percentage of items no longer "not-started."
- `completionScore`: number, 0–100, weighted completion score.
- `categoryProgress`: object with 8 keys, each containing count breakdowns.
- `items`: array of 42 objects, each with `id`, `category`, `status`, and `notes`. **Initialization pattern:** On load, the component constructs the full 42-item array from a hardcoded master list (the 8 category tables above). Each item starts with `status: "not-started"` and `notes: ""`. Then, any items saved in Supabase are merged in by matching on `id`, overwriting the defaults. This means the full 42-item array is ALWAYS in the Zustand store in memory — the Supabase persistence only stores items whose status has changed from `"not-started"` (storage optimization). The UI renders from the full in-memory array, never from the sparse Supabase data directly.

**Downstream consumers:**
- **Tool 2 (Marital Estate Inventory):** Uses checklist completion by category to show contextual prompts: "You've gathered your bank statements — ready to enter those account balances?"
- **AI Navigator:** Uses `completionScore` and category gaps to guide conversations: "I see you haven't gathered your retirement account documents yet. Those can be among the most valuable assets — want me to explain why?"
- **Signature tier:** The CDFA practitioner sees checklist progress in the client dashboard to identify documentation gaps before the engagement meeting.
- **Email nurture:** If `overallProgress` stalls below 50% for 7+ days, trigger a re-engagement email: "Your checklist is waiting. Here's one thing you can do today to move it forward."

---

### UI REQUIREMENTS

**Layout:**
- Accordion-style category sections. Each category header shows the category name, item count (e.g., "3 of 6"), and a mini progress bar (60px wide, 4px tall, Gold (#C8A96E) fill on Navy at 10% opacity track, rounded ends).
- Default state: all categories collapsed. On first visit (detected by `expandedCategories` array being empty AND `startedAt` being null), auto-expand the first category (Tax Returns). On subsequent visits, restore the `expandedCategories` state from the Zustand store — if the user previously collapsed Tax Returns, it stays collapsed.
- Within each category: vertical list of document items. Each item is a row with status toggle (cycling through the 4 statuses on click/tap), document label, and an expand arrow for helper text + notes field.
- Status legend fixed at the top of the checklist (below the page header, above the accordion).
- Overall progress bar and completion percentage displayed in a sticky header that remains visible as the user scrolls.

**Interactions:**
- **Status cycling:** Clicking/tapping the status icon cycles: not-started → located → collected → not-applicable → not-started. On desktop, a dropdown with all four options appears on click. On mobile, tap cycles forward through the statuses.
- **Notes field:** Expands inline below the item when the expand arrow is tapped. Multiline text input, max 500 characters. Auto-saves on blur (debounced 500ms).
- **Category collapse memory:** Remember which categories are expanded/collapsed in the Zustand store. Persist across page refreshes.
- **Milestone toasts:** When a milestone threshold is crossed, display a toast notification (bottom-center, auto-dismiss after 5 seconds) with the milestone message. Each milestone fires **once ever** — the `milestonesFired` array in the Zustand store (persisted to Supabase) tracks which milestones have been shown. Once a milestone ID (e.g., "25%") is in the array, it never fires again unless the user resets the tool. Do NOT use session-scoped tracking — milestones persist across sessions.

**Brand tokens:**
- Navy: `#1B2A4A` (primary text, category headers)
- Gold: `#C8A96E` (progress bar fill, "located" status icon)
- Parchment: `#FAF8F2` (page background)
- White: `#FFFFFF` (item row backgrounds, card backgrounds)
- Surplus green: `#2D8A4E` ("collected" status icon, completion percentage when > 75%)
- Shortfall red: `#C0392B` (not used in this tool — no negative states)

**Typography:**
- Category headers: Playfair Display, 20px, Navy
- Item labels: Source Sans Pro, 16px, Navy
- Helper text: Source Sans Pro, 14px, Navy at 70% opacity
- Notes input: Source Sans Pro, 14px, Navy
- Progress numbers: Source Sans Pro 600, 14px
- Milestone messages: Source Sans Pro, 16px, Navy

**Accessibility:**
- All status toggles are keyboard-navigable. On desktop: Enter or Space cycles the status. Arrow keys move between items within a category.
- Each status icon has an `aria-label` describing the current status: e.g., "Federal income tax returns: collected."
- Accordion sections use `aria-expanded` and `aria-controls`.
- Progress bar has `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`.
- Category progress is announced to screen readers when a category reaches 100%: "Tax Returns: all documents accounted for."
- Color contrast: all text/background combinations pass WCAG AA. Status icons use both color AND shape to convey state (not color alone).

**Responsive:**
- Mobile (< 640px): full-width rows, status icon left-aligned, document label wraps, expand arrow right-aligned. Notes field full-width.
- Tablet (640–1024px): centered container max-width 700px.
- Desktop (> 1024px): centered container max-width 760px. Status icon + label on one line for most items.

---

### VALIDATION TEST CASES

| # | Test | Inputs | Expected Output |
|---|---|---|---|
| 1 | Fresh load | No data in store | All 42 items show "not-started," overallProgress = 0%, completionScore = 0%, all categories collapsed except Tax Returns |
| 2 | Single item status change | Set doc-tax-01 to "collected" | overallProgress = 2.38% (1/42), completionScore recalculates, "You've started" milestone fires |
| 3 | Full category completion | Set all 6 Tax Returns items to "collected" | taxReturns.progress = 100%, AI prompt or upsell card appears below category (tier-dependent), 25% milestone may fire |
| 4 | Not-applicable items | Set doc-tax-05 and doc-tax-06 to "not-applicable" | They count toward overallProgress (items touched) and contribute 2x to completionScore |
| 5 | 50% threshold CTA | 21 items changed from "not-started" | Forward CTA to Marital Estate Inventory appears |
| 6 | 100% threshold | All 42 items in any non-"not-started" state | Stronger CTA copy, 100% milestone message, overallProgress = 100% |
| 7 | Notes persistence | Add notes to doc-bank-01, navigate away, return | Notes are preserved in Zustand store and data pipeline |
| 8 | Status cycle full loop | Click status icon 4 times on any item | Cycles not-started → located → collected → not-applicable → not-started |
| 9 | Mobile rendering | Viewport 375×667 | Category headers tap to expand, items are single-column, status icons are touch-target minimum 44×44px |
| 10 | Milestone deduplication | Cross 25% threshold, navigate away, return, make no changes | Milestone toast does NOT re-fire |

---

### DISCLAIMER

Footer text on the checklist screen (Source Sans Pro, 12px, Navy at 60% opacity):

> "This checklist is for educational and organizational purposes only. It does not constitute financial, legal, or tax advice. Not all documents listed may apply to your situation. For guidance specific to your circumstances, consult a Certified Divorce Financial Analyst® or attorney."

---
---

## Tool 2: Marital Estate Inventory / Asset Classification Wizard

### Purpose

The comprehensive inventory of everything a woman owns and owes — and the classification of each item as marital property, separate property, or commingled/disputed. This is the most complex tool in M2 and the foundation for every downstream calculation in the ClearPath curriculum. The Marital Estate Inventory answers the question: "What is the full picture of our marital estate, and who has a claim to what?"

Available at **Essentials tier** and above. At Essentials, the tool functions as an interactive worksheet (data entry and auto-totals). At Navigator, the AI layer adds classification guidance and commingling prompts. At Signature, the data feeds the Marital Balance Sheet deliverable prepared by the CDFA practitioner.

### Instructions

Build a professional React component (.jsx) called "Marital Estate Inventory" for the ClearPath for Women curriculum app. This is the core M2 tool — the centerpiece of the "Know What You Own" module and the single most data-rich component in the entire platform.

> **Grounded in:** IDFA Asset and Liability Comparison Worksheet (11-page asset/liability taxonomy with three-column allocation: Asset Value, Client's Value, Spouse's Value), IDFA Charting Assets Worksheet (classification fields: Date Acquired, Titleholder, Cost, Source of Payment, Current Value), CDFA Coursework — Property and Related Tax Issues (marital vs. separate property definitions, commingling rules, equitable vs. community property, Beth and David examples, Martha and Tom case study, hidden asset indicators, career assets).

---

### THE INVENTORY MODEL

**9 asset categories + 3 liability categories = 12 sections.**

**Structural note:** This category structure matches the IDFA Asset and Liability Comparison Worksheet and its Division Summary. Working Capital includes both cash/banking and investment accounts per the IDFA grouping. Stock Options and Corporate Incentive Programs are separate categories per the IDFA worksheet (they have different valuation and tax treatment).

Each inventory item has the following fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | auto-generated | Format: `{category}-{nnn}` (e.g., `re-001`, `bank-003`) |
| `category` | enum | auto (from section) | One of 12 category keys |
| `description` | text | yes | Name/description of the asset or liability |
| `dateAcquired` | date | no | When was this acquired? Drives classification logic. |
| `titleholder` | enum | yes | `"self" | "spouse" | "joint" | "other" | "unknown"` |
| `sourceOfPayment` | enum | no | `"marital-funds" | "separate-funds" | "mixed" | "gift" | "inheritance" | "unknown"` |
| `currentValue` | currency | yes | Fair market value as of today (best estimate) |
| `costBasis` | currency | no | Original purchase price. Available at all tiers. Used for automated appreciation analysis (commingling prompt) at Navigator tier and above. |
| `outstandingBalance` | currency | no | For assets with loans against them (home, car, life insurance). Net equity = currentValue − outstandingBalance. |
| `classification` | enum | derived + editable | `"marital" | "separate" | "commingled" | "disputed" | "unknown"` |
| `notes` | text | no | Free-text field for additional context |

**Field semantics for liability items (categories 10–12):** For Loans, Credit Cards, and Other Debt, `currentValue` represents the outstanding balance owed, not fair market value. The `outstandingBalance` field is not used for liability items — it applies only to assets with encumbrances (real estate, vehicles, life insurance). Fields `costBasis` and `sourceOfPayment` are not displayed for liability items. The `titleholder` field for liabilities indicates whose name the debt is in (self, spouse, or joint).

**Classification logic (auto-suggested, user-overridable):**

The tool auto-suggests a classification based on `dateAcquired`, `titleholder`, and `sourceOfPayment`:

```
// FIRST: check if marriageDate is available
IF marriageDate is NULL:
  // Cannot determine before/during marriage — skip date-based classification
  IF sourceOfPayment === "mixed":
    suggestedClassification = "commingled"
  ELSE:
    suggestedClassification = "unknown"
  // EXIT classification logic — do not proceed to date-based branches

IF dateAcquired is UNKNOWN:
  suggestedClassification = "unknown"
  // EXIT — do not proceed to date-based branches

IF sourceOfPayment === "mixed":
  suggestedClassification = "commingled"
  // EXIT — mixed funds override date-based logic

IF dateAcquired is BEFORE marriage date:
  IF sourceOfPayment === "separate-funds" AND titleholder === "self":
    suggestedClassification = "separate"
  ELSE IF titleholder === "joint":
    suggestedClassification = "commingled"  // was separate, but joint title = presumptive gift
  ELSE:
    suggestedClassification = "separate"  // with commingling warning

IF dateAcquired is DURING marriage:
  IF sourceOfPayment === "gift" OR sourceOfPayment === "inheritance":
    IF titleholder === "self":
      suggestedClassification = "separate"
    ELSE IF titleholder === "joint":
      suggestedClassification = "commingled"  // gift/inheritance deposited jointly
    ELSE:
      suggestedClassification = "separate"  // with commingling warning
  ELSE:
    suggestedClassification = "marital"

// APPRECIATION CHECK (Navigator tier+):
// After classification, if the asset is pre-marital AND costBasis is present
// AND currentValue > costBasis, fire the "pre-marital asset with value increase"
// commingling prompt. Do NOT change the classification — the base is correctly
// classified as separate; the prompt educates about the growth question.
```

**Classification logic for liability items (categories 10–12):**

Debt classification follows a simplified rule set. The asset-specific logic above (gifts, inheritance, sourceOfPayment, commingling) does not apply to debts.

```
IF marriageDate is NULL:
  suggestedClassification = "unknown"
  // EXIT

IF dateAcquired is UNKNOWN:
  suggestedClassification = "unknown"
  // EXIT

IF dateAcquired is BEFORE marriage date:
  suggestedClassification = "separate"

IF dateAcquired is DURING marriage:
  suggestedClassification = "marital"
```

**Note:** Debt classification in practice depends on factors beyond timing — whether the debt benefited the marriage, whether one spouse incurred it without the other's knowledge, and state-specific rules. The auto-suggestion above is a starting default. The "commingled" classification is not used for debts. Accurate debt allocation is a Signature tier analysis.

**Commingling prompts (Navigator tier+):**

When the classification logic produces "commingled" or detects potential commingling risk, display a contextual education card:

| Trigger | Commingling Prompt |
|---|---|
| Pre-marital asset + joint title | "When separate property is retitled into joint names, many states treat that as a 'presumptive gift' to the marriage — meaning it may become marital property. Your attorney can clarify how your state handles this." |
| Gift/inheritance + joint account | "Gifts and inheritances are generally separate property — but depositing them into a joint account can convert them to marital property. The key question is whether the funds can still be traced." |
| sourceOfPayment = "mixed" | "When marital and separate funds are mixed together — for example, using salary to pay down a pre-marital mortgage — the asset may be partly marital and partly separate. This is called commingling, and it's one of the most common complications in property division." |
| Pre-marital asset with value increase | "Even when an asset stays in your name alone, the increase in value during the marriage may be considered marital property in some states. The original value is separate; the growth is the question." |

**Gating:** At Essentials tier, the classification field is visible but the auto-suggestion and commingling prompts are hidden. The user manually selects a classification or leaves it as "unknown." The upsell prompt appears when the user first encounters the classification field: "Not sure if this is marital or separate property? ClearPath Navigator explains the rules and helps you classify each asset. [Upgrade to Navigator →]"

---

### ASSET CATEGORIES

#### Category 1 — Real Estate (key: `realEstate`)

Default fields visible: Description, Current Value (Fair Market Value), Outstanding Balance (Mortgage), Titleholder

**Subcategories (pre-populated rows the user can fill or skip):**
- Primary Residence
- Other Real Estate (1) — vacation home, rental property
- Other Real Estate (2) — additional property

**Calculated field:** Net Equity = Fair Market Value − Total Mortgage Balance(s)

**Per the IDFA worksheet:** Track FMV, 1st Mortgage, 2nd Mortgage, and Net Equity per property. Allow multiple mortgage line items per property.

#### Category 2 — Working Capital (key: `workingCapital`)

Subcategories:
- Cash
- Checking Accounts
- Savings Accounts
- Money Market Accounts
- Certificates of Deposit
- Treasury Bills and Savings Bonds
- Mutual Funds
- Individual Stocks (with loan-against-brokerage field)
- Individual Bonds (with loan-against-brokerage field)

**Note:** Each subcategory allows multiple line items (e.g., 3 checking accounts). Add-row button at the bottom of each subcategory.

**Design note:** The IDFA Asset and Liability Comparison Worksheet groups all cash, banking, and investment accounts under "Working Capital." This spec preserves that grouping for 1:1 worksheet compatibility. The UI should visually separate cash/banking items (Cash through Savings Bonds) from investment items (Mutual Funds through Individual Bonds) with a subtle divider within the Working Capital section.

#### Category 3 — Retirement Accounts (key: `retirement`)

Subcategories:
- IRAs and Roth IRAs
- 401(k), 403(b), and 457 Plans
- Thrift Savings Plans

#### Category 4 — Pension Plans (key: `pensions`)

Subcategories:
- Pension Plans (Present Value)

**Helper text:** "Pensions are valued differently than other retirement accounts. The 'present value' is what the future pension payments are worth today. If you don't know this number, leave it blank — a CDFA can calculate it."

#### Category 5 — Stock Options (key: `stockOptions`)

Subcategories:
- Stock Options (vested and unvested)

**Helper text:** "Unvested stock options may still be marital property. Include them with a note about the vesting date and exercise price. A CDFA or attorney can determine the marital portion using the coverture fraction."

#### Category 6 — Corporate Incentive Programs (key: `corporateIncentives`)

Subcategories:
- Restricted Stock Units (RSUs)
- Employee Stock Purchase Plans (ESPP)
- Deferred Compensation
- Other Incentive Programs

**Helper text:** "RSUs, ESPP shares, and deferred compensation are separate from stock options and have different tax treatment. Include the grant date, vesting schedule, and current value for each."

**Design note:** The IDFA worksheet and Division Summary list Stock Options and Corporate Incentive Programs as separate line items. This spec preserves that separation because stock options (which have an exercise price and may expire) have fundamentally different valuation mechanics than RSUs and deferred comp (which have no exercise price). Downstream M5 settlement modeling depends on this distinction.

#### Category 7 — Business Interests (key: `businessInterests`)

Subcategories:
- Business Interests (with Business Debt field)

**Helper text:** "If either spouse owns a business — even a small one — it needs to be valued. The value listed here is your best estimate. If there's any significant value at stake, an independent business appraiser is strongly recommended."

#### Category 8 — Other Assets (key: `otherAssets`)

Subcategories:
- Cash Value of Life Insurance (with loans-against-policy field)
- Annuities
- Other (catch-all: patents, royalties, digital assets, cryptocurrency, collectibles with significant value)

#### Category 9 — Personal Property (key: `personalProperty`)

**Note:** Personal Property has its own dedicated tool (Tool 3). In the Marital Estate Inventory, personal property appears as a single summary line item with a link to the Personal Property Inventory tool. The total from Tool 3 flows into this line.

Display: "Personal Property (see detailed inventory)" — shows the total value from Tool 3 if completed, or "$0 — not yet inventoried" with a link to start Tool 3.

---

### LIABILITY CATEGORIES

#### Category 10 — Loans (key: `loans`)

Subcategories:
- Personal Loans
- Educational Loans
- Promissory Notes
- Lines of Credit

**Per IDFA worksheet note:** "Do not include loans/mortgages already deducted against assets in the Asset sections." Display this as a helper at the top of the Liabilities section.

#### Category 11 — Credit Cards (key: `creditCards`)

Allows multiple line items. Display fields (compact view): `description` (labeled "Creditor Name"), `titleholder` (labeled "Whose Name"), `currentValue` (labeled "Outstanding Balance"). Hide `costBasis`, `sourceOfPayment`, `outstandingBalance`, and `dateAcquired` from the expanded view for credit card items — they are not relevant for this category.

#### Category 12 — Other Debt / Outstanding Liabilities (key: `otherDebt`)

Subcategories:
- Back Taxes
- Professional Debts
- Business Liabilities (not already captured in Category 7)
- Other

---

### THE DIVISION SUMMARY

At the bottom of the inventory, display a **Pre-Tax Division Summary** table:

**Label note:** The summary is explicitly titled "Pre-Tax" to match the IDFA Division Summary ("Pre-Tax Assets & Liabilities Division Summary"). All values are before tax adjustments. Tax-adjusted analysis (Point-in-Time Tax Discount) is a Signature tier deliverable. This label sets the expectation and creates the natural upsell hook: "Want to see what these assets are worth after taxes? That's where the Point-in-Time Tax Discount analysis comes in. [Schedule a Clarity Call →]"

```
| Category                     | Total Value  | Client's Value | Spouse's Value | Unallocated |
|------------------------------|-------------|---------------|----------------|-------------|
| Real Estate (Net Equity)     | $XXX,XXX    | $XXX,XXX      | $XXX,XXX       | $XX,XXX     |
| Working Capital              | $XX,XXX     | $XX,XXX       | $XX,XXX        | $XX,XXX     |
| Retirement Accounts          | $XXX,XXX    | $XX,XXX       | $XX,XXX        | $XX,XXX     |
| Pension Plans                | $XX,XXX     | $XX,XXX       | $XX,XXX        | $XX,XXX     |
| Stock Options                | $XX,XXX     | $XX,XXX       | $XX,XXX        | $XX,XXX     |
| Corporate Incentive Programs | $XX,XXX     | $XX,XXX       | $XX,XXX        | $XX,XXX     |
| Business Interests           | $XX,XXX     | $XX,XXX       | $XX,XXX        | $XX,XXX     |
| Other Assets                 | $XX,XXX     | $XX,XXX       | $XX,XXX        | $XX,XXX     |
| Personal Property            | $XX,XXX     | $XX,XXX       | $XX,XXX        | $XX,XXX     |
| SUBTOTAL ASSETS              | $XXX,XXX    | $XXX,XXX      | $XXX,XXX       | $XX,XXX     |
|------------------------------|-------------|---------------|----------------|-------------|
| Loans                        | ($XX,XXX)   | ($XX,XXX)     | ($XX,XXX)      | ($XX,XXX)   |
| Credit Cards                 | ($XX,XXX)   | ($XX,XXX)     | ($XX,XXX)      | ($XX,XXX)   |
| Other Debt                   | ($XX,XXX)   | ($XX,XXX)     | ($XX,XXX)      | ($XX,XXX)   |
| SUBTOTAL LIABILITIES         | ($XX,XXX)   | ($XX,XXX)     | ($XX,XXX)      | ($XX,XXX)   |
|------------------------------|-------------|---------------|----------------|-------------|
| NET PRE-TAX ESTATE           | $XXX,XXX    | $XXX,XXX      | $XXX,XXX       | $XX,XXX     |
| PERCENTAGE (of allocated)    |             |    XX%        |     XX%        |             |
```

**How Client/Spouse columns populate:**

**Step 1 — Calculate net value per item:**
For each item, compute `netValue = currentValue − outstandingBalance` (or just `currentValue` if `outstandingBalance` is null or 0). The Division Summary uses net values, not gross. This matches the IDFA worksheet, which carries Net Equity (not FMV) into the summary for Real Estate and any other asset with a loan against it.

**Step 2 — Check classification override:**
If `classification === "disputed"` or `classification === "unknown"`, the item goes to the Unallocated column regardless of titleholder. Disputed and unknown items should not appear in either party's column — they represent unresolved questions. Only items classified as "marital," "separate," or "commingled" proceed to titleholder-based allocation.

**Step 3 — Allocate based on titleholder:**
- `"self"` → Client's column (full netValue)
- `"spouse"` → Spouse's column (full netValue)
- `"joint"` → Split 50/50 between Client and Spouse (each gets netValue / 2). Override-able in Signature tier (v2 — `allocationOverride` field to be added).
- `"other"` / `"unknown"` → Unallocated column

**Note on commingled allocation:** In v1, commingled assets use the same titleholder-based allocation as marital and separate assets. This is a simplification — true commingling tracing (determining what portion is marital vs. separate) requires professional analysis and is a Signature tier deliverable. The Division Summary should display a footnote when any commingled items exist: "* Items marked 'commingled' use a default allocation. A CDFA can determine the precise marital and separate portions."

**Percentage calculation:**
`clientPercentage = clientNetEstate / (clientNetEstate + spouseNetEstate) × 100`
`spousePercentage = spouseNetEstate / (clientNetEstate + spouseNetEstate) × 100`

Percentages are calculated on **allocated net estate only**, excluding unallocated items. This is intentional — unallocated items represent unresolved questions, not a third party. The label reads "PERCENTAGE (of allocated)" to make this explicit. If both clientNetEstate and spouseNetEstate are 0, display "—" instead of a percentage.

**Signature tier enhancement:** The CDFA practitioner can manually adjust the allocation of each asset. This is where the Marital Balance Sheet is built. Not in v1 — an `allocationOverride` field will be added to the item schema in v2. Do not include this field in the current item field table, Zustand store, or data pipeline JSON.

---

### SCORING

The Marital Estate Inventory uses a **completeness score** rather than a correctness score (the tool cannot judge whether values are correct):

```
completenessScore = (
  (itemsWithDescription × 1) +
  (itemsWithValue × 2) +
  (itemsWithTitleholder × 1) +
  (itemsWithClassification × 2) +
  (itemsWithDateAcquired × 1)
) / (totalItems × 7) × 100
```

**Scoring field definitions:**
- `itemsWithDescription`: items where `description` is not empty/null.
- `itemsWithValue`: items where `currentValue` is not null and > 0.
- `itemsWithTitleholder`: items where `titleholder` is not `"unknown"`. Selecting self/spouse/joint/other all count.
- `itemsWithClassification`: items where `classification` is NOT `"unknown"`. Only marital/separate/commingled/disputed count. The `"unknown"` value is the default and does NOT count as classified — this is what drives the tier-dependent scoring gap.
- `itemsWithDateAcquired`: items where `dateAcquired` is not null.

**Display:** "Your inventory is X% complete" — shown below the Division Summary. Not a gate; the user can proceed to M3 at any point.

**Tier-dependence note (intentional):** At Essentials tier, auto-classification is hidden, so the practical maximum completeness score is ~57% (description + value + titleholder = 4/7 per item). At Navigator tier, auto-classification fills in the classification field, pushing the same data to ~86%. This is intentional — the lower Essentials score creates a natural upsell moment. When an Essentials user's completeness score plateaus below 60%, display below the percentage: "Want to increase your completeness score? ClearPath Navigator automatically classifies your assets and helps you fill in the details. [Upgrade to Navigator →]"

---

### NAVIGATOR AI INTEGRATION (Tier 2+)

Beyond the commingling prompts (described above), the Navigator AI has access to the full inventory state during AI sessions. Key behaviors:

- **Classification assistance:** "You entered a savings account opened before your marriage with $10,000. If you kept it in your name only, that's likely separate property — but the interest earned during the marriage may be marital. Want me to explain how this works in Virginia?"
- **Hidden asset prompts:** When the user has entered data for most categories but left specific categories empty, the AI asks: "I notice you haven't entered any retirement account information. Retirement accounts are among the most valuable marital assets — and among the most commonly overlooked. Do you know if either of you has a 401(k), IRA, or pension?"
- **Escalation trigger:** When the user asks the AI to classify a specific asset with real dollar values, or asks "how much of my house is marital?" — the AI triggers the Tier 3 escalation: "This involves applying your state's property laws to your specific financial data. That's exactly what a CDFA does in a full engagement. [Schedule a Clarity Call →]"

---

### CTA LOGIC

**Bottom of inventory:**

| State | CTA |
|---|---|
| < 5 items entered | "Keep building your inventory. Every asset and debt you add makes the picture more complete." |
| 5+ items, no personal property | "Ready to inventory your household items? The Personal Property Inventory goes room by room." → [Start Personal Property Inventory →] |
| 5+ items, personal property complete | "Your marital estate picture is taking shape. Module 3 maps your income and expenses — the other half of your financial picture." → [Continue to Module 3 →] |

---

### DATA PIPELINE

Write to `curriculum-data.schema.v2.json` at:

```json
{
  "modules": {
    "m2": {
      "maritalEstateInventory": {
        "startedAt": "2026-04-09T11:00:00Z",
        "lastUpdatedAt": "2026-04-10T09:15:00Z",
        "completenessScore": 68.4,
        "marriageDate": "2005-06-15",
        "summary": {
          "totalAssets": 485000,
          "totalLiabilities": 112000,
          "netMaritalEstate": 373000,
          "clientAssets": 210000,
          "spouseAssets": 225000,
          "clientLiabilities": 48000,
          "spouseLiabilities": 52000,
          "unallocatedAssets": 50000,
          "unallocatedLiabilities": 12000,
          "clientNetEstate": 162000,
          "spouseNetEstate": 173000,
          "clientPercentage": 48.4,
          "spousePercentage": 51.6
        },
        "items": [
          {
            "id": "re-001",
            "category": "realEstate",
            "description": "Primary Residence — 123 Oak Lane",
            "dateAcquired": "2008-03-20",
            "titleholder": "joint",
            "sourceOfPayment": "marital-funds",
            "currentValue": 425000,
            "costBasis": 310000,
            "outstandingBalance": 180000,
            "classification": "marital",
            "classificationSource": "auto",
            "notes": "Refinanced in 2019"
          },
          {
            "id": "ret-001",
            "category": "retirement",
            "description": "Husband's 401(k) — Fidelity",
            "dateAcquired": "2003-01-01",
            "titleholder": "spouse",
            "sourceOfPayment": "marital-funds",
            "currentValue": 285000,
            "costBasis": null,
            "outstandingBalance": null,
            "classification": "commingled",
            "classificationSource": "auto",
            "notes": "Contributions started before marriage. Premarital portion estimated at $42,000."
          }
        ]
      }
    }
  }
}
```

**Schema field definitions:**
- `startedAt` / `lastUpdatedAt`: ISO 8601 datetimes.
- `completenessScore`: number, 0–100.
- `marriageDate`: date string (YYYY-MM-DD). Required for classification logic. Prompted on first entry.
- `summary`: auto-calculated rollup. Recalculates on every item change.
- `items`: array of inventory item objects. `classificationSource`: `"auto" | "user" | "cdfa"` — tracks whether the classification was auto-suggested, user-overridden, or set by a CDFA practitioner (Signature tier).

**Downstream consumers:**
- **M5 (Value What Matters):** Uses the complete inventory as the starting point for settlement scenario modeling. M5's Settlement Scenario Comparison Dashboard pulls directly from this data.
- **M7 (Blueprint):** The Financial Blueprint's "Marital Estate" section is generated from this inventory.
- **AI Navigator:** Full inventory context is injected into the system prompt for AI conversations. The AI can reference specific items: "You listed a 401(k) with a pre-marital portion of $42,000 — let me explain how coverture might apply to that."
- **Signature tier — Marital Balance Sheet:** The CDFA practitioner's primary deliverable. M2 inventory data is the raw input; the practitioner adjusts valuations, refines classifications, and produces the court-ready balance sheet.
- **Tool 1 (Documentation Checklist):** Cross-references entered assets against documentation status. If a retirement account is entered but retirement documents are not yet "collected," flag it: "You've entered a 401(k) — make sure to gather the statements."

---

### UI REQUIREMENTS

**Layout:**
- **Section navigation by viewport:** On desktop (> 1024px) and tablet (640–1024px): horizontal tab bar at the top of the tool. Tabs are scrollable horizontally if they overflow the container. Active tab has a Gold (#C8A96E) bottom border (3px). On mobile (< 640px): vertical accordion (same pattern as Tool 1's category accordion). Do NOT mix tabs and accordion on the same viewport — pick one per breakpoint.
- Within each section: a data table with rows for each item. Each row displays a **compact view** showing Description, Current Value, Titleholder, and Classification (color-coded chip). Clicking anywhere on the row (except the classification chip) expands it into an **expanded view** showing all fields in an editable form. Click the collapse arrow (▲) at the top-right of the expanded view to return to compact. Only one row can be expanded at a time — expanding a new row collapses the previously expanded one.
- **Inline editing in expanded view:** All fields are editable within the expanded row. Currency fields use `$` prefix and auto-format with comma separators on blur. Date fields use a native date picker. Text fields save on blur (debounced 300ms). The expanded view has a visible "Done" button (Source Sans Pro 600, 14px, Gold background, Navy text) that collapses the row back to compact view.
- **Add Item** button at the bottom of each section adds a blank row for assets not covered by the pre-populated subcategories.
- **Pre-populated subcategories** appear as inactive header rows within each section. Each shows the subcategory name (e.g., "Primary Residence") in Source Sans Pro 600, 15px, Navy at 50% opacity, with a muted "+ Add details" link to the right. Clicking "+ Add details" expands the row into an editable form with the subcategory name pre-filled in the `description` field. The user can edit the description, enter values, and save. Subcategory rows that the user doesn't activate stay inactive and are NOT written to the data pipeline. Once activated, the row behaves identically to a user-added row (editable, deletable, included in all calculations).
- Division Summary table is always visible in a collapsible section at the bottom, labeled "Your Marital Estate Summary."

**Marriage Date prompt:**
- On first load (no `marriageDate` in store), display a modal: "To help classify your assets, we need one date: **When were you married?**" Date picker input. Skip option: "I'd rather not enter this right now" (sets `marriageDate` to null; classification logic falls back to "unknown" for date-dependent rules).
- Displayed in the header area after entry: "Marriage date: June 15, 2005 — [Edit]"

**Interactions:**
- **Classification chip:** Color-coded pill showing the current classification. At Navigator tier, tapping the chip shows the auto-suggestion rationale in a tooltip (see rationale templates below). At Essentials tier, tapping opens a dropdown to manually select.

**Classification rationale templates (Navigator tier tooltip text):**
| Classification | Rationale Template |
|---|---|
| Marital | "Classified as marital: acquired during marriage with marital funds." |
| Separate (pre-marital, self-titled) | "Classified as separate: acquired before marriage and titled in your name." |
| Separate (gift/inheritance) | "Classified as separate: acquired as a [gift/inheritance] and kept in your name." |
| Commingled (joint title on pre-marital) | "Flagged as commingled: acquired before marriage but retitled to joint names." |
| Commingled (gift into joint account) | "Flagged as commingled: [gift/inheritance] deposited into a joint account." |
| Commingled (mixed funds) | "Flagged as commingled: funded with a mix of marital and separate funds." |
| Unknown (no date) | "Cannot classify: marriage date or acquisition date not provided." |
- **Real-time totals:** Category subtotals and the Division Summary update in real time as values change.
- **Drag-to-reorder:** Items within a category can be reordered by drag (desktop) or long-press-drag (mobile). Order is preserved in the data pipeline.

**Classification chip colors:**
| Classification | Chip Color | Text Color |
|---|---|---|
| Marital | Navy (#1B2A4A) background | Parchment text |
| Separate | Gold (#C8A96E) background | Navy text |
| Commingled | #D4A574 (warm amber) background | Navy text |
| Disputed | Shortfall red (#C0392B) background | White text |
| Unknown | Navy at 20% opacity background | Navy text |

**Brand tokens:** Same as Tool 1 (Navy, Gold, Parchment, White, Surplus green, Shortfall red).

**Typography:**
- Section headers: Playfair Display, 20px, Navy
- Table headers: Source Sans Pro 600, 13px, Navy at 70% opacity, uppercase
- Cell values: Source Sans Pro, 15px, Navy
- Helper text / commingling prompts: Source Sans Pro, 14px, Navy at 70% opacity
- Summary totals: Source Sans Pro 600, 16px, Navy
- Net Marital Estate: Playfair Display, 24px, Navy

**Accessibility:**
- All table cells are keyboard-navigable. Tab moves between cells in a row; Enter opens edit mode; Escape cancels.
- Classification chips have `aria-label`: e.g., "Primary Residence: classified as marital property."
- Add Item button has `aria-label`: "Add a new item to Real Estate."
- Summary table includes `<caption>`: "Pre-tax division summary of your marital estate."
- Color-coded classification chips use both color AND text label (not color alone).
- Screen reader announcement when summary totals change: "Net marital estate updated: $373,000."

**Responsive:**
- Mobile (< 640px): Each item renders as a card (not a table row). Card shows Description and Current Value; tap to expand all fields. Section tabs become a vertical accordion.
- Tablet (640–1024px): Table layout with horizontal scroll for columns beyond the viewport. Sticky first column (Description).
- Desktop (> 1024px): Full table layout, max-width 960px centered. All columns visible.

---

### VALIDATION TEST CASES

| # | Test | Inputs | Expected Output |
|---|---|---|---|
| 1 | Empty state | No items entered | All categories show "No items yet," summary shows $0 across all fields, completenessScore = 0% |
| 2 | Single asset entry | Primary Residence: value $400K, mortgage $200K, joint, marital funds, during marriage | Net equity $200K. Classification auto-suggests "marital." Client/Spouse columns show $100K each (50/50 joint split). |
| 3 | Pre-marital separate asset | Savings account: $10K, self-titled, separate funds, acquired before marriage | Classification auto-suggests "separate." Full $10K in Client's column. |
| 4 | Commingling trigger — joint title on pre-marital asset | House acquired before marriage, retitled to joint | Classification auto-suggests "commingled." Commingling prompt displays (Navigator tier). |
| 5 | Gift deposited into joint account | $50K inheritance, deposited into joint checking | Classification auto-suggests "commingled." Gift-in-joint-account prompt displays. |
| 6 | Classification override to disputed | Joint asset worth $50K (net). User changes classification from "marital" to "disputed." | `classificationSource` changes to "user." Chip color updates to red. Item moves from Client ($25K) + Spouse ($25K) to Unallocated ($50K). Client/Spouse totals decrease by $25K each. |
| 7 | Liability netting | Prerequisites: marriage date set. Loan of $20K, titleholder = Spouse, acquired during marriage. | Classification resolves to Marital. Appears in Loans section. Spouse column increases by $20K. Net estate decreases. Note: without marriage date set, classification defaults to Unknown and item routes to Unallocated — this is correct behavior (see TC-10). |
| 8 | Multiple items in category | 3 checking accounts entered | All 3 appear as rows. Category subtotal sums all 3. |
| 9 | Personal property link | Personal Property Inventory (Tool 3) completed with $45K total | Personal Property summary line shows $45K with link to Tool 3. Flows into summary. |
| 10 | Marriage date null | User skips marriage date | All date-dependent classification defaults to "unknown." Prompt to enter marriage date persists in header. |
| 11 | Division percentage | clientNetEstate = $200K, spouseNetEstate = $300K, unallocated = $0 | clientPercentage = 200/(200+300) = 40%, spousePercentage = 60%. Calculated on allocated net estate only. |
| 12 | Mobile card rendering | Viewport 375×667 | Items render as cards. Tap to expand. Section tabs become accordion. Summary table scrolls horizontally. |
| 13 | "Start over" scope (design TBD) | User clicks "Start over" | Open question: should reset clear only inventory items, or also session context (marriage date, user name)? Current behavior clears everything. Ticket open. |

---

### DISCLAIMER

Footer text on the inventory screen (Source Sans Pro, 12px, Navy at 60% opacity):

> "This inventory tool is for educational and organizational purposes only. Asset values entered are your best estimates and may not reflect fair market value. Classification suggestions are based on general property law principles and may not apply in your state. This tool does not constitute financial, legal, or tax advice. For guidance specific to your situation — including accurate asset valuation and legal classification — consult a Certified Divorce Financial Analyst® or attorney."

---
---

## Tool 3: Personal Property Inventory

### Purpose

A room-by-room inventory of household personal property — furniture, electronics, jewelry, vehicles, collections, and everything else that isn't a financial account or real estate. This tool answers the question: "If we had to divide everything in this house, what's here and what's it worth?"

Personal property is typically the most emotionally charged and least financially significant category in a divorce. The CDFA coursework notes that home furnishings are generally valued at garage-sale prices and often divided informally rather than through formal appraisal. This tool's primary value is (a) creating a complete record, (b) identifying high-value items that warrant appraisal (art, antiques, jewelry, collections), and (c) feeding the Personal Property subtotal into the Marital Estate Inventory.

Available at **Essentials tier** and above. No gated features by tier — this tool is the same at all paid tiers. (No AI classification is needed for personal property; the value is in the inventory itself.)

### Instructions

Build a professional React component (.jsx) called "Personal Property Inventory" for the ClearPath for Women curriculum app. This is the third M2 tool and moderate in complexity.

> **Grounded in:** IDFA Household Inventory Worksheet (room-by-room format with columns: Item, Description/serial#, Qty, Purchased During Marriage, Current Value, Who Keeps — Self/Spouse/Disputed), IDFA Asset and Liability Comparison Worksheet page 8 (Personal Property subcategories: Automobiles, Motorcycles/RVs, Boats, Furniture, Jewelry, Furs, Silverware/China, Art-Collectible, Antiques, Collections, Electronic Equipment, Yard/Gardening Equipment/Tools, Children's Property).

---

### THE INVENTORY MODEL

**Room-based + High-Value Item categories.**

The inventory uses two parallel structures:

**Structure A — Room-by-Room Inventory**
User creates rooms (pre-populated suggestions, editable):
- Living Room
- Master Bedroom
- Kitchen
- Dining Room
- Bedroom 2
- Bedroom 3
- Bathroom(s)
- Garage
- Home Office
- Basement/Attic
- Outdoor/Yard
- Other (custom name)

Each room contains item rows. The user can add rooms and add items to any room.

**Structure B — High-Value Item Categories**
Pre-defined categories for items that may warrant individual appraisal or special handling:
- Vehicles (automobiles, motorcycles, RVs, boats)
- Jewelry and Watches
- Art and Antiques
- Collections (coins, stamps, wine, memorabilia, etc.)
- Firearms
- Musical Instruments
- Electronics (high-value: home theater, camera equipment, etc.)
- Sporting Equipment (high-value: bikes, golf clubs, skis, etc.)
- Children's Property (savings bonds, electronics, furniture in their name)
- Furs and Outerwear (high-value coats, fur items)
- Silverware, China, and Crystal

**Dual-entry prevention:** The system does NOT automatically detect duplicates — the item descriptions are free-text and matching is unreliable. Instead, when the user adds an item to a high-value category, display a one-time reminder at the top of the category: "If you already listed this item in a room inventory, remove it there to avoid counting it twice." Additionally, the Division Summary's total value line shows a helper icon (ⓘ) that on click displays: "Make sure items aren't counted in both a room and a high-value category. If they are, the total will be overstated."

Each inventory item has:

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | auto-generated | Format: `pp-{room/category}-{nnn}` |
| `location` | string | auto (from room/category) | Room name or high-value category |
| `description` | text | yes | Item name and description |
| `serialNumber` | text | no | Serial number if applicable (electronics, vehicles, firearms) |
| `quantity` | number | yes (default 1) | For multiples of the same item (e.g., "dining chairs × 6") |
| `purchasedDuringMarriage` | enum | yes | `"yes" | "no" | "unknown"` — tri-state, not boolean. Default: `"unknown"`. Maps to the IDFA Household Inventory Worksheet's "Purchased During Marriage" column. |
| `currentValue` | currency | no | Approximate current value. Helper: "For most household items, estimate what you could sell them for today — not what you paid." |
| `whoKeeps` | enum | no | `"self" | "spouse" | "disputed" | "undecided"` |
| `notes` | text | no | Free-text for additional context |

---

### VALUE GUIDANCE

**Helper text at top of tool:**
> "For most household items, the standard is 'garage sale value' — what you could reasonably sell the item for today, not what you paid for it. Exceptions: vehicles (use Kelley Blue Book or similar), jewelry and watches (get an appraisal for items over $1,000), art and antiques (get an appraisal for items over $2,500), and collections (get an appraisal if total collection value exceeds $5,000)."

**Appraisal flag:** When a user enters a value above the threshold for a high-value category, display an inline prompt:

| Category | Threshold | Prompt |
|---|---|---|
| Jewelry and Watches | $1,000 per item | "Items valued over $1,000 should be professionally appraised. An independent appraisal protects both parties." |
| Art and Antiques | $2,500 per item | "Art and antiques valued over $2,500 should be professionally appraised. The purchase price and current market value can differ significantly." |
| Collections | $5,000 total | "Collections valued over $5,000 in total should be professionally appraised. Individual items may have appreciated substantially." |
| Vehicles | always | "Use Kelley Blue Book (kbb.com), Edmunds, or NADA Guides for vehicle values. Enter the 'private party' value, not the trade-in value. If you have a loan on this vehicle, enter the loan amount separately in the Liabilities section of the Marital Estate Inventory — the summary will net them automatically." |
| Firearms | always | "Firearms should be valued by a licensed dealer or appraiser. Note: some states have specific rules about firearms in divorce — check with your attorney." |

---

### SCORING

```
// Room completion
roomProgress = items.filter(item => item.currentValue > 0 || item.whoKeeps !== "undecided").length / room.items.length × 100

// Overall
totalItems = sum of all items across all rooms and categories
valuedItems = items where currentValue > 0
decidedItems = items where whoKeeps !== "undecided"
inventoryCompleteness = (valuedItems + decidedItems) / (totalItems × 2) × 100
// If totalItems is 0, inventoryCompleteness = 0% (avoid division by zero)

// Summary values
totalPersonalPropertyValue = sum of all currentValue
clientPropertyValue = sum of currentValue where whoKeeps === "self"
spousePropertyValue = sum of currentValue where whoKeeps === "spouse"
disputedPropertyValue = sum of currentValue where whoKeeps === "disputed"
undecidedPropertyValue = sum of currentValue where whoKeeps === "undecided"
```

---

### DIVISION VISUALIZATION

At the bottom of the inventory, display a **visual division summary**:

**Horizontal stacked bar chart (Recharts):**
- Green segment: "Keeping" (self) — $X,XXX
- Navy segment: "Spouse keeps" — $X,XXX
- Red segment: "Disputed" — $X,XXX
- Gray segment: "Undecided" — $X,XXX

**Below the chart:** Simple table:
```
| Status     | Items | Total Value |
|------------|-------|-------------|
| You keep   |   XX  | $XX,XXX     |
| Spouse     |   XX  | $XX,XXX     |
| Disputed   |   XX  | $XX,XXX     |
| Undecided  |   XX  | $XX,XXX     |
| TOTAL      |   XX  | $XX,XXX     |
```

**Bar chart colors:**
- Self/keeping: Surplus green (#2D8A4E)
- Spouse: Navy (#1B2A4A)
- Disputed: Shortfall red (#C0392B)
- Undecided: Navy at 30% opacity

---

### CTA LOGIC

**Bottom of inventory:**

| State | CTA |
|---|---|
| < 10 items entered | "Keep going — a complete inventory protects your interests and prevents surprises." |
| 10+ items, undecided > 50% of items | "You've built a solid list. The next step is deciding who keeps what — or flagging items as 'disputed' for negotiation." |
| 10+ items, undecided ≤ 50% of items | "Your personal property inventory is taking shape. The total feeds into your Marital Estate Inventory — ready to see the full picture?" → [Return to Marital Estate Inventory →] |

---

### DATA PIPELINE

Write to `curriculum-data.schema.v2.json` at:

```json
{
  "modules": {
    "m2": {
      "personalPropertyInventory": {
        "startedAt": "2026-04-10T14:00:00Z",
        "lastUpdatedAt": "2026-04-11T08:30:00Z",
        "inventoryCompleteness": 72.5,
        "summary": {
          "totalItems": 47,
          "totalValue": 38500,
          "clientValue": 15200,
          "spouseValue": 12800,
          "disputedValue": 6500,
          "undecidedValue": 4000,
          "highValueItemCount": 5,
          "appraisalRecommended": true,
          "appraisalFlags": ["jewelry-001", "art-002"]
        },
        "rooms": [
          {
            "name": "Living Room",
            "items": [
              {
                "id": "pp-living-001",
                "description": "Sectional sofa",
                "serialNumber": null,
                "quantity": 1,
                "purchasedDuringMarriage": "yes",
                "currentValue": 800,
                "whoKeeps": "self",
                "notes": "Bought at Pottery Barn 2019"
              },
              {
                "id": "pp-living-002",
                "description": "65-inch Samsung TV",
                "serialNumber": "SN-4829301",
                "quantity": 1,
                "purchasedDuringMarriage": "yes",
                "currentValue": 600,
                "whoKeeps": "disputed",
                "notes": ""
              }
            ]
          }
        ],
        "highValueItems": [
          {
            "id": "pp-jewelry-001",
            "location": "Jewelry and Watches",
            "description": "Engagement ring — 2ct diamond solitaire",
            "serialNumber": null,
            "quantity": 1,
            "purchasedDuringMarriage": "no",
            "currentValue": 8500,
            "whoKeeps": "self",
            "notes": "Appraised 2024 at $8,500. Was this a gift? May be separate property.",
            "appraisalFlagged": true
          }
        ]
      }
    }
  }
}
```

**Schema field definitions:**
- `summary.appraisalRecommended`: boolean, true if any item exceeds the appraisal threshold for its category.
- `summary.appraisalFlags`: array of item IDs that triggered appraisal prompts.
- `rooms`: array of room objects, each containing an `items` array.
- `highValueItems`: separate array for high-value category items. These use the same field model as room items — the `location` field contains the high-value category name (e.g., "Jewelry and Watches", "Vehicles"). No separate `category` field — the `highValueItems` array membership identifies them as high-value, and `location` holds the category name.
- Each item follows the field model described above.

**Downstream consumers:**
- **Tool 2 (Marital Estate Inventory):** The `summary.totalValue` feeds into the Personal Property line of the Division Summary. `clientValue` and `spouseValue` feed into the Client/Spouse columns. This is the primary integration point.
- **M7 (Blueprint):** The Blueprint's "Personal Property Division" section pulls from this data.
- **AI Navigator:** Uses the inventory to contextualize conversations: "I see you've flagged the engagement ring as 'self' — whether that's separate or marital property depends on your state's laws about gifts between spouses."
- **Signature tier:** The CDFA practitioner reviews the high-value items and appraisal flags to advise on which items warrant formal appraisal before settlement.

---

### UI REQUIREMENTS

**Layout:**
- Two-tab interface: **"Room by Room"** and **"High-Value Items"**. Both tabs contribute to the same inventory total.
- **Room by Room tab:** Left sidebar (desktop) or dropdown (mobile) lists rooms. Tapping a room shows its items in the main area. "Add Room" button at the bottom of the sidebar. Each room shows its item count and total value next to the name.
- **High-Value Items tab:** Accordion of high-value categories. Each category shows its items as a card list.
- Division summary chart and table are always visible at the bottom, regardless of which tab is active.

**Interactions:**
- **Add Item:** In-line add at the bottom of each room or category. Description field auto-focuses. Tab through fields. Enter to save and start a new row.
- **Default add behavior (quick entry):** When a new item row is created, only two fields are visible: Description (text input, auto-focused) and Current Value (currency input). All other fields (serialNumber, quantity, purchasedDuringMarriage, whoKeeps, notes) are collapsed below in an expandable "More details" section. This IS the quick entry pattern — there is no separate mode toggle. The user can fill Description + Value and move on, then come back to expand and fill in additional fields later. Pressing Enter in the Value field saves the item and creates a new blank row below it.
- **Who Keeps toggle:** Four-option toggle (self / spouse / disputed / undecided) displayed as a segmented control on each item row. Default: "undecided."
- **Room reordering:** Rooms can be reordered by drag. Items within a room can be reordered by drag.
- **Delete item:** Swipe-left (mobile) or click X (desktop) with a confirmation: "Remove [item description]?"

**Brand tokens:** Same as Tools 1 and 2.

**Typography:**
- Room names / category headers: Playfair Display, 18px, Navy
- Item descriptions: Source Sans Pro, 15px, Navy
- Value fields: Source Sans Pro 600, 15px, Navy
- "Who Keeps" labels: Source Sans Pro, 13px
- Summary totals: Source Sans Pro 600, 16px
- Appraisal prompts: Source Sans Pro, 14px, Gold (#C8A96E) border-left, Parchment background

**Accessibility:**
- All form fields have associated `<label>` elements.
- "Who Keeps" segmented control uses `role="radiogroup"` with `role="radio"` on each option. Arrow keys navigate options; Space/Enter selects.
- Room sidebar navigation: `role="tablist"` with `role="tab"` on each room. Arrow keys navigate rooms.
- Division chart includes a visually hidden summary table for screen readers.
- Touch targets minimum 44×44px on all interactive elements.

**Responsive:**
- Mobile (< 640px): Room dropdown replaces sidebar. Items render as cards. "Who Keeps" renders as a dropdown instead of a segmented control to save horizontal space.
- Tablet (640–1024px): Sidebar visible. Items as compact cards.
- Desktop (> 1024px): Sidebar + table layout. All fields visible inline. Max-width 960px.

---

### VALIDATION TEST CASES

| # | Test | Inputs | Expected Output |
|---|---|---|---|
| 1 | Empty state | No rooms, no items | "Add your first room to start." Division summary shows $0. |
| 2 | Single room, single item | Living Room: Sofa, $500, self | totalValue = $500, clientValue = $500, bar chart shows 100% green. |
| 3 | Disputed item tracking | TV, $800, disputed | disputedValue = $800, red segment in bar chart. |
| 4 | Appraisal threshold — jewelry | Ring, $1,200, jewelryAndWatches category | Appraisal prompt displays. `appraisalFlagged = true`. |
| 5 | Appraisal threshold — vehicle | Car, $25,000, vehicles category | Vehicle value prompt (KBB/Edmunds) always displays. |
| 6 | Duplicate prevention reminder | Add item to "Art and Antiques" high-value category | One-time reminder displays at top of category: "If you already listed this item in a room inventory, remove it there to avoid counting it twice." |
| 7 | Integration with Tool 2 | Total personal property = $38,500 | Marital Estate Inventory Personal Property line shows $38,500. |
| 8 | Multiple rooms | 4 rooms with 10+ items each | Each room shows correct subtotal. Overall total sums all rooms + high-value items. |
| 9 | Default add (description + value only) | Description + value only, all other fields default | Item saves with quantity = 1, purchasedDuringMarriage = "unknown", whoKeeps = "undecided." |
| 10 | Delete item | Delete an item worth $500 | Total decreases by $500. Confirmation dialog appears before deletion. Item is removed from data pipeline. |
| 11 | Mobile rendering | Viewport 375×667 | Room dropdown, card-based items, "Who Keeps" as dropdown. Summary chart legible at 340px width. |

---

### DISCLAIMER

Footer text on the inventory screen (Source Sans Pro, 12px, Navy at 60% opacity):

> "This inventory is for organizational and planning purposes only. Estimated values are approximations and should not be relied upon for legal or settlement purposes. High-value items should be professionally appraised. This tool does not constitute financial, legal, or tax advice. For guidance specific to your situation, consult a Certified Divorce Financial Analyst® or attorney."

---
---

## Cross-Tool Integration Notes

### Tool 1 → Tool 2 Flow

The Documentation Checklist feeds the Marital Estate Inventory in two ways:

1. **Contextual prompts:** When the user enters an asset in Tool 2 for a category where Tool 1 documents are not yet "collected," display a warning: "You've entered a retirement account, but your retirement plan documents haven't been collected yet. The values you enter will be more accurate with statements in hand." Link to the relevant checklist category.

**Tool 2 → Tool 1 category mapping (for cross-tool document warnings):**

| Tool 2 inventory category (key) | Tool 1 checklist category(s) to check | Primary document IDs |
|---|---|---|
| `realEstate` | `realEstate` | doc-re-01 through doc-re-05 |
| `workingCapital` (cash/banking items) | `bankAndCash` | doc-bank-01, doc-bank-02 |
| `workingCapital` (investment items) | `investmentAccounts` | doc-inv-01 through doc-inv-05 |
| `retirement` | `retirementAccounts` | doc-ret-01, doc-ret-02 |
| `pensions` | `retirementAccounts` | doc-ret-03 |
| `stockOptions` | `incomeDocumentation` | doc-inc-03 |
| `corporateIncentives` | `incomeDocumentation` | doc-inc-03 |
| `businessInterests` | `taxReturns` + `debtAndLiabilities` | doc-tax-05, doc-debt-05 |
| `otherAssets` (life insurance) | `investmentAccounts` | doc-inv-05 |
| `otherAssets` (annuities) | `investmentAccounts` | doc-inv-04 |
| `loans` | `debtAndLiabilities` | doc-debt-02 |
| `creditCards` | `debtAndLiabilities` | doc-debt-01 |
| `otherDebt` | `debtAndLiabilities` | doc-debt-05, doc-debt-06 |

**Warning trigger rule:** When the user adds an item to a Tool 2 category, check the mapped Tool 1 category(s). If ANY of the mapped checklist items have status `"not-started"`, show the warning. If all mapped items are `"located"`, `"collected"`, or `"not-applicable"`, suppress the warning. The warning links to the specific Tool 1 category accordion section.

2. **Completion gating (soft):** When the user reaches Tool 2 with < 50% checklist progress, display a one-time advisory: "You've started building your inventory — great. As you go, you'll find it easier if you have the actual statements and documents. Your Documentation Checklist is X% complete. [Review Checklist →]" This is advisory, not blocking.

### Tool 2 → Tool 3 Flow

1. **Personal Property line:** The Marital Estate Inventory's Personal Property section displays a single summary line linking to Tool 3. The total from Tool 3 flows into the Division Summary automatically.

2. **Pre-population:** If the user enters items in Tool 2's personal property section before starting Tool 3, those items appear in Tool 3 when it's first opened (mapped to the appropriate room or high-value category based on description keywords).

### Tool 3 → Tool 2 Flow

1. **Value sync:** Any changes to Tool 3 totals automatically update the Personal Property line in Tool 2. This is a one-way data flow: Tool 3 is the source of truth for personal property; Tool 2 displays the summary.

2. **whoKeeps → allocation mapping:** Tool 3 uses `whoKeeps` (self/spouse/disputed/undecided) while Tool 2 uses `titleholder` for allocation. When Tool 3 data feeds into Tool 2's Division Summary, the translation is:
   - `whoKeeps === "self"` → Client's column
   - `whoKeeps === "spouse"` → Spouse's column
   - `whoKeeps === "disputed"` → Unallocated column (same treatment as `classification === "disputed"` in Tool 2)
   - `whoKeeps === "undecided"` → Unallocated column
   
   This means Tool 2's Division Summary Personal Property row uses `clientValue`, `spouseValue` from Tool 3's summary directly for Client/Spouse columns, and `disputedValue + undecidedValue` for the Unallocated column.

### M1 → M2 Flow

**Cross-store dependency:** M2 components that reference M1 data must import from `src/stores/m1Store.js`. Use a read-only selector — M2 never writes to the M1 store. Example: `const domainScores = useM1Store(state => state.readinessAssessment?.results?.domainScores)`. Handle the case where M1 data is null (user skipped M1 or is a direct Essentials purchaser who didn't complete the assessment).

1. **Assessment domain scores:** If the user's M1 Readiness Assessment scored ≤ 3 on Debt Awareness, Asset Awareness, or Document Access, display a contextual message on first M2 visit (detected by `documentChecklist.startedAt === null`): "Your assessment showed some gaps in [domain]. That's exactly what Module 2 is designed to fix. Let's start with the Documentation Checklist." If M1 data is null (assessment not completed), skip this message entirely — do not show an error.

2. **Budget Gap expenses:** M1's 8 expense categories do NOT feed M2 directly (they feed M3). However, the M1 `budgetGap.expenses.housing` value can be used as a reasonableness check: if the user enters a primary residence value in Tool 2 with no mortgage but M1 showed a housing expense > $0, flag it: "Your budget gap analysis showed housing costs of $X/month. Is there a mortgage or rent payment on this property?"

### M2 → M3 Flow (future, design note)

M2 data does not directly populate M3 tools, but the M2 liability data (credit card balances, loan payments) informs M3's expense categories. When M3 is built, consider pre-populating debt payment expense fields from M2 liability data.

---

### Tier Upgrade Behavior

When a user upgrades from Essentials to Navigator (or Navigator to Signature) mid-way through M2:

1. **Auto-classification backfill:** Re-run the classification logic for all inventory items where `classificationSource` is NOT `"user"`. This fills in auto-suggestions for items the user left as "unknown" because classification wasn't available at Essentials. Do NOT override any item where the user manually selected a classification.
2. **Commingling prompts:** Show commingling prompts for any items newly classified as "commingled" by the backfill. These appear the next time the user views that item's section.
3. **Navigator AI prompts:** Show AI prompt cards below any Tool 1 checklist categories that are already complete. The user didn't see these before because they were gated.
4. **No data re-entry:** All existing data is preserved. The upgrade adds features on top of existing work.
5. **One-time toast:** On first post-upgrade visit to any M2 tool, display a toast: "You now have Navigator access. We've added AI-powered classification to your inventory — review the suggestions marked with ★." Auto-dismiss after 6 seconds.

---

### Reset Behavior (all three tools)

Each tool displays a "Start over" text link at the bottom of the tool (Source Sans Pro, 14px, Navy at 50% opacity — understated, not a primary action). On click: confirmation dialog ("This will clear all entries in [tool name]. You'll start with a blank [checklist / inventory]. Are you sure?"). On confirm:
1. Clear the tool's section in the Zustand store (reset to initial state).
2. Clear the corresponding `modules.m2.[toolKey]` from the data pipeline.
3. Reset `startedAt` and `lastUpdatedAt` to null.

Resetting one tool does NOT affect the other two M2 tools. Resetting the Marital Estate Inventory does NOT reset the Personal Property Inventory (or vice versa), but the Personal Property summary line in Tool 2 will show "$0 — not yet inventoried" until Tool 3 is rebuilt.

---

### Shared State (Zustand)

All three tools share a Zustand store scoped to `m2`:

```javascript
// stores/m2Store.js
{
  documentChecklist: {
    items: [],                    // array of { id, category, status, notes }
    overallProgress: 0,
    completionScore: 0,
    categoryProgress: {           // MUST match data pipeline shape
      taxReturns: { progress: 0, collected: 0, located: 0, notApplicable: 0, notStarted: 6 },
      incomeDocumentation: { progress: 0, collected: 0, located: 0, notApplicable: 0, notStarted: 5 },
      bankAndCash: { progress: 0, collected: 0, located: 0, notApplicable: 0, notStarted: 5 },
      investmentAccounts: { progress: 0, collected: 0, located: 0, notApplicable: 0, notStarted: 5 },
      retirementAccounts: { progress: 0, collected: 0, located: 0, notApplicable: 0, notStarted: 5 },
      realEstate: { progress: 0, collected: 0, located: 0, notApplicable: 0, notStarted: 5 },
      debtAndLiabilities: { progress: 0, collected: 0, located: 0, notApplicable: 0, notStarted: 6 },
      legalAndInsurance: { progress: 0, collected: 0, located: 0, notApplicable: 0, notStarted: 5 }
    },
    startedAt: null,
    lastUpdatedAt: null,
    expandedCategories: [],       // UI state: which accordion sections are open
    milestonesFired: []           // dedup array: ["25%", "50%", etc.]
  },
  maritalEstateInventory: {
    marriageDate: null,
    items: [],                    // array of inventory item objects
    completenessScore: 0,
    summary: {                    // auto-calculated on every change
      totalAssets: 0,
      totalLiabilities: 0,
      netMaritalEstate: 0,
      clientAssets: 0,
      spouseAssets: 0,
      clientLiabilities: 0,
      spouseLiabilities: 0,
      unallocatedAssets: 0,
      unallocatedLiabilities: 0,
      clientNetEstate: 0,         // clientAssets - clientLiabilities
      spouseNetEstate: 0,         // spouseAssets - spouseLiabilities
      clientPercentage: 0,        // of allocated only
      spousePercentage: 0         // of allocated only
    },
    startedAt: null,
    lastUpdatedAt: null
  },
  personalPropertyInventory: {
    rooms: [],                    // array of { name, items: [] }
    highValueItems: [],           // array of high-value category items
    summary: {
      totalItems: 0,
      totalValue: 0,
      clientValue: 0,
      spouseValue: 0,
      disputedValue: 0,
      undecidedValue: 0,
      highValueItemCount: 0,      // count of items in high-value categories
      appraisalRecommended: false,
      appraisalFlags: []
    },
    inventoryCompleteness: 0,
    startedAt: null,
    lastUpdatedAt: null
  }
}
```

**Persistence:** Authenticated users (Essentials+ — which is all M2 users): persist to Supabase. sessionStorage fallback is not needed for M2 because access requires authentication. However, maintain sessionStorage as a write-through cache for offline resilience and faster load times.

---

## Related Documents

- [[Tier-Architecture-and-Gating-Map]] — tier context and gating rules
- [[AI-Knowledge-Base-Architecture]] — how the Navigator AI consumes M2 data
- [[curriculum-data.schema.v2]] — data contract (M2 section to be added based on this spec)
- [[Brand Voice]] — voice and style rules
- [[M1-Tool-Specs]] — M1 spec format reference
- [[M2-Handoff]] — build context and lessons learned

---

## Addendum 1 — Vested/Exercised Gate on Equity Compensation Entries (DEF-9, 2026-04-21)

**Applies to:** Tool 2 (Marital Estate Inventory), categories `stockOptions` and `corporateIncentives`.

**Problem:** Unvested equity compensation (unvested RSUs, unexercised options) is legally *deferred compensation*, not owned property. Its division uses coverture formulas (Hug / Nelson time-rule analysis), not direct allocation. Current M2 treats all equity comp identically, conflating owned vested shares with contingent future compensation.

**Resolution:** Add a per-grant vested/exercised vs. unvested/unexercised gate at the top of the entry form for both `stockOptions` and `corporateIncentives` categories.

### UI Specification

Before any other entry fields render, the gate appears:

```
┌─────────────────────────────────────────────────────────┐
│  Is this grant vested/exercised or unvested/unexercised?│
│                                                         │
│  ( ) Vested or exercised — I own it                     │
│  ( ) Unvested or unexercised — it's deferred comp       │
│                                                         │
│  [Info icon] Why does this matter?                      │
└─────────────────────────────────────────────────────────┘
```

Info-panel copy (shown on info icon hover/tap):

> Unvested equity compensation isn't legally yours yet — it's contingent on you staying employed through the vesting date. Courts divide these using coverture formulas (a time-rule that reflects how much of the vesting period overlapped with your marriage), not by splitting them as regular assets.
>
> If you select "Unvested," we'll capture the grant details but route them to Module 6's Deferred Compensation Analyzer rather than including them in your Asset Inventory totals.

Per-grant classification, not per-category. A single grant with partially-vested tranches should be entered as separate tranche records — each with its own gate answer.

### Behavior

- **Vested/exercised selection:** Standard entry form renders below the gate. Entry proceeds normally — written to `m2Store.maritalEstateInventory.items[]` with existing fields. Flows through TAV with standard 15% LTCG branch (see M4-Tool-Specs.md §9 Branch 5).
- **Unvested/unexercised selection:** Truncated stub entry form renders — fields: company, grant date, shares granted, vesting schedule (free-text if complex), strike price (options only). Entry routes to `blueprintStore.deferredCompStubs[]` with `deferredComp: true` flag. **Does NOT** write to `m2Store.maritalEstateInventory.items[]`. **Does NOT** contribute to M2 §3 Asset Inventory dollar totals.

### Blueprint §3 Rendering

Deferred comp stubs render as a separate, clearly-differentiated line item below the Asset Inventory proper:

```
Deferred Compensation (Pending Module 6)
  • [Company] — Grant [Date], [N] shares — valuation pending
  • [Company] — Grant [Date], [N] options @ $[strike] — valuation pending

  [→ Analyze deferred compensation in Module 6]
```

No dollar values shown. Link routes to M6 Deferred Compensation Analyzer (M6-TICKET-1) when that tool is built.

### Store Changes

- `blueprintStore`: add `deferredCompStubs: []` array. Each stub: `{ id, category: 'stockOptions' | 'corporateIncentives', company, grantDate, sharesGranted, vestingSchedule, strikePrice?, deferredComp: true, createdAt }`.
- `m2Store`: no schema change. Unvested entries don't write here.

### Validation

- **TC-A1:** User selects "Unvested" on a new `stockOptions` entry, enters stub fields, saves. Entry appears in `blueprintStore.deferredCompStubs[]`. Does NOT appear in `m2Store.maritalEstateInventory.items[]`. M2 §3 totals unchanged. Blueprint §3 renders the stub in the "Deferred Compensation (Pending Module 6)" line.
- **TC-A2:** User selects "Vested/exercised" on a new `stockOptions` entry. Standard entry form renders. Entry writes to `m2Store` normally. TAV entry panel picks it up per M4-Tool-Specs.md §9 Branch 5.
- **TC-A3:** User edits an existing entry — gate value is preserved and editable. Changing gate value mid-edit triggers confirmation dialog ("This will move the entry between your Asset Inventory and your Deferred Compensation list. Continue?").

### Cross-References

- **M4-Tool-Specs.md §9** — TAV scope and calculation branches; vested equity comp flows through the 15% LTCG branch
- **M6-TICKET-1** — Deferred Compensation Analyzer (coverture calculator, consumes the stubs this addendum routes)
- **`M5-Scope-and-Progress.md`** session 2026-04-21 (late evening) — Full DEF-9 rationale and contingent-asset pattern
- **TC-A3 implementation ticket** — `M2-Handoff.md` M2 Schema Evolution Sprint table (gate-flip confirmation dialog)
- **Commit of record:** `0188f64` on `m4-blueprint` (DEF-9 + DEF-6 implementation, 2026-04-21)
