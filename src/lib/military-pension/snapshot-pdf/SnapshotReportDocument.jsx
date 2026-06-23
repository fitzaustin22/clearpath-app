// src/lib/military-pension/snapshot-pdf/SnapshotReportDocument.jsx
//
// The five-page "Your Military Pension Snapshot" @react-pdf document. Pure
// presentation: it consumes the view-model from presentation.js and the styles
// from styles.js — no math, no copy decisions here. Pages: (1) navy cover,
// (2) what you told us + your result, (3) present-value range, (4) four issues
// as questions, (5) checklist + CTA + disclaimer.
import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { makeSnapshotStyles, flagTone } from './styles';

const h = React.createElement;
const PAGE = { size: 'LETTER' };

function RunningHeader(s, copy, n) {
  return h(
    View,
    { style: s.runningHeader },
    h(Text, { style: s.headerBrand }, copy.brand),
    h(Text, { style: s.headerLabel }, `${copy.runningLabel} · ${n}`),
  );
}

function SectionHead(s, { eyebrow, title, intro }) {
  return h(
    View,
    null,
    h(Text, { style: s.sectionEyebrow }, eyebrow),
    h(Text, { style: s.sectionTitle }, title),
    intro ? h(Text, { style: s.sectionIntro }, intro) : null,
  );
}

function PageFooter(s, text) {
  return h(View, { style: s.pageFooter }, h(Text, { style: s.pageFooterText }, text));
}

function FlagCallout(s, flag) {
  const tone = flagTone(flag.tone);
  return h(
    View,
    { key: flag.id, style: [s.flagBox, { borderColor: tone.border, backgroundColor: tone.bg }], wrap: false },
    h(View, { style: [s.flagDot, { backgroundColor: tone.dot }] }),
    h(
      View,
      { style: s.flagBody },
      h(Text, { style: s.flagTitle }, flag.title),
      h(Text, { style: s.flagText }, flag.body),
      h(Text, { style: s.flagCite }, flag.cite),
    ),
  );
}

// Render text with a bold lead segment split at `marker` (inclusive in the bold).
function leadStrong(s, full, marker, baseStyle, strongStyle) {
  const idx = full.indexOf(marker);
  if (idx < 0) return h(Text, { style: baseStyle }, full);
  const lead = full.slice(0, idx + marker.length);
  const rest = full.slice(idx + marker.length);
  return h(Text, { style: baseStyle }, h(Text, { style: strongStyle }, lead), rest);
}

export function CoverPage(s, m) {
  const { copy } = m;
  const discRest = m.coverDisclaimer.replace(/^Not legal advice\.\s*/, '');
  return h(
    Page,
    { ...PAGE, style: s.cover },
    h(
      View,
      { style: s.coverBrandRow },
      h(Text, { style: s.coverWordmark }, copy.brand),
      h(Text, { style: s.coverForWomen }, copy.brandEyebrow),
    ),
    h(
      View,
      { style: s.coverTitleBlock },
      h(Text, { style: s.coverEyebrow }, copy.cover.eyebrow),
      h(Text, { style: s.coverTitle }, copy.cover.title.join('\n')),
      h(Text, { style: s.coverSubhead }, copy.cover.subhead),
    ),
    h(
      View,
      { style: s.coverStatPanel },
      h(Text, { style: s.coverStatLabel }, copy.cover.statLabel),
      h(Text, { style: s.coverStatValue }, m.cover.pvRange),
      h(Text, { style: s.coverStatNote }, m.cover.monthlyNote),
    ),
    h(View, { style: s.coverSpacer }),
    h(
      View,
      { style: s.coverFooter },
      h(Text, { style: s.coverFooterDisc }, h(Text, { style: s.coverFooterDiscStrong }, 'Not legal advice. '), discRest),
      h(
        View,
        null,
        h(Text, { style: s.coverFooterDate }, 'Prepared'),
        h(Text, { style: [s.coverFooterDate, s.coverFooterDateStrong] }, m.preparedDate),
      ),
    ),
  );
}

