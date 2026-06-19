// src/lib/blueprint/pdf/AttorneyBlueprintDocument.jsx
//
// The ClearPath Attorney Blueprint @react-pdf document. Consumes ONLY the
// intermediate document model (R1) plus thin presentation opts. The redesign
// routes every section through the presentation layer (one hero answer, metric
// cards, proportion bars, grouped entities, method tables) and the component
// kit. A `buildRenderPlan` step produces the exact string set that will render
// — the single source of truth the A4 raw-token harvester reads, so the page
// and the test never drift. Page masters: Cover · Contents · Content ·
// Methodology · Inputs (+ optional Scope notice).
import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { makeStyles } from './tokens';
import { registerBlueprintFonts } from './registerFonts';
import {
  formatValue,
  isNegativeValue,
  humanizeLabel,
  formatAppendixValue,
  SECTION_TITLES,
  sectionNumberLabel,
  jurisdictionLabel,
  preparedLabel,
  headerName,
} from './format';
import { layoutSection, layoutCarrier } from './presentation';
import { HeroBand, MetricCards, ProportionBars, MethodTable, Group, EntityBox, LineItems, TocList } from './components';
import { getEntry } from '../citationRegistry';

const COVER_DISCLAIMER =
  'Prepared with ClearPath software. This document assembles client-provided information and disclosed methodologies. It is not legal, tax, or investment advice and does not substitute for review by retained counsel.';
const FOOTER_DISCLAIMER =
  'Prepared with ClearPath software · Not legal, tax, or investment advice; not a substitute for review by retained counsel.';
const REVIEW_SUFFIX = ' (methodology under review)';
const SCOPE_REASON = 'Not completed in ClearPath as of the preparation date.';
const h = React.createElement;

// ── Render plan (single source of truth for rendered strings) ───────────────

// Per-citation controlling jurisdiction — render-time presentation metadata for
// the footnote sort only. The document model and CITATIONS_BY_PATH are NOT
// touched. Only the DMV state authorities are classified; federal, California,
// and method/national authorities are intentionally absent (they never match a
// matter's jurisdiction, so the sort leaves their relative order untouched).
const CITATION_JURISDICTION = Object.freeze({
  // District of Columbia
  bender_dc_1972: 'DC', // Barbour v. Barbour
  builta_2024: 'DC',
  dc_16_916_01_911: 'DC',
  dc_16_913: 'DC',
  // Virginia
  mosley_va_1994: 'VA',
  va_16_1_278_17_1: 'VA',
  va_20_108_2: 'VA',
  va_20_103: 'VA',
  va_20_107_1: 'VA',
  // Maryland
  deering_md_1981: 'MD',
  boemio_2010: 'MD',
  voishan_1992: 'MD',
  md_fl_12_201_202_204: 'MD',
  md_fl_11_106: 'MD',
});

// Stable, render-time WITHIN-GROUP sort: authorities controlling in the matter's
// jurisdiction lead; everything else keeps its existing relative order. A group
// with no matter-jurisdiction authority is returned unchanged (fallback). The
// lead jurisdiction is driven by the `jurisdiction` param — never hardcoded to
// one state. Returns a NEW array; the underlying block.citations is not mutated.
export function sortCitationsByJurisdiction(keys, jurisdiction) {
  const list = keys || [];
  if (!jurisdiction) return [...list];
  const lead = [];
  const rest = [];
  for (const k of list) {
    if (CITATION_JURISDICTION[k] === jurisdiction) lead.push(k);
    else rest.push(k);
  }
  return [...lead, ...rest];
}

// Enrich a block list into presentation rows (formatted value + raw + flags +
// citation markers) and the per-block-list source list (numbered at first use).
// Within each block's citation group, the matter's jurisdiction leads (render-
// time sort); first-use marker numbering then follows that order.
function enrichRows(blocks, jurisdiction = null) {
  const orderedKeys = [];
  const seen = new Set();
  const rows = blocks.map((b) => {
    const markers = [];
    for (const k of sortCitationsByJurisdiction(b.citations || [], jurisdiction)) {
      if (!seen.has(k)) {
        seen.add(k);
        orderedKeys.push(k);
        markers.push(orderedKeys.length);
      }
    }
    return {
      id: b.id,
      label: humanizeLabel(b.label),
      value: formatValue(b),
      rawValue: b.value,
      valueClass: b.valueClass,
      negative: isNegativeValue(b),
      markers,
    };
  });
  const sources = orderedKeys.map((key, i) => {
    const e = getEntry(key);
    return {
      n: i + 1,
      key,
      shortCite: e.shortCite,
      fullCite: e.fullCite,
      verified: e.verified,
      disclosedMethod: !!e.disclosedMethod,
    };
  });
  return { rows, sources };
}

