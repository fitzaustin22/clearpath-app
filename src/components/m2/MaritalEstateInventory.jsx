'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useM2Store } from '@/src/stores/m2Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import {
  ASSET_SECTIONS,
  LIABILITY_SECTIONS,
  ALL_SECTIONS,
  LIABILITY_KEYS,
  computeCategoryTotals,
} from '@/src/lib/m2Sections';
import { buildAssetInventoryPayload } from '@/src/lib/blueprintM2Payload';

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const PARCHMENT = '#FAF8F2';
const WHITE = '#FFFFFF';
const GREEN = '#2D8A4E';
const RED = '#C0392B';
const AMBER = '#D4A574';

// Section definitions, LIABILITY_KEYS, and computeCategoryTotals live in
// src/lib/m2Sections.js (imported above) — shared with PersonalPropertyInventory
// so §3 retrofits from both components agree on shape.

// Tool 2 inventory category → Tool 1 checklist document IDs
// Used by cross-tool document warnings (Integration 1)
const CHECKLIST_MAPPING = {
  realEstate: ['doc-re-01', 'doc-re-02', 'doc-re-03', 'doc-re-04', 'doc-re-05'],
  workingCapital: ['doc-bank-01', 'doc-bank-02', 'doc-inv-01', 'doc-inv-02', 'doc-inv-03'],
  retirement: ['doc-ret-01', 'doc-ret-02', 'doc-ret-04'],
  pensions: ['doc-ret-03'],
  stockOptions: ['doc-inc-03', 'doc-ret-05'],
  corporateIncentives: ['doc-inc-03'],
  businessInterests: ['doc-tax-05', 'doc-debt-05'],
  otherAssets: ['doc-inv-04', 'doc-inv-05'],
  loans: ['doc-debt-02'],
  creditCards: ['doc-debt-01'],
  otherDebt: ['doc-debt-05', 'doc-debt-06'],
};

// Mapping from Tool 1 category keys to display labels (for warning link text)
const CHECKLIST_CATEGORY_LABELS = {
  taxReturns: 'Tax Returns',
  incomeDocumentation: 'Income Documentation',
  bankAndCash: 'Bank and Cash Accounts',
  investmentAccounts: 'Investment Accounts',
  retirementAccounts: 'Retirement Accounts',
  realEstate: 'Real Estate',
  debtAndLiabilities: 'Debt and Liabilities',
  legalAndInsurance: 'Legal and Insurance',
};

// Summary table row order
const SUMMARY_ASSET_ROWS = [
  { key: 'realEstate', label: 'Real Estate (Net Equity)' },
  { key: 'workingCapital', label: 'Working Capital' },
  { key: 'retirement', label: 'Retirement Accounts' },
  { key: 'pensions', label: 'Pension Plans' },
  { key: 'stockOptions', label: 'Stock Options' },
  { key: 'corporateIncentives', label: 'Corporate Incentive Programs' },
  { key: 'businessInterests', label: 'Business Interests' },
  { key: 'otherAssets', label: 'Other Assets' },
  { key: 'personalProperty', label: 'Personal Property' },
];
const SUMMARY_LIABILITY_ROWS = [
  { key: 'loans', label: 'Loans' },
  { key: 'creditCards', label: 'Credit Cards' },
  { key: 'otherDebt', label: 'Other Debt' },
];

// ─── Formatters ────────────────────────────────────────────────────────────────
function formatCurrency(value) {
  const num = Number(value) || 0;
  return '$' + Math.round(num).toLocaleString('en-US');
}
function formatCurrencyParen(value) {
  const num = Number(value) || 0;
  const s = '$' + Math.abs(Math.round(num)).toLocaleString('en-US');
  return num < 0 ? `(${s})` : s;
}
function formatLiabilityCurrency(value) {
  // Display liabilities as parenthesized negatives even when stored positive
  const num = Number(value) || 0;
  if (num === 0) return '$0';
  return `($${Math.abs(Math.round(num)).toLocaleString('en-US')})`;
}
function formatMarriageDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── Classification chip styles ────────────────────────────────────────────────
const CHIP_STYLES = {
  marital: { bg: NAVY, color: PARCHMENT, label: 'Marital' },
  separate: { bg: GOLD, color: NAVY, label: 'Separate' },
  commingled: { bg: AMBER, color: NAVY, label: 'Commingled' },
  disputed: { bg: RED, color: WHITE, label: 'Disputed' },
  unknown: { bg: `${NAVY}33`, color: NAVY, label: 'Unknown' },
};
const CLASSIFICATION_CHOICES = [
  { value: 'marital', label: 'Marital' },
  { value: 'separate', label: 'Separate' },
  { value: 'commingled', label: 'Commingled' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'unknown', label: 'Unknown' },
];

