// src/lib/blueprint/pdf/presentation.js
//
// Presentation layer for the Attorney Blueprint. Pure: consumes the rows the
// renderer already builds from the document model (each row carries the
// formatted value + raw value + valueClass + negative flag + citation markers)
// and produces the visual LAYOUT — one hero answer per section, supporting
// metric cards, proportion bars, grouped entity boxes, and Hug/Nelson-style
// method tables. NO numbers change here; this only chooses how rows are
// arranged (R4/R5/R6). The renderer maps this layout onto the @react-pdf kit.
//
// Row shape (from buildRenderPlan):
//   { id, label, value(formatted string), rawValue, valueClass, negative, markers }

import { CARRIER_TITLES } from './format';

// ── helpers ──────────────────────────────────────────────────────────────────
const pick = (rows, id) => rows.find((r) => r.id === id) || null;
const matchRows = (rows, re) => rows.filter((r) => re.test(r.id));
const titleCase = (s) => {
  const t = String(s).trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
};
const spaceCamel = (s) => String(s).replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
// The portion of a label after an em dash ("Assets — Real estate" → "Real estate").
const tail = (label) => {
  const i = String(label).indexOf('—');
  return i >= 0 ? String(label).slice(i + 1).trim() : String(label);
};
// Strip a trailing " — Hug time rule" method qualifier from a method-table row label.
const methodRowLabel = (label) => {
  const i = String(label).lastIndexOf(' — ');
  return i >= 0 ? String(label).slice(0, i) : String(label);
};
const cardOf = (r) => ({ id: r.id, label: r.label, value: r.value, negative: r.negative, markers: r.markers });
const num = (r) => (Number.isFinite(Number(r.rawValue)) ? Number(r.rawValue) : 0);
// Render a reduction (liability/subtrahend) in accounting style: ($X) + the
// negative flag (which drives the negative color), even though it's stored +.
const asReduction = (r) => ({
  ...cardOf(r),
  value: typeof r.value === 'string' && r.value.startsWith('(') ? r.value : `(${r.value})`,
  negative: true,
});

// ── hero / cards / bars ───────────────────────────────────────────────────────
function resolveHero(config, rows, consumed) {
  if (config.heroSynthetic) {
    const h = config.heroSynthetic(rows, pick);
    return h ? { id: '__synthetic__', markers: [], negative: false, ...h } : null;
  }
  const ids = Array.isArray(config.hero) ? config.hero : config.hero ? [config.hero] : [];
  for (const id of ids) {
    const r = pick(rows, id);
    if (r) {
      consumed.add(r.id);
      const hero = { id: r.id, label: r.label, value: r.value, negative: r.negative, markers: r.markers };
      if (config.heroLabel) hero.label = config.heroLabel;
      if (config.heroSubtitle) hero.subtitle = config.heroSubtitle(rows, pick);
      return hero;
    }
  }
  if (rows.length) {
    const r = rows[0];
    consumed.add(r.id);
    return { id: r.id, label: r.label, value: r.value, negative: r.negative, markers: r.markers };
  }
  return null;
}

function buildCards(config, rows, consumed) {
  const negSet = new Set(config.negativeCards || []);
  return (config.cards || [])
    .map((id) => pick(rows, id))
    .filter(Boolean)
    .map((r) => {
      consumed.add(r.id);
      return negSet.has(r.id) ? asReduction(r) : cardOf(r);
    });
}

function buildBars(config, rows, consumed) {
  if (!config.bars) return [];
  const matched = matchRows(rows, config.bars.match).filter((r) => !consumed.has(r.id));
  if (!matched.length) return [];
  const sum = matched.reduce((a, r) => a + Math.abs(num(r)), 0) || 1;
  return [...matched]
    .sort((a, b) => Math.abs(num(b)) - Math.abs(num(a)))
    .map((r) => {
      consumed.add(r.id);
      return {
        id: r.id,
        label: titleCase(tail(r.label)),
        value: r.value,
        pct: Math.round((Math.abs(num(r)) / sum) * 10000) / 100,
        markers: r.markers,
      };
    });
}