function sectionNotes(section, { hasRetirementSection = false } = {}) {
  const notes = [];
  const pvaPath = section.blocks.find((b) => b.id === 's6.pva.path');
  if (pvaPath && pvaPath.value === 'cash_balance') {
    notes.push(
      'Account-balance plan: present value equals the account balance and is not rate-sensitive (no ±100 bp discount-rate sensitivity).',
    );
  }
  // #7: flag the §1 budget figures as the client's preliminary self-estimate,
  // superseded by the detailed analysis in §2/§7.
  if (
    section.id === 's1' &&
    section.blocks.some((b) => b.id === 's1.monthlyGap' || b.id === 's1.adjustedMonthlyIncome')
  ) {
    notes.push(
      'The budget figures in this section are the client’s preliminary self-estimate from the initial readiness exercise. The detailed income analysis in Section 2 and expense analysis in Section 7 supersede them.',
    );
  }
  if (section.id === 's2') {
    notes.push(
      'Deductions are as reported on the client’s pay stub (client-provided inputs); ClearPath does not compute withholding. Net take-home pay equals gross income less mandatory deductions; pre-tax retirement deferrals reduce taxable pay but are retained as the client’s savings and are included in take-home.',
    );
  }
  // #9: the balance-sheet totals exclude the actuarial pension value, valued in
  // §6. Cross-reference it ONLY when §6 is actually in the document (otherwise
  // the cross-reference dangles to an omitted section, e.g. the sparse F4b).
  if (section.id === 's3' && hasRetirementSection) {
    notes.push(
      'Net worth and the marital-estate total reflect the asset and liability values entered in the inventory. The defined-benefit pension is carried here at its inventory value (which may be nominal); its actuarial present value and marital portion are determined separately in Section 6 (Retirement Plan Division) and are not included in these totals.',
    );
  }
  if (section.id === 's4') {
    // #2: when the married-filing statuses were suppressed (unmarried at year-
    // end), the note states they are unavailable rather than "shown for
    // comparison"; otherwise the comparison includes them and the note differs.
    const marriedShown = section.blocks.some(
      (b) => b.id === 's4.scenario.mfj.netTax' || b.id === 's4.scenario.mfs.netTax',
    );
    notes.push(
      marriedShown
        ? 'Filing-status eligibility is determined as of December 31 per the disclosed divorce timeline. The projected difference is computed over the eligible statuses.'
        : 'Filing-status eligibility is determined as of December 31 per the disclosed divorce timeline. A client treated as unmarried at year-end cannot use the married-filing statuses (jointly or separately); those statuses are unavailable and are not shown. Only the eligible statuses (single and head of household) appear, and the projected difference is computed over those eligible statuses.',
    );
  }
  if (section.id === 's5') {
    // #12: drop "Module 2" from the provenance note (keep "Marital Estate
    // Inventory"). PR-B rescopes the DISCLAIMER (second sentence): the blanket
    // "does not apply a coverture or time rule" claim is removed — it
    // contradicted §6, which DOES apply coverture/time-rule methods to VALUE the
    // marital portion of retirement/deferred-comp. The no-coverture statement is
    // now scoped to the property split, and §6 is pointed to for valuation
    // coverture. The provenance sentence (and "Marital Estate Inventory") and the
    // A4 §5-disclosure guard's does-not-classify / equitable-distribution /
    // "not a legal" / coverture phrasing are preserved.
    notes.push(
      'The client, spouse, and undecided face-value figures are the sums of individual asset values as the parties designated each item (kept by the client, by the spouse, or undecided) in the Marital Estate Inventory. For this property-division summary, the split reflects the parties’ own designations of who keeps each asset — not a legal or computed determination. ClearPath does not classify property as marital or separate, or determine an equitable-distribution share, here. Coverture and time-rule methods are applied separately in Section 6 and its supplements, solely to value the marital portion of retirement and deferred-compensation assets — not to divide property.',
    );
  }
  // #8: state the basis difference and cross-reference §6 for retirement/pension
  // and the separate debt allocation — ONLY when a tax-adjusted column renders.
  // Describe the tax-adjusted coverage GENERICALLY (the assets itemized in the
  // block) rather than naming asset classes — the block's contents vary by
  // matter (real property only when working capital is cash with no basis), so
  // naming classes can contradict the block and the halving (A5-M F3 Cat 3). The
  // face-value figures include ALL assets and sum to the marital estate; only the
  // tax-adjusted figures are limited to the jointly-titled cost-basis assets
  // (conflating the two was the A5-M F1 Cat 3 inconsistency).
  if (section.id === 's5' && section.blocks.some((b) => b.id.includes('.taxAdjusted.'))) {
    notes.push(
      'Face value reflects all assets at the values the parties designated and sums to the total marital estate. The tax-adjusted figures, by contrast, cover only the jointly-titled assets itemized in the Tax-Adjusted Asset Values block — each party’s tax-adjusted figure is one half of that combined tax-adjusted value (a 50/50 split, net of any mortgage, less estimated tax). Retirement accounts and the defined-benefit pension — including the pension’s marital-portion present value — are valued separately in Section 6 (Retirement Plan Division) and are not reflected in the tax-adjusted figures; marital debts are allocated separately and are not netted here. The two bases are on different footings and are not expected to reconcile line-to-line.',
    );
  }
  // #7: reconcile the income-only §7 gap with the support-aware net position and
  // point to §1 (preliminary self-estimate) and §8 (support) — ONLY when the
  // support-aware line is actually present (the client is the recipient and §8
  // exists), so the note never dangles to an omitted §8.
  if (section.id === 's7' && section.blocks.some((b) => b.id === 's7.supportAwareNetPosition')) {
    notes.push(
      'The projected surplus/shortfall above is income-only and excludes support. The support-aware net monthly position adds the estimated monthly support from Section 8 (received by the client) and supersedes the preliminary self-estimated budget gap reported in Section 1.',
    );
  }
  if (section.id === 's8') {
    notes.push(
      'Spousal support is the AAML benchmark (Appendix A). Child support is the basic obligation — read from the published guideline schedule at combined income, or, above the schedule cap, the statutory top-of-schedule amount — apportioned to the obligor by the obligor’s share of alimony-first-adjusted combined income (child support = basic obligation × obligor income share). These are disclosed-methodology estimates, not a court order.',
    );
  }
  // #4: legend for the reworded offer-position status.
  if (section.id === 's11') {
    notes.push(
      '“Not addressed in the offer” means the settlement offer does not speak to that priority one way or the other.',
    );
  }
  return notes;
}

