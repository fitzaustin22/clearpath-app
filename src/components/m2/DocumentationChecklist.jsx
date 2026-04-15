'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useM2Store } from '@/src/stores/m2Store';

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const PARCHMENT = '#FAF8F2';
const WHITE = '#FFFFFF';
const GREEN = '#2D8A4E';

// ─── Master document list (42 items, 8 categories) ────────────────────────────
const MASTER_ITEMS = [
  // CATEGORY 1 — Tax Returns (6)
  {
    id: 'doc-tax-01', category: 'taxReturns',
    label: 'Federal income tax returns (last 3 years)',
    helperText: 'Your tax returns are the single most important financial document in divorce. They show income sources, deductions, and investments — and they\'re the first place a CDFA looks for hidden assets.',
  },
  {
    id: 'doc-tax-02', category: 'taxReturns',
    label: 'State income tax returns (last 3 years)',
    helperText: 'State returns may show income or deductions not visible on the federal return, especially if you or your spouse have income in multiple states.',
  },
  {
    id: 'doc-tax-03', category: 'taxReturns',
    label: 'All W-2s (last 3 years)',
    helperText: 'W-2s confirm salary, bonuses, and employer benefits. Compare them to the tax return to make sure nothing was left off.',
  },
  {
    id: 'doc-tax-04', category: 'taxReturns',
    label: 'All 1099s (last 3 years)',
    helperText: '1099s reveal investment income, freelance income, rental income, and interest — income sources that may not show up on a pay stub.',
  },
  {
    id: 'doc-tax-05', category: 'taxReturns',
    label: 'Business tax returns — Schedule C, Form 1065, 1120/1120S (last 3 years, if applicable)',
    helperText: 'If your spouse owns a business, these returns show revenue, expenses, depreciation, and distributions. Depreciation is not a cash expense — it can mask real income.',
  },
  {
    id: 'doc-tax-06', category: 'taxReturns',
    label: 'Any amended returns (last 5 years)',
    helperText: 'Amended returns can reveal changes to income or deductions that were made after the original filing. Review these carefully.',
  },
  // CATEGORY 2 — Income Documentation (5)
  {
    id: 'doc-inc-01', category: 'incomeDocumentation',
    label: 'Most recent pay stubs (both spouses)',
    helperText: 'Pay stubs show current salary, deductions, retirement contributions, and year-to-date earnings. Get the most recent available.',
  },
  {
    id: 'doc-inc-02', category: 'incomeDocumentation',
    label: 'Bonus and commission documentation',
    helperText: 'Bonuses and commissions can be a significant portion of income. Get documentation of the schedule, formula, and amounts for the last 2–3 years.',
  },
  {
    id: 'doc-inc-03', category: 'incomeDocumentation',
    label: 'Stock option and RSU grant documentation',
    helperText: 'If either spouse has stock options or restricted stock units, you need the grant agreements, vesting schedules, and current values. These can be among the most valuable marital assets.',
  },
  {
    id: 'doc-inc-04', category: 'incomeDocumentation',
    label: 'Rental income documentation',
    helperText: 'If you own rental property, gather lease agreements, rental income records, and expense documentation for each property.',
  },
  {
    id: 'doc-inc-05', category: 'incomeDocumentation',
    label: 'Any other income documentation (Social Security statements, pension estimates, deferred compensation)',
    helperText: 'Include anything that generates or will generate income: Social Security statements (available at ssa.gov), pension benefit estimates, deferred compensation agreements.',
  },
  // CATEGORY 3 — Bank and Cash Accounts (5)
  {
    id: 'doc-bank-01', category: 'bankAndCash',
    label: 'Checking account statements (all accounts, last 12 months)',
    helperText: 'Review for recurring deposits, automatic transfers, and large withdrawals. Don\'t forget accounts used for specific purposes — holiday funds, property tax escrow, etc.',
  },
  {
    id: 'doc-bank-02', category: 'bankAndCash',
    label: 'Savings account statements (all accounts, last 12 months)',
    helperText: 'Include money market accounts, CDs, and any \'special purpose\' savings accounts funded by payroll deduction.',
  },
  {
    id: 'doc-bank-03', category: 'bankAndCash',
    label: 'Children\'s bank accounts (custodial accounts, 529 plans)',
    helperText: 'Check whether your spouse has recently opened custodial accounts in a child\'s name. These are sometimes used to move assets out of the marital estate.',
  },
  {
    id: 'doc-bank-04', category: 'bankAndCash',
    label: 'Safety deposit box inventory',
    helperText: 'Visit the bank and document every item in the box. Note anything that should be there but isn\'t.',
  },
  {
    id: 'doc-bank-05', category: 'bankAndCash',
    label: 'Most recent mortgage application',
    helperText: 'Your mortgage application required full disclosure of all assets, liabilities, and income sources. It\'s a snapshot of your household\'s financial picture at that point in time.',
  },
  // CATEGORY 4 — Investment Accounts (5)
  {
    id: 'doc-inv-01', category: 'investmentAccounts',
    label: 'Brokerage account statements (all accounts, last 12 months)',
    helperText: 'Individual stocks, bonds, mutual funds, and ETFs. Include any margin account balances (loans against the brokerage account).',
  },
  {
    id: 'doc-inv-02', category: 'investmentAccounts',
    label: 'Mutual fund statements',
    helperText: 'Include any mutual fund accounts held directly (not through a brokerage). Quarterly statements are typical.',
  },
  {
    id: 'doc-inv-03', category: 'investmentAccounts',
    label: 'Treasury bills, savings bonds, and CDs',
    helperText: 'These are often forgotten because they don\'t generate monthly statements. Check for paper bonds in the safety deposit box and electronic bonds at TreasuryDirect.gov.',
  },
  {
    id: 'doc-inv-04', category: 'investmentAccounts',
    label: 'Annuity contracts and statements',
    helperText: 'Annuities have surrender charges and tax implications that affect their real value. Gather the original contract and the most recent statement.',
  },
  {
    id: 'doc-inv-05', category: 'investmentAccounts',
    label: 'Cash value life insurance policies',
    helperText: 'Whole life and universal life policies accumulate cash value that is a marital asset. Request an \'in-force illustration\' from the insurance company showing the current cash value and any loans against the policy.',
  },
  // CATEGORY 5 — Retirement Accounts (5)
  {
    id: 'doc-ret-01', category: 'retirementAccounts',
    label: '401(k), 403(b), 457 plan statements (all accounts, last 12 months)',
    helperText: 'Include accounts from current and previous employers. Many people leave old 401(k)s behind when they change jobs — those are still marital assets.',
  },
  {
    id: 'doc-ret-02', category: 'retirementAccounts',
    label: 'IRA and Roth IRA statements (all accounts)',
    helperText: 'Traditional IRAs and Roth IRAs have different tax treatment when divided. Gather statements for every IRA either spouse holds.',
  },
  {
    id: 'doc-ret-03', category: 'retirementAccounts',
    label: 'Pension plan documents and benefit estimates',
    helperText: 'If either spouse has a defined benefit pension, request the plan\'s Summary Plan Description and a current benefit estimate. Pensions can be among the most valuable — and most overlooked — marital assets.',
  },
  {
    id: 'doc-ret-04', category: 'retirementAccounts',
    label: 'Thrift Savings Plan (TSP) statements (if applicable)',
    helperText: 'For federal employees and military members. The TSP functions like a 401(k) but has its own rules for division in divorce.',
  },
  {
    id: 'doc-ret-05', category: 'retirementAccounts',
    label: 'Stock option plan documents and vesting schedules',
    helperText: 'Unvested stock options may still be marital property depending on when they were granted. Gather the grant agreement, vesting schedule, and exercise history.',
  },
  // CATEGORY 6 — Real Estate (5)
  {
    id: 'doc-re-01', category: 'realEstate',
    label: 'Deed(s) to all real property',
    helperText: 'The deed shows legal ownership — whose name is on the title. This matters for classification as marital or separate property.',
  },
  {
    id: 'doc-re-02', category: 'realEstate',
    label: 'Most recent mortgage statements (all properties)',
    helperText: 'Shows current balance, interest rate, payment amount, and escrow. Include first and second mortgages, HELOCs, and any other liens.',
  },
  {
    id: 'doc-re-03', category: 'realEstate',
    label: 'Most recent property tax assessments',
    helperText: 'Property tax records show the assessed value (which may differ from market value) and can reveal property you didn\'t know about.',
  },
  {
    id: 'doc-re-04', category: 'realEstate',
    label: 'Homeowner\'s insurance declarations page',
    helperText: 'The declarations page shows coverage amounts and listed personal property, which can help with the personal property inventory.',
  },
  {
    id: 'doc-re-05', category: 'realEstate',
    label: 'Recent appraisal or comparative market analysis (if available)',
    helperText: 'If the home was recently appraised (for a refinance, HELOC, or sale), that value is a useful starting point. A CMA from a real estate agent provides a current estimate.',
  },
  // CATEGORY 7 — Debt and Liabilities (6)
  {
    id: 'doc-debt-01', category: 'debtAndLiabilities',
    label: 'Credit card statements (all cards, last 12 months)',
    helperText: 'List every credit card — joint and individual. Statements reveal spending patterns, cash advances, and balances that are part of the marital estate.',
  },
  {
    id: 'doc-debt-02', category: 'debtAndLiabilities',
    label: 'Personal loan documentation',
    helperText: 'Include personal loans, lines of credit, student loans, and promissory notes. Note whether each is joint or individual.',
  },
  {
    id: 'doc-debt-03', category: 'debtAndLiabilities',
    label: 'Auto loan documentation',
    helperText: 'Gather loan statements for all vehicles. The loan balance plus the vehicle\'s current value determines net equity.',
  },
  {
    id: 'doc-debt-04', category: 'debtAndLiabilities',
    label: 'Credit reports for both spouses',
    helperText: 'Pull your free annual credit report at annualcreditreport.com. It may reveal accounts or debts you didn\'t know about — credit cards, loans, or collections in your spouse\'s name.',
  },
  {
    id: 'doc-debt-05', category: 'debtAndLiabilities',
    label: 'Business liabilities documentation (if applicable)',
    helperText: 'If either spouse owns a business, gather documentation of business debts, lease obligations, and any personal guarantees on business loans.',
  },
  {
    id: 'doc-debt-06', category: 'debtAndLiabilities',
    label: 'Back taxes owed (federal or state)',
    helperText: 'Any outstanding tax liabilities — including penalties and interest — are marital debts that need to be allocated in the settlement.',
  },
  // CATEGORY 8 — Legal and Insurance (5)
  {
    id: 'doc-legal-01', category: 'legalAndInsurance',
    label: 'Prenuptial or postnuptial agreement (if applicable)',
    helperText: 'If one exists, it may override default state property division rules. Your attorney needs to review this first.',
  },
  {
    id: 'doc-legal-02', category: 'legalAndInsurance',
    label: 'Life insurance policies (all)',
    helperText: 'Include term and permanent policies. Note the owner, insured, beneficiary, and death benefit. Permanent policies may have cash value that is a marital asset.',
  },
  {
    id: 'doc-legal-03', category: 'legalAndInsurance',
    label: 'Health insurance policy documents',
    helperText: 'If you\'re on your spouse\'s employer plan, you need to plan for coverage after divorce. Gather the plan summary and COBRA information.',
  },
  {
    id: 'doc-legal-04', category: 'legalAndInsurance',
    label: 'Estate planning documents (wills, trusts, powers of attorney)',
    helperText: 'These will need to be updated after divorce. Gather current versions to understand what exists.',
  },
  {
    id: 'doc-legal-05', category: 'legalAndInsurance',
    label: 'Any existing court orders (temporary support, protective orders)',
    helperText: 'If any temporary orders are in place, gather copies. These affect current financial obligations.',
  },
];

