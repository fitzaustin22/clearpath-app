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
