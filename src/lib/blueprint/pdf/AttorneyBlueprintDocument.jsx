// src/lib/blueprint/pdf/AttorneyBlueprintDocument.jsx
//
// The ClearPath Attorney Blueprint @react-pdf document. Consumes ONLY the
// intermediate document model (R1) plus thin presentation opts (client name,
// prepared date, variant config). Four page masters per the design README:
// Cover · Content · Methodology & Provenance · Scope Notice (+ a D-V2-7 Inputs
// & Assumptions appendix). A `buildRenderPlan` step produces the exact string
// set that will render — the single source of truth the A4 raw-token harvester
// reads, so the page and the test never drift.
import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { makeStyles } from './tokens';
import { registerBlueprintFonts } from './registerFonts';
import {
  formatValue,
  humanizeLabel,
  formatAppendixValue,
  SECTION_TITLES,
  sectionNumberLabel,
  CARRIER_TITLES,
  jurisdictionLabel,
  preparedLabel,
  headerName,
} from './format';
import { getEntry } from '../citationRegistry';

// Disclaimer copy extends the README's verbatim base with "or tax" because the
// document carries withholding/tax figures (A5-M Cat 5 requires a not-tax-advice
// disclaimer); flagged as a deviation from the verbatim README copy for review.
const COVER_DISCLAIMER =
  'Prepared with ClearPath software. This document assembles client-provided information and disclosed methodologies. It is not legal, tax, or investment advice and does not substitute for review by retained counsel.';
const FOOTER_DISCLAIMER =
  'Prepared with ClearPath software · Not legal, tax, or investment advice; not a substitute for review by retained counsel.';
const REVIEW_SUFFIX = ' (methodology under review)';
const SCOPE_REASON = 'Not completed in ClearPath as of the preparation date.';
const h = React.createElement;

// ── Render plan (single source of truth for rendered strings) ───────────────

function sectionPlan(section) {
  // Per-section citation numbering: each authority is numbered once, marked at
  // first use, and listed in the section's sources block.
  const orderedKeys = [];
  const seen = new Set();
  const rows = section.blocks.map((b) => {
    const markers = [];
    for (const k of b.citations || []) {
      if (!seen.has(k)) {
        seen.add(k);
        orderedKeys.push(k);
        markers.push(orderedKeys.length); // 1-based; marked at first use only
      }
    }
    return { id: b.id, label: humanizeLabel(b.label), value: formatValue(b), markers };
  });
  const sources = orderedKeys.map((key, i) => {
    const e = getEntry(key);
    return { n: i + 1, key, shortCite: e.shortCite, fullCite: e.fullCite, verified: e.verified };
  });
  // Passthrough directive: a cash-balance pension is account-balance only —
  // never present a degenerate ±100bp pair as analysis.
  const pvaPath = section.blocks.find((b) => b.id === 's6.pva.path');
  const notes = [];
  if (pvaPath && pvaPath.value === 'cash_balance') {
    notes.push(
      'Account-balance plan: present value equals the account balance and is not rate-sensitive (no ±100 bp discount-rate sensitivity).',
    );
  }
  if (section.id === 's5') {
    // Face value and tax-adjusted value are on DIFFERENT bases — face reflects
    // the Module 2 division allocation; tax-adjusted reflects net equity (after
    // any mortgage) less estimated tax, with jointly-titled assets split 50/50.
    // They are not expected to foot column-to-column (A5-M Cat 3 clarification).
    notes.push(
      'Face value reflects the Module 2 division allocation; tax-adjusted value reflects net equity (after any mortgage) less estimated tax, with jointly-titled assets split equally. The two are on different bases and are not expected to reconcile line-to-line.',
    );
  }
  if (section.id === 's2') {
    notes.push(
      'Deductions are as reported on the client’s pay stub (client-provided inputs); ClearPath does not compute withholding. Net take-home pay equals gross income less mandatory deductions; pre-tax retirement deferrals reduce taxable pay but are retained as the client’s savings and are included in take-home.',
    );
  }
  if (section.id === 's4') {
    notes.push(
      'Filing-status eligibility is determined as of December 31 per the disclosed divorce timeline. Married-filing statuses are shown for comparison only and may be unavailable to a client treated as unmarried at year-end; the projected difference is computed over the eligible statuses (single and head of household).',
    );
  }
  return {
    number: sectionNumberLabel(section.id),
    title: SECTION_TITLES[section.id] ?? section.id,
    rows,
    sources,
    notes,
  };
}

