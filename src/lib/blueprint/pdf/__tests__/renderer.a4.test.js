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