function sectionPlan(section, { hasRetirementSection = false, jurisdiction = null } = {}) {
  const { rows, sources } = enrichRows(section.blocks, jurisdiction);
  return {
    id: section.id,
    number: sectionNumberLabel(section.id),
    title: SECTION_TITLES[section.id] ?? section.id,
    layout: layoutSection(section.id, rows),
    notes: sectionNotes(section, { hasRetirementSection }),
    sources,
  };
}

function carrierNotes(name) {
  const notes = [];
  // #19: Hug and Nelson are alternative time-rule methods shown side by side;
  // disclose that the choice is jurisdiction/court-dependent and ClearPath does
  // not select one as primary.
  if (name === 'deferredCompStubs') {
    notes.push(
      'Hug and Nelson are alternative time-rule methods for allocating the marital portion of an equity award; both are shown because the applicable method is jurisdiction- and court-dependent. ClearPath presents both rather than selecting one as primary.',
    );
  }
  // #21: the tax-adjusted block covers only cost-basis assets, so a §3 category
  // total (face value) can exceed the amount shown here (cash has no cost basis
  // or built-in gain and is not tax-adjusted).
  if (name === 'costBasisEntries') {
    notes.push(
      'This block tax-adjusts only assets that carry a cost basis (for example, appreciated brokerage holdings and real property). Cash accounts have no cost basis or built-in gain and are not tax-adjusted here; they appear at face value in Section 3 (Asset Inventory), which is why a category total in Section 3 can exceed the amount shown in this block.',
    );
  }
  return notes;
}

function carrierPlan(name, blocks, jurisdiction = null) {
  if (!blocks || blocks.length === 0) return null;
  const { rows, sources } = enrichRows(blocks, jurisdiction);
  const layout = layoutCarrier(name, rows);
  return { name, number: layout.number, title: layout.title, layout, notes: carrierNotes(name), sources };
}

