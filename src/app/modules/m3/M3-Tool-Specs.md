---
type: build-prompt
module: m3
status: draft
tool: Claude Code
created: 2026-04-12
revenue_stream: essentials + navigator + signature
clearpath_pro_licensable: true
tags:
  - m3
  - expenses
  - income
  - affidavit
  - budget
  - pay-stub
---
# M3: Know What You Spend — Tool Specifications

> **Module context:** M3 is the expense and income analysis module. It transitions users from understanding what they own (M2) to understanding what they earn and spend — and critically, how those numbers change when one household becomes two. The three tools below serve Essentials ($97), Navigator ($247/3mo), and Signature ($3,500+) tiers per the [[Tier-Architecture-and-Gating-Map]].
>
> **Tier gating:** Essentials = worksheets only (interactive tools render, but AI guidance and generated Budget Analysis deliverable are gated). Navigator = full tools + AI. Signature = full tools + AI + Budget Analysis deliverable.
>
> **Brand voice:** Apply ClearPath voice per `Frameworks/Brand Voice.md`. All four attributes — Clear, Steady, Expert, Warm — are active. For M3 specifically, dial up **Clear** and **Expert** (users are now past the contemplation phase and working with real numbers). Keep **Warm** present — expense tracking is emotionally loaded.
>
> **Data contract:** All tools write to `curriculum-data.schema.v2.json` at `modules.m3`. Never break the contract between modules.
>
> **Grounded in:** CDFA Coursework — Analyzing the Financial Data (Paula/Peter case study, Michael/Cathy case study, expense worksheets, financial affidavit process), CDFA Coursework — Spousal and Child Support (income calculation methodology), IDFA Expense Worksheets, IDFA Expense/Budget Comparison Worksheet, IDFA Sample Financial Affidavit.
>
> **Font dependencies:** Playfair Display (700) and Source Sans Pro (400, 600). Same as M1/M2.

---

## Zustand Store Schema — `m3Store.js`

> This store follows the same patterns as `m1Store.js` and `m2Store.js`: Zustand with sessionStorage persistence for anonymous/free users, Supabase persistence for authenticated Essentials+ users.

```javascript
// stores/m3Store.js
{
  // ═══════════════════════════════════════════
  // TOOL 1: PAY STUB DECODER
  // ═══════════════════════════════════════════
  payStubDecoder: {
    completed: false,
    completedAt: null,           // ISO 8601
    inputs: {
      payFrequency: null,        // "weekly" | "biweekly" | "semimonthly" | "monthly"
      paychecksPerYear: null,    // number — defaults from frequency, user-overridable (Paula's 19)
      useCustomPaychecks: false, // true when user overrides default count
      grossPayPerCheck: null,    // number — gross amount on a single paycheck
      deductions: [
        // Each: { id, label, perPaycheck, isVoluntary, isPreTax }
        // Pre-populated defaults:
        // { id: "fedTax", label: "Federal Withholding", perPaycheck: 0, isVoluntary: false, isPreTax: false }
        // { id: "stateTax", label: "State Withholding", perPaycheck: 0, isVoluntary: false, isPreTax: false }
        // { id: "socialSecurity", label: "Social Security", perPaycheck: 0, isVoluntary: false, isPreTax: false }
        // { id: "medicare", label: "Medicare", perPaycheck: 0, isVoluntary: false, isPreTax: false }
        // { id: "medical", label: "Medical Insurance", perPaycheck: 0, isVoluntary: false, isPreTax: true }
        // { id: "dental", label: "Dental Insurance", perPaycheck: 0, isVoluntary: false, isPreTax: true }
        // { id: "401k", label: "401(k) / 403(b) / 457", perPaycheck: 0, isVoluntary: true, isPreTax: true }
      ],
      otherIncomeSources: [
        // Each: { id, source, monthlyAmount, isTaxable }
        // e.g. { id: "cs1", source: "Temporary Child Support", monthlyAmount: 1000, isTaxable: false }
      ]
    },
    results: null
    // When computed:
    // {
    //   grossMonthlyIncome: number,
    //   monthlyDeductions: { required: number, voluntary: number, total: number },
    //   netMonthlyIncome: number,
    //   takeHomePay: number,           // net + voluntary deductions added back
    //   otherIncomeMonthly: number,
    //   totalMonthlyIncomeAllSources: number,
    //   deductionBreakdown: [{ id, label, monthly, annual, isVoluntary }],
    //   warnings: string[]             // e.g. ["Pay frequency may be incorrect — bi-weekly ≠ semi-monthly"]
    // }
  },

  // ═══════════════════════════════════════════
  // TOOL 2: MARRIED-VS-SINGLE BUDGET MODELER
  // ═══════════════════════════════════════════
  budgetModeler: {
    completed: false,
    completedAt: null,
    prePopulated: {
      fromM1: false,   // true if M1 Budget Gap data was loaded
      fromM2: false,   // true if M2 liability data was loaded
      fromTool1: false  // true if Pay Stub Decoder income was loaded
    },
    married: {
      // 10 expense categories, each an object with line items
      home: {
        rentMortgage: 0, hoaFees: 0, propertyTaxes: 0, phone: 0,
        cellPhone: 0, internet: 0, cableSatellite: 0, securitySystem: 0,
        electricity: 0, gasOilPropane: 0, waterSewer: 0, trashRemoval: 0,
        lawnCare: 0, snowRemoval: 0, repairsMaintenance: 0,
        cleaningServices: 0, other: 0
      },
      food: {
        groceries: 0, snacks: 0, fastFood: 0, restaurantMeals: 0
      },
      entertainment: {
        entertainment: 0, movieTheater: 0, hobbies: 0, classesLessons: 0,
        vacationTravel: 0, membershipsClubs: 0
      },
      medical: {
        physicians: 0, dentistOrtho: 0, optometristVision: 0, prescriptions: 0
      },
      insurance: {
        life: 0, healthDental: 0, disability: 0, longTermCare: 0,
        home: 0, auto: 0, other: 0
      },
      transportation: {
        autoPayment: 0, fuel: 0, repairMaintenance: 0,
        parkingTolls: 0, license: 0, taxisPublicTransit: 0
      },
      personalMisc: {
        clothing: 0, dryCleaning: 0, giftsHoliday: 0,
        vitaminsOTC: 0, toiletries: 0, beautyHair: 0,
        petCare: 0, booksNewspapers: 0, homeOffice: 0,
        postageCourier: 0, education: 0, donations: 0, cash: 0
      },
      otherPayments: {
        quarterlyTaxes: 0, creditCardDebt: 0, loanPayments: 0,
        serviceFees: 0, eldercare: 0, spousalSupport: 0,
        childSupport: 0, professionalFees: 0, mediationCourt: 0,
        therapyCounseling: 0
      },
      children: {
        educationTuition: 0, schoolSupplies: 0, childcareWork: 0,
        childcareNonWork: 0, sportsCampsLessons: 0, hobbiesToysGames: 0,
        schoolMeals: 0, clothing: 0, medicalNotCovered: 0,
        dentalNotCovered: 0, optometristNotCovered: 0,
        prescriptionsNotCovered: 0, allowances: 0, transportation: 0,
        miscellaneous: 0
      },
      savings: {
        emergencyFund: 0, retirementContributions: 0, collegeSavings: 0,
        otherSavings: 0
      }
    },
    single: {
      // Same shape as married — separate object so every field can differ
      // Initialized as a deep copy of married on first "Start Single Budget" action
      home: { /* same keys */ },
      food: { /* same keys */ },
      entertainment: { /* same keys */ },
      medical: { /* same keys */ },
      insurance: { /* same keys */ },
      transportation: { /* same keys */ },
      personalMisc: { /* same keys */ },
      otherPayments: { /* same keys */ },
      children: { /* same keys */ },
      savings: { /* same keys */ }
    },
    results: null
    // When computed:
    // {
    //   currentTotal: number,
    //   projectedTotal: number,
    //   delta: number,                   // projectedTotal - currentTotal
    //   deltaPercent: number,
    //   categoryDeltas: [{ category, current, projected, delta }],
    //   topIncreases: [{ lineItem, category, current, projected, delta }],  // top 3
    //   topDecreases: [{ lineItem, category, current, projected, delta }],  // top 3
    //   incomeComparison: {             // if Pay Stub Decoder completed
    //     monthlyIncome: number,
    //     currentSurplusShortfall: number,
    //     projectedSurplusShortfall: number
    //   }
    // }
  },

  // ═══════════════════════════════════════════
  // TOOL 3: FINANCIAL AFFIDAVIT BUILDER
  // ═══════════════════════════════════════════
  affidavitBuilder: {
    completed: false,
    completedAt: null,
    prePopulated: {
      fromTool1: false,  // income from Pay Stub Decoder
      fromTool2: false,  // expenses from Budget Modeler
      fromM2: false       // assets/liabilities from M2
    },
    sections: {
      // Part A: Income
      income: {
        primaryEmployment: {
          employer: "",
          payFrequency: null,    // loaded from Tool 1 if available
          paychecksPerYear: null,
          grossPayPerCheck: 0,
          grossMonthlyIncome: 0, // calculated
          deductions: [],         // loaded from Tool 1 if available
          totalDeductions: 0,
          netMonthlyIncome: 0
        },
        otherIncome: [],          // loaded from Tool 1 if available
        deductionsFromOtherIncome: [],
        netMonthlyIncomeAllSources: 0,
        monthlyIncomeOfDependentChildren: 0
      },
      // Part B: Expenses (loaded from Tool 2 "single" column if available)
      expenses: {
        home: {},         // same shape as budgetModeler.single.home
        food: {},
        entertainment: {},
        medical: {},
        insurance: {},
        transportation: {},
        personalMisc: {},
        otherPayments: {},
        children: {},
        // No savings category — affidavit doesn't include savings
        totalMonthlyExpenses: 0,
        totalMonthlyExpensesExcludingChildren: 0
      },
      // Part C: Assets (loaded from M2 maritalEstateInventory if available)
      assets: {
        loaded: false,    // true if M2 data was imported
        summary: {
          realProperty: 0,
          cashAccounts: 0,
          investments: 0,
          retirementAccounts: 0,
          otherAssets: 0,
          personalProperty: 0,
          totalAssets: 0
        }
      },
      // Part D: Liabilities (loaded from M2 maritalEstateInventory if available)
      liabilities: {
        loaded: false,
        summary: {
          loans: 0,
          creditCards: 0,
          otherDebt: 0,
          totalLiabilities: 0
        }
      }
    },
    progress: {
      incomeComplete: false,
      expensesComplete: false,
      assetsComplete: false,
      liabilitiesComplete: false
    }
  },

  // ═══════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════

  // Pay Stub Decoder
  setPayStubField: (path, value) => {},
  addDeduction: (deduction) => {},
  removeDeduction: (id) => {},
  addOtherIncomeSource: (source) => {},
  removeOtherIncomeSource: (id) => {},
  calculatePayStubResults: () => {},
  resetPayStubDecoder: () => {},

  // Budget Modeler
  prePopulateFromM1: () => {},       // loads M1 budgetGap expenses into married column
  prePopulateFromM2Liabilities: () => {}, // loads M2 debt data into otherPayments
  prePopulateFromPayStub: () => {},  // loads income for comparison
  setBudgetField: (column, category, field, value) => {}, // column: "current" | "projected"
  copyCategoryToProjected: (category) => {},  // one-click copy current → projected for a category
  copyAllToProjected: () => {},          // copy entire current budget to projected as starting point
  calculateBudgetResults: () => {},
  resetBudgetModeler: () => {},

  // Affidavit Builder
  prePopulateAffidavitFromTools: () => {},  // loads from Tool 1, Tool 2, M2
  setAffidavitField: (section, path, value) => {},
  calculateAffidavitTotals: () => {},
  markSectionComplete: (section) => {},
  resetAffidavitBuilder: () => {}
}
```

