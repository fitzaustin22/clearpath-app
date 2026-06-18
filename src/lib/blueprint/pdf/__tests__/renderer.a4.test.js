import { describe, it, expect, beforeAll } from 'vitest';
import F1 from '../../../../test/fixtures/v2-golden/F1.json';
import F2 from '../../../../test/fixtures/v2-golden/F2.json';
import F3 from '../../../../test/fixtures/v2-golden/F3.json';
import F4b from '../../../../test/fixtures/v2-golden/F4b.json';
import { seedFixtureStores, buildToolInputs } from '../../../../test/fixtures/v2-golden/seedFixtureStores.js';
import { buildDocumentModel } from '../../documentModel.js';
import { buildRenderPlan, collectRenderableStrings, renderAttorneyBlueprint } from '../renderAttorneyBlueprint.js';

const FIXTURES = { F1, F2, F3, F4b };
const MODELS = {};
const PLANS = {};

beforeAll(() => {
  for (const [id, fixture] of Object.entries(FIXTURES)) {
    const state = seedFixtureStores(fixture);
    MODELS[id] = buildDocumentModel(
      { sections: JSON.parse(JSON.stringify(state.sections)), deferredCompStubs: JSON.parse(JSON.stringify(state.deferredCompStubs)), qdroBlueprint: JSON.parse(JSON.stringify(state.qdroBlueprint)), costBasisEntries: JSON.parse(JSON.stringify(state.costBasisEntries)) },
      { jurisdiction: fixture.clientState, preparedDate: '2026-06-01', toolInputs: buildToolInputs(fixture) },
    );
    PLANS[id] = buildRenderPlan(MODELS[id], { clientName: fixture.persona?.name, preparedDate: '2026-06-01' });
  }
});

// A4 raw-token denylist: no internal key, enum value, or placeholder token may
// render. lowerCamelCase identifiers (pvSource/keepAndRefi/sellNow), snake_case
// identifiers (tier_3/pva_db_*), and {/} literals are forbidden in any rendered
// string. TitleCase brand words ("ClearPath") are safe (start uppercase).
const CAMEL = /\b[a-z][a-z0-9]*[A-Z][a-zA-Z0-9]*\b/;
const SNAKE = /\b[a-z0-9]+_[a-z0-9_]+\b/;
const BRACES = /[{}]/;

describe('A4 — raw-token denylist (the pvSource class)', () => {
  it.each(['F1', 'F2', 'F3', 'F4b'])('%s renders no camelCase / snake_case / brace tokens', (id) => {
    const strings = collectRenderableStrings(PLANS[id]);
    expect(strings.length).toBeGreaterThan(0);
    const hits = strings.filter((s) => CAMEL.test(s) || SNAKE.test(s) || BRACES.test(s));
    expect(hits, `${id} raw-token leaks`).toEqual([]);
  });
});

// Value-level leak guard (the redesign R1 fix). These patterns are ANCHORED to a
// whole VALUE string (not prose), so legitimately-hyphenated words in
// labels/notes/citations (point-in-time, tax-deferred, loan-to-value) never
// trip it. A rendered VALUE must never BE a raw ISO date, a bare boolean, a
// naked engine float, or a lowercase enum slug.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}/; // 2026-06-18T...Z or 1998-04-01
const BARE_BOOL = /^(?:true|false)$/i;
const NAKED_FLOAT = /^-?\d*\.\d{3,}$/; // 0.6824, .05 with 3+ decimals
const LOWER_SLUG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/; // refi-at-current, margin-of-safety

function collectValueStrings(plan) {
  const vals = [];
  const v = (s) => {
    if (s != null && String(s).length) vals.push(String(s));
  };
  const mt = (t) => {
    if (t) for (const r of t.rows) for (const c of r.cells) v(c);
  };
  const rows = (rs) => {
    for (const r of rs || []) v(r.value);
  };
  const lay = (L) => {
    if (!L) return;
    if (L.hero) v(L.hero.value);
    rows(L.cards);
    for (const b of L.bars || []) v(b.value);
    for (const g of L.groups || []) {
      rows(g.rows);
      mt(g.methodTable);
    }
    for (const t of L.methodTables || []) mt(t);
    rows(L.lineItems);
    for (const e of L.entities || []) {
      rows(e.rows);
      mt(e.methodTable);
    }
    rows(L.rows);
  };
  for (const s of plan.content.sections) lay(s.layout);
  for (const c of plan.content.carriers) lay(c.layout);
  for (const it of plan.inputs.items) {
    if (it.box) for (const r of it.rows) v(r.value);
    else v(it.value);
  }
  return vals;
}