export function buildRenderPlan(model, opts = {}) {
  const clientName = opts.clientName ?? null;
  const documentId = model.documentId ?? 'CP-BP-0000-0000';

  const includedSections = model.sections.filter((s) => s.included);
  const omitted = model.scopeDisclosure?.omittedSections ?? [];

  const cover = {
    wordmark: 'ClearPath',
    title: 'ClearPath Financial Blueprint',
    edition: 'Attorney Edition',
    matter: [
      { label: 'Prepared for', value: clientName || '—' },
      { label: 'Jurisdiction', value: jurisdictionLabel(model.jurisdiction) },
      { label: 'Prepared', value: preparedLabel(opts.preparedDate) || '—' },
      { label: 'Document ID', value: documentId },
    ],
    disclaimerLabel: 'Not legal advice',
    disclaimer: COVER_DISCLAIMER,
  };

  const scope =
    omitted.length > 0
      ? {
          eyebrow: 'Scope of this document',
          title: 'Sections Not Included',
          intro:
            'This Blueprint contains the sections the client completed in ClearPath as of the preparation date. The sections listed below are excluded in their entirety. Section numbering is preserved throughout, so cross-references and citations to included sections remain stable.',
          items: omitted.map((id) => ({
            name: `${sectionNumberLabel(id)} — ${SECTION_TITLES[id] ?? id}`,
            reason: SCOPE_REASON,
          })),
          close:
            'Any omitted section may be completed and issued as a supplement; a supplemented Blueprint carries a new document ID and preparation date.',
        }
      : null;

  const hasRetirementSection = includedSections.some((s) => s.id === 's6');
  const content = {
    headerLeft: `${headerName(clientName)} — Financial Blueprint`,
    sections: includedSections.map((s) =>
      sectionPlan(s, { hasRetirementSection, jurisdiction: model.jurisdiction }),
    ),
    carriers: ['deferredCompStubs', 'costBasisEntries', 'qdroBlueprint']
      .map((name) => carrierPlan(name, model.carriers?.[name], model.jurisdiction))
      .filter(Boolean),
  };

  const methodologyEntryCount = (model.appendices?.methodology?.entries ?? []).length;
  const methodology = {
    eyebrow: 'Appendix A',
    title: 'Methodologies and Authorities',
    intro:
      methodologyEntryCount > 0
        ? 'The authorities supporting the figures in this blueprint are drawn from a maintained citation registry. Statutory and case authorities are verified against their primary sources. Where a calculation relies on a professional methodology rather than a controlling legal authority, it is identified as ClearPath’s disclosed implementation, with its published source credited.'
        : 'This document cites no external methodology authorities. Its figures are arithmetic sums of client-entered values and ClearPath’s structured readiness self-assessment (scale disclosed in Section 1). The rounding contract and provenance below apply.',
    entries: (model.appendices?.methodology?.entries ?? []).map((e) => ({
      name: e.shortCite,
      description: e.description || null,
      cite: e.fullCite,
      verified: e.verified,
      disclosedMethod: !!e.disclosedMethod,
    })),
    roundingLabel: 'Rounding and precision',
    rounding: model.appendices?.methodology?.roundingContractDisclosure?.summary ?? '',
    provenance: model.appendices?.provenance?.methodologyAttribution?.text ?? '',
  };

  // Group appendix entries by their label prefix (before " — ") so a repeated
  // prefix (Pension input (…) ×11, Deferred comp grant 1 input (…) ×9) collapses
  // into one named box with bare field rows, instead of repeating the prefix on
  // every line (R5). A prefix with a single entry stays an inline row.
  const rawEntries = (model.appendices?.inputsAndAssumptions?.entries ?? []).filter(
    (e) => e && e.value != null && typeof e.value !== 'object',
  );
  const igMap = new Map();
  const igOrder = [];
  let standaloneCounter = 0;
  for (const e of rawEntries) {
    const full = humanizeLabel(e.label);
    const idx = full.indexOf(' — ');
    const header = idx > 0 ? full.slice(0, idx) : null;
    const rowLabel = idx > 0 ? full.slice(idx + 3) : full;
    const key = header ?? `__standalone__${standaloneCounter++}`;
    if (!igMap.has(key)) {
      igMap.set(key, { header, rows: [] });
      igOrder.push(key);
    }
    igMap.get(key).rows.push({ label: rowLabel, value: formatAppendixValue(e.value, e.format) });
  }
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const inputItems = [];
  for (const k of igOrder) {
    const g = igMap.get(k);
    // In a box the field label is a bare suffix → capitalize it so it reads as a
    // proper row label, not a lowercase serialized key (R1).
    if (g.header && g.rows.length >= 2) inputItems.push({ box: true, header: g.header, rows: g.rows.map((r) => ({ label: cap(r.label), value: r.value })) });
    else for (const r of g.rows) inputItems.push({ box: false, label: g.header ? `${g.header} — ${r.label}` : r.label, value: r.value });
  }
  const inputs = {
    eyebrow: 'Appendix B',
    title: 'Inputs and Assumptions',
    intro:
      'The inputs and assumptions below are disclosed so a competent reviewer can reproduce each figure from this document alone.',
    items: inputItems,
    assumptions: (model.appendices?.inputsAndAssumptions?.phase2Placeholders ?? []).map((p) => p.label),
  };
  const hasInputs = inputs.items.length > 0 || inputs.assumptions.length > 0;

  // Table of contents — sections, numbered supplements, and appendices, in
  // document order. `key` matches the per-heading page-capture key so the
  // two-pass render can stamp accurate page numbers.
  const toc = [];
  if (scope) toc.push({ key: 'scope', label: 'Sections Not Included' });
  for (const s of content.sections) toc.push({ key: s.number, label: `${s.number} · ${s.title}` });
  for (const cb of content.carriers) toc.push({ key: cb.title, label: `${cb.number} · ${cb.title}`, supplement: true });
  toc.push({ key: 'Appendix A', label: 'Appendix A · Methodologies and Authorities' });
  if (hasInputs) toc.push({ key: 'Appendix B', label: 'Appendix B · Inputs and Assumptions' });

  return {
    documentId,
    cover,
    scope,
    content,
    methodology,
    inputs,
    hasInputs,
    toc,
    footer: { disclaimer: FOOTER_DISCLAIMER, documentId },
  };
}