---

## Cross-Tool Data Flows

### Inbound (from other modules)

| Source | Target | Data | Trigger |
|---|---|---|---|
| M1 `budgetGap.expenses` | Tool 2 `m1References` | 8 M1 categories mapped to 10 M3 category-level reference values (displayed above categories, NOT injected into line-item fields). housing+utilities→home, groceries→food, healthInsurance→insurance, transportation→transportation, childcare→children, debtPayments→otherPayments, personal→personalMisc, savings→savings | Auto on Tool 2 mount if M1 completed |
| M1 `budgetGap.payFrequency` + `grossMonthlyIncome` | Tool 1 inputs | Pay frequency and gross income | Auto on Tool 1 mount if M1 completed |
| M2 `maritalEstateInventory.items` (loans, creditCards, otherDebt) | Tool 2 `married.otherPayments` + Tool 3 liabilities | Liability descriptions + monthly payments | Auto on mount if M2 completed |
| M2 `maritalEstateInventory.items` (all asset categories) | Tool 3 assets | Asset summaries by type | Auto on Tool 3 mount if M2 completed |

### Internal (within M3)

| Source | Target | Data | Trigger |
|---|---|---|---|
| Tool 1 results | Tool 2 `incomeComparison` | `totalMonthlyIncomeAllSources` | Auto on Tool 2 results calc if Tool 1 completed |
| Tool 1 results | Tool 3 `income` section | Full income + deductions | Auto on Tool 3 mount if Tool 1 completed |
| Tool 2 `single` column | Tool 3 `expenses` section | All single-household expenses | Auto on Tool 3 mount if Tool 2 completed |

### Outbound (to future modules)

| Source | Target | Data |
|---|---|---|
| Tool 1 `results.grossMonthlyIncome` | M4 Filing Status Optimizer | Gross income for tax calculations |
| Tool 1 `results.takeHomePay` | M4 Tax impact analysis | Take-home pay baseline |
| Tool 2 `results` | M5 Marital Home Affordability | Single-household expense total for affordability check |
| Tool 3 complete affidavit data | M7 Blueprint | "Income and Expenses" section of the 12-section Blueprint |

---

## Tool 1: Pay Stub Decoder

### Purpose

Teaches users how to read their pay stub correctly — the most common source of income errors in divorce financial analysis. Grounded in the Paula case study from CDFA Coursework, where Paula's self-reported payment frequency (semi-monthly) was wrong (actually bi-weekly), she was a seasonal employee receiving only 19 of 26 possible paychecks, and her gross income and deduction calculations were therefore all incorrect.

This tool turns a confusing pay stub into a clear monthly income picture, flags common errors, and distinguishes between required deductions (taxes, FICA) and voluntary deductions (401k, bonds, credit union) — because voluntary deductions must be added back for take-home pay calculations in divorce.

Available at **Essentials tier** (worksheet-only) and above.

### Instructions

Build a professional React component (.jsx) called `PayStubDecoder` for the ClearPath for Women M3 module.