// ─── Category metadata ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'taxReturns',          label: 'Tax Returns',            count: 6 },
  { key: 'incomeDocumentation', label: 'Income Documentation',   count: 5 },
  { key: 'bankAndCash',         label: 'Bank and Cash Accounts', count: 5 },
  { key: 'investmentAccounts',  label: 'Investment Accounts',    count: 5 },
  { key: 'retirementAccounts',  label: 'Retirement Accounts',    count: 5 },
  { key: 'realEstate',          label: 'Real Estate',            count: 5 },
  { key: 'debtAndLiabilities',  label: 'Debt and Liabilities',   count: 6 },
  { key: 'legalAndInsurance',   label: 'Legal and Insurance',    count: 5 },
];

// ─── Navigator AI prompts per category ────────────────────────────────────────
const AI_PROMPTS = {
  taxReturns:          'You\'ve gathered your tax returns. Want me to walk you through what a CDFA looks for in a tax return — and how to spot income or assets that might be missing?',
  incomeDocumentation: 'Your income documents are in hand. Want to understand how pay frequency, bonuses, and stock options affect your monthly income calculation?',
  bankAndCash:         'Bank statements collected. Want me to explain what to look for in the transaction history — transfers, large withdrawals, and patterns that might matter?',
  investmentAccounts:  'Investment documents gathered. Want a walkthrough of how different account types (brokerage, annuity, life insurance) are valued and taxed differently in divorce?',
  retirementAccounts:  'Retirement documents collected. Want to understand the difference between a 401(k) and a pension — and why a QDRO matters for dividing them?',
  realEstate:          'Real estate documents in hand. Want me to explain how home equity is calculated and what the Section 121 exclusion means for your situation?',
  debtAndLiabilities:  'Debt documents gathered. Want to understand how debts are classified — marital vs. separate — and who is responsible for what?',
  legalAndInsurance:   'Legal documents collected. Want a walkthrough of how prenuptial agreements and life insurance interact with property division?',
};