function carrierPlan(name, blocks) {
  if (!blocks || blocks.length === 0) return null;
  const orderedKeys = [];
  const seen = new Set();
  const rows = blocks.map((b) => {
    const markers = [];
    for (const k of b.citations || []) {
      if (!seen.has(k)) {
        seen.add(k);
        orderedKeys.push(k);
        markers.push(orderedKeys.length);
      }
    }
    return { id: b.id, label: humanizeLabel(b.label), value: formatValue(b), markers };
  });
  const sources = orderedKeys.map((key, i) => {
    const e = getEntry(key);
    return { n: i + 1, key, shortCite: e.shortCite, fullCite: e.fullCite, verified: e.verified };
  });
  return { title: CARRIER_TITLES[name] ?? name, rows, sources };
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

  const content = {
    headerLeft: `${headerName(clientName)} — Financial Blueprint`,
    sections: includedSections.map(sectionPlan),
    carriers: ['deferredCompStubs', 'costBasisEntries', 'qdroBlueprint']
      .map((name) => carrierPlan(name, model.carriers?.[name]))
      .filter(Boolean),
  };

  const methodologyEntryCount = (model.appendices?.methodology?.entries ?? []).length;
  const methodology = {
    eyebrow: 'Appendix A',
    title: 'Methodologies and Authorities',
    intro:
      methodologyEntryCount > 0
        ? 'Each computed value in this document is produced by one of the methods below, applied as described. An authority annotated “methodology under review” has not yet been independently confirmed against its primary source; that pending-verification status is a disclosure about the citation only and does not change how the disclosed method is applied or computed.'
        : 'This document cites no external methodology authorities. Its figures are arithmetic sums of client-entered values and ClearPath’s structured readiness self-assessment (scale disclosed in Section 1). The rounding contract and provenance below apply.',
    entries: (model.appendices?.methodology?.entries ?? []).map((e) => ({
      name: e.shortCite,
      description: e.description || null,
      cite: e.fullCite,
      verified: e.verified,
    })),
    roundingLabel: 'Rounding and precision',
    rounding: model.appendices?.methodology?.roundingContractDisclosure?.summary ?? '',
    provenance: model.appendices?.provenance?.methodologyAttribution?.text ?? '',
  };

  const inputs = {
    eyebrow: 'Appendix B',
    title: 'Inputs and Assumptions',
    intro:
      'The inputs and assumptions below are disclosed so a competent reviewer can reproduce each figure from this document alone.',
    entries: (model.appendices?.inputsAndAssumptions?.entries ?? [])
      .filter((e) => e && e.value != null && typeof e.value !== 'object')
      .map((e) => ({ label: humanizeLabel(e.label), value: formatAppendixValue(e.value) })),
    assumptions: (model.appendices?.inputsAndAssumptions?.phase2Placeholders ?? []).map((p) => p.label),
  };

  return {
    documentId,
    cover,
    scope,
    content,
    methodology,
    inputs,
    footer: { disclaimer: FOOTER_DISCLAIMER, documentId },
  };
}

/** Every string the renderer will place on the page — for the A4 raw-token harness. */
export function collectRenderableStrings(plan) {
  const out = [];
  const push = (s) => {
    if (s != null && String(s).length > 0) out.push(String(s));
  };
  const c = plan.cover;
  push(c.wordmark); push(c.title); push(c.edition); push(c.disclaimerLabel); push(c.disclaimer);
  for (const m of c.matter) { push(m.label); push(m.value); }
  if (plan.scope) {
    push(plan.scope.eyebrow); push(plan.scope.title); push(plan.scope.intro); push(plan.scope.close);
    for (const it of plan.scope.items) { push(it.name); push(it.reason); }
  }
  push(plan.content.headerLeft);
  const harvestRowsAndSources = (block) => {
    push(block.title);
    if (block.number) push(block.number);
    for (const r of block.rows) { push(r.label); push(r.value); }
    for (const n of block.notes || []) push(n);
    for (const s of block.sources) { push(s.shortCite); push(s.fullCite); }
  };
  for (const s of plan.content.sections) harvestRowsAndSources(s);
  for (const carrier of plan.content.carriers) harvestRowsAndSources(carrier);
  push(plan.methodology.eyebrow); push(plan.methodology.title); push(plan.methodology.intro);
  push(plan.methodology.roundingLabel); push(plan.methodology.rounding); push(plan.methodology.provenance);
  for (const e of plan.methodology.entries) { push(e.name); push(e.description); push(e.cite); }
  push(plan.inputs.eyebrow); push(plan.inputs.title); push(plan.inputs.intro);
  for (const e of plan.inputs.entries) { push(e.label); push(e.value); }
  for (const a of plan.inputs.assumptions) push(a);
  push(plan.footer.disclaimer); push(plan.footer.documentId);
  return out;
}