/** Every string the renderer will place on the page — for the A4 raw-token harness. */
export function collectRenderableStrings(plan) {
  const out = [];
  const push = (s) => {
    if (s != null && String(s).length > 0) out.push(String(s));
  };
  const harvestMethodTable = (mt) => {
    if (!mt) return;
    for (const c of mt.columns) push(c);
    for (const r of mt.rows) {
      push(r.label);
      for (const cell of r.cells) push(cell);
    }
  };
  const harvestRows = (rows) => {
    for (const r of rows || []) {
      push(r.label);
      push(r.value);
    }
  };
  const harvestLayout = (layout) => {
    if (!layout) return;
    if (layout.hero) {
      push(layout.hero.label);
      push(layout.hero.value);
      push(layout.hero.subtitle);
    }
    harvestRows(layout.cards);
    for (const b of layout.bars || []) {
      push(b.label);
      push(b.value);
      push(`${Number(b.pct).toFixed(2)}%`);
    }
    for (const g of layout.groups || []) {
      push(g.header);
      harvestRows(g.rows);
      harvestMethodTable(g.methodTable);
    }
    for (const mt of layout.methodTables || []) harvestMethodTable(mt);
    harvestRows(layout.lineItems);
    for (const e of layout.entities || []) {
      push(e.header);
      harvestRows(e.rows);
      harvestMethodTable(e.methodTable);
    }
    harvestRows(layout.rows);
  };

  const c = plan.cover;
  push(c.wordmark);
  push(c.title);
  push(c.edition);
  push(c.disclaimerLabel);
  push(c.disclaimer);
  for (const m of c.matter) {
    push(m.label);
    push(m.value);
  }
  for (const it of plan.toc) push(it.label);
  if (plan.scope) {
    push(plan.scope.eyebrow);
    push(plan.scope.title);
    push(plan.scope.intro);
    push(plan.scope.close);
    for (const it of plan.scope.items) {
      push(it.name);
      push(it.reason);
    }
  }
  push(plan.content.headerLeft);
  for (const s of plan.content.sections) {
    push(s.number);
    push(s.title);
    harvestLayout(s.layout);
    for (const n of s.notes || []) push(n);
    for (const src of s.sources) {
      push(src.shortCite);
      push(src.fullCite);
    }
  }
  for (const cb of plan.content.carriers) {
    push(cb.number);
    push(cb.title);
    harvestLayout(cb.layout);
    for (const n of cb.notes || []) push(n);
    for (const src of cb.sources) {
      push(src.shortCite);
      push(src.fullCite);
    }
  }
  push(plan.methodology.eyebrow);
  push(plan.methodology.title);
  push(plan.methodology.intro);
  push(plan.methodology.roundingLabel);
  push(plan.methodology.rounding);
  push(plan.methodology.provenance);
  for (const e of plan.methodology.entries) {
    push(e.name);
    push(e.description);
    push(e.cite);
  }
  push(plan.inputs.eyebrow);
  push(plan.inputs.title);
  push(plan.inputs.intro);
  for (const it of plan.inputs.items) {
    if (it.box) {
      push(it.header);
      for (const r of it.rows) {
        push(r.label);
        push(r.value);
      }
    } else {
      push(it.label);
      push(it.value);
    }
  }
  for (const a of plan.inputs.assumptions) push(a);
  push(plan.footer.disclaimer);
  push(plan.footer.documentId);
  return out;
}