describe('A4 — value-level leak guard (ISO / boolean / naked float / enum slug)', () => {
  it.each(['F1', 'F2', 'F3', 'F4b'])('%s renders no raw VALUES', (id) => {
    const vals = collectValueStrings(PLANS[id]);
    expect(vals.length).toBeGreaterThan(0);
    const bad = vals.filter(
      (s) => ISO_DATE.test(s) || BARE_BOOL.test(s) || NAKED_FLOAT.test(s) || LOWER_SLUG.test(s),
    );
    expect(bad, `${id} raw value leaks`).toEqual([]);
  });
});

describe('A4 — scope disclosure (D-V2-3)', () => {
  it('F1 (all sections complete) omits nothing → no scope-notice page', () => {
    expect(MODELS.F1.scopeDisclosure.omittedSections).toEqual([]);
    expect(PLANS.F1.scope).toBeNull();
  });
  it.each(['F2', 'F3', 'F4b'])('%s lists every omitted section on the scope-notice page', (id) => {
    const omitted = MODELS[id].scopeDisclosure.omittedSections;
    expect(omitted.length).toBeGreaterThan(0);
    expect(PLANS[id].scope).toBeTruthy();
    expect(PLANS[id].scope.items.length).toBe(omitted.length);
    expect(PLANS[id].scope.title).toBe('Sections Not Included');
  });
});

describe('A4 — page furniture (document ID on cover + footer)', () => {
  it.each(['F1', 'F2', 'F3', 'F4b'])('%s stamps CP-BP-YYYY-NNNN on cover matter and footer', (id) => {
    const plan = PLANS[id];
    const coverId = plan.cover.matter.find((m) => m.label === 'Document ID').value;
    expect(coverId).toMatch(/^CP-BP-\d{4}-\d{4}$/);
    expect(plan.footer.documentId).toBe(coverId);
    expect(plan.content.headerLeft).toMatch(/Financial Blueprint$/);
  });
});

describe('A4 — methodology appendix verified treatment', () => {
  it('F1 marks unverified authorities under review and verified ones as settled', () => {
    const entries = PLANS.F1.methodology.entries;
    const deering = entries.find((e) => e.cite.includes('Deering'));
    const boemio = entries.find((e) => e.cite.includes('Boemio'));
    expect(deering.verified).toBe(false); // coverture case — under review
    expect(boemio.verified).toBe(true); // verified 2026-06-12
  });
});

// A5-M round-9 surfaced a Cat-2a direct flag on F2: §5 renders the
// client/spouse/undecided face-value split with NO note when no tax-adjusted
// column exists, so the split reads as an uncited computed equitable-distribution
// determination. The split is actually the parties' OWN Module 2 inventory
// designations (an input tally), exactly parallel to §2's "client-provided
// inputs; ClearPath does not compute" disclosure. §5 must ALWAYS disclose this.
describe('§5 disclosure — division split is the parties’ Module 2 designation, not a ClearPath computation', () => {
  const findS5 = (id) => PLANS[id].content.sections.find((s) => s.title === 'Property Division');
  it.each(['F1', 'F2', 'F3', 'F4b'])('%s §5 (when included) carries the provenance + non-computation disclosure', (id) => {
    const s5 = findS5(id);
    if (!s5) return; // §5 omitted for this fixture → nothing on the page to disclose
    const joined = (s5.notes || []).join(' ');
    expect(joined, `${id} §5 missing Module-2 provenance disclosure`).toMatch(
      /Marital Estate Inventory|Module 2/,
    );
    expect(joined, `${id} §5 missing non-computation disclaimer`).toMatch(
      /does not classify|equitable-distribution|not a legal|coverture/i,
    );
  });
  it('F2 §5 (face-value-only, no tax-adjusted column) still carries the disclosure', () => {
    const s5 = findS5('F2');
    expect(s5, 'F2 should include §5').toBeTruthy();
    // F2 has no tax-adjusted blocks — the disclosure must not be gated on them
    expect(s5.notes.some((n) => /not a legal/i.test(n) || /does not classify/i.test(n))).toBe(true);
  });
});

describe('renderer — produces a valid PDF for every fixture', () => {
  it.each(['F1', 'F2', 'F3', 'F4b'])('%s renders to a non-trivial PDF buffer', async (id) => {
    const buf = await renderAttorneyBlueprint(MODELS[id], {
      clientName: FIXTURES[id].persona?.name,
      preparedDate: '2026-06-01',
    });
    expect(buf.slice(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(3000);
  });
});