function getRationale(item) {
  if (!item.classification || item.classification === 'unknown') {
    return 'Cannot classify: marriage date or acquisition date not provided.';
  }
  if (item.classification === 'marital') {
    return 'Classified as marital: acquired during marriage with marital funds.';
  }
  if (item.classification === 'separate') {
    if (item.sourceOfPayment === 'gift') {
      return 'Classified as separate: acquired as a gift and kept in your name.';
    }
    if (item.sourceOfPayment === 'inheritance') {
      return 'Classified as separate: acquired as an inheritance and kept in your name.';
    }
    return 'Classified as separate: acquired before marriage and titled in your name.';
  }
  if (item.classification === 'commingled') {
    if (item.sourceOfPayment === 'mixed') {
      return 'Flagged as commingled: funded with a mix of marital and separate funds.';
    }
    if (item.sourceOfPayment === 'gift') {
      return 'Flagged as commingled: gift deposited into a joint account.';
    }
    if (item.sourceOfPayment === 'inheritance') {
      return 'Flagged as commingled: inheritance deposited into a joint account.';
    }
    return 'Flagged as commingled: acquired before marriage but retitled to joint names.';
  }
  if (item.classification === 'disputed') {
    return 'Marked as disputed. This item is excluded from Client and Spouse totals.';
  }
  return '';
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function genId(category) {
  return `${category}-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)
    .toString(36)
    .padStart(2, '0')}`;
}

function isPreMarital(item, marriageDate) {
  if (!marriageDate || !item.dateAcquired) return false;
  return new Date(item.dateAcquired) < new Date(marriageDate);
}

function showAppreciationWarning(item, marriageDate) {
  if (!isPreMarital(item, marriageDate)) return false;
  if (item.costBasis == null || item.costBasis === '') return false;
  const cv = Number(item.currentValue);
  const cb = Number(item.costBasis);
  if (!Number.isFinite(cv) || !Number.isFinite(cb)) return false;
  return cv > cb;
}

// ─── Small inline icons ───────────────────────────────────────────────────────
function Chevron({ open }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
    >
      <path d="M8 10.586L2.707 5.293a1 1 0 00-1.414 1.414l6 6a1 1 0 001.414 0l6-6a1 1 0 00-1.414-1.414L8 10.586z" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M12.854 3.146a.5.5 0 010 .708L8.707 8l4.147 4.146a.5.5 0 01-.708.708L8 8.707l-4.146 4.147a.5.5 0 01-.708-.708L7.293 8 3.146 3.854a.5.5 0 11.708-.708L8 7.293l4.146-4.147a.5.5 0 01.708 0z" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MaritalEstateInventory({ userTier = 'essentials' }) {
  const maritalEstateInventory = useM2Store((s) => s.maritalEstateInventory);
  const addInventoryItem = useM2Store((s) => s.addInventoryItem);
  const updateInventoryItem = useM2Store((s) => s.updateInventoryItem);
  const removeInventoryItem = useM2Store((s) => s.removeInventoryItem);
  const setMarriageDateAction = useM2Store((s) => s.setMarriageDate);
  const resetMaritalEstateInventory = useM2Store((s) => s.resetMaritalEstateInventory);
  const personalPropertySummary = useM2Store((s) => s.personalPropertyInventory.summary);
  const personalPropertyStarted = useM2Store((s) => s.personalPropertyInventory.startedAt);
  const personalPropertyRooms = useM2Store((s) => s.personalPropertyInventory.rooms);
  const checklistItems = useM2Store((s) => s.documentChecklist.items);
  const checklistProgress = useM2Store((s) => s.documentChecklist.overallProgress);

  const { marriageDate, items, summary, completenessScore } = maritalEstateInventory;
  const autoClassify = userTier !== 'essentials';
  const isNavigator = userTier === 'navigator' || userTier === 'signature';
  const isEssentials = userTier === 'essentials';

  // ── UI state ────────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState('realEstate');
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [marriageModalOpen, setMarriageModalOpen] = useState(false);
  const [tempMarriageDate, setTempMarriageDate] = useState('');
  const [openAccordions, setOpenAccordions] = useState(['realEstate']);
  const [classifyDropdownId, setClassifyDropdownId] = useState(null);
  const [rationaleTooltipId, setRationaleTooltipId] = useState(null);
  const [gatingDismissed, setGatingDismissed] = useState(false);

  // Open marriage-date modal on first load if missing (unless user skipped this session)
  useEffect(() => {
    if (!marriageDate) {
      const skipped =
        typeof window !== 'undefined' && sessionStorage.getItem('m2-marriage-date-skipped');
      if (!skipped) setMarriageModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close classification dropdown on outside click
  useEffect(() => {
    if (classifyDropdownId === null) return;
    const close = () => setClassifyDropdownId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [classifyDropdownId]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const itemsBySection = useMemo(() => {
    const grouped = {};
    for (const section of ALL_SECTIONS) grouped[section.key] = [];
    for (const item of items) {
      if (grouped[item.category]) grouped[item.category].push(item);
    }
    return grouped;
  }, [items]);

  const categoryTotals = useMemo(() => {
    const base = computeCategoryTotals(items);
    const pp = personalPropertySummary || {};
    const ppTotal = Number(pp.totalValue) || 0;
    const ppClient = Number(pp.clientValue) || 0;
    const ppSpouse = Number(pp.spouseValue) || 0;
    const ppUnallocated = (Number(pp.disputedValue) || 0) + (Number(pp.undecidedValue) || 0);
    base['personalProperty'] = {
      total: ppTotal,
      client: ppClient,
      spouse: ppSpouse,
      unallocated: ppUnallocated,
    };
    return base;
  }, [items, personalPropertySummary]);

  const adjustedSummary = useMemo(() => {
    const s = summary || {};
    const pp = personalPropertySummary || {};
    const ppTotal = Number(pp.totalValue) || 0;
    const ppClient = Number(pp.clientValue) || 0;
    const ppSpouse = Number(pp.spouseValue) || 0;
    const ppUnallocated = (Number(pp.disputedValue) || 0) + (Number(pp.undecidedValue) || 0);

    const totalAssets = (s.totalAssets || 0) + ppTotal;
    const clientAssets = (s.clientAssets || 0) + ppClient;
    const spouseAssets = (s.spouseAssets || 0) + ppSpouse;
    const unallocatedAssets = (s.unallocatedAssets || 0) + ppUnallocated;
    const clientNetEstate = clientAssets - (s.clientLiabilities || 0);
    const spouseNetEstate = spouseAssets - (s.spouseLiabilities || 0);
    const netMaritalEstate = totalAssets - (s.totalLiabilities || 0);
    const allocatedTotal = clientNetEstate + spouseNetEstate;
    const clientPercentage = allocatedTotal !== 0 ? (clientNetEstate / allocatedTotal) * 100 : 0;
    const spousePercentage = allocatedTotal !== 0 ? (spouseNetEstate / allocatedTotal) * 100 : 0;

    return {
      ...s,
      totalAssets,
      clientAssets,
      spouseAssets,
      unallocatedAssets,
      clientNetEstate,
      spouseNetEstate,
      netMaritalEstate,
      clientPercentage,
      spousePercentage,
    };
  }, [summary, personalPropertySummary]);

  // Cross-tool document warnings: for each Tool 2 section, check
  // whether any mapped Tool 1 checklist docs are still "not-started"
  const documentWarnings = useMemo(() => {
    if (!checklistItems || checklistItems.length === 0) return {};
    const warnings = {};
    for (const [sectionKey, docIds] of Object.entries(CHECKLIST_MAPPING)) {
      const missingDocs = docIds.filter((docId) => {
        const item = checklistItems.find((i) => i.id === docId);
        return item && item.status === 'not-started';
      });
      if (missingDocs.length > 0) {
        // Determine which Tool 1 categories are affected
        const affectedCategories = new Set();
        for (const docId of missingDocs) {
          const item = checklistItems.find((i) => i.id === docId);
          if (item) affectedCategories.add(item.category);
        }
        warnings[sectionKey] = {
          count: missingDocs.length,
          total: docIds.length,
          categories: [...affectedCategories],
        };
      }
    }
    return warnings;
  }, [checklistItems]);

  const hasCommingledItems = useMemo(
    () => items.some((i) => i.classification === 'commingled'),
    [items]
  );

  const totalItemCount = items.length;

  // ── Blueprint §3 sync (debounced 500ms) ────────────────────────────────────
  useEffect(() => {
    if (items.length === 0 && (!personalPropertySummary || personalPropertySummary.totalItems === 0)) return;
    const timer = setTimeout(() => {
      const payload = buildAssetInventoryPayload({
        items,
        summary,
        categoryTotals,
        itemsBySection,
        adjustedSummary,
        checklistItems,
        personalPropertySummary,
        personalPropertyRooms,
        ALL_SECTIONS,
        LIABILITY_KEYS,
      });
      useBlueprintStore.getState().updateAssetInventory(payload);
    }, 500);
    return () => clearTimeout(timer);
  }, [
    items,
    adjustedSummary,
    summary,
    categoryTotals,
    itemsBySection,
    checklistItems,
    personalPropertySummary,
    personalPropertyRooms,
  ]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAddItem = (sectionKey, description = '') => {
    const newItem = {
      id: genId(sectionKey),
      category: sectionKey,
      description,
      dateAcquired: null,
      titleholder: 'unknown',
      sourceOfPayment: null,
      currentValue: 0,
      costBasis: null,
      outstandingBalance: null,
      classification: 'unknown',
      classificationSource: null,
      notes: '',
    };
    addInventoryItem(newItem, autoClassify);
    setExpandedItemId(newItem.id);
  };

  const handleUpdate = (id, update) => {
    updateInventoryItem(id, update, autoClassify);
  };

  const handleRemove = (id) => {
    if (expandedItemId === id) setExpandedItemId(null);
    removeInventoryItem(id);
  };

  // DEF-9: Convert an unvested/unexercised stockOptions or corporateIncentives
  // item into a deferred-comp placeholder in the blueprint store, then remove it
  // from the m2 inventory so today's tax-adjusted totals aren't inflated. The
  // placeholder surfaces in §3 / §5 as a "Deferred Comp Pending" advisory.
  // stubData carries the user-supplied stub-form values (company, grantDate,
  // sharesGranted, vestingSchedule, strikePrice).
  const handleConvertToDeferredCompStub = (item, stubData) => {
    useBlueprintStore.getState().addDeferredCompStub({
      category: item.category, // 'stockOptions' | 'corporateIncentives'
      company: stubData.company,
      grantDate: stubData.grantDate,
      sharesGranted: stubData.sharesGranted,
      vestingSchedule: stubData.vestingSchedule,
      strikePrice: stubData.strikePrice,
    });
    if (expandedItemId === item.id) setExpandedItemId(null);
    removeInventoryItem(item.id);
  };

  const handleSaveMarriageDate = () => {
    if (tempMarriageDate) {
      setMarriageDateAction(tempMarriageDate, autoClassify);
      setMarriageModalOpen(false);
      setTempMarriageDate('');
    }
  };

  const handleSkipMarriageDate = () => {
    sessionStorage.setItem('m2-marriage-date-skipped', '1');
    setMarriageModalOpen(false);
    setTempMarriageDate('');
  };

  const openMarriageModal = () => {
    setTempMarriageDate(marriageDate || '');
    setMarriageModalOpen(true);
  };

  const toggleAccordion = (key) => {
    setOpenAccordions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // ── Render helpers ──────────────────────────────────────────────────────────
  const activeSectionData = ALL_SECTIONS.find((s) => s.key === activeSection);

  return (
    <div
      style={{
        backgroundColor: PARCHMENT,
        minHeight: '100vh',
        fontFamily: '"Source Sans Pro", -apple-system, system-ui, sans-serif',
        color: NAVY,
      }}
    >
      {/* Back link */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 0' }}>
        <Link
          href="/modules/m2"
          style={{
            color: NAVY,
            textDecoration: 'none',
            fontSize: 14,
            opacity: 0.75,
          }}
        >
          ← Back to Know What You Own
        </Link>
      </div>

      {/* Header */}
      <header style={{ maxWidth: 960, margin: '0 auto', padding: '16px 20px 24px' }}>
        <h1
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 700,
            fontSize: 32,
            color: NAVY,
            margin: 0,
            marginBottom: 8,
          }}
        >
          Marital Estate Inventory
        </h1>
        <p style={{ fontSize: 16, color: NAVY, opacity: 0.8, margin: 0, maxWidth: 720 }}>
          Map every asset and debt, classify them, and see the full picture of your marital
          estate. You can enter as much or as little as you know — every item makes the picture
          more complete.
        </p>

        {/* Marriage date banner */}
        <div
          style={{
            marginTop: 20,
            padding: '10px 16px',
            background: `${NAVY}0D`,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {marriageDate ? (
            <span style={{ fontSize: 14, color: NAVY }}>
              Marriage date: <strong>{formatMarriageDate(marriageDate)}</strong>
            </span>
          ) : (
            <span style={{ fontSize: 14, color: NAVY, opacity: 0.75 }}>
              Marriage date not set — date-based classification is paused.
            </span>
          )}
          <button
            onClick={openMarriageModal}
            style={{
              background: 'none',
              border: 'none',
              color: NAVY,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {marriageDate ? 'Edit' : 'Add marriage date'}
          </button>
        </div>
      </header>

      {/* Completion gating advisory (Integration 2) — one-time per session */}
      {!gatingDismissed && checklistProgress < 50 && checklistItems.length > 0 && (
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            padding: '0 20px',
          }}
        >
          <div
            style={{
              marginTop: 16,
              padding: '14px 18px',
              background: `${GOLD}1A`,
              borderLeft: `3px solid ${GOLD}`,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: 14,
                  color: NAVY,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                You've started building your inventory — great. As you go, you'll find
                it easier if you have the actual statements and documents. Your
                Documentation Checklist is{' '}
                <strong>{Math.round(checklistProgress)}% complete</strong>.{' '}
                <Link
                  href="/modules/m2/checklist"
                  style={{
                    color: NAVY,
                    fontWeight: 600,
                    textDecoration: 'underline',
                  }}
                >
                  Review Checklist →
                </Link>
              </p>
            </div>
            <button
              onClick={() => setGatingDismissed(true)}
              aria-label="Dismiss checklist advisory"
              style={{
                background: 'none',
                border: 'none',
                color: NAVY,
                opacity: 0.5,
                cursor: 'pointer',
                padding: '2px 4px',
                fontSize: 18,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Section navigation + content */}
      <div className="mx-auto w-full max-w-[960px] px-5">
        {/* Mobile (<640px): vertical accordion */}
        <div className="sm:hidden">
          {ALL_SECTIONS.map((section) => {
            const open = openAccordions.includes(section.key);
            return (
              <div
                key={section.key}
                style={{
                  background: WHITE,
                  borderRadius: 6,
                  marginBottom: 8,
                  border: `1px solid ${NAVY}1A`,
                  overflow: 'visible',
                }}
              >
                <button
                  onClick={() => toggleAccordion(section.key)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: NAVY,
                    textAlign: 'left',
                  }}
                  aria-expanded={open}
                >
                  <span
                    style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontSize: 20,
                      fontWeight: 700,
                    }}
                  >
                    {section.label}
                  </span>
                  <Chevron open={open} />
                </button>
                {open && (
                  <div style={{ padding: '0 16px 16px' }}>
                    {renderSectionBody(section)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tablet/desktop (≥640px): horizontal scrolling tabs */}
        <div className="hidden sm:block">
          <div
            role="tablist"
            aria-label="Inventory sections"
            className="flex gap-1 overflow-x-auto mb-5 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]"
            style={{
              borderBottom: `1px solid ${NAVY}1A`,
            }}
          >
            {ALL_SECTIONS.map((section) => {
              const active = section.key === activeSection;
              return (
                <button
                  key={section.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveSection(section.key)}
                  style={{
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: active ? `3px solid ${GOLD}` : '3px solid transparent',
                    color: NAVY,
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    marginBottom: -1,
                    flexShrink: 0,
                  }}
                >
                  {section.label}
                </button>
              );
            })}
          </div>
          <div
            className="p-5 sm:p-6"
            style={{
              background: WHITE,
              borderRadius: 8,
              border: `1px solid ${NAVY}1A`,
            }}
          >
            <h2
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 20,
                fontWeight: 700,
                color: NAVY,
                margin: 0,
                marginBottom: 12,
              }}
            >
              {activeSectionData?.label}
            </h2>
            {renderSectionBody(activeSectionData)}
          </div>
        </div>
      </div>

      {/* Division Summary */}
      <div style={{ maxWidth: 960, margin: '32px auto 0', padding: '0 20px' }}>
        <div
          style={{
            background: WHITE,
            borderRadius: 8,
            border: `1px solid ${NAVY}1A`,
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => setSummaryCollapsed((s) => !s)}
            aria-expanded={!summaryCollapsed}
            style={{
              width: '100%',
              padding: '16px 20px',
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              color: NAVY,
              textAlign: 'left',
            }}
          >
            <span
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              Pre-Tax Division Summary
            </span>
            <Chevron open={!summaryCollapsed} />
          </button>
          {!summaryCollapsed && (
            <div style={{ padding: '0 20px 20px' }}>{renderDivisionSummary()}</div>
          )}
        </div>

        {/* Completeness score */}
        <div
          style={{
            marginTop: 20,
            padding: '16px 20px',
            background: WHITE,
            borderRadius: 8,
            border: `1px solid ${NAVY}1A`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 15, color: NAVY, fontWeight: 600 }}>
              Your inventory is {Math.round(completenessScore)}% complete
            </span>
            <span style={{ fontSize: 13, color: NAVY, opacity: 0.65 }}>
              {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} entered
            </span>
          </div>
          <div
            style={{
              marginTop: 8,
              width: '100%',
              height: 6,
              background: `${NAVY}1A`,
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, completenessScore)}%`,
                height: '100%',
                background: GOLD,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          {isEssentials && completenessScore < 60 && totalItemCount > 0 && (
            <p
              style={{
                fontSize: 13,
                color: NAVY,
                opacity: 0.8,
                marginTop: 12,
                marginBottom: 0,
                lineHeight: 1.5,
              }}
            >
              Want to increase your completeness score? Full Access automatically
              classifies your assets and helps you fill in the details.{' '}
              <a
                href="/upgrade"
                style={{ color: NAVY, fontWeight: 600, textDecoration: 'underline' }}
              >
                Unlock with Full Access →
              </a>
            </p>
          )}
        </div>
      </div>

      {/* Adaptive CTA */}
      <div style={{ maxWidth: 960, margin: '20px auto 0', padding: '0 20px' }}>
        {totalItemCount < 5 && !personalPropertyStarted ? (
          <p
            style={{
              fontFamily: '"Source Sans Pro", sans-serif',
              fontSize: 16,
              color: NAVY,
              opacity: 0.7,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Keep building your inventory. Every asset and debt you add makes the picture more
            complete.
          </p>
        ) : personalPropertyStarted ? (
          <div>
            <p
              style={{
                fontFamily: '"Source Sans Pro", sans-serif',
                fontSize: 16,
                color: NAVY,
                opacity: 0.7,
                margin: 0,
                marginBottom: 14,
                lineHeight: 1.5,
              }}
            >
              Your marital estate picture is taking shape. When you're ready to move forward,
              Module 3 will walk you through cash flow and budgeting.
            </p>
            <Link
              href="/modules/m3"
              style={{
                display: 'inline-block',
                background: NAVY,
                color: WHITE,
                fontFamily: '"Source Sans Pro", sans-serif',
                fontWeight: 600,
                fontSize: 14,
                padding: '11px 22px',
                borderRadius: 6,
                textDecoration: 'none',
              }}
            >
              Continue to Module 3 →
            </Link>
          </div>
        ) : (
          <div>
            <p
              style={{
                fontFamily: '"Source Sans Pro", sans-serif',
                fontSize: 16,
                color: NAVY,
                opacity: 0.7,
                margin: 0,
                marginBottom: 14,
                lineHeight: 1.5,
              }}
            >
              Ready to inventory your household items? The Personal Property Inventory goes
              room by room.
            </p>
            <Link
              href="/modules/m2/personal-property"
              style={{
                display: 'inline-block',
                background: NAVY,
                color: WHITE,
                fontFamily: '"Source Sans Pro", sans-serif',
                fontWeight: 600,
                fontSize: 14,
                padding: '11px 22px',
                borderRadius: 6,
                textDecoration: 'none',
              }}
            >
              Start Personal Property Inventory →
            </Link>
          </div>
        )}
      </div>

      {/* Reset link */}
      <div style={{ maxWidth: 960, margin: '24px auto 0', padding: '0 20px', textAlign: 'center' }}>
        <button
          onClick={() => {
            if (
              window.confirm(
                'This will clear all entries in the Marital Estate Inventory. You will start with a blank inventory. Are you sure?'
              )
            ) {
              resetMaritalEstateInventory();
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            color: NAVY,
            opacity: 0.5,
            fontSize: 14,
            fontFamily: '"Source Sans Pro", sans-serif',
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          Start over
        </button>
      </div>

      {/* Disclaimer */}
      <footer
        style={{
          maxWidth: 960,
          margin: '24px auto 0',
          padding: '20px',
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: NAVY,
            opacity: 0.6,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          This inventory tool is for educational and organizational purposes only. Asset values
          entered are your best estimates and may not reflect fair market value. Classification
          suggestions are based on general property law principles and may not apply in your
          state. This tool does not constitute financial, legal, or tax advice. For guidance
          specific to your situation — including accurate asset valuation and legal classification
          — consult a Certified Divorce Financial Analyst® or attorney.
        </p>
      </footer>

      {/* Marriage date modal */}
      {marriageModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="marriage-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(27, 42, 74, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: WHITE,
              borderRadius: 10,
              padding: 28,
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
            }}
          >
            <h2
              id="marriage-modal-title"
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 22,
                fontWeight: 700,
                color: NAVY,
                margin: 0,
                marginBottom: 12,
              }}
            >
              When were you married?
            </h2>
            <p
              style={{
                fontSize: 14,
                color: NAVY,
                opacity: 0.75,
                margin: 0,
                marginBottom: 16,
                lineHeight: 1.5,
              }}
            >
              To help classify your assets as marital or separate property, we need one date:
              your marriage date.
            </p>
            <input
              type="date"
              value={tempMarriageDate}
              onChange={(e) => setTempMarriageDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 15,
                border: `1px solid ${NAVY}33`,
                borderRadius: 6,
                color: NAVY,
                fontFamily: 'inherit',
                marginBottom: 20,
              }}
              aria-label="Marriage date"
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                onClick={handleSkipMarriageDate}
                style={{
                  background: 'none',
                  border: `1px solid ${NAVY}33`,
                  color: NAVY,
                  padding: '10px 16px',
                  borderRadius: 6,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                I'd rather not enter this right now
              </button>
              <button
                onClick={handleSaveMarriageDate}
                disabled={!tempMarriageDate}
                style={{
                  background: tempMarriageDate ? GOLD : `${GOLD}66`,
                  border: 'none',
                  color: NAVY,
                  padding: '10px 20px',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: tempMarriageDate ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Inner render helpers (close over state) ────────────────────────────────
  function renderSectionBody(section) {
    if (!section) return null;

    // Personal Property: dynamic summary row (Tool 3 link)
    if (section.isPersonalProperty) {
      const pp = personalPropertySummary || {};
      const ppTotal = Number(pp.totalValue) || 0;
      const ppItems = Number(pp.totalItems) || 0;
      const hasStarted = !!personalPropertyStarted;

      return (
        <div>
          <p style={{ fontSize: 14, color: NAVY, opacity: 0.75, lineHeight: 1.5, marginTop: 0 }}>
            Personal Property has its own dedicated tool. Go room by room and catalog household
            items; the total flows into your marital estate summary.
          </p>
          <div
            style={{
              padding: '14px 16px',
              background: `${NAVY}0A`,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 14, color: NAVY }}>
              {hasStarted ? (
                <>Personal Property — <strong>{formatCurrency(ppTotal)}</strong> ({ppItems} {ppItems === 1 ? 'item' : 'items'})</>
              ) : (
                <>Personal Property (see detailed inventory) — <strong>$0</strong> — not yet inventoried</>
              )}
            </span>
            <Link
              href="/modules/m2/personal-property"
              style={{
                color: NAVY,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              {hasStarted ? 'View / Edit Inventory →' : 'Start Personal Property Inventory →'}
            </Link>
          </div>
          {hasStarted && pp.appraisalRecommended && (
            <div
              style={{
                marginTop: 10,
                padding: '10px 14px',
                background: `${AMBER}26`,
                borderLeft: `3px solid ${AMBER}`,
                borderRadius: 4,
                fontSize: 13,
                color: NAVY,
                lineHeight: 1.5,
              }}
            >
              One or more high-value items may need a professional appraisal. Review flagged items in the Personal Property Inventory.
            </div>
          )}
        </div>
      );
    }

    const sectionItems = itemsBySection[section.key] || [];
    const isLiab = !!section.isLiability;

    // Determine which subcategories are already "activated" (have a matching item)
    const activatedDescriptions = new Set(sectionItems.map((i) => i.description));
    const inactiveSubs = (section.subcategories || []).filter(
      (s) => !activatedDescriptions.has(s)
    );

    return (
      <div>
        {section.helperText && (
          <p
            style={{
              fontSize: 13,
              color: NAVY,
              opacity: 0.75,
              lineHeight: 1.5,
              marginTop: 0,
              marginBottom: 16,
              padding: '10px 14px',
              background: `${GOLD}1A`,
              borderLeft: `3px solid ${GOLD}`,
              borderRadius: 4,
            }}
          >
            {section.helperText}
          </p>
        )}

        {/* Cross-tool document warning (Integration 1) */}
        {documentWarnings[section.key] && (
          <div
            style={{
              padding: '10px 14px',
              background: `${GOLD}1A`,
              borderLeft: `3px solid ${GOLD}`,
              borderRadius: 4,
              fontSize: 13,
              color: NAVY,
              lineHeight: 1.5,
              marginBottom: 12,
            }}
          >
            <span>
              {documentWarnings[section.key].count === 1
                ? 'A related document hasn\'t been collected yet.'
                : `${documentWarnings[section.key].count} related documents haven't been collected yet.`}
              {' '}The values you enter will be more accurate with the actual statements in hand.{' '}
            </span>
            {documentWarnings[section.key].categories.map((catKey) => (
              <Link
                key={catKey}
                href="/modules/m2/checklist"
                style={{
                  color: NAVY,
                  fontWeight: 600,
                  textDecoration: 'underline',
                  marginRight: 8,
                }}
              >
                Review {CHECKLIST_CATEGORY_LABELS[catKey] || catKey} →
              </Link>
            ))}
          </div>
        )}

        {/* Active items */}
        {sectionItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {sectionItems.map((item) =>
              expandedItemId === item.id
                ? renderExpandedItem(item, section)
                : renderCompactItem(item, section)
            )}
          </div>
        )}

        {/* Pre-populated subcategories (inactive) */}
        {inactiveSubs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            {inactiveSubs.map((sub) => (
              <div
                key={sub}
                style={{
                  padding: '10px 12px',
                  background: `${NAVY}05`,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: NAVY,
                    opacity: 0.5,
                  }}
                >
                  {sub}
                </span>
                <button
                  onClick={() => handleAddItem(section.key, sub)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: NAVY,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  + Add details
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add custom item */}
        <button
          onClick={() => handleAddItem(section.key)}
          aria-label={`Add a new item to ${section.label}`}
          style={{
            background: 'none',
            border: `1px dashed ${NAVY}66`,
            color: NAVY,
            padding: '10px 16px',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
            fontFamily: 'inherit',
          }}
        >
          + Add Item
        </button>

        {/* Category subtotal */}
        {sectionItems.length > 0 && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              background: `${NAVY}08`,
              borderRadius: 4,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 14,
              color: NAVY,
            }}
          >
            <span style={{ fontWeight: 600 }}>Category subtotal</span>
            <span style={{ fontWeight: 600 }}>
              {isLiab
                ? formatLiabilityCurrency(categoryTotals[section.key]?.total || 0)
                : formatCurrency(categoryTotals[section.key]?.total || 0)}
            </span>
          </div>
        )}
      </div>
    );
  }

  function renderCompactItem(item, section) {
    const isLiab = !!section.isLiability;
    const isCreditCard = section.key === 'creditCards';
    const chip = CHIP_STYLES[item.classification] || CHIP_STYLES.unknown;
    return (
      <div
        key={item.id}
        role="button"
        tabIndex={0}
        onClick={() => setExpandedItemId(item.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpandedItemId(item.id);
          }
        }}
        className="flex flex-col gap-2 sm:grid sm:grid-cols-[2fr_1fr_1fr_auto] sm:gap-3 sm:items-center"
        style={{
          padding: '12px 14px',
          background: `${NAVY}08`,
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              color: NAVY,
              opacity: 0.55,
              textTransform: 'uppercase',
              fontWeight: 600,
              letterSpacing: 0.3,
            }}
          >
            {isCreditCard ? 'Creditor Name' : 'Description'}
          </div>
          <div
            className="sm:truncate sm:whitespace-nowrap"
            style={{
              fontSize: 15,
              color: NAVY,
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {item.description || <span style={{ opacity: 0.5 }}>(untitled)</span>}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 12,
              color: NAVY,
              opacity: 0.55,
              textTransform: 'uppercase',
              fontWeight: 600,
              letterSpacing: 0.3,
            }}
          >
            {isCreditCard || isLiab ? 'Outstanding Balance' : 'Current Value'}
          </div>
          <div style={{ fontSize: 15, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>
            {isLiab
              ? formatLiabilityCurrency(item.currentValue)
              : formatCurrency(item.currentValue)}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 12,
              color: NAVY,
              opacity: 0.55,
              textTransform: 'uppercase',
              fontWeight: 600,
              letterSpacing: 0.3,
            }}
          >
            {isCreditCard ? 'Whose Name' : 'Titleholder'}
          </div>
          <div style={{ fontSize: 15, color: NAVY, textTransform: 'capitalize' }}>
            {item.titleholder || 'unknown'}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <span
            aria-label={`${item.description || 'Item'}: classified as ${chip.label.toLowerCase()} property.`}
            style={{
              padding: '4px 10px',
              background: chip.bg,
              color: chip.color,
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {chip.label}
          </span>
        </div>
      </div>
    );
  }

  function renderExpandedItem(item, section) {
    const isLiab = !!section.isLiability;
    const isCreditCard = section.key === 'creditCards';
    // DEF-9: stockOptions and corporateIncentives need a vested/exercised gate so
    // unvested grants get diverted to the deferred-comp placeholder flow rather
    // than living in the m2 inventory with a fictional FMV.
    const isEquityComp = section.key === 'stockOptions' || section.key === 'corporateIncentives';
    // Default to vested for back-compat: items created before this change have
    // no `vested` field, and toggling existed pre-DEF-9 would have meant they
    // were already-recognized grants worth current FMV.
    const isVested = !isEquityComp || item.vested !== false;
    const hideAssetOnlyFields = isLiab || (isEquityComp && !isVested);
    const showAppreciation = isNavigator && isVested && showAppreciationWarning(item, marriageDate);

    const chip = CHIP_STYLES[item.classification] || CHIP_STYLES.unknown;
    const rationale = getRationale(item);

    return (
      <div
        key={item.id}
        style={{
          padding: 18,
          background: WHITE,
          border: `1px solid ${NAVY}33`,
          borderLeft: `3px solid ${GOLD}`,
          borderRadius: 6,
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: NAVY,
              opacity: 0.55,
              textTransform: 'uppercase',
              fontWeight: 600,
              letterSpacing: 0.3,
            }}
          >
            Edit item
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleRemove(item.id)}
              aria-label="Remove item"
              style={{
                background: 'none',
                border: `1px solid ${NAVY}33`,
                color: NAVY,
                padding: '6px 12px',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Remove
            </button>
            <button
              onClick={() => setExpandedItemId(null)}
              aria-label="Collapse item"
              style={{
                background: 'none',
                border: 'none',
                color: NAVY,
                cursor: 'pointer',
                padding: 6,
              }}
            >
              <Chevron open={true} />
            </button>
          </div>
        </div>

        {/* DEF-9: Vested/exercised gate (stockOptions, corporateIncentives only) */}
        {isEquityComp && (
          <div
            style={{
              marginBottom: 14,
              padding: 12,
              background: PARCHMENT,
              border: `1px solid ${NAVY}22`,
              borderRadius: 6,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: NAVY,
                opacity: 0.65,
                textTransform: 'uppercase',
                fontWeight: 600,
                letterSpacing: 0.3,
                marginBottom: 8,
              }}
            >
              Vesting / exercise status
            </div>
            <div
              role="group"
              aria-label="Vesting status"
              style={{
                display: 'inline-flex',
                border: `1px solid ${GOLD}`,
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={() => handleUpdate(item.id, { vested: true })}
                aria-pressed={isVested}
                style={{
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: isVested ? 700 : 400,
                  color: isVested ? WHITE : NAVY,
                  background: isVested ? GOLD : 'transparent',
                  border: 'none',
                  padding: '6px 12px',
                  cursor: isVested ? 'default' : 'pointer',
                }}
              >
                Vested or already exercised
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUpdate(item.id, { vested: false, currentValue: 0, costBasis: null })
                }
                aria-pressed={!isVested}
                style={{
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: !isVested ? 700 : 400,
                  color: !isVested ? WHITE : NAVY,
                  background: !isVested ? GOLD : 'transparent',
                  border: 'none',
                  padding: '6px 12px',
                  cursor: !isVested ? 'default' : 'pointer',
                }}
              >
                Unvested or unexercised
              </button>
            </div>
            {!isVested && (
              <div
                style={{
                  marginTop: 12,
                  fontFamily: '"Source Sans Pro", -apple-system, system-ui, sans-serif',
                  fontSize: 13,
                  color: NAVY,
                  lineHeight: 1.5,
                }}
              >
                This grant has no current FMV to divide today. Fill in the identifying
                fields below and save it as a deferred-comp placeholder so it appears in
                your blueprint as <em>pending</em> (informing settlement conversations)
                without inflating today&apos;s tax-adjusted total.
              </div>
            )}
          </div>
        )}

        {isEquityComp && !isVested ? (
          <DeferredCompStubForm
            category={item.category}
            initialCompany={item.description || ''}
            initialGrantDate={item.dateAcquired || ''}
            onSave={(stubData) => handleConvertToDeferredCompStub(item, stubData)}
          />
        ) : (
        <>
        {/* Fields */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2"
          style={{
            gap: 14,
          }}
        >
          <Field label={isCreditCard ? 'Creditor Name' : 'Description'}>
            <TextInput
              value={item.description || ''}
              onCommit={(v) => handleUpdate(item.id, { description: v })}
            />
          </Field>

          <Field label={isCreditCard || isLiab ? 'Outstanding Balance' : 'Current Value'}>
            <CurrencyInput
              value={item.currentValue}
              onCommit={(v) => handleUpdate(item.id, { currentValue: v })}
            />
          </Field>

          {!hideAssetOnlyFields && (
            <Field label="Outstanding Balance (loan against this asset)">
              <CurrencyInput
                value={item.outstandingBalance}
                onCommit={(v) => handleUpdate(item.id, { outstandingBalance: v })}
                allowNull
              />
            </Field>
          )}

          {!hideAssetOnlyFields && (
            <Field label="Cost Basis (original purchase price)">
              <CurrencyInput
                value={item.costBasis}
                onCommit={(v) => handleUpdate(item.id, { costBasis: v })}
                allowNull
              />
            </Field>
          )}

          <Field label="Date Acquired">
            <input
              type="date"
              value={item.dateAcquired || ''}
              onChange={(e) =>
                handleUpdate(item.id, { dateAcquired: e.target.value || null })
              }
              style={fieldInputStyle}
            />
          </Field>

          <Field label={isCreditCard ? 'Whose Name' : 'Titleholder'}>
            <select
              value={item.titleholder || 'unknown'}
              onChange={(e) => handleUpdate(item.id, { titleholder: e.target.value })}
              style={fieldInputStyle}
            >
              <option value="self">Self</option>
              <option value="spouse">Spouse</option>
              <option value="joint">Joint</option>
              <option value="other">Other</option>
              <option value="unknown">Unknown</option>
            </select>
          </Field>

          {!hideAssetOnlyFields && (
            <Field label="Source of Payment">
              <select
                value={item.sourceOfPayment || ''}
                onChange={(e) =>
                  handleUpdate(item.id, { sourceOfPayment: e.target.value || null })
                }
                style={fieldInputStyle}
              >
                <option value="">(not specified)</option>
                <option value="marital-funds">Marital funds</option>
                <option value="separate-funds">Separate funds</option>
                <option value="mixed">Mixed marital and separate</option>
                <option value="gift">Gift</option>
                <option value="inheritance">Inheritance</option>
                <option value="unknown">Unknown</option>
              </select>
            </Field>
          )}

          <Field label="Classification">
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setClassifyDropdownId(
                    classifyDropdownId === item.id ? null : item.id
                  );
                }}
                onMouseEnter={() => isNavigator && setRationaleTooltipId(item.id)}
                onMouseLeave={() => setRationaleTooltipId(null)}
                style={{
                  padding: '6px 14px',
                  background: chip.bg,
                  color: chip.color,
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {chip.label}
              </button>
              {isNavigator && rationaleTooltipId === item.id && (
                <div
                  role="tooltip"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 6,
                    padding: '8px 12px',
                    background: NAVY,
                    color: PARCHMENT,
                    borderRadius: 6,
                    fontSize: 12,
                    maxWidth: 280,
                    lineHeight: 1.4,
                    zIndex: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                >
                  {rationale}
                </div>
              )}
              {classifyDropdownId === item.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 6,
                    background: WHITE,
                    border: `1px solid ${NAVY}33`,
                    borderRadius: 6,
                    zIndex: 20,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                    minWidth: 160,
                  }}
                >
                  {CLASSIFICATION_CHOICES.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => {
                        handleUpdate(item.id, { classification: c.value });
                        setClassifyDropdownId(null);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 14px',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        fontSize: 14,
                        color: NAVY,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {item.classification === 'unknown' && !item.dateAcquired && (
              <p
                style={{
                  fontFamily: '"Source Sans Pro", -apple-system, system-ui, sans-serif',
                  fontSize: 13,
                  color: NAVY,
                  opacity: 0.6,
                  fontStyle: 'italic',
                  marginTop: 8,
                  marginBottom: 0,
                  lineHeight: 1.4,
                }}
              >
                {isLiab
                  ? 'Add a date to classify this debt, or tap to set manually.'
                  : 'Add a date acquired to classify this item, or tap to set manually.'}
              </p>
            )}
            {isEssentials && (
              <p
                style={{
                  fontSize: 12,
                  color: NAVY,
                  opacity: 0.7,
                  marginTop: 8,
                  marginBottom: 0,
                  lineHeight: 1.4,
                }}
              >
                Not sure if this is marital or separate property? Full Access explains
                the rules and helps you classify each asset.{' '}
                <a
                  href="/upgrade"
                  style={{ color: NAVY, fontWeight: 600, textDecoration: 'underline' }}
                >
                  Unlock with Full Access →
                </a>
              </p>
            )}
          </Field>

          <Field label="Notes">
            <TextInput
              value={item.notes || ''}
              onCommit={(v) => handleUpdate(item.id, { notes: v })}
              multiline
            />
          </Field>
        </div>

        {/* Appreciation warning (Navigator+) */}
        {showAppreciation && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 14px',
              background: `${AMBER}26`,
              borderLeft: `3px solid ${AMBER}`,
              borderRadius: 4,
              fontSize: 13,
              color: NAVY,
              lineHeight: 1.5,
            }}
          >
            Even when an asset stays in your name alone, the increase in value during the
            marriage may be considered marital property in some states. The original value is
            separate; the growth is the question.
          </div>
        )}

        {/* Commingling prompts (Navigator+) */}
        {isNavigator && item.classification === 'commingled' && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 14px',
              background: `${AMBER}26`,
              borderLeft: `3px solid ${AMBER}`,
              borderRadius: 4,
              fontSize: 13,
              color: NAVY,
              lineHeight: 1.5,
            }}
          >
            {getCommingledPrompt(item)}
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setExpandedItemId(null)}
            style={{
              background: GOLD,
              border: 'none',
              color: NAVY,
              padding: '8px 20px',
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Done
          </button>
        </div>
        </>
        )}
      </div>
    );
  }

  function renderDivisionSummary() {
    const s = adjustedSummary;
    const hasAllocated = s.clientNetEstate !== 0 || s.spouseNetEstate !== 0;
    const clientPctDisplay = hasAllocated ? `${Math.round(s.clientPercentage)}%` : '—';
    const spousePctDisplay = hasAllocated ? `${Math.round(s.spousePercentage)}%` : '—';

    // Mobile card for a category row (label + 4 value pairs)
    const renderMobileCategoryCard = (label, totalVal, clientVal, spouseVal, unallocatedVal, isLiab, isEmphasis) => {
      const fmt = isLiab ? formatLiabilityCurrency : formatCurrency;
      return (
        <div
          key={label}
          style={{
            background: isEmphasis ? `${NAVY}0F` : `${NAVY}05`,
            borderRadius: 6,
            padding: '12px 14px',
            border: `1px solid ${NAVY}1A`,
          }}
        >
          <div
            style={{
              fontSize: isEmphasis ? 15 : 14,
              fontWeight: isEmphasis ? 700 : 600,
              color: NAVY,
              marginBottom: 8,
              fontFamily: isEmphasis
                ? '"Playfair Display", Georgia, serif'
                : 'inherit',
            }}
          >
            {label}
          </div>
          <dl
            style={{
              margin: 0,
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              rowGap: 4,
              columnGap: 12,
              fontSize: 13,
            }}
          >
            <dt style={{ opacity: 0.65 }}>Total</dt>
            <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>{fmt(totalVal)}</dd>
            <dt style={{ opacity: 0.65 }}>Client</dt>
            <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>{fmt(clientVal)}</dd>
            <dt style={{ opacity: 0.65 }}>Spouse</dt>
            <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>{fmt(spouseVal)}</dd>
            <dt style={{ opacity: 0.65 }}>Unallocated</dt>
            <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>{fmt(unallocatedVal)}</dd>
          </dl>
        </div>
      );
    };

    return (
      <div>
        {/* Mobile (<640px): stacked cards */}
        <div
          className="sm:hidden flex flex-col gap-3"
          role="group"
          aria-label="Pre-tax division summary"
        >
          {SUMMARY_ASSET_ROWS.map(({ key, label }) => {
            const t = categoryTotals[key] || { total: 0, client: 0, spouse: 0, unallocated: 0 };
            return renderMobileCategoryCard(label, t.total, t.client, t.spouse, t.unallocated, false, false);
          })}
          {renderMobileCategoryCard(
            'Subtotal Assets',
            s.totalAssets,
            s.clientAssets,
            s.spouseAssets,
            s.unallocatedAssets,
            false,
            true
          )}
          {SUMMARY_LIABILITY_ROWS.map(({ key, label }) => {
            const t = categoryTotals[key] || { total: 0, client: 0, spouse: 0, unallocated: 0 };
            return renderMobileCategoryCard(label, t.total, t.client, t.spouse, t.unallocated, true, false);
          })}
          {renderMobileCategoryCard(
            'Subtotal Liabilities',
            s.totalLiabilities,
            s.clientLiabilities,
            s.spouseLiabilities,
            s.unallocatedLiabilities,
            true,
            true
          )}
          {renderMobileCategoryCard(
            'Net Pre-Tax Estate',
            s.netMaritalEstate,
            s.clientNetEstate,
            s.spouseNetEstate,
            (s.unallocatedAssets || 0) - (s.unallocatedLiabilities || 0),
            false,
            true
          )}
          <div
            style={{
              padding: '10px 14px',
              background: `${NAVY}05`,
              borderRadius: 6,
              border: `1px solid ${NAVY}1A`,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              fontSize: 13,
              color: NAVY,
            }}
          >
            <span style={{ opacity: 0.7 }}>Percentage (of allocated)</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              Client {clientPctDisplay} · Spouse {spousePctDisplay}
            </span>
          </div>
        </div>

        {/* Tablet/desktop (≥640px): full table. Sticky first column kicks in when overflow occurs. */}
        <div className="hidden sm:block overflow-x-auto">
        <table
          className="sm:min-w-[560px] [&_tbody_tr>td:first-child]:sticky [&_tbody_tr>td:first-child]:left-0 [&_tbody_tr>td:first-child]:bg-white [&_tbody_tr>td:first-child]:z-[1] [&_thead_tr>th:first-child]:sticky [&_thead_tr>th:first-child]:left-0 [&_thead_tr>th:first-child]:bg-white [&_thead_tr>th:first-child]:z-[1]"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 14,
            color: NAVY,
          }}
        >
          <caption
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
            }}
          >
            Pre-tax division summary of your marital estate.
          </caption>
          <thead>
            <tr style={{ borderBottom: `2px solid ${NAVY}33` }}>
              <th style={summaryThStyle}>Category</th>
              <th style={{ ...summaryThStyle, textAlign: 'right' }}>Total Value</th>
              <th style={{ ...summaryThStyle, textAlign: 'right' }}>Client's Value</th>
              <th style={{ ...summaryThStyle, textAlign: 'right' }}>Spouse's Value</th>
              <th style={{ ...summaryThStyle, textAlign: 'right' }}>Unallocated</th>
            </tr>
          </thead>
          <tbody>
            {SUMMARY_ASSET_ROWS.map(({ key, label }) => {
              const t = categoryTotals[key] || { total: 0, client: 0, spouse: 0, unallocated: 0 };
              return (
                <tr key={key} style={{ borderBottom: `1px solid ${NAVY}14` }}>
                  <td style={summaryTdStyle}>{label}</td>
                  <td style={summaryTdRightStyle}>{formatCurrency(t.total)}</td>
                  <td style={summaryTdRightStyle}>{formatCurrency(t.client)}</td>
                  <td style={summaryTdRightStyle}>{formatCurrency(t.spouse)}</td>
                  <td style={summaryTdRightStyle}>{formatCurrency(t.unallocated)}</td>
                </tr>
              );
            })}
            <tr
              style={{
                borderTop: `2px solid ${NAVY}33`,
                borderBottom: `2px solid ${NAVY}33`,
                fontWeight: 600,
              }}
            >
              <td style={summaryTdStyle}>Subtotal Assets</td>
              <td style={summaryTdRightStyle}>{formatCurrency(s.totalAssets)}</td>
              <td style={summaryTdRightStyle}>{formatCurrency(s.clientAssets)}</td>
              <td style={summaryTdRightStyle}>{formatCurrency(s.spouseAssets)}</td>
              <td style={summaryTdRightStyle}>{formatCurrency(s.unallocatedAssets)}</td>
            </tr>
            {SUMMARY_LIABILITY_ROWS.map(({ key, label }) => {
              const t = categoryTotals[key] || { total: 0, client: 0, spouse: 0, unallocated: 0 };
              return (
                <tr key={key} style={{ borderBottom: `1px solid ${NAVY}14` }}>
                  <td style={summaryTdStyle}>{label}</td>
                  <td style={summaryTdRightStyle}>{formatLiabilityCurrency(t.total)}</td>
                  <td style={summaryTdRightStyle}>{formatLiabilityCurrency(t.client)}</td>
                  <td style={summaryTdRightStyle}>{formatLiabilityCurrency(t.spouse)}</td>
                  <td style={summaryTdRightStyle}>{formatLiabilityCurrency(t.unallocated)}</td>
                </tr>
              );
            })}
            <tr
              style={{
                borderTop: `2px solid ${NAVY}33`,
                borderBottom: `2px solid ${NAVY}33`,
                fontWeight: 600,
              }}
            >
              <td style={summaryTdStyle}>Subtotal Liabilities</td>
              <td style={summaryTdRightStyle}>
                {formatLiabilityCurrency(s.totalLiabilities)}
              </td>
              <td style={summaryTdRightStyle}>
                {formatLiabilityCurrency(s.clientLiabilities)}
              </td>
              <td style={summaryTdRightStyle}>
                {formatLiabilityCurrency(s.spouseLiabilities)}
              </td>
              <td style={summaryTdRightStyle}>
                {formatLiabilityCurrency(s.unallocatedLiabilities)}
              </td>
            </tr>
            <tr style={{ fontWeight: 700 }}>
              <td
                style={{
                  ...summaryTdStyle,
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontSize: 16,
                  paddingTop: 14,
                }}
              >
                Net Pre-Tax Estate
              </td>
              <td style={{ ...summaryTdRightStyle, paddingTop: 14 }}>
                {formatCurrency(s.netMaritalEstate)}
              </td>
              <td style={{ ...summaryTdRightStyle, paddingTop: 14 }}>
                {formatCurrency(s.clientNetEstate)}
              </td>
              <td style={{ ...summaryTdRightStyle, paddingTop: 14 }}>
                {formatCurrency(s.spouseNetEstate)}
              </td>
              <td style={{ ...summaryTdRightStyle, paddingTop: 14 }}>
                {formatCurrency(
                  (s.unallocatedAssets || 0) - (s.unallocatedLiabilities || 0)
                )}
              </td>
            </tr>
            <tr>
              <td style={{ ...summaryTdStyle, opacity: 0.7 }}>Percentage (of allocated)</td>
              <td style={{ ...summaryTdRightStyle, opacity: 0.7 }}></td>
              <td style={summaryTdRightStyle}>{clientPctDisplay}</td>
              <td style={summaryTdRightStyle}>{spousePctDisplay}</td>
              <td style={{ ...summaryTdRightStyle, opacity: 0.7 }}></td>
            </tr>
          </tbody>
        </table>
        </div>
        {hasCommingledItems && (
          <p
            style={{
              fontSize: 12,
              color: NAVY,
              opacity: 0.7,
              marginTop: 12,
              marginBottom: 0,
              lineHeight: 1.5,
            }}
          >
            * Items marked "commingled" use a default allocation. A CDFA can determine the
            precise marital and separate portions.
          </p>
        )}
      </div>
    );
  }
}

// ─── Commingling prompt selector ──────────────────────────────────────────────
function getCommingledPrompt(item) {
  if (item.sourceOfPayment === 'mixed') {
    return "When marital and separate funds are mixed together — for example, using salary to pay down a pre-marital mortgage — the asset may be partly marital and partly separate. This is called commingling, and it's one of the most common complications in property division.";
  }
  if (
    (item.sourceOfPayment === 'gift' || item.sourceOfPayment === 'inheritance') &&
    item.titleholder === 'joint'
  ) {
    return 'Gifts and inheritances are generally separate property — but depositing them into a joint account can convert them to marital property. The key question is whether the funds can still be traced.';
  }
  return "When separate property is retitled into joint names, many states treat that as a 'presumptive gift' to the marriage — meaning it may become marital property. Your attorney can clarify how your state handles this.";
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontSize: 12,
          color: NAVY,
          opacity: 0.65,
          textTransform: 'uppercase',
          fontWeight: 600,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const fieldInputStyle = {
  padding: '8px 10px',
  fontSize: 14,
  color: NAVY,
  border: `1px solid ${NAVY}33`,
  borderRadius: 4,
  background: WHITE,
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
};

const summaryThStyle = {
  padding: '10px 8px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: NAVY,
  opacity: 0.7,
  textTransform: 'uppercase',
  letterSpacing: 0.3,
};
const summaryTdStyle = {
  padding: '8px',
  fontSize: 14,
  color: NAVY,
};
const summaryTdRightStyle = {
  padding: '8px',
  fontSize: 14,
  color: NAVY,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

// ─── DEF-9: Truncated stub form for unvested equity comp ──────────────────────
// Renders in place of the standard M2 entry form when the vesting/exercise gate
// is set to "Unvested". Submitting creates a blueprint deferredCompStub and
// removes the owning item from m2Store (via the parent's onSave handler) —
// never writes to m2Store.maritalEstateInventory.items[].
function DeferredCompStubForm({ category, initialCompany, initialGrantDate, onSave }) {
  const [company, setCompany] = useState(initialCompany || '');
  const [grantDate, setGrantDate] = useState(initialGrantDate || '');
  const [sharesGranted, setSharesGranted] = useState('');
  const [vestingSchedule, setVestingSchedule] = useState('');
  const [strikePrice, setStrikePrice] = useState('');
  const [errors, setErrors] = useState({});

  const isStockOptions = category === 'stockOptions';

  const handleSave = () => {
    const nextErrors = {};
    if (!company.trim()) nextErrors.company = 'Required.';
    const sharesNum = Number(sharesGranted);
    if (sharesGranted === '' || !Number.isFinite(sharesNum) || sharesNum < 0) {
      nextErrors.sharesGranted = 'Enter 0 or a positive number.';
    }
    let strikeNum = null;
    if (isStockOptions) {
      const stripped = String(strikePrice).replace(/[$,]/g, '').trim();
      strikeNum = Number(stripped);
      if (stripped === '' || !Number.isFinite(strikeNum)) {
        nextErrors.strikePrice = 'Required for stock options.';
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    onSave({
      company: company.trim(),
      grantDate: grantDate || null,
      sharesGranted: sharesNum,
      vestingSchedule: vestingSchedule.trim(),
      strikePrice: isStockOptions ? strikeNum : null,
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
        <Field label="Company">
          <input
            type="text"
            value={company}
            onChange={(e) => {
              setCompany(e.target.value);
              if (errors.company) setErrors((p) => ({ ...p, company: undefined }));
            }}
            aria-invalid={errors.company ? 'true' : undefined}
            style={fieldInputStyle}
          />
          {errors.company && (
            <span style={{ fontSize: 12, color: RED, marginTop: 4 }}>{errors.company}</span>
          )}
        </Field>

        <Field label="Grant date">
          <input
            type="date"
            value={grantDate}
            onChange={(e) => setGrantDate(e.target.value)}
            style={fieldInputStyle}
          />
        </Field>

        <Field label="Shares granted">
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={sharesGranted}
            onChange={(e) => {
              setSharesGranted(e.target.value);
              if (errors.sharesGranted) setErrors((p) => ({ ...p, sharesGranted: undefined }));
            }}
            aria-invalid={errors.sharesGranted ? 'true' : undefined}
            style={fieldInputStyle}
          />
          {errors.sharesGranted && (
            <span style={{ fontSize: 12, color: RED, marginTop: 4 }}>
              {errors.sharesGranted}
            </span>
          )}
        </Field>

        {isStockOptions && (
          <Field label="Strike price">
            <input
              type="text"
              inputMode="decimal"
              value={strikePrice}
              onChange={(e) => {
                setStrikePrice(e.target.value);
                if (errors.strikePrice) setErrors((p) => ({ ...p, strikePrice: undefined }));
              }}
              placeholder="$0.00"
              aria-invalid={errors.strikePrice ? 'true' : undefined}
              style={fieldInputStyle}
            />
            {errors.strikePrice && (
              <span style={{ fontSize: 12, color: RED, marginTop: 4 }}>
                {errors.strikePrice}
              </span>
            )}
          </Field>
        )}

        <Field label="Vesting schedule">
          <textarea
            value={vestingSchedule}
            onChange={(e) => setVestingSchedule(e.target.value)}
            rows={2}
            placeholder="e.g., 4-year graded, 25%/year"
            style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 60 }}
          />
        </Field>
      </div>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={handleSave}
          style={{
            background: GOLD,
            border: 'none',
            color: NAVY,
            padding: '8px 20px',
            borderRadius: 4,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Save as deferred-comp placeholder →
        </button>
      </div>
    </>
  );
}

// ─── Text input with commit-on-blur ───────────────────────────────────────────
function TextInput({ value, onCommit, multiline }) {
  const [local, setLocal] = useState(value ?? '');
  const initialRef = useRef(value ?? '');

  // Sync when upstream value changes externally
  useEffect(() => {
    if (value !== initialRef.current) {
      initialRef.current = value ?? '';
      setLocal(value ?? '');
    }
  }, [value]);

  const commit = () => {
    if (local !== initialRef.current) {
      initialRef.current = local;
      onCommit(local);
    }
  };

  if (multiline) {
    return (
      <textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        rows={2}
        style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 60 }}
      />
    );
  }

  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      style={fieldInputStyle}
    />
  );
}

// ─── Currency input with format-on-blur ───────────────────────────────────────
function CurrencyInput({ value, onCommit, allowNull = false }) {
  const emptyDisplay = allowNull ? '' : '0';
  const initial =
    value == null || value === '' ? emptyDisplay : String(value);
  const [local, setLocal] = useState(initial);
  const [focused, setFocused] = useState(false);
  const initialRef = useRef(initial);

  useEffect(() => {
    const next = value == null || value === '' ? emptyDisplay : String(value);
    if (next !== initialRef.current) {
      initialRef.current = next;
      setLocal(next);
    }
  }, [value, emptyDisplay]);

  const handleBlur = () => {
    setFocused(false);
    const stripped = local.replace(/[$,]/g, '').trim();
    if (stripped === '') {
      initialRef.current = emptyDisplay;
      setLocal(emptyDisplay);
      onCommit(allowNull ? null : 0);
      return;
    }
    const num = Number(stripped);
    if (!Number.isFinite(num)) {
      setLocal(initialRef.current);
      return;
    }
    const nextStr = String(num);
    initialRef.current = nextStr;
    setLocal(nextStr);
    onCommit(num);
  };

  const display = focused
    ? local
    : local === '' || local == null
    ? ''
    : (() => {
        const n = Number(local);
        return Number.isFinite(n) ? '$' + Math.round(n).toLocaleString('en-US') : local;
      })();

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onFocus={() => setFocused(true)}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
      placeholder={allowNull ? 'Optional' : '$0'}
      style={fieldInputStyle}
    />
  );
}