export function RecapResultPage(s, m) {
  const { copy } = m;
  return h(
    Page,
    { ...PAGE, style: s.page },
    RunningHeader(s, copy, 1),
    SectionHead(s, copy.recapSection),
    h(
      View,
      { style: s.recapGrid },
      ...m.recap.map((t, i) =>
        h(
          View,
          { key: i, style: s.recapTile },
          h(
            View,
            { style: s.recapTileInner },
            h(Text, { style: s.recapLabel }, t.label),
            h(Text, { style: s.recapValue }, t.value),
          ),
        ),
      ),
    ),
    h(
      View,
      { style: s.resultDivider },
      SectionHead(s, copy.resultSection),
      h(
        View,
        { style: s.resultGrid },
        h(
          View,
          { style: s.resultTile },
          h(Text, { style: s.resultLabel }, copy.resultSection.grossLabel),
          h(Text, { style: s.resultValue }, m.result.gross),
          h(Text, { style: s.resultSub }, m.result.grossSub),
        ),
        h(View, { style: s.resultGap }),
        h(
          View,
          { style: [s.resultTile, s.resultTileShare] },
          h(Text, { style: [s.resultLabel, s.resultLabelGold] }, copy.resultSection.shareLabel),
          h(Text, { style: [s.resultValue, s.resultValueGold] }, m.result.share),
          h(Text, { style: s.resultSub }, m.result.shareSub),
        ),
      ),
      h(Text, { style: s.explainer }, m.result.explainer),
    ),
    h(View, { style: s.pageSpacer }),
    PageFooter(s, copy.resultSection.footer),
  );
}

export function PvRangePage(s, m) {
  const { copy } = m;
  return h(
    Page,
    { ...PAGE, style: s.page },
    RunningHeader(s, copy, 2),
    SectionHead(s, copy.pvSection),
    h(
      View,
      { style: s.pvCard },
      h(
        View,
        { style: s.pvRow },
        h(View, { style: s.pvCol }, h(Text, { style: s.pvSideLabel }, copy.pvSection.lowerLabel), h(Text, { style: s.pvSideValue }, m.pv.lower)),
        h(View, { style: s.pvCol }, h(Text, { style: s.pvMidLabel }, copy.pvSection.middleLabel), h(Text, { style: s.pvMidValue }, m.pv.middle)),
        h(View, { style: s.pvCol }, h(Text, { style: s.pvSideLabel }, copy.pvSection.higherLabel), h(Text, { style: s.pvSideValue }, m.pv.higher)),
      ),
    ),
    h(
      View,
      { style: s.whyBlock },
      h(Text, { style: s.whyTitle }, copy.pvSection.whyTitle),
      h(Text, { style: s.whyBody }, copy.pvSection.whyBody),
      h(
        View,
        { style: s.chipRow },
        ...m.pv.methods.map((chip, i) =>
          h(
            View,
            { key: i, style: s.chip },
            h(Text, { style: s.chipName }, chip.name),
            h(Text, { style: s.chipDriver }, chip.driver),
          ),
        ),
      ),
    ),
    leadStrong(s, copy.pvSection.cdfaPrompt, 'Bring this to your CDFA®:', s.cdfaPrompt, s.cdfaPromptStrong),
    h(View, { style: s.pageSpacer }),
    PageFooter(s, copy.pvSection.footer),
  );
}

export function FlagsPage(s, m) {
  const { copy } = m;
  return h(
    Page,
    { ...PAGE, style: s.page },
    RunningHeader(s, copy, 3),
    SectionHead(s, copy.flagsSection),
    h(View, { style: s.flagList }, ...m.flags.map((f) => FlagCallout(s, f))),
    h(View, { style: s.pageSpacer }),
    PageFooter(s, copy.flagsSection.footer),
  );
}

export function ChecklistPage(s, m) {
  const { copy } = m;
  const closeRest = m.disclaimer.replace(/^Educational estimate only[^.]*\.\s*/, '');
  const closeLead = m.disclaimer.slice(0, m.disclaimer.length - closeRest.length);
  return h(
    Page,
    { ...PAGE, style: s.page },
    RunningHeader(s, copy, 4),
    SectionHead(s, copy.checklistSection),
    h(
      View,
      { style: { marginTop: 10 } },
      ...m.checklist.map((item, i) =>
        h(
          View,
          { key: i, style: i === m.checklist.length - 1 ? [s.checkRow, s.checkRowLast] : s.checkRow, wrap: false },
          h(View, { style: s.checkBox }),
          h(Text, { style: s.checkText }, item),
        ),
      ),
    ),
    h(
      View,
      { style: s.ctaBlock, wrap: false },
      h(Text, { style: s.ctaTitle }, m.cta.title),
      h(Text, { style: s.ctaBody }, m.cta.body),
      h(View, { style: s.ctaPill }, h(Text, null, m.cta.pill)),
    ),
    h(Text, { style: s.closingDisclaimer }, h(Text, { style: s.closingDisclaimerStrong }, closeLead), closeRest),
  );
}

/** The full document. Props: { model } from buildSnapshotModel(). */
export function SnapshotReportDocument({ model }) {
  const s = makeSnapshotStyles();
  return h(
    Document,
    { title: 'Your Military Pension Snapshot', author: 'ClearPath Divorce Financial LLC' },
    CoverPage(s, model),
    RecapResultPage(s, model),
    PvRangePage(s, model),
    FlagsPage(s, model),
    ChecklistPage(s, model),
  );
}