// An explicit-id method table: each row pairs named block ids under fixed
// columns (PIT vs traditional discount) — for dual-method values that aren't
// .hug/.nelson siblings.
function buildOnePairTable(spec, rows, consumed) {
  const tableRows = [];
  for (const r of spec.rows) {
    const found = r.ids.map((id) => pick(rows, id));
    if (!found.some(Boolean)) continue;
    found.forEach((row) => row && consumed.add(row.id));
    tableRows.push({ label: r.label, cells: found.map((row) => (row ? row.value : '—')) });
  }
  return tableRows.length ? { columns: [...spec.columns], rows: tableRows } : null;
}

// Named groups (a labeled box of rows): liabilities, support inputs, s6 sub-plans.
function buildGroups(config, rows, consumed) {
  return (config.groups || [])
    .map((spec) => {
      const pairTable = spec.pairTable ? buildOnePairTable(spec.pairTable, rows, consumed) : null;
      const matched = matchRows(rows, spec.match).filter((r) => !consumed.has(r.id));
      if (!matched.length && !pairTable) return null;
      const ordered = spec.sort === 'desc' ? [...matched].sort((a, b) => Math.abs(num(b)) - Math.abs(num(a))) : matched;
      ordered.forEach((r) => consumed.add(r.id));
      // A negative-tone group (liabilities) renders each row as a reduction.
      const groupRows = spec.tone === 'negative' ? ordered.map(asReduction) : ordered.map(cardOf);
      return { header: spec.header, tone: spec.tone || null, rows: groupRows, methodTable: pairTable, display: spec.display || null };
    })
    .filter(Boolean);
}

// Capture-grouped entities (s5 buckets; carrier grants/assets): one named box per
// captured key, with an optional Hug/Nelson method table folded in.
function buildEntities(rows, captureRe, opts, consumed) {
  const groups = new Map();
  const order = [];
  for (const r of rows) {
    if (consumed.has(r.id)) continue;
    const m = r.id.match(captureRe);
    if (!m) continue;
    const key = m[1];
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key).push(r);
  }
  return order.map((key) => buildEntity(key, groups.get(key), opts, consumed));
}

function buildEntity(key, entityRows, opts = {}, consumed) {
  const { methodColumns, headerFields, headerLabel, headerFromKey } = opts;
  const suffixes = (methodColumns || []).map((c) => c.toLowerCase());
  const headerRows = [];
  const methodEntries = new Map();
  const methodOrder = [];
  const rows = [];
  for (const r of entityRows) {
    consumed.add(r.id);
    const last = r.id.split('.').pop();
    const mi = suffixes.indexOf(last);
    if (mi >= 0) {
      const baseId = r.id.slice(0, -(last.length + 1));
      if (!methodEntries.has(baseId)) {
        methodEntries.set(baseId, { label: methodRowLabel(r.label), cells: new Array(methodColumns.length).fill('') });
        methodOrder.push(baseId);
      }
      methodEntries.get(baseId).cells[mi] = r.value;
    } else if (headerFields && headerFields.some((f) => r.id.endsWith(`.${f}`))) {
      headerRows.push(r);
    } else {
      rows.push(r);
    }
  }
  const methodTable = methodOrder.length
    ? { columns: [...methodColumns], rows: methodOrder.map((b) => methodEntries.get(b)) }
    : null;
  const header = headerLabel
    ? headerLabel(key, headerRows)
    : headerFromKey
      ? headerFromKey(key)
      : titleCase(spaceCamel(key));
  return { key, header, rows: rows.map(cardOf), methodTable };
}

// A (name × column) method table from sibling rows, e.g. s7 category Current/Projected.
function buildPairMethodTable(spec, rows, consumed) {
  if (!spec) return null;
  const colKeys = spec.columns.map((c) => c.key);
  const map = new Map();
  const order = [];
  for (const r of rows) {
    if (consumed.has(r.id)) continue;
    const m = r.id.match(spec.capture);
    if (!m) continue;
    const name = m[1];
    const ci = colKeys.indexOf(m[2]);
    if (ci < 0) continue;
    if (!map.has(name)) {
      map.set(name, { label: titleCase(name), cells: new Array(spec.columns.length).fill(''), sort: 0, any: false });
      order.push(name);
    }
    const entry = map.get(name);
    entry.cells[ci] = r.value;
    if (Number(r.rawValue) !== 0) entry.any = true;
    if (ci === 0) entry.sort = Math.abs(num(r));
    consumed.add(r.id);
  }
  const tableRows = order
    .map((n) => map.get(n))
    .filter((e) => e.any) // drop all-zero categories (noise)
    .sort((a, b) => b.sort - a.sort)
    .map(({ label, cells }) => ({ label, cells }));
  if (!tableRows.length) return null;
  return { columns: spec.columns.map((c) => c.label), rows: tableRows };
}