// ── React-PDF view helpers ──────────────────────────────────────────────────

function RunningHeader({ styles, left }) {
  return h(
    View,
    { style: styles.runningHeader, fixed: true },
    h(Text, { style: styles.runningHeaderText }, left),
    h(Text, {
      style: styles.runningHeaderText,
      render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`,
    }),
  );
}

function PageFooter({ styles, documentId }) {
  return h(
    View,
    { style: styles.footer, fixed: true },
    h(Text, { style: styles.footerText }, FOOTER_DISCLAIMER),
    h(Text, { style: styles.footerId }, documentId),
  );
}

function CiteText({ styles, cite }) {
  if (cite.includes(' v. ')) {
    const i = cite.indexOf(',');
    if (i > 0) {
      return h(
        React.Fragment,
        null,
        h(Text, { style: styles.sourceItalic }, cite.slice(0, i)),
        h(Text, null, cite.slice(i)),
      );
    }
  }
  return h(Text, null, cite);
}

function SourcesBlock({ styles, sources }) {
  if (!sources || !sources.length) return null;
  return h(
    View,
    { style: styles.sourcesBlock, wrap: false },
    h(View, { style: styles.sourcesRule }),
    ...sources.map((s) =>
      h(
        Text,
        { key: s.key, style: styles.sourceLine },
        h(Text, { style: styles.sourceMarker }, `${s.n}  `),
        h(CiteText, { styles, cite: s.fullCite }),
        s.verified || s.disclosedMethod ? null : h(Text, { style: styles.underReview }, REVIEW_SUFFIX),
      ),
    ),
  );
}

// Invisible page-number capture for the TOC two-pass. This node renders in BOTH
// passes (identical, zero-height) whether or not it captures — so the document's
// layout is structurally identical across passes and a captured page number IS
// the final page number. (Returning null when not capturing would remove these
// nodes from one pass and reflow the content, breaking the page mapping.)
function PageCapture({ tocKey, onCapture }) {
  return h(View, {
    render: ({ pageNumber }) => {
      if (onCapture) onCapture(tocKey, pageNumber);
      return null;
    },
  });
}

function SectionHeading({ styles, eyebrow, title, tocKey, onCapture }) {
  return h(
    View,
    { wrap: false, minPresenceAhead: 110 },
    // The page capture lives INSIDE the no-break heading group so it records the
    // page the heading actually lands on. minPresenceAhead can push this whole
    // group to the next page; a capture placed OUTSIDE would stay behind and
    // report the heading one page early (the §4/§10/§12 TOC drift).
    h(PageCapture, { tocKey, onCapture }),
    eyebrow ? h(Text, { style: styles.sectionEyebrow }, String(eyebrow).toUpperCase()) : null,
    h(Text, { style: styles.sectionTitle }, title),
  );
}

function SectionBlock({ styles, block, onCapture }) {
  const L = block.layout;
  return h(
    View,
    { style: styles.sectionWrap },
    h(SectionHeading, { styles, eyebrow: block.number, title: block.title, tocKey: block.number, onCapture }),
    h(HeroBand, { styles, hero: L.hero }),
    h(MetricCards, { styles, cards: L.cards }),
    h(ProportionBars, { styles, bars: L.bars }),
    ...L.methodTables.map((mt, i) => h(MethodTable, { key: `mt${i}`, styles, table: mt })),
    ...L.groups.map((g, i) => h(Group, { key: `g${i}`, styles, group: g })),
    L.lineItems.length ? h(LineItems, { styles, items: L.lineItems, tone: 'input' }) : null,
    ...(block.notes || []).map((n, i) => h(Text, { key: `n${i}`, style: styles.tableNote }, n)),
    h(SourcesBlock, { styles, sources: block.sources }),
  );
}

function CarrierBlock({ styles, block, onCapture }) {
  const L = block.layout;
  return h(
    View,
    { style: styles.sectionWrap },
    h(SectionHeading, { styles, eyebrow: L.number, title: L.title, tocKey: block.title, onCapture }),
    ...L.entities.map((e, i) => h(EntityBox, { key: `e${i}`, styles, entity: e })),
    L.rows && L.rows.length ? h(LineItems, { styles, items: L.rows }) : null,
    ...(block.notes || []).map((n, i) => h(Text, { key: `n${i}`, style: styles.tableNote }, n)),
    h(SourcesBlock, { styles, sources: block.sources }),
  );
}

function CoverPage({ styles, cover }) {
  return h(
    Page,
    { size: 'LETTER', style: styles.coverPage },
    h(Text, { style: styles.wordmark }, cover.wordmark),
    h(
      View,
      { style: styles.coverTitleBlock },
      h(Text, { style: styles.coverTitle }, cover.title),
      h(View, { style: styles.goldRule }),
      h(Text, { style: styles.coverEdition }, cover.edition.toUpperCase()),
    ),
    h(
      View,
      { style: styles.matterBlock },
      ...cover.matter.map((m) =>
        h(
          View,
          { key: m.label, style: styles.matterRow },
          h(Text, { style: styles.matterLabel }, m.label.toUpperCase()),
          h(Text, { style: styles.matterValue }, m.value),
        ),
      ),
    ),
    h(View, { style: styles.coverSpacer }),
    h(
      View,
      { style: styles.disclaimerBlock },
      h(Text, { style: styles.disclaimerLabel }, cover.disclaimerLabel.toUpperCase()),
      h(Text, { style: styles.disclaimerBody }, cover.disclaimer),
    ),
  );
}

function StandardPage({ styles, headerLeft, documentId, children }) {
  return h(
    Page,
    { size: 'LETTER', style: styles.page },
    h(RunningHeader, { styles, left: headerLeft }),
    h(PageFooter, { styles, documentId }),
    ...children,
  );
}

function TocPage({ styles, headerLeft, documentId, toc, tocPages }) {
  const items = toc.map((it) => ({ ...it, page: tocPages ? tocPages[it.key] : null }));
  return h(StandardPage, { styles, headerLeft, documentId }, [
    h(Text, { key: 'e', style: styles.sectionEyebrow }, 'CONTENTS'),
    h(Text, { key: 't', style: styles.sectionTitle }, 'Table of Contents'),
    h(TocList, { key: 'l', styles, items }),
  ]);
}

export function AttorneyBlueprintDocument({ model, opts = {} }) {
  registerBlueprintFonts();
  const styles = makeStyles(opts.variants);
  const plan = buildRenderPlan(model, opts);
  const headerLeft = plan.content.headerLeft;
  const documentId = plan.documentId;
  const onCapture = opts.capturePage || null; // pass 1 only
  const tocPages = opts.tocPages || null; // pass 2 only

  const pages = [];
  pages.push(h(CoverPage, { key: 'cover', styles, cover: plan.cover }));

  // The Contents page is a permanent part of the document, so it renders on BOTH
  // passes — pass 1 with blank page numbers (tocPages null → TocList prints ''),
  // pass 2 with the captured numbers. Rendering it in both keeps the two passes
  // structurally identical, so a page captured in pass 1 is exactly where the
  // heading prints in pass 2 (no offset, and correct even if the Contents itself
  // spans more than one page).
  pages.push(h(TocPage, { key: 'toc', styles, headerLeft, documentId, toc: plan.toc, tocPages }));

  if (plan.scope) {
    pages.push(
      h(StandardPage, { key: 'scope', styles, headerLeft, documentId }, [
        h(PageCapture, { key: 'cap', tocKey: 'scope', onCapture }),
        h(Text, { key: 'e', style: styles.sectionEyebrow }, plan.scope.eyebrow.toUpperCase()),
        h(Text, { key: 't', style: styles.sectionTitle }, plan.scope.title),
        h(Text, { key: 'i', style: styles.para }, plan.scope.intro),
        h(
          View,
          { key: 'list', style: { marginTop: 12 } },
          ...plan.scope.items.map((it) =>
            h(
              View,
              { key: it.name, style: styles.scopeItem },
              h(Text, { style: styles.scopeName }, it.name),
              h(Text, { style: styles.scopeReason }, it.reason),
            ),
          ),
        ),
        h(Text, { key: 'c', style: styles.scopeClose }, plan.scope.close),
      ]),
    );
  }

  pages.push(
    h(StandardPage, { key: 'content', styles, headerLeft, documentId }, [
      ...plan.content.sections.map((s) => h(SectionBlock, { key: s.number, styles, block: s, onCapture })),
      ...plan.content.carriers.map((cb) => h(CarrierBlock, { key: cb.title, styles, block: cb, onCapture })),
    ]),
  );

  pages.push(
    h(StandardPage, { key: 'methodology', styles, headerLeft, documentId }, [
      h(PageCapture, { key: 'cap', tocKey: 'Appendix A', onCapture }),
      h(Text, { key: 'e', style: styles.sectionEyebrow }, plan.methodology.eyebrow.toUpperCase()),
      h(Text, { key: 't', style: styles.sectionTitle }, plan.methodology.title),
      h(Text, { key: 'i', style: styles.para }, plan.methodology.intro),
      h(
        View,
        { key: 'methods', style: { marginTop: 12 } },
        ...plan.methodology.entries.map((e, i) =>
          h(
            View,
            { key: `${e.name}-${i}`, style: i === 0 ? [styles.methodRow, styles.methodRowTop] : styles.methodRow, wrap: false },
            h(Text, { style: styles.methodName }, e.name),
            h(
              View,
              { style: styles.methodRight },
              e.description ? h(Text, { style: styles.methodDesc }, e.description) : null,
              h(
                Text,
                { style: styles.methodCite },
                h(CiteText, { styles, cite: e.cite }),
                e.verified || e.disclosedMethod ? null : h(Text, { style: styles.underReview }, REVIEW_SUFFIX),
              ),
            ),
          ),
        ),
      ),
      h(
        View,
        { key: 'rounding', wrap: false },
        h(Text, { style: styles.blockLabel }, plan.methodology.roundingLabel.toUpperCase()),
        h(Text, { style: styles.para }, plan.methodology.rounding),
      ),
      h(
        View,
        { key: 'prov', style: styles.provenanceBlock, wrap: false },
        h(View, { style: styles.provenanceRule }),
        h(Text, { style: styles.provenanceText }, plan.methodology.provenance),
      ),
    ]),
  );

  if (plan.hasInputs) {
    pages.push(
      h(StandardPage, { key: 'inputs', styles, headerLeft, documentId }, [
        h(PageCapture, { key: 'cap', tocKey: 'Appendix B', onCapture }),
        h(Text, { key: 'e', style: styles.sectionEyebrow }, plan.inputs.eyebrow.toUpperCase()),
        h(Text, { key: 't', style: styles.sectionTitle }, plan.inputs.title),
        h(Text, { key: 'i', style: styles.para }, plan.inputs.intro),
        ...plan.inputs.items.map((it, i) =>
          it.box
            ? h(
                View,
                { key: `in${i}`, style: { marginTop: 9 } },
                h(Text, { style: styles.groupHeader }, it.header.toUpperCase()),
                ...it.rows.map((r, j) =>
                  h(
                    View,
                    { key: `r${j}`, style: styles.row },
                    h(Text, { style: styles.rowLabel }, r.label),
                    h(Text, { style: styles.rowValue }, r.value),
                  ),
                ),
              )
            : h(
                View,
                { key: `in${i}`, style: styles.row },
                h(Text, { style: styles.rowLabel }, it.label),
                h(Text, { style: styles.rowValue }, it.value),
              ),
        ),
        plan.inputs.assumptions.length > 0
          ? h(
              View,
              { key: 'assumptions', wrap: false },
              h(Text, { style: styles.blockLabel }, 'DISCLOSED ASSUMPTIONS'),
              ...plan.inputs.assumptions.map((a, i) => h(Text, { key: `a${i}`, style: styles.scopeReason }, `· ${a}`)),
            )
          : null,
      ]),
    );
  }

  return h(Document, { title: `ClearPath Financial Blueprint — ${documentId}`, author: 'ClearPath' }, ...pages);
}

export default AttorneyBlueprintDocument;
