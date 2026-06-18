// src/lib/blueprint/pdf/components.jsx
//
// The @react-pdf component kit for the redesigned Attorney Blueprint. Each
// component takes the shared `styles` object (from makeStyles) plus a plain
// data shape produced by presentation.js — no model/format logic lives here.
// Citation markers always sit on the LABEL in gold with a thin space (R7).
import React from 'react';
import { View, Text } from '@react-pdf/renderer';

const h = React.createElement;
const THIN = ' '; // thin space before a citation marker (never jam a digit)

/** Gold superscript citation markers, thin-spaced — placed on a label. */
export function Markers({ styles, markers, markerStyle }) {
  if (!markers || !markers.length) return null;
  return markers.map((m, i) => h(Text, { key: `mk${i}`, style: markerStyle || styles.citeMarker }, `${THIN}${m}`));
}

/** A label/value row. tone: 'input' (muted) | 'negative' (force negative color). */
export function ValueRow({ styles, row, tone, isLast }) {
  const rowStyle = isLast ? [styles.row, styles.rowClose] : styles.row;
  const labelStyle = tone === 'input' ? [styles.rowLabel, styles.rowLabelMuted] : styles.rowLabel;
  const valueStyle = [styles.rowValue];
  if (tone === 'input') valueStyle.push(styles.rowValueMuted);
  if (tone === 'negative' || row.negative) valueStyle.push(styles.rowValueNegative);
  return h(
    View,
    { style: rowStyle },
    h(Text, { style: labelStyle }, row.label, h(Markers, { styles, markers: row.markers })),
    h(Text, { style: valueStyle }, row.value),
  );
}

/** The one hero answer per section — tint band, gold left-rule, serif value. */
export function HeroBand({ styles, hero }) {
  if (!hero) return null;
  const valStyle = hero.negative ? [styles.heroValue, styles.heroValueNegative] : styles.heroValue;
  return h(
    View,
    { style: styles.heroBand, wrap: false },
    // Citation markers ride the LABEL (gold, thin-spaced), never the big value (R7).
    h(Text, { style: styles.heroLabel }, String(hero.label || '').toUpperCase(), h(Markers, { styles, markers: hero.markers, markerStyle: styles.heroMarker })),
    h(Text, { style: valStyle }, hero.value),
    hero.subtitle ? h(Text, { style: styles.heroSubtitle }, hero.subtitle) : null,
  );
}

/** 1–3 supporting metric cards in a row. */
export function MetricCards({ styles, cards }) {
  if (!cards || !cards.length) return null;
  const children = [];
  cards.forEach((c, i) => {
    if (i > 0) children.push(h(View, { key: `gap${i}`, style: styles.cardGap }));
    children.push(
      h(
        View,
        { key: c.id, style: styles.card },
        h(Text, { style: styles.cardLabel }, String(c.label || '').toUpperCase(), h(Markers, { styles, markers: c.markers })),
        h(
          Text,
          { style: c.negative ? [styles.cardValue, styles.cardValueNegative] : styles.cardValue },
          c.value,
        ),
      ),
    );
  });
  return h(View, { style: styles.cardRow, wrap: false }, ...children);
}

/** Part-of-whole proportion bars (asset mix), largest-first. */
export function ProportionBars({ styles, bars }) {
  if (!bars || !bars.length) return null;
  return h(
    View,
    { style: { marginTop: 3 } },
    ...bars.map((b) =>
      h(
        View,
        { key: b.id, style: styles.barRow, wrap: false },
        h(
          View,
          { style: styles.barTop },
          h(Text, { style: styles.barLabel }, b.label, h(Markers, { styles, markers: b.markers })),
          h(
            View,
            { style: styles.barRight },
            h(Text, { style: styles.barValue }, b.value),
            h(Text, { style: styles.barPct }, `${Number(b.pct).toFixed(2)}%`),
          ),
        ),
        h(View, { style: styles.barTrack }, h(View, { style: [styles.barFill, { width: `${Math.max(1, Math.min(100, b.pct))}%` }] })),
      ),
    ),
  );
}

/** A dual-method table (Hug/Nelson, Current/Projected) — columns labeled once. */
export function MethodTable({ styles, table }) {
  if (!table || !table.rows.length) return null;
  return h(
    View,
    { style: { marginTop: 3 } },
    h(
      View,
      { style: styles.mtHead },
      h(Text, { style: styles.mtHeadLabel }, ''),
      ...table.columns.map((c, i) => h(Text, { key: `col${i}`, style: styles.mtHeadCol }, String(c).toUpperCase())),
    ),
    ...table.rows.map((r, ri) =>
      h(
        View,
        { key: `mr${ri}`, style: styles.mtRow, wrap: false },
        h(Text, { style: styles.mtRowLabel }, r.label),
        ...r.cells.map((cell, ci) => h(Text, { key: `mc${ci}`, style: styles.mtCell }, cell)),
      ),
    ),
  );
}

/** A trade-off row: give ↔ get (font-safe arrow, replaces the NOTDEF ⇄). */
export function TradeOffRow({ styles, value }) {
  return h(View, { style: styles.tradeRow }, h(Text, { style: styles.tradeItem }, value));
}

/** A named group of rows (s5 buckets, s6 sub-plans, liabilities, inputs). */
export function Group({ styles, group }) {
  if (!group || (!group.rows.length && !group.methodTable)) return null;
  const tone = group.tone === 'input' ? 'input' : group.tone === 'negative' ? 'negative' : null;
  const fullWidth = group.display === 'fullWidth';
  return h(
    View,
    { style: { marginBottom: 3 } },
    group.header ? h(Text, { style: styles.groupHeader }, String(group.header).toUpperCase()) : null,
    ...group.rows.map((r, i) =>
      fullWidth
        ? h(TradeOffRow, { key: r.id || i, styles, value: r.value })
        : h(ValueRow, { key: r.id || i, styles, row: r, tone, isLast: i === group.rows.length - 1 && !group.methodTable }),
    ),
    group.methodTable ? h(MethodTable, { styles, table: group.methodTable }) : null,
  );
}

/** A bordered entity box (deferred-comp grant, tax-adjusted asset). */
export function EntityBox({ styles, entity }) {
  return h(
    View,
    { style: styles.entityBox, wrap: false },
    h(Text, { style: styles.entityHeader }, entity.header),
    ...entity.rows.map((r, i) => h(ValueRow, { key: r.id || i, styles, row: r, isLast: i === entity.rows.length - 1 && !entity.methodTable })),
    entity.methodTable ? h(MethodTable, { styles, table: entity.methodTable }) : null,
  );
}

/** A de-emphasized line-item table (raw inputs that feed the math). */
export function LineItems({ styles, items, tone }) {
  if (!items || !items.length) return null;
  return h(
    View,
    { style: { marginTop: 6 } },
    ...items.map((r, i) => h(ValueRow, { key: r.id || i, styles, row: r, tone, isLast: i === items.length - 1 })),
  );
}

/** Table-of-contents rows with dot-leaders and page numbers. */
export function TocList({ styles, items }) {
  return h(
    View,
    { style: { marginTop: 12 } },
    ...items.map((it, i) =>
      h(
        View,
        { key: `toc${i}`, style: styles.tocRow },
        h(Text, { style: it.supplement ? [styles.tocTitle, styles.tocSupplement] : styles.tocTitle }, it.label),
        h(View, { style: styles.tocLeader }),
        h(Text, { style: styles.tocPage }, it.page != null ? String(it.page) : ''),
      ),
    ),
  );
}