// ── section configuration ─────────────────────────────────────────────────────
const SECTION_CONFIG = {
  s1: {
    hero: 's1.tier',
    heroLabel: 'Readiness',
    heroSubtitle: (rows, p) => {
      const s = p(rows, 's1.totalScore');
      return s ? `Self-assessment score ${s.value} of 30` : null;
    },
    cards: ['s1.monthlyGap', 's1.gapPercent'],
  },
  s2: {
    hero: 's2.netMonthlyIncome',
    cards: ['s2.grossMonthlyIncome', 's2.annualGrossIncome'],
    groups: [{ header: 'Monthly deductions', match: /^s2\.deduction\./, sort: 'desc' }],
  },
  s3: {
    hero: 's3.netWorth',
    cards: ['s3.totalAssets', 's3.totalLiabilities'],
    negativeCards: ['s3.totalLiabilities'], // liabilities reduce net worth → ($X)
    bars: { match: /^s3\.assets\./ },
    groups: [{ header: 'Liabilities', match: /^s3\.liabilities\./, sort: 'desc', tone: 'negative' }],
  },
  s4: {
    hero: 's4.bestOption',
    heroLabel: 'Lowest-tax filing status',
    heroSubtitle: (rows, p) => {
      const d = p(rows, 's4.maxSavings');
      return d ? `Projected difference ${d.value}` : null;
    },
    groups: [{ header: 'Net tax by filing status', match: /^s4\.scenario\..*\.netTax$/, sort: 'desc' }],
  },
  s5: {
    hero: 's5.totalMaritalEstate',
    entities: { capture: /^s5\.(?:faceValue|taxAdjusted|hiddenTax)\.([^.]+)$/, headerFromKey: (k) => titleCase(k) },
  },
  s6: {
    // Hero is the DB pension present value (or the DC tax-adjusted value when
    // there is no DB pension). Keep the block's own precise label — this is one
    // valuation, not a combined "retirement total" (which the model never computes).
    hero: ['s6.pva.headlinePV', 's6.pit.taxAdjustedValue'],
    groups: [
      {
        header: 'Defined-contribution account (point-in-time)',
        match: /^s6\.pit\.(taxDiscountPercent|taxAdjustedValue|overage)$/,
        // The point-in-time vs traditional tax discount is a dual-method value →
        // labeled columns, not stacked inline rows (R6).
        pairTable: {
          columns: ['Point-in-time', 'Traditional'],
          rows: [{ label: 'Tax discount on the account', ids: ['s6.pit.taxDiscountDollars', 's6.pit.traditionalDiscountDollars'] }],
        },
      },
      { header: 'Defined-benefit pension', match: /^s6\.pva\./ },
      { header: 'QDRO order', match: /^s6\.qdro\./ },
      // The account balance + PIT assumptions are inputs that feed the discount —
      // de-emphasized vs the outputs above so neither out-sizes the hero (R4/R5).
      { header: 'Point-in-time inputs (account balance and assumptions)', match: /^s6\.pit\.(planBalance|n|effectiveTaxRate|discountRate)$/, tone: 'input' },
    ],
  },
  s7: {
    hero: 's7.monthlyGap',
    cards: ['s7.currentTotal', 's7.projectedTotal'],
    methodTable: {
      capture: /^s7\.category\.(.+)\.(current|projected)$/,
      columns: [
        { key: 'current', label: 'Current' },
        { key: 'projected', label: 'Projected' },
      ],
    },
  },
  s8: {
    hero: 's8.totalMonthlySupport',
    cards: ['s8.spousalSupport.monthly', 's8.childSupport.monthly'],
    groups: [
      { header: 'Child-support worksheet', match: /^s8\.childSupport\./ },
      { header: 'Income inputs', match: /^s8\.(payorMonthlyIncome|payeeMonthlyIncome|combinedMonthlyIncome)$/, tone: 'input' },
    ],
  },
  s9: {
    heroSynthetic: (rows, p) => {
      const sel = p(rows, 's9.userSelection');
      if (sel) return { label: 'Selected scenario', value: sel.value };
      const n = matchRows(rows, /^s9\.scenario\./).length;
      return { label: 'Scenarios analyzed', value: String(n) };
    },
    groups: [{ header: 'Scenarios analyzed', match: /^s9\.scenario\./ }],
  },
  s10: {
    hero: 's10.priorityCount',
    heroLabel: 'Priorities recorded',
    cards: ['s10.tradeOffCount'],
    groups: [
      { header: 'Priorities', match: /^s10\.priority\./ },
      { header: 'Trade-offs', match: /^s10\.tradeOff\./ },
    ],
  },
  s11: {
    hero: 's11.gapCount',
    heroLabel: 'Offer silences (gaps)',
    cards: ['s11.mapCount'],
    groups: [{ header: 'Priorities mapped against the offer', match: /^s11\.map\./ }],
  },
  s12: {
    hero: 's12.nextStepCount',
    heroLabel: 'Next steps',
    cards: ['s12.professionalCount', 's12.keyDateCount'],
    groups: [
      { header: 'Next steps', match: /^s12\.nextStep\./ },
      { header: 'Key dates', match: /^s12\.keyDate\./ },
    ],
  },
};