// ─── Milestone definitions ─────────────────────────────────────────────────────
const MILESTONES = [
  { id: 'first', check: (p) => p > 0,    message: 'You\'ve started. That\'s the hardest part.' },
  { id: '25%',   check: (p) => p >= 25,  message: 'A quarter of your documents are accounted for. Keep going — each one makes the picture clearer.' },
  { id: '50%',   check: (p) => p >= 50,  message: 'Halfway there. You\'re building a foundation that most women never have when they walk into a settlement.' },
  { id: '75%',   check: (p) => p >= 75,  message: 'Almost there. The gaps you see now are the gaps that matter most — focus on those.' },
  { id: '100%',  check: (p) => p >= 100, message: 'Every document accounted for. You\'re ready to build your complete asset picture in the Marital Estate Inventory.' },
];

// ─── Status definitions ────────────────────────────────────────────────────────
const STATUS_CYCLE = ['not-started', 'located', 'collected', 'not-applicable'];
const STATUS_LABELS = {
  'not-started':    'Not started',
  'located':        'Located',
  'collected':      'Collected',
  'not-applicable': 'Not applicable',
};

// ─── Status icon ───────────────────────────────────────────────────────────────
function StatusIcon({ status }) {
  if (status === 'located') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
        <circle cx="10" cy="10" r="8.5" stroke={GOLD} strokeWidth="1.5" fill="none" />
        {/* Left semicircle filled */}
        <path d="M 10 1.5 A 8.5 8.5 0 0 0 10 18.5 Z" fill={GOLD} />
      </svg>
    );
  }
  if (status === 'collected') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
        <circle cx="10" cy="10" r="9" fill={GREEN} />
        <path d="M6 10.5l2.8 2.8 5.2-5.2" stroke={WHITE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === 'not-applicable') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
        <rect x="5" y="9.25" width="10" height="1.5" rx="0.75" fill={`${NAVY}4D`} />
      </svg>
    );
  }
  // not-started: empty circle
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="8.5" stroke={`${NAVY}66`} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// ─── Mini progress bar ─────────────────────────────────────────────────────────
function MiniProgressBar({ value }) {
  return (
    <div
      role="presentation"
      style={{ width: 60, height: 4, background: `${NAVY}1A`, borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}
    >
      <div
        style={{
          width: `${Math.min(100, value)}%`,
          height: '100%',
          background: GOLD,
          borderRadius: 2,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
}

// ─── Chevron icon ──────────────────────────────────────────────────────────────
function ChevronIcon({ open }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="currentColor"
      aria-hidden="true" focusable="false"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', flexShrink: 0 }}
    >
      <path d="M8 10.586L2.707 5.293a1 1 0 00-1.414 1.414l6 6a1 1 0 001.414 0l6-6a1 1 0 00-1.414-1.414L8 10.586z" />
    </svg>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function DocumentationChecklist({ userTier = 'essentials' }) {
  const {
    documentChecklist,
    initChecklistItems,
    updateChecklistItem,
    toggleExpandedCategory,
    fireMilestone,
  } = useM2Store();

  const { items, expandedCategories, milestonesFired, startedAt } = documentChecklist;

  const isNavigator = userTier === 'navigator' || userTier === 'signature';

  // ── Local UI state ───────────────────────────────────────────────────────────
  const [openDropdown, setOpenDropdown] = useState(null);         // item id or null
  const [expandedNotes, setExpandedNotes] = useState({});         // { [id]: boolean }
  const [localNotes, setLocalNotes] = useState({});               // { [id]: string }
  const [toast, setToast] = useState(null);                       // { message } or null
  const [categoryAnnouncement, setCategoryAnnouncement] = useState('');
  const toastTimerRef = useRef(null);
  const notesDebounceRef = useRef({});

  // ── Initialize items on first mount (if store is empty) ──────────────────────
  useEffect(() => {
    if (items.length === 0) {
      const defaults = MASTER_ITEMS.map((m) => ({
        id: m.id,
        category: m.category,
        status: 'not-started',
        notes: '',
      }));
      initChecklistItems(defaults);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-expand Tax Returns on absolute first visit ───────────────────────────
  useEffect(() => {
    if (items.length > 0 && expandedCategories.length === 0 && !startedAt) {
      toggleExpandedCategory('taxReturns');
    }
  }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Seed localNotes from store (once, when items first populate) ─────────────
  useEffect(() => {
    if (items.length > 0) {
      setLocalNotes((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const notes = {};
        items.forEach((item) => { notes[item.id] = item.notes || ''; });
        return notes;
      });
    }
  }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Build full 42-item array by merging master with store ─────────────────────
  const fullItems = useMemo(() => {
    return MASTER_ITEMS.map((master) => {
      const stored = items.find((s) => s.id === master.id);
      return stored
        ? { ...master, status: stored.status, notes: stored.notes }
        : { ...master, status: 'not-started', notes: '' };
    });
  }, [items]);

  // ── Derived progress values ──────────────────────────────────────────────────
  const TOTAL = 42;
  const collectedCount    = fullItems.filter((i) => i.status === 'collected').length;
  const locatedCount      = fullItems.filter((i) => i.status === 'located').length;
  const notApplicableCount = fullItems.filter((i) => i.status === 'not-applicable').length;
  const notStartedCount   = fullItems.filter((i) => i.status === 'not-started').length;
  const touchedCount      = TOTAL - notStartedCount;
  const overallProgress   = (touchedCount / TOTAL) * 100;
  const completionScore   = ((collectedCount * 3 + locatedCount * 1 + notApplicableCount * 2) / (TOTAL * 3)) * 100;

  // ── Milestone checking ───────────────────────────────────────────────────────
  const prevProgressRef = useRef(-1);
  useEffect(() => {
    if (overallProgress === prevProgressRef.current) return;
    prevProgressRef.current = overallProgress;
    for (const milestone of MILESTONES) {
      if (!milestonesFired.includes(milestone.id) && milestone.check(overallProgress)) {
        fireMilestone(milestone.id);
        showToast(milestone.message);
        break;
      }
    }
  }, [overallProgress, milestonesFired.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Category completion announcements (screen reader) ────────────────────────
  useEffect(() => {
    for (const { key, label } of CATEGORIES) {
      if (isCategoryComplete(key)) {
        const announcementId = `cat-complete-${key}`;
        if (!milestonesFired.includes(announcementId)) {
          fireMilestone(announcementId);
          setCategoryAnnouncement(`${label}: all documents accounted for.`);
          setTimeout(() => setCategoryAnnouncement(''), 3000);
          break;
        }
      }
    }
  }, [fullItems]); // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(message) {
    setToast({ message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }

  // ── Status controls ──────────────────────────────────────────────────────────
  function handleStatusIconClick(e, item) {
    e.stopPropagation();
    setOpenDropdown((prev) => (prev === item.id ? null : item.id));
  }

  function handleStatusKeyDown(e, item) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const idx = STATUS_CYCLE.indexOf(item.status);
      const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
      updateChecklistItem(item.id, { status: next });
      setOpenDropdown(null);
    }
  }

  function selectStatus(itemId, status) {
    updateChecklistItem(itemId, { status });
    setOpenDropdown(null);
  }

  // Close dropdown on outside click
  useEffect(() => {
    if (openDropdown === null) return;
    const close = () => setOpenDropdown(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openDropdown]);

  // ── Notes controls ───────────────────────────────────────────────────────────
  function toggleNotes(id) {
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleNotesChange(id, value) {
    setLocalNotes((prev) => ({ ...prev, [id]: value }));
    // Debounced auto-save to store during typing
    if (notesDebounceRef.current[id]) clearTimeout(notesDebounceRef.current[id]);
    notesDebounceRef.current[id] = setTimeout(() => {
      updateChecklistItem(id, { notes: value });
    }, 500);
  }

  function handleNotesBlur(id) {
    // Immediate save on blur (cancels any pending debounce)
    if (notesDebounceRef.current[id]) {
      clearTimeout(notesDebounceRef.current[id]);
      delete notesDebounceRef.current[id];
    }
    const value = localNotes[id] ?? '';
    updateChecklistItem(id, { notes: value });
  }

  // ── Per-category helpers ─────────────────────────────────────────────────────
  function getCategoryItems(categoryKey) {
    return fullItems.filter((i) => i.category === categoryKey);
  }

  function getCategoryProgress(categoryKey, count) {
    const catItems = getCategoryItems(categoryKey);
    const touched = catItems.filter((i) => i.status !== 'not-started').length;
    return { touched, total: count, pct: count > 0 ? (touched / count) * 100 : 0 };
  }

  function isCategoryComplete(categoryKey) {
    const catItems = getCategoryItems(categoryKey);
    return catItems.length > 0 && catItems.every((i) => i.status !== 'not-started');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .checklist-container { max-width: 760px; margin: 0 auto; }
        @media (max-width: 1024px) { .checklist-container { max-width: 700px; } }
        @media (max-width: 639px)  { .checklist-container { max-width: 100%; } }
      `}</style>

      {/* ── Screen reader live region for category completion ──────────────── */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
      >
        {categoryAnnouncement}
      </div>

      {/* ── Sticky progress header ─────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: WHITE,
          borderBottom: `1px solid ${NAVY}1A`,
          padding: '12px 24px',
        }}
      >
        <div className="checklist-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div
                role="progressbar"
                aria-label="Overall document progress"
                aria-valuenow={Math.round(overallProgress)}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{
                  height: 8,
                  background: `${NAVY}1A`,
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${overallProgress}%`,
                    height: '100%',
                    background: GOLD,
                    borderRadius: 4,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: 'Source Sans Pro, sans-serif', fontWeight: 600, fontSize: 14, color: NAVY }}>
                {touchedCount} of {TOTAL} items
              </span>
              <span
                style={{
                  fontFamily: 'Source Sans Pro, sans-serif',
                  fontWeight: 600,
                  fontSize: 14,
                  color: completionScore >= 75 ? GREEN : NAVY,
                }}
              >
                {Math.round(completionScore)}% complete
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="checklist-container" style={{ padding: '0 24px 64px' }}>

        {/* Back link */}
        <div style={{ padding: '24px 0 8px' }}>
          <Link
            href="/modules/m2"
            style={{
              fontFamily: 'Source Sans Pro, sans-serif',
              fontSize: 14,
              color: `${NAVY}99`,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ← Back to Know What You Own
          </Link>
        </div>

        {/* Page header */}
        <div style={{ padding: '16px 0 24px' }}>
          <p style={{ fontFamily: 'Source Sans Pro, sans-serif', fontSize: 13, color: GOLD, letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 8px' }}>
            M2 · Tool 1
          </p>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 28, color: NAVY, margin: '0 0 12px', lineHeight: 1.25 }}>
            Documentation Checklist
          </h1>
          <p style={{ fontFamily: 'Source Sans Pro, sans-serif', fontSize: 16, color: `${NAVY}B3`, lineHeight: 1.7, margin: 0, maxWidth: 600 }}>
            Track every document you need before building your financial picture. Work through each category at your own pace — mark items as you locate and collect them.
          </p>
        </div>

        {/* ── Status legend ──────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px 24px',
            padding: '16px 20px',
            backgroundColor: `${NAVY}06`,
            borderRadius: 8,
            marginBottom: 32,
          }}
        >
          <span style={{ fontFamily: 'Source Sans Pro, sans-serif', fontSize: 13, fontWeight: 600, color: `${NAVY}99`, textTransform: 'uppercase', letterSpacing: '1px', width: '100%' }}>
            Status legend
          </span>
          {STATUS_CYCLE.map((status) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusIcon status={status} />
              <span style={{ fontFamily: 'Source Sans Pro, sans-serif', fontSize: 14, color: NAVY }}>
                {STATUS_LABELS[status]}
              </span>
            </div>
          ))}
          <p style={{ fontFamily: 'Source Sans Pro, sans-serif', fontSize: 13, color: `${NAVY}80`, margin: 0, width: '100%', lineHeight: 1.5 }}>
            Click any status icon to choose a status. Use Enter or Space to cycle forward.
          </p>
        </div>

        {/* ── Accordion categories ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {CATEGORIES.map(({ key, label, count }) => {
            const { touched, pct } = getCategoryProgress(key, count);
            const isExpanded = expandedCategories.includes(key);
            const catItems = getCategoryItems(key);
            const complete = isCategoryComplete(key);
            const panelId = `panel-${key}`;
            const headerId = `header-${key}`;

            return (
              <div
                key={key}
                style={{
                  backgroundColor: WHITE,
                  borderRadius: 8,
                  border: `1px solid ${NAVY}1A`,
                  overflow: 'visible',
                }}
              >
                {/* Category header (accordion trigger) */}
                <button
                  id={headerId}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  onClick={() => toggleExpandedCategory(key)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '16px 20px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'Playfair Display, serif',
                      fontWeight: 700,
                      fontSize: 20,
                      color: NAVY,
                      flex: 1,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontFamily: 'Source Sans Pro, sans-serif',
                      fontSize: 13,
                      color: complete ? GREEN : `${NAVY}80`,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {touched} of {count}
                  </span>
                  <MiniProgressBar value={pct} />
                  <ChevronIcon open={isExpanded} />
                </button>

                {/* Category items panel */}
                {isExpanded && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headerId}
                    style={{ borderTop: `1px solid ${NAVY}0D`, padding: '0 20px' }}
                  >
                    {catItems.map((item, idx) => {
                      const isDropdownOpen = openDropdown === item.id;
                      const isNotesOpen = !!expandedNotes[item.id];
                      const noteValue = localNotes[item.id] ?? item.notes ?? '';

                      return (
                        <div key={item.id}>
                          {/* Item row */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              paddingTop: idx === 0 ? 12 : 10,
                              paddingBottom: 10,
                              borderTop: idx > 0 ? `1px solid ${NAVY}0D` : 'none',
                            }}
                          >
                            {/* Status toggle with dropdown */}
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                              <button
                                onClick={(e) => handleStatusIconClick(e, item)}
                                onKeyDown={(e) => handleStatusKeyDown(e, item)}
                                aria-label={`${item.label}: ${STATUS_LABELS[item.status]}. Click to change status.`}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 4,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minWidth: 44,
                                  minHeight: 44,
                                  borderRadius: 6,
                                }}
                              >
                                <StatusIcon status={item.status} />
                              </button>

                              {/* Status dropdown */}
                              {isDropdownOpen && (
                                <div
                                  role="listbox"
                                  aria-label="Select document status"
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: '100%',
                                    zIndex: 100,
                                    backgroundColor: WHITE,
                                    border: `1px solid ${NAVY}1A`,
                                    borderRadius: 8,
                                    boxShadow: '0 4px 16px rgba(27,42,74,0.14)',
                                    minWidth: 190,
                                    overflow: 'hidden',
                                  }}
                                >
                                  {STATUS_CYCLE.map((status) => (
                                    <button
                                      key={status}
                                      role="option"
                                      aria-selected={item.status === status}
                                      onClick={(e) => { e.stopPropagation(); selectStatus(item.id, status); }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        width: '100%',
                                        padding: '10px 14px',
                                        background: item.status === status ? `${NAVY}08` : 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontFamily: 'Source Sans Pro, sans-serif',
                                        fontSize: 14,
                                        color: NAVY,
                                        textAlign: 'left',
                                      }}
                                    >
                                      <StatusIcon status={status} />
                                      {STATUS_LABELS[status]}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Document label */}
                            <span
                              style={{
                                flex: 1,
                                fontFamily: 'Source Sans Pro, sans-serif',
                                fontSize: 16,
                                color: item.status === 'not-applicable' ? `${NAVY}66` : NAVY,
                                lineHeight: 1.45,
                                textDecoration: item.status === 'not-applicable' ? 'line-through' : 'none',
                              }}
                            >
                              {item.label}
                            </span>

                            {/* Expand arrow for helper text + notes */}
                            <button
                              onClick={() => toggleNotes(item.id)}
                              aria-label={isNotesOpen ? `Collapse details for ${item.label}` : `Expand details for ${item.label}`}
                              aria-expanded={isNotesOpen}
                              aria-controls={`notes-${item.id}`}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 8,
                                color: `${NAVY}66`,
                                minWidth: 36,
                                minHeight: 36,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 4,
                                flexShrink: 0,
                              }}
                            >
                              <ChevronIcon open={isNotesOpen} />
                            </button>
                          </div>

                          {/* Helper text + notes (expanded) */}
                          {isNotesOpen && (
                            <div
                              id={`notes-${item.id}`}
                              style={{
                                paddingLeft: 54,
                                paddingBottom: 16,
                                borderTop: `1px solid ${NAVY}08`,
                              }}
                            >
                              <p
                                style={{
                                  fontFamily: 'Source Sans Pro, sans-serif',
                                  fontSize: 14,
                                  color: `${NAVY}B3`,
                                  margin: '12px 0 12px',
                                  lineHeight: 1.65,
                                }}
                              >
                                {item.helperText}
                              </p>
                              <textarea
                                value={noteValue}
                                onChange={(e) => handleNotesChange(item.id, e.target.value)}
                                onBlur={() => handleNotesBlur(item.id)}
                                placeholder="Add notes — where to find it, who to contact, account number, etc."
                                maxLength={500}
                                rows={3}
                                aria-label={`Notes for ${item.label}`}
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  padding: '10px 12px',
                                  fontFamily: 'Source Sans Pro, sans-serif',
                                  fontSize: 14,
                                  color: NAVY,
                                  border: `1px solid ${NAVY}2A`,
                                  borderRadius: 6,
                                  resize: 'vertical',
                                  backgroundColor: PARCHMENT,
                                  outline: 'none',
                                  lineHeight: 1.5,
                                }}
                              />
                              <div
                                style={{
                                  fontFamily: 'Source Sans Pro, sans-serif',
                                  fontSize: 12,
                                  color: `${NAVY}66`,
                                  textAlign: 'right',
                                  marginTop: 4,
                                }}
                              >
                                {noteValue.length}/500
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* AI prompt or upsell (shown when category is fully touched) */}
                    {complete && (
                      <div
                        style={{
                          borderLeft: `4px solid ${GOLD}`,
                          backgroundColor: PARCHMENT,
                          padding: '14px 16px',
                          margin: '4px 0 16px',
                          borderRadius: '0 8px 8px 0',
                        }}
                      >
                        {isNavigator ? (
                          <>
                            <p
                              style={{
                                fontFamily: 'Source Sans Pro, sans-serif',
                                fontSize: 15,
                                color: NAVY,
                                margin: '0 0 8px',
                                lineHeight: 1.6,
                              }}
                            >
                              {AI_PROMPTS[key]}
                            </p>
                            <span
                              style={{
                                fontFamily: 'Source Sans Pro, sans-serif',
                                fontSize: 13,
                                color: `${NAVY}80`,
                              }}
                            >
                              ClearPath Navigator AI — Coming soon
                            </span>
                          </>
                        ) : (
                          <>
                            <p
                              style={{
                                fontFamily: 'Source Sans Pro, sans-serif',
                                fontSize: 15,
                                color: NAVY,
                                margin: '0 0 10px',
                                lineHeight: 1.6,
                              }}
                            >
                              Want to understand what these documents reveal? ClearPath Navigator gives you AI-guided education on every aspect of your financial picture.
                            </p>
                            <Link
                              href="/upgrade"
                              style={{
                                fontFamily: 'Source Sans Pro, sans-serif',
                                fontSize: 14,
                                fontWeight: 600,
                                color: GOLD,
                                textDecoration: 'none',
                              }}
                            >
                              Upgrade to Navigator →
                            </Link>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── CTA section ────────────────────────────────────────────────────── */}
        <div style={{ padding: '40px 0 0', borderTop: `1px solid ${NAVY}1A`, marginTop: 32 }}>
          {overallProgress < 50 ? (
            <p
              style={{
                fontFamily: 'Source Sans Pro, sans-serif',
                fontSize: 16,
                color: `${NAVY}B3`,
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Keep gathering. The more complete your documentation, the stronger your position.
            </p>
          ) : overallProgress < 100 ? (
            <div>
              <p
                style={{
                  fontFamily: 'Source Sans Pro, sans-serif',
                  fontSize: 16,
                  color: `${NAVY}B3`,
                  lineHeight: 1.7,
                  margin: '0 0 20px',
                }}
              >
                Ready to start building your asset picture? The Marital Estate Inventory uses the documents you've gathered to map everything you own and owe.
              </p>
              <Link
                href="/modules/m2/inventory"
                style={{
                  display: 'inline-block',
                  backgroundColor: NAVY,
                  color: WHITE,
                  fontFamily: 'Source Sans Pro, sans-serif',
                  fontSize: 16,
                  fontWeight: 600,
                  padding: '13px 28px',
                  borderRadius: 6,
                  textDecoration: 'none',
                }}
              >
                Start the Marital Estate Inventory →
              </Link>
            </div>
          ) : (
            <div>
              <p
                style={{
                  fontFamily: 'Source Sans Pro, sans-serif',
                  fontSize: 16,
                  color: `${NAVY}B3`,
                  lineHeight: 1.7,
                  margin: '0 0 20px',
                }}
              >
                Your documentation is complete. Now let's turn those documents into a clear picture of your marital estate.
              </p>
              <Link
                href="/modules/m2/inventory"
                style={{
                  display: 'inline-block',
                  backgroundColor: GOLD,
                  color: NAVY,
                  fontFamily: 'Source Sans Pro, sans-serif',
                  fontSize: 16,
                  fontWeight: 600,
                  padding: '13px 28px',
                  borderRadius: 6,
                  textDecoration: 'none',
                }}
              >
                Build Your Marital Estate Inventory →
              </Link>
            </div>
          )}

          {/* Secondary CTA (always visible) */}
          <p
            style={{
              fontFamily: 'Source Sans Pro, sans-serif',
              fontSize: 14,
              color: `${NAVY}80`,
              lineHeight: 1.7,
              margin: '24px 0 0',
            }}
          >
            Not sure where to find a document? Check the notes field — or ask your attorney. Many of these documents are available through the discovery process.
          </p>
        </div>

        {/* ── Disclaimer ─────────────────────────────────────────────────────── */}
        <p
          style={{
            fontFamily: 'Source Sans Pro, sans-serif',
            fontSize: 12,
            color: `${NAVY}99`,
            lineHeight: 1.7,
            marginTop: 48,
            paddingTop: 24,
            borderTop: `1px solid ${NAVY}0D`,
          }}
        >
          This checklist is for educational and organizational purposes only. It does not constitute financial, legal, or tax advice. Not all documents listed may apply to your situation. For guidance specific to your circumstances, consult a Certified Divorce Financial Analyst® or attorney.
        </p>
      </div>

      {/* ── Milestone toast ─────────────────────────────────────────────────── */}
      {toast && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: WHITE,
            border: `1px solid ${NAVY}1A`,
            borderRadius: 10,
            padding: '16px 24px',
            boxShadow: '0 8px 24px rgba(27,42,74,0.16)',
            fontFamily: 'Source Sans Pro, sans-serif',
            fontSize: 16,
            color: NAVY,
            maxWidth: 480,
            width: 'calc(100vw - 48px)',
            zIndex: 1000,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