> **Grounded in:** CDFA Coursework — Analyzing the Financial Data, Lesson 3 (Paula's Income and Expenses): pay frequency confusion (bi-weekly ≠ semi-monthly, 26 vs 24), seasonal employee calculation (19 paychecks), deduction recalculation formula `(deduction × paychecksPerYear) / 12`. Also: Michael/Cathy case study Lesson 6 — voluntary 401(k) contributions not included in take-home pay, Social Security wage cap calculation.

---

### USER INPUTS

#### Section A — Pay Frequency and Schedule

| # | Field | Type | Validation | Default | Notes |
|---|---|---|---|---|---|
| A1 | Pay frequency | Select | Required | — | Options: Weekly / Biweekly / Semi-monthly / Monthly. **Inline educational callout:** "Biweekly means you're paid every two weeks (26 paychecks/year). Semi-monthly means twice a month on set dates (24 paychecks/year). Getting this wrong is the #1 income error in divorce." |
| A2 | Use standard paycheck count? | Toggle | — | true | When true, uses standard count (52/26/24/12). When false, reveals A3. **Helper:** "If you're a seasonal employee, part-time, or started mid-year, your actual paycheck count may differ." |
| A3 | Actual paychecks per year | Number | 1–52, required if A2=false | — | **Helper:** "Count the pay stubs you received last year, or check with your employer. This number is critical for accurate monthly income." |

**Pay frequency → default paycheck count mapping:**

| Frequency | Default Paychecks/Year |
|---|---|
| Weekly | 52 |
| Biweekly | 26 |
| Semi-monthly | 24 |
| Monthly | 12 |

#### Section B — Gross Pay

| # | Field | Type | Validation | Default | Notes |
|---|---|---|---|---|---|
| B1 | Gross pay per paycheck | Currency | > 0, required | — | **Helper:** "This is the amount before any deductions — the largest number on your pay stub, usually labeled 'Gross Pay' or 'Total Earnings.'" |

**Live calculation (displayed immediately below B1):**

```
grossMonthlyIncome = grossPayPerCheck × paychecksPerYear / 12
grossAnnualIncome = grossPayPerCheck × paychecksPerYear
```

Display: "Your gross monthly income: **$X,XXX** ($XX,XXX/year)"

#### Section C — Paycheck Deductions

Pre-populated with 7 standard deduction rows. User enters the per-paycheck amount for each. User can add custom deduction rows.

| # | Default Label | isVoluntary | isPreTax | Notes |
|---|---|---|---|---|
| C1 | Federal Withholding | false | false | Required deduction |
| C2 | State Withholding | false | false | Required deduction |
| C3 | Social Security | false | false | Required. **Helper for high earners (if grossAnnual > $168,600):** "Social Security tax stops after you earn $168,600. Your monthly deduction should be averaged: ($168,600 × 6.2%) / 12 = $871." |
| C4 | Medicare | false | false | Required. **Helper:** "Medicare has no income cap — it's always 1.45% of gross pay." |
| C5 | Medical Insurance | false | true | Required. **Helper:** "If you're on your spouse's plan, you'll need to estimate your own coverage cost post-divorce." |
| C6 | Dental Insurance | false | true | Required |
| C7 | 401(k) / 403(b) / 457 | true | true | **Voluntary.** **Critical educational callout (gold box):** "This deduction is voluntary. In divorce financial analysis, voluntary retirement contributions are added back to calculate your true take-home pay. This doesn't mean you should stop contributing — it means the court considers this money available for support calculations." |

**Add custom deduction:** Button to add rows for Bonds, Credit Union, Loan Repayment, Union Dues, Charitable Contributions, Other.

**Per-deduction calculation (shown inline):**
```
monthlyDeduction = (perPaycheck × paychecksPerYear) / 12
annualDeduction = perPaycheck × paychecksPerYear
```

#### Section D — Other Sources of Income

Repeating rows for additional income not on the primary pay stub.

| # | Field | Type | Notes |
|---|---|---|---|
| D1 | Source | Text | e.g., "Temporary child support", "Part-time job", "Rental income" |
| D2 | Monthly amount | Currency | |
| D3 | Is this taxable? | Toggle | Default: true. **Helper:** "Child support received is not taxable. Spousal support received under pre-2019 agreements is taxable; post-2018 agreements it's not. Interest and rental income are taxable." |

---

### THE CORE CALCULATIONS

```javascript
// Step 1: Gross monthly income
const paychecks = useCustomPaychecks ? customPaychecksPerYear : defaultPaychecksForFrequency;
const grossMonthly = (grossPayPerCheck * paychecks) / 12;
const grossAnnual = grossPayPerCheck * paychecks;

// Step 2: Monthly deductions (per-paycheck × paychecks / 12)
const deductionRows = deductions.map(d => ({
  ...d,
  monthly: (d.perPaycheck * paychecks) / 12,
  annual: d.perPaycheck * paychecks
}));

const requiredDeductions = deductionRows.filter(d => !d.isVoluntary).reduce((sum, d) => sum + d.monthly, 0);
const voluntaryDeductions = deductionRows.filter(d => d.isVoluntary).reduce((sum, d) => sum + d.monthly, 0);
const totalDeductions = requiredDeductions + voluntaryDeductions;

// Step 3: Net monthly income from primary employment
const netMonthlyIncome = grossMonthly - totalDeductions;

// Step 4: Take-home pay (add back voluntary deductions)
const takeHomePay = netMonthlyIncome + voluntaryDeductions;
// i.e., takeHomePay = grossMonthly - requiredDeductions

// Step 5: Other income
const otherIncomeMonthly = otherIncomeSources.reduce((sum, s) => sum + s.monthlyAmount, 0);

// Step 6: Total monthly income from all sources
const totalMonthlyIncomeAllSources = takeHomePay + otherIncomeMonthly;
```

---

### OUTPUTS

#### Output 1 — Income Summary Card

| Line | Value | Color |
|---|---|---|
| Gross Monthly Income | $X,XXX | Navy |
| − Required Deductions | ($X,XXX) | Navy |
| − Voluntary Deductions | ($XXX) | Gold with strikethrough line |
| = Net Monthly Income (Primary) | $X,XXX | Navy bold |
| + Voluntary Deductions Added Back | $XXX | Gold |
| = Take-Home Pay (Primary) | **$X,XXX** | Navy bold, larger |
| + Other Income Sources | $X,XXX | Navy |
| = **Total Monthly Income (All Sources)** | **$X,XXX** | Navy, Playfair Display, 36px |

**Educational callout (gold border box below summary):**
"In divorce financial analysis, take-home pay — not net income from your paycheck — is the number that matters. Voluntary deductions like 401(k) contributions are considered available income for support calculations."

#### Output 2 — Deduction Breakdown Chart (Recharts)

Horizontal stacked bar chart:
- One bar = total gross monthly income
- Segments: Federal tax (Navy), State tax (#4A6FA5), Social Security (#6B8E9B), Medicare (#5C7A6E), Medical/Dental (#8B6F47), Voluntary deductions (Gold with diagonal hatch), Take-home pay (green #2D8A4E)
- Labels: dollar amount + percentage of gross

#### Output 3 — Warning Flags

Conditional warnings displayed in amber (#D4A843) callout boxes:

| Condition | Warning |
|---|---|
| biweekly selected + user might mean semi-monthly | "Double-check: Biweekly = every 2 weeks (26 times/year). Semi-monthly = twice per month on set dates (24 times/year). This two-paycheck difference changes your monthly income by [calculated delta]." |
| grossAnnual > $168,600 + socialSecurity deduction appears to be per-paycheck rate (> $871/mo after conversion) | "Your income is above the Social Security wage cap ($168,600). Your average monthly Social Security deduction should be $871, not $[their calculated amount]. This may be overstated." |
| 401(k) annual contribution > $23,500 (2025 limit) | "Your 401(k) contributions appear to exceed the annual limit ($23,500 for 2025, $31,000 if age 50+). Verify this number." |
| No medical insurance deduction + no insurance in other sources | "No health insurance deduction found. If you're on your spouse's plan, you'll need to budget for your own coverage post-divorce. Individual marketplace plans typically cost $400–$700/month." |

#### Output 4 — CTA

Below results, a full-width CTA card:

> **"Now see what your expenses look like."**
> "The Budget Modeler compares what you spend now as a married household to what you'll spend on your own — and shows you exactly where the numbers change."
> **[Build My Budget →]** (button, Navy background, Parchment text, links to Tool 2)

---

### DATA PIPELINE

Write to `curriculum-data.schema.v2.json` at:

```json
{
  "modules": {
    "m3": {
      "payStubDecoder": {
        "completedAt": "2026-04-12T10:00:00Z",
        "payFrequency": "biweekly",
        "paychecksPerYear": 19,
        "useCustomPaychecks": true,
        "grossPayPerCheck": 640,
        "grossMonthlyIncome": 1013.33,
        "grossAnnualIncome": 12160,
        "deductions": [
          { "id": "fedTax", "label": "Federal Withholding", "perPaycheck": 51, "monthly": 80.75, "isVoluntary": false },
          { "id": "stateTax", "label": "State Withholding", "perPaycheck": 13, "monthly": 20.58, "isVoluntary": false },
          { "id": "socialSecurity", "label": "Social Security", "perPaycheck": 40, "monthly": 63.33, "isVoluntary": false },
          { "id": "medicare", "label": "Medicare", "perPaycheck": 9, "monthly": 14.25, "isVoluntary": false }
        ],
        "requiredDeductionsMonthly": 178.92,
        "voluntaryDeductionsMonthly": 0,
        "netMonthlyIncome": 834.42,
        "takeHomePay": 834.42,
        "otherIncomeSources": [
          { "source": "Temporary Child Support", "monthlyAmount": 1000, "isTaxable": false }
        ],
        "otherIncomeMonthly": 1000,
        "totalMonthlyIncomeAllSources": 1834.42,
        "warnings": ["Pay frequency corrected from semi-monthly to biweekly"]
      }
    }
  }
}
```

**Downstream consumers:**
- **Tool 2 (Budget Modeler):** Uses `totalMonthlyIncomeAllSources` for surplus/shortfall calculation.
- **Tool 3 (Affidavit Builder):** Pre-populates entire income section (Part A).
- **M4 (Filing Status Optimizer):** Uses `grossAnnualIncome` for tax calculations.
- **AI Navigator:** Uses income data to contextualize expense conversations and flag anomalies.

---

### UI REQUIREMENTS

**Layout:**
- Vertical stepper with 4 sections: Pay Schedule → Gross Pay → Deductions → Other Income.
- Each section collapsible with ✓ indicator when complete.
- Running "Income Summary" sidebar on desktop (sticky), bottom sheet on mobile.
- Currency inputs: `$` prefix, comma formatting on blur, `inputmode="decimal"`.

**Results screen:**
- Income Summary Card (centered, full-width).
- Deduction Breakdown Chart (below summary, 100% width, 250px height).
- Warning flags (if any, below chart).
- CTA card (bottom).

**Brand tokens:** Navy #1B2A4A, Gold #C8A96E, Parchment #FAF8F2, White #FFFFFF, Warning amber #D4A843, Surplus green #2D8A4E.

**Typography:** Headings: Playfair Display. Body/inputs: Source Sans Pro. Income total: Playfair Display 36px.

**Accessibility:**
- All form inputs have associated `<label>` elements.
- Currency inputs have `inputmode="decimal"` for mobile numeric keyboard.
- Toggle switches have `role="switch"` with `aria-checked`.
- Deduction table is a proper `<table>` with `<thead>` and `<tbody>`.
- Charts include visually hidden data tables.
- Warning flags use `role="alert"`.

**Responsive:**
- Mobile (< 640px): full-width, stepper collapses to accordion, summary shows inline after each section.
- Tablet (640–1024px): centered max-width 700px.
- Desktop (> 1024px): two-column layout — form left (60%), sticky summary right (40%).

---

### VALIDATION TEST CASES

| # | Scenario | Inputs | Expected Output |
|---|---|---|---|
| TC-1 | Paula case study — original (wrong) | Semi-monthly, 24 paychecks, $640/check | grossMonthly = $1,280. This is the WRONG answer that Paula originally reported. |
| TC-2 | Paula case study — corrected frequency | Biweekly, 26 paychecks, $640/check | grossMonthly = $1,386.67. Still wrong — she's seasonal. |
| TC-3 | Paula case study — fully corrected | Biweekly, custom 19 paychecks, $640/check, deductions: Fed $51, State $13, SS $40, Medicare $9. Other income: child support $1,000 (non-taxable) | grossMonthly = $1,013.33, totalDeductions = $178.92, netMonthly = $834.42, takeHome = $834.42, totalAllSources = $1,834.42 |
| TC-4 | High earner with voluntary 401(k) | Monthly, 12 paychecks, $15,000/check, deductions: Fed $2,268, State $457, SS $930, Medicare $218, 401(k) $2,250 | grossMonthly = $15,000, voluntaryDeductions = $2,250, netMonthly = $8,877, takeHomePay = $11,127. Warning: 401(k) annual $27,000 exceeds limit. Warning: SS may be overstated (monthly $930 vs avg $871). |
| TC-5 | Michael case study — corrected | Monthly, 12 paychecks, $15,000, deductions: Fed $2,268, State $457, SS $871 (corrected avg), Medicare $218, 401(k) $0 (voluntary removed) | grossMonthly = $15,000, takeHomePay = $11,186, net = $11,186 (no voluntary to add back) |
| TC-6 | Weekly pay | Weekly, 52 paychecks, $1,500/check | grossMonthly = $6,500.00 |
| TC-7 | Other income — multiple sources | Monthly, 12, $5,000, plus: rental $800 taxable, child support $1,200 non-taxable | otherIncomeMonthly = $2,000, totalAllSources = $5,000 + $2,000 = $7,000 (minus deductions) |
| TC-8 | No medical insurance warning | Any frequency, no medical/dental deductions entered, no insurance in other income | Warning flag: "No health insurance deduction found..." |
| TC-9 | Pre-population from M1 | M1 completed with biweekly, $3,461.54 gross | Tool 1 loads: payFrequency = "biweekly", grossPayPerCheck inferred from M1 data if available |

---

### DISCLAIMER

Footer text (Source Sans Pro, 12px, Navy at 60% opacity):

> "This tool is for educational and planning purposes only. It provides estimates based on the numbers you enter. Actual take-home pay depends on filing status, exemptions, and state tax rules. Voluntary deduction treatment varies by jurisdiction. For guidance specific to your situation, consult a Certified Divorce Financial Analyst® or attorney."

---
---

## Tool 2: Married-vs-Single Budget Modeler

### Purpose

Side-by-side comparison of current married household expenses versus projected single household expenses. This is where the revelation architecture works hardest — the tool surfaces the reality that divorce creates expense duplication (one household becomes two, and most costs don't halve). Grounded in the IDFA Expense/Budget Comparison Worksheet structure and the David/Daphne case study showing that many clients have no idea what they actually spend.

The tool uses the full IDFA expense category structure (10 categories, 100+ line items) rather than the simplified 8-category structure from M1's Budget Gap Calculator. This gives users the granular view they need for affidavit preparation (Tool 3) while showing exactly where their costs will increase, decrease, or remain the same post-divorce.

Available at **Essentials tier** (worksheets only) and above.

### Instructions

Build a professional React component (.jsx) called `BudgetModeler` for the ClearPath for Women M3 module.

> **Grounded in:** CDFA Coursework — Analyzing the Financial Data (Expense Worksheets, Expense/Budget Comparison Worksheet, David/Daphne case study). IDFA Expense Worksheets (8 monthly tracking worksheets). IDFA Expense/Budget Comparison Worksheet (Client vs. Spouse, Monthly + Annual, category totals). DFA Journal Q1 2026 — income disparity and duplication of expenses analysis.

---

### USER FLOW

**Step 1: Married Household Budget**
User enters current married household expenses across 10 categories. If M1 Budget Gap Calculator was completed, the 8 simplified categories pre-populate into their detailed equivalents (with a dismissable banner: "We loaded your estimates from the Budget Gap Calculator. These are starting points — take time to refine them now.").

If M2 liabilities were entered, debt payment fields pre-populate in Other Payments.

**Step 2: Single Household Budget**
User clicks "Start My Single Budget." The married values are deep-copied as a starting point. A banner explains: "We've started with your married expenses. Go through each category and adjust for life on your own. Some costs go up (you'll need your own insurance). Some go down (groceries for one vs. two). Some stay the same."

User edits the single column. Key educational prompts surface at relevant points.

**Step 3: Comparison Results**
Side-by-side results with category-level and line-item-level deltas. If Pay Stub Decoder was completed, includes income comparison showing surplus/shortfall for each scenario.

---

### EXPENSE CATEGORIES AND LINE ITEMS

The 10 categories and their line items match the IDFA Expense Worksheets and Financial Affidavit structure exactly. See Zustand store schema above for the full field list. The categories are:

1. **Home** — 17 line items (Rent/Mortgage through Other)
2. **Food** — 4 line items (Groceries, Snacks, Fast Food, Restaurant Meals)
3. **Entertainment & Recreation** — 6 line items
4. **Medical** — 4 line items (after insurance — excludes children)
5. **Insurance** — 7 line items
6. **Transportation** — 6 line items
7. **Personal & Miscellaneous** — 13 line items
8. **Other Payments** — 10 line items (quarterly taxes, debt, support, legal, therapy)
9. **Children** — 15 line items (2 pages in IDFA worksheets)
10. **Savings** — 4 line items (not in IDFA affidavit, but essential for planning)

**Category educational prompts (displayed when user enters the single column for each category):**

| Category | Prompt |
|---|---|
| Home | "Will you stay in the current home, or move? If moving, estimate new rent/mortgage. Property taxes, HOA, and insurance may change. Don't forget: maintenance costs don't halve — a roof replacement costs the same whether one person or two lives there." |
| Food | "Groceries typically decrease 30–40% for a single-person household, but not by half. Restaurant and takeout spending often increases during and after divorce." |
| Insurance | "If you're on your spouse's health plan, you'll need your own. COBRA is an option but expensive and temporary. Check your employer's plan or the marketplace. Budget $400–$700/month for individual coverage." |
| Transportation | "Will you keep the same car? If you're a two-car household and keeping one, your payment and insurance may stay the same, but fuel and maintenance could change with a different commute." |
| Children | "These expenses are shared between parents according to the custody arrangement. Estimate your share, not the total. Don't forget: children's expenses often increase after divorce (duplicate gear, transportation between homes)." |
| Other Payments | "Debt payments: check whether each debt is in your name, your spouse's name, or joint. You may not be responsible for all of them post-divorce. Add legal fees, mediation costs, and therapy — these are real expenses during divorce." |

---

### THE CORE CALCULATIONS

```javascript
// Per-category totals
const categoryTotal = (column, category) =>
  Object.values(store[column][category]).reduce((sum, val) => sum + (val || 0), 0);

// Grand totals
const currentTotal = CATEGORIES.reduce((sum, cat) => sum + categoryTotal('current', cat), 0);
const projectedTotal = CATEGORIES.reduce((sum, cat) => sum + categoryTotal('projected', cat), 0);

// Delta
const delta = projectedTotal - currentTotal;
const deltaPercent = currentTotal > 0 ? (delta / currentTotal) * 100 : null;

// Per-category deltas
const categoryDeltas = CATEGORIES.map(cat => ({
  category: cat,
  current: categoryTotal('current', cat),
  projected: categoryTotal('projected', cat),
  delta: categoryTotal('projected', cat) - categoryTotal('current', cat)
}));

// Top 3 increases and decreases (line-item level)
const allLineItemDeltas = [];
CATEGORIES.forEach(cat => {
  Object.keys(store.current[cat]).forEach(field => {
    const m = store.current[cat][field] || 0;
    const s = store.projected[cat][field] || 0;
    if (m !== s) {
      allLineItemDeltas.push({ lineItem: field, category: cat, current: m, projected: s, delta: s - m });
    }
  });
});
const topIncreases = allLineItemDeltas.filter(d => d.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
const topDecreases = allLineItemDeltas.filter(d => d.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);

// Income comparison (if Pay Stub Decoder completed)
if (payStubDecoder.completed) {
  const income = payStubDecoder.results.totalMonthlyIncomeAllSources;
  const currentSurplus = income - currentTotal;
  const projectedSurplus = income - projectedTotal;
}
```

---

### OUTPUTS

#### Output 1 — Comparison Summary Card

Centered, large display:

| Line | Married | Single |
|---|---|---|
| Total Monthly Expenses | $X,XXX | $X,XXX |
| Monthly Change | | +/−$X,XXX (XX%) |

Color: increase = Red (#C0392B), decrease = Green (#2D8A4E), no change = Navy.

If income available:
| Your Monthly Income | $X,XXX |
| Married Surplus/Shortfall | +/−$X,XXX |
| Single Surplus/Shortfall | +/−$X,XXX |

#### Output 2 — Category Comparison Bar Chart (Recharts)

Grouped horizontal bar chart: married (Navy) vs single (Gold) bars for each of 10 categories. Delta label on the right side of each row (+$XXX or −$XXX, colored red/green).

#### Output 3 — Top Changes Cards

Two cards side by side (stacked on mobile):
- **"Where Costs Go Up"** — Top 3 line-item increases, Red accent
- **"Where Costs Go Down"** — Top 3 line-item decreases, Green accent

Each shows: line item name, married amount, single amount, delta.

#### Output 4 — Revelation Message

Conditional message based on delta:

| Condition | Message |
|---|---|
| delta > 0 (single costs more) | "Living independently typically costs more, not less. Your single household expenses are **$[delta] more per month** than your current married budget. This is normal — expenses like housing, insurance, and utilities don't split evenly. Understanding this gap is the first step to planning around it." |
| delta < 0 (single costs less) | "Your projected single expenses are **$[abs(delta)] less per month** than your married household. This is less common — review your single budget to make sure you haven't underestimated new costs like health insurance, home maintenance, or children's duplicate needs." |
| delta ≈ 0 (within $50) | "Your single and married expenses are roughly equal. The mix changes — some categories go up, others go down — but the total is similar. What matters now is whether your income covers these costs." |

**If income available and single shows shortfall:**
"Your projected single expenses exceed your income by **$[shortfall]/month**. The Financial Affidavit Builder (next tool) will help you organize these numbers, and Modules 4–6 cover strategies to close this gap — from tax planning to settlement negotiation."

#### Output 5 — CTA

> **"Ready to put this on paper?"**
> "The Financial Affidavit Builder organizes your income and expenses into the format courts require — using the numbers you just worked through."
> **[Build My Affidavit →]** (Navy button, links to Tool 3)

Secondary:
> "Or refine your income picture first with the Pay Stub Decoder." (text link to Tool 1, shown only if Tool 1 not completed)

---

### DATA PIPELINE

Write to `curriculum-data.schema.v2.json` at `modules.m3.budgetModeler`:

```json
{
  "completedAt": "2026-04-12T11:00:00Z",
  "prePopulated": { "fromM1": true, "fromM2": false, "fromTool1": true },
  "currentTotal": 4500,
  "projectedTotal": 5200,
  "delta": 700,
  "deltaPercent": 15.56,
  "categoryTotals": {
    "home": { "current": 1800, "projected": 2100 },
    "food": { "current": 600, "projected": 450 },
    "entertainment": { "current": 200, "projected": 150 },
    "medical": { "current": 100, "projected": 100 },
    "insurance": { "current": 300, "projected": 650 },
    "transportation": { "current": 500, "projected": 500 },
    "personalMisc": { "current": 300, "projected": 250 },
    "otherPayments": { "current": 200, "projected": 350 },
    "children": { "current": 400, "projected": 500 },
    "savings": { "current": 100, "projected": 150 }
  },
  "incomeComparison": {
    "monthlyIncome": 5500,
    "currentSurplusShortfall": 1000,
    "projectedSurplusShortfall": 300
  }
}
```

**Downstream consumers:**
- **Tool 3 (Affidavit Builder):** "Single" column feeds the expense section of the affidavit.
- **M5 (Marital Home Affordability):** Uses `projectedTotal` for affordability analysis.
- **AI Navigator:** Uses category deltas to identify areas for expense reduction coaching.
- **Email nurture:** `deltaPercent` segments users — high-delta users get content about expense reduction strategies.

---

### UI REQUIREMENTS

**Layout:**
- **Entry mode:** Tab bar at top: "Married Budget" | "Single Budget" | "Results". Married must be partially filled before Single unlocks. Both must have data before Results unlocks.
- **Within each tab:** Accordion of 10 category sections. Each section shows category total in the header. Expand to see line items.
- **Side-by-side mode (desktop > 1024px):** Two columns visible simultaneously — married (left) and single (right). Each row shows both values with inline delta.
- **Copy controls:** "Copy all to Single" button (top of Single tab). Per-category "Copy from Married" button in each accordion header.

**Pre-population banner:** Gold-border callout at top when any data is pre-populated. Lists sources. Dismissable.

**Running totals:** Sticky footer showing: Married Total | Single Total | Delta. Updates on every keystroke (debounced 150ms).

**Brand tokens:** Same as Tool 1.

**Typography:** Same as Tool 1. Category headers: Source Sans Pro 600, 16px. Line item labels: Source Sans Pro 400, 14px.

**Accessibility:**
- Accordion headers have `aria-expanded` and `aria-controls`.
- Tab bar uses `role="tablist"` with proper `role="tab"` and `role="tabpanel"`.
- Copy buttons have descriptive `aria-label` (e.g., "Copy married home expenses to single budget").
- All currency inputs have associated labels.
- Running totals footer has `aria-live="polite"`.

**Responsive:**
- Mobile (< 640px): single column, tab navigation, accordion within each tab.
- Tablet (640–1024px): single column, wider inputs, centered max-width 700px.
- Desktop (> 1024px): side-by-side columns when editing, centered results.

---

### VALIDATION TEST CASES

| # | Scenario | Expected |
|---|---|---|
| TC-1 | M1 pre-population | M1 Budget Gap values load into married column: housing→home.rentMortgage, utilities→home.electricity, groceries→food.groceries, etc. Banner shows. |
| TC-2 | M2 liability pre-population | M2 credit card and loan items load into married.otherPayments.creditCardDebt and married.otherPayments.loanPayments |
| TC-3 | Copy all to single | Deep copy of all married values into single column. All values match. Delta = $0. |
| TC-4 | Single > married (typical) | After editing single: insurance increased (new health plan), home increased (new apartment), food decreased. Delta > 0, correct top increases/decreases. |
| TC-5 | Income comparison — surplus | Pay Stub shows $6,000/mo income. Married $4,000, Single $5,200. Shows: married surplus +$2,000, single surplus +$800. |
| TC-6 | Income comparison — shortfall | Pay Stub shows $3,500/mo. Single $5,200. Shows single shortfall −$1,700 in red. Revelation message references the gap. |
| TC-7 | Empty categories | User enters $0 in all children fields. Children category shows $0 in both columns, $0 delta. Category still appears in chart (at zero). |
| TC-8 | No Tool 1 data | Income comparison section hidden entirely. CTA suggests completing Pay Stub Decoder. |
| TC-9 | Results tab gating | Results tab disabled until married has ≥ 1 non-zero category and single has ≥ 1 non-zero category. |
| TC-10 | Per-category copy | User clicks "Copy from Married" on Insurance category only. Insurance single = married. All other single values unchanged. |

---

### DISCLAIMER

Footer text (same style as Tool 1):

> "This tool is for educational and planning purposes only. It provides estimates based on the numbers you enter. Actual post-divorce expenses depend on custody arrangements, housing decisions, insurance options, and court orders. For guidance specific to your situation, consult a Certified Divorce Financial Analyst® or attorney."

---
---

## Tool 3: Financial Affidavit Builder

### Purpose

Educational tool that walks users through the structure and purpose of a financial affidavit — the sworn document filed with the court that details income, expenses, assets, and liabilities. This is NOT a legal document generator. It is an educational scaffolding tool that helps users understand what goes into an affidavit, identify missing information, and prepare organized data for their attorney.

The revelation architecture is strongest here: users who complete the affidavit builder will see the full complexity of the document, understand why professional help matters, and have organized data ready for a CDFA engagement (Signature tier conversion).

Available at **Essentials tier** (worksheets only) and above.

### Instructions

Build a professional React component (.jsx) called `AffidavitBuilder` for the ClearPath for Women M3 module.

> **Grounded in:** CDFA Coursework — Analyzing the Financial Data (Financial Affidavit process, sections, common errors). IDFA Sample Financial Affidavit (4-part structure: Income, Expenses, Assets, Liabilities). Paula/Peter case study (affidavit corrections). David/Daphne case study (clients with no financial exposure).

---

### CRITICAL EDUCATIONAL FRAMING

**This tool must prominently disclaim that it is NOT a legal document.** The framing is educational throughout:

**Top-of-page banner (persistent, non-dismissable, gold border):**
"This is an educational tool to help you understand and prepare for the financial affidavit process. **This is not a legal document.** Your attorney will prepare the official affidavit for filing with the court. The organized data you create here will make that process faster and more accurate."

**Why this matters commercially:** The affidavit builder exposes the full complexity of financial disclosure. Users who complete it (or get halfway through and realize they can't) are the highest-converting leads for Signature tier. The tool should make users feel informed and prepared, while making clear that professional analysis of this data is where the real value lies.

---

### USER FLOW

The affidavit has 4 parts, presented as a vertical stepper:

**Part A: Income** — Pre-populated from Pay Stub Decoder (Tool 1) if completed. Otherwise, user enters from scratch. Sections: Primary Employment Income, Deductions, Net Income, Other Sources of Income, Deductions from Other Income, Net Monthly Income from All Sources.

**Part B: Expenses** — Pre-populated from Budget Modeler "single" column (Tool 2) if completed. Otherwise, user enters from scratch. Same 10 categories (minus Savings — not part of the affidavit). Calculates: Total Monthly Expenses, Total Excluding Children.

**Part C: Assets** — Pre-populated from M2 Marital Estate Inventory if completed. Summary view only (the full inventory lives in M2). Categories: Real Property, Cash Accounts, Investments, Retirement Accounts, Other Assets, Personal Property.

**Part D: Liabilities** — Pre-populated from M2 Marital Estate Inventory if completed. Summary view. Categories: Loans, Credit Cards, Other Debt.

**Completion screen:** Summary of all 4 parts with completeness indicators. If any section is incomplete, specific guidance on what's missing.

---

### PART A: INCOME (Detail)

**Pre-population logic:** If Tool 1 (Pay Stub Decoder) is completed, auto-fill all income fields. Display banner: "We loaded your income data from the Pay Stub Decoder. Review it here in the affidavit format."

| Field | Source | Notes |
|---|---|---|
| Pay frequency | Tool 1 `payFrequency` | |
| Paychecks per year | Tool 1 `paychecksPerYear` | |
| Gross pay per check | Tool 1 `grossPayPerCheck` | |
| Gross monthly income | Tool 1 calculated | |
| Deduction rows | Tool 1 `deductions` array | Per-paycheck and monthly columns |
| Total deductions | Tool 1 calculated | |
| Net monthly income | Tool 1 calculated | |
| Other income sources | Tool 1 `otherIncomeSources` | |
| Net monthly income all sources | Tool 1 calculated | |

**If Tool 1 not completed:** User enters all fields manually. Same input structure as Tool 1 but in the affidavit's two-column format (Per Paycheck | Monthly Deduction).

**Monthly income of dependent children:** Additional field at bottom of Part A. Not in Tool 1. Helper: "Include any income your children earn (employment, trust distributions). Most families enter $0 here."

---

### PART B: EXPENSES (Detail)

**Pre-population logic:** If Tool 2 (Budget Modeler) is completed, load the "single" column values. Display banner: "We loaded your single-household expenses from the Budget Modeler. These are the numbers that will appear on your affidavit."

Same 10 categories minus Savings. Monthly and Annual columns (annual = monthly × 12, auto-calculated).

**Each category shows:**
- Line items with Monthly and Annual columns
- Category subtotal
- Educational prompt for common errors (from CDFA source material)

**Key educational prompts within Part B:**

| Location | Prompt |
|---|---|
| Home (if mortgage entered) | "Are property taxes and insurance included in your mortgage payment? Many people double-count these." |
| Insurance (if health = 0) | "If you're on your spouse's plan, estimate your own post-divorce coverage cost here." |
| Insurance (if health > 0 and also deducted from paycheck) | "If health insurance is already deducted from your paycheck (shown in Part A), don't enter it again here — that's double-counting." |
| Other Payments → Debt | "Don't include your mortgage or car payment here — those are already counted in Home and Transportation. This is for credit cards, student loans, and personal loans only." |
| Other Payments → Support | "If you're currently paying temporary spousal or child support, enter it here. This is your current obligation, not what you're requesting." |
| Children | "Record only your share of children's expenses, not the total. If your spouse is also listing children's expenses, coordinate to avoid double-counting." |
| Bottom of Part B | **Totals section:** "Total Monthly Expenses (excluding children): $X,XXX" and "Total Monthly Expenses: $X,XXX" — matches the affidavit format which breaks these out separately. |

---

### PART C: ASSETS (Summary View)

**Pre-population logic:** If M2 Marital Estate Inventory is completed, load asset totals by category. Display banner: "We loaded your asset data from the Marital Estate Inventory (Module 2). The detailed breakdown lives there — this is a summary view for the affidavit."

If M2 not completed: Display a message: "Complete the Marital Estate Inventory in Module 2 to populate this section, or enter summary totals below." Allow manual entry of category totals.

| Category | Maps from M2 |
|---|---|
| Real Property | M2 items where category = `realEstate` |
| Cash Accounts | M2 items where category = `bankAccounts` |
| Investments | M2 items where category = `investments` |
| Retirement Accounts | M2 items where category = `retirementAccounts` |
| Other Assets | M2 items where category = `otherAssets`, `lifeInsurance` |
| Personal Property | M2 `personalPropertyInventory.summary.totalValue` |
| **Total Assets** | Sum of above |

---

### PART D: LIABILITIES (Summary View)

**Pre-population logic:** Same as Part C — loads from M2 if completed.

| Category | Maps from M2 |
|---|---|
| Loans | M2 items where category = `loans` |
| Credit Cards | M2 items where category = `creditCards` |
| Other Debt | M2 items where category = `otherDebt` |
| **Total Liabilities** | Sum of above |

---

### COMPLETION SCREEN

**Net Worth Summary (if both C and D have data):**
```
Total Assets:       $XXX,XXX
Total Liabilities:  ($XX,XXX)
Net Worth:          $XXX,XXX
```

**Completeness Checklist:**
- ✅ Part A: Income — Complete
- ✅ Part B: Expenses — Complete
- ⚠️ Part C: Assets — Loaded from M2 (summary only)
- ❌ Part D: Liabilities — Not started

**Missing information flags (amber callouts):**
For each incomplete section, specific guidance: "Part D is empty. If you have any debts — credit cards, student loans, car loans, personal loans — they need to be disclosed. Module 2's Documentation Checklist can help you track these down."

**Revelation message:**
"You've organized a comprehensive financial picture. In a real affidavit, this data would be sworn under oath and filed with the court — and it's frequently amended as new information surfaces. A Certified Divorce Financial Analyst® reviews these numbers for accuracy, flags errors, identifies missing items, and analyzes what the numbers mean for your settlement."

**CTA — Tier-dependent:**

| Tier | CTA |
|---|---|
| Essentials | "Get AI-guided analysis of your financial data with ClearPath Navigator." → Navigator upsell |
| Navigator | "Ready for professional analysis? A ClearPath Signature engagement turns this data into a complete financial strategy." → Clarity Call scheduling link |
| Signature | "Your CDFA professional will review this data in your next session." → Internal |

---

### DATA PIPELINE

Write to `curriculum-data.schema.v2.json` at `modules.m3.affidavitBuilder`:

```json
{
  "completedAt": "2026-04-12T12:00:00Z",
  "prePopulated": { "fromTool1": true, "fromTool2": true, "fromM2": true },
  "progress": {
    "incomeComplete": true,
    "expensesComplete": true,
    "assetsComplete": true,
    "liabilitiesComplete": false
  },
  "summary": {
    "netMonthlyIncomeAllSources": 5500,
    "totalMonthlyExpenses": 5200,
    "totalMonthlyExpensesExcludingChildren": 4700,
    "totalAssets": 450000,
    "totalLiabilities": 85000,
    "netWorth": 365000,
    "monthlyGap": 300
  },
  "sectionsCompleted": 3,
  "sectionsTotal": 4
}
```

**Downstream consumers:**
- **M7 Blueprint:** The complete affidavit data feeds the "Income and Expenses" section.
- **AI Navigator:** Uses completion progress and gaps to guide conversations.
- **Signature conversion analytics:** `sectionsCompleted < sectionsTotal` users who reach the completion screen are high-intent conversion targets.

---

### UI REQUIREMENTS

**Layout:**
- Vertical stepper: Part A → Part B → Part C → Part D → Summary.
- Each part is a full page/section with scroll. Stepper shows completion status.
- Parts can be completed in any order (non-linear), but the stepper encourages A → B → C → D.
- Pre-populated fields have a subtle gold left border to indicate imported data.

**Print/Export:** "Print Preview" button generates a clean, formatted view of the entered data matching the affidavit layout. This is NOT the legal document — the print includes the educational disclaimer at the top and bottom. Available at all tiers.

**Brand tokens:** Same as Tool 1/2. Pre-populated field accent: Gold left border (4px).

**Accessibility:**
- Stepper uses `role="list"` with `role="listitem"` for each step.
- Completion indicators use `aria-label` (e.g., "Part A: Income — Complete").
- Print preview is a proper `@media print` stylesheet, not a screenshot.
- All educational prompts are in `<aside>` elements with `role="note"`.

**Responsive:**
- Mobile: stepper collapses to dropdown selector. Each part renders full-width.
- Tablet/Desktop: stepper remains visible as left sidebar (200px).

---

### VALIDATION TEST CASES

| # | Scenario | Expected |
|---|---|---|
| TC-1 | Full pre-population (all tools + M2 complete) | Parts A, B, C load pre-populated data. Gold borders on all imported fields. 3 banners (one per data source). |
| TC-2 | No pre-population (fresh start) | All fields empty. No banners. User enters everything manually. |
| TC-3 | Tool 1 only | Part A pre-populated. Parts B, C, D empty. |
| TC-4 | Tool 2 only | Part B pre-populated. Parts A, C, D empty. |
| TC-5 | M2 only | Parts C and D pre-populated. Parts A, B empty. |
| TC-6 | Double-counting check — insurance | If health insurance appears in Part A deductions AND user enters it in Part B Insurance, show amber warning: "Health insurance appears in both your paycheck deductions and your expense list. This may be double-counting." |
| TC-7 | Double-counting check — mortgage | If user enters debt in Part B Other Payments that matches a mortgage or car payment, show amber warning. |
| TC-8 | Completion with gaps | User completes Parts A and B but not C and D. Summary shows 2/4 complete, flags missing sections, still shows income vs. expense gap. |
| TC-9 | Print preview | Generates formatted 4-part document. Disclaimer appears at top and bottom. All entered data renders correctly. Currency formatting consistent. |
| TC-10 | Tier-appropriate CTA | Essentials user sees Navigator upsell. Navigator user sees Clarity Call CTA. Signature user sees internal reference. |

---

### DISCLAIMER

**Top banner (persistent, non-dismissable):**
> "This is an educational tool, not a legal document. Your attorney will prepare the official financial affidavit for filing with the court."

**Footer:**
> "This tool is for educational and planning purposes only. A Financial Affidavit is a sworn legal document that must be prepared and filed by your attorney. The data you organize here can help make that process more efficient and accurate. ClearPath does not provide legal advice. For guidance specific to your situation, consult an attorney and/or a Certified Divorce Financial Analyst®."

---
---

## M3 Landing Page

### Pattern

Same as M2ModulePage.jsx / M2ToolCard.jsx pattern:

- **Page title:** "Know What You Spend" (Playfair Display, centered)
- **Module description:** "Understanding your income and expenses — and how they change when one household becomes two — is the foundation of every financial decision in divorce."
- **M1 domain score gap messages** (same logic as M2): Check `m1Store.readinessAssessment.domainScores.incomeAwareness`. If ≤ 3, show gold callout: "Your Readiness Assessment flagged income awareness as an area to strengthen. These tools will help you build that picture."
- **Tool cards** (3 cards in order):
  1. Pay Stub Decoder — icon: 📄, progress from m3Store
  2. Married-vs-Single Budget Modeler — icon: ⚖️, progress from m3Store
  3. Financial Affidavit Builder — icon: 📋, progress from m3Store
- **Back link:** "← Back to Dashboard" (or module picker)
- **Tool recommended order note:** "We recommend starting with the Pay Stub Decoder, then the Budget Modeler, and finishing with the Affidavit Builder — each tool feeds data into the next."

---

## M3 Data Pipeline Schema Addition

Add to `curriculum-data.schema.v2.json` under `modules`:

```json
"m3": {
  "type": "object",
  "properties": {
    "payStubDecoder": {
      "type": "object",
      "properties": {
        "completedAt": { "type": ["string", "null"], "format": "date-time" },
        "payFrequency": { "type": "string", "enum": ["weekly", "biweekly", "semimonthly", "monthly"] },
        "paychecksPerYear": { "type": "integer", "minimum": 1, "maximum": 52 },
        "useCustomPaychecks": { "type": "boolean" },
        "grossPayPerCheck": { "type": "number", "minimum": 0 },
        "grossMonthlyIncome": { "type": "number" },
        "grossAnnualIncome": { "type": "number" },
        "deductions": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "label": { "type": "string" },
              "perPaycheck": { "type": "number" },
              "monthly": { "type": "number" },
              "isVoluntary": { "type": "boolean" }
            }
          }
        },
        "requiredDeductionsMonthly": { "type": "number" },
        "voluntaryDeductionsMonthly": { "type": "number" },
        "netMonthlyIncome": { "type": "number" },
        "takeHomePay": { "type": "number" },
        "otherIncomeSources": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "source": { "type": "string" },
              "monthlyAmount": { "type": "number" },
              "isTaxable": { "type": "boolean" }
            }
          }
        },
        "otherIncomeMonthly": { "type": "number" },
        "totalMonthlyIncomeAllSources": { "type": "number" },
        "warnings": { "type": "array", "items": { "type": "string" } }
      }
    },
    "budgetModeler": {
      "type": "object",
      "properties": {
        "completedAt": { "type": ["string", "null"], "format": "date-time" },
        "prePopulated": {
          "type": "object",
          "properties": {
            "fromM1": { "type": "boolean" },
            "fromM2": { "type": "boolean" },
            "fromTool1": { "type": "boolean" }
          }
        },
        "currentTotal": { "type": "number" },
        "projectedTotal": { "type": "number" },
        "delta": { "type": "number" },
        "deltaPercent": { "type": ["number", "null"] },
        "categoryTotals": { "type": "object" },
        "incomeComparison": {
          "type": ["object", "null"],
          "properties": {
            "monthlyIncome": { "type": "number" },
            "currentSurplusShortfall": { "type": "number" },
            "projectedSurplusShortfall": { "type": "number" }
          }
        }
      }
    },
    "affidavitBuilder": {
      "type": "object",
      "properties": {
        "completedAt": { "type": ["string", "null"], "format": "date-time" },
        "prePopulated": {
          "type": "object",
          "properties": {
            "fromTool1": { "type": "boolean" },
            "fromTool2": { "type": "boolean" },
            "fromM2": { "type": "boolean" }
          }
        },
        "progress": {
          "type": "object",
          "properties": {
            "incomeComplete": { "type": "boolean" },
            "expensesComplete": { "type": "boolean" },
            "assetsComplete": { "type": "boolean" },
            "liabilitiesComplete": { "type": "boolean" }
          }
        },
        "summary": {
          "type": "object",
          "properties": {
            "netMonthlyIncomeAllSources": { "type": "number" },
            "totalMonthlyExpenses": { "type": "number" },
            "totalMonthlyExpensesExcludingChildren": { "type": "number" },
            "totalAssets": { "type": "number" },
            "totalLiabilities": { "type": "number" },
            "netWorth": { "type": "number" },
            "monthlyGap": { "type": "number" }
          }
        },
        "sectionsCompleted": { "type": "integer", "minimum": 0, "maximum": 4 },
        "sectionsTotal": { "type": "integer", "const": 4 }
      }
    }
  }
}
```

---

## Build Sequence (Recommended)

1. **✅ M3 Tool Spec** (this document)
2. **Scaffold `m3Store.js`** — Zustand store with all slices, actions, persistence
3. **Build Tool 1: Pay Stub Decoder** — simplest, self-contained, good warm-up. Claude Code with Sonnet.
4. **Build Tool 2: Married-vs-Single Budget Modeler** — moderate complexity, M1 pre-population. Claude Code with Opus.
5. **Build Tool 3: Financial Affidavit Builder** — complex, pre-populates from Tools 1+2+M2, educational framing critical. Claude Code with Opus.
6. **Build M3 Landing Page** — same pattern as M2ModulePage.jsx
7. **Wire cross-tool integrations** — M1→M3, M2→M3, Tool 1→Tool 2→Tool 3
8. **Run validation test cases**
9. **Update vault handoff doc**

---

## Related Documents

- [[Tier-Architecture-and-Gating-Map]] — tier gating rules
- [[AI-Knowledge-Base-Architecture]] — how Navigator AI consumes M3 data
- [[curriculum-data.schema.v2]] — data contract
- [[Brand Voice]] — voice and style rules
- [[M2-Handoff]] — M2→M3 data connections
- [[M1-Tool-Specs]] — M1 store shape for pre-population