export function layoutSection(sectionId, rows) {
  const config = SECTION_CONFIG[sectionId] || {};
  const consumed = new Set();
  const hero = resolveHero(config, rows, consumed);
  const cards = buildCards(config, rows, consumed);
  const bars = buildBars(config, rows, consumed);
  const methodTables = [];
  const mt = buildPairMethodTable(config.methodTable, rows, consumed);
  if (mt) methodTables.push(mt);
  const groups = buildGroups(config, rows, consumed);
  if (config.entities) {
    const ent = buildEntities(rows, config.entities.capture, config.entities, consumed);
    for (const e of ent) groups.push({ header: e.header, tone: null, rows: e.rows, methodTable: e.methodTable });
  }
  const lineItems = rows.filter((r) => !consumed.has(r.id)).map(cardOf);
  return { hero, cards, bars, groups, methodTables, lineItems };
}

// ── carriers (numbered supplements to their parent section) ───────────────────
function dcaHeader(key, headerRows) {
  const get = (suffix) => {
    const r = headerRows.find((x) => x.id.endsWith(`.${suffix}`));
    return r ? r.value : null;
  };
  const parts = [];
  const cat = get('category');
  if (cat) parts.push(cat);
  const shares = get('sharesGranted');
  if (shares) parts.push(`${shares} shares`);
  const strike = get('strikePrice');
  if (strike) parts.push(`strike ${strike}`);
  const detail = parts.join(' · ');
  const company = get('company');
  if (company && detail) return `${company} — ${detail}`;
  return detail || company || 'Grant';
}

const CARRIER_CONFIG = {
  deferredCompStubs: {
    number: 'Supplement to Section 5',
    capture: /^carrier\.dcs\.([^.]+)\./,
    methodColumns: ['Hug', 'Nelson'],
    headerFields: ['company', 'category', 'sharesGranted', 'strikePrice'],
    headerLabel: dcaHeader,
  },
  costBasisEntries: {
    number: 'Supplement to Section 5',
    capture: /^carrier\.cbe\.([^.]+)\./,
    // Asset ids carry a trailing instance suffix (realEstate-f1home); strip it so
    // the header reads as the asset category, not a raw internal id.
    headerFromKey: (k) => titleCase(spaceCamel(String(k).replace(/-[^-]*$/, ''))),
  },
  qdroBlueprint: { number: 'Supplement to Section 6', flat: true },
};

export function layoutCarrier(name, rows) {
  const config = CARRIER_CONFIG[name] || {};
  const title = CARRIER_TITLES[name] ?? name;
  if (config.flat) {
    return { number: config.number, title, entities: [], rows: rows.map(cardOf) };
  }
  const consumed = new Set();
  const entities = buildEntities(rows, config.capture, config, consumed).map((e) => ({
    header: e.header,
    rows: e.rows,
    methodTable: e.methodTable,
  }));
  const leftovers = rows.filter((r) => !consumed.has(r.id)).map(cardOf);
  return { number: config.number, title, entities, rows: leftovers };
}

export const __testing = { SECTION_CONFIG, CARRIER_CONFIG };