// ── React-PDF view helpers ──────────────────────────────────────────────────

function RunningHeader({ styles, left }) {
  return h(
    View,
    { style: styles.runningHeader, fixed: true },
    h(Text, { style: styles.runningHeaderText }, left),
    h(
      Text,
      { style: styles.runningHeaderText, render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}` },
    ),
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
  // Case names italic, reporter roman: split at the first comma after " v. ".
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

function ValueRow({ styles, row, isLast }) {
  return h(
    View,
    { style: isLast ? [styles.row, styles.rowClose] : styles.row },
    h(Text, { style: styles.rowLabel }, row.label),
    h(
      Text,
      { style: styles.rowValue },
      row.value,
      ...row.markers.map((m, i) => h(Text, { key: `m${i}`, style: styles.citeMarker }, ` ${m}`)),
    ),
  );
}

function SourcesBlock({ styles, sources }) {
  if (!sources.length) return null;
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
        s.verified ? null : h(Text, { style: styles.underReview }, REVIEW_SUFFIX),
      ),
    ),
  );
}

function ContentBlock({ styles, block }) {
  const rows = block.rows;
  return h(
    View,
    { style: styles.sectionWrap },
    // Heading group glued to the first row + caption so a section/subsection
    // heading never renders as the last element on a page (A4 orphan rule);
    // minPresenceAhead pulls the heading to the next page if little space remains.
    h(
      View,
      { wrap: false, minPresenceAhead: 90 },
      block.number ? h(Text, { style: styles.sectionEyebrow }, block.number.toUpperCase()) : null,
      h(Text, { style: styles.sectionTitle }, block.title),
      rows.length > 0 ? h(ValueRow, { styles, row: rows[0], isLast: rows.length === 1 }) : null,
    ),
    ...rows.slice(1).map((r, i) =>
      h(ValueRow, { key: r.id, styles, row: r, isLast: i === rows.length - 2 }),
    ),
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

export function AttorneyBlueprintDocument({ model, opts = {} }) {
  registerBlueprintFonts();
  const styles = makeStyles(opts.variants);
  const plan = buildRenderPlan(model, opts);
  const headerLeft = plan.content.headerLeft;
  const documentId = plan.documentId;

  const pages = [];
  pages.push(h(CoverPage, { key: 'cover', styles, cover: plan.cover }));

  if (plan.scope) {
    pages.push(
      h(StandardPage, { key: 'scope', styles, headerLeft, documentId }, [
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
      ...plan.content.sections.map((s) => h(ContentBlock, { key: s.number, styles, block: s })),
      ...plan.content.carriers.map((cb) => h(ContentBlock, { key: cb.title, styles, block: cb })),
    ]),
  );

  pages.push(
    h(StandardPage, { key: 'methodology', styles, headerLeft, documentId }, [
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
                e.verified ? null : h(Text, { style: styles.underReview }, REVIEW_SUFFIX),
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

  if (plan.inputs.entries.length > 0 || plan.inputs.assumptions.length > 0) {
    pages.push(
      h(StandardPage, { key: 'inputs', styles, headerLeft, documentId }, [
        h(Text, { key: 'e', style: styles.sectionEyebrow }, plan.inputs.eyebrow.toUpperCase()),
        h(Text, { key: 't', style: styles.sectionTitle }, plan.inputs.title),
        h(Text, { key: 'i', style: styles.para }, plan.inputs.intro),
        ...plan.inputs.entries.map((e, i) =>
          h(
            View,
            { key: `in${i}`, style: i === 0 ? [styles.row, styles.methodRowTop] : styles.row },
            h(Text, { style: styles.rowLabel }, e.label),
            h(Text, { style: styles.rowValue }, e.value),
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
