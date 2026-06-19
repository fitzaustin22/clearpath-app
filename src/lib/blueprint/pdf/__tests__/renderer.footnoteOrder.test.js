// Jurisdiction-aware footnote ordering (Phase 2). Per-section citation footnotes
// lead with the matter's controlling jurisdiction; render-time sort only (the
// document model is untouched — see documentModel.fixtures.test.js byte-identity).
import { describe, it, expect, beforeAll } from 'vitest';
import F1 from '../../../../test/fixtures/v2-golden/F1.json';
import F2 from '../../../../test/fixtures/v2-golden/F2.json';
import F3 from '../../../../test/fixtures/v2-golden/F3.json';
import F4b from '../../../../test/fixtures/v2-golden/F4b.json';
import { seedFixtureStores, buildToolInputs } from '../../../../test/fixtures/v2-golden/seedFixtureStores.js';
import { buildDocumentModel } from '../../documentModel.js';
import { buildRenderPlan, sortCitationsByJurisdiction } from '../renderAttorneyBlueprint.js';

const FIXTURES = { F1, F2, F3, F4b };
const PLANS = {};

beforeAll(() => {
  for (const [id, fixture] of Object.entries(FIXTURES)) {
    const state = seedFixtureStores(fixture);
    const model = buildDocumentModel(
      {
        sections: JSON.parse(JSON.stringify(state.sections)),
        deferredCompStubs: JSON.parse(JSON.stringify(state.deferredCompStubs)),
        qdroBlueprint: JSON.parse(JSON.stringify(state.qdroBlueprint)),
        costBasisEntries: JSON.parse(JSON.stringify(state.costBasisEntries)),
      },
      { jurisdiction: fixture.clientState, preparedDate: '2026-06-01', toolInputs: buildToolInputs(fixture) },
    );
    PLANS[id] = buildRenderPlan(model, { clientName: fixture.persona?.name, preparedDate: '2026-06-01' });
  }
});

const s6Keys = (id) => {
  const s6 = PLANS[id].content.sections.find((s) => s.title === 'Retirement Plan Division');
  return s6 ? (s6.sources || []).map((x) => x.key) : [];
};

// The §6 coverture group (CITATIONS_BY_PATH.tier_3) always carries DC + VA + MD
// cases regardless of matter; the matter's jurisdiction decides which leads.
const COVERTURE = { bender_dc_1972: 'DC', mosley_va_1994: 'VA', deering_md_1981: 'MD' };

describe('jurisdiction-aware footnote ordering — F1 (MD) coverture group', () => {
  it('leads with the MD case: Deering before both Barbour (DC) and Mosley (VA)', () => {
    const keys = s6Keys('F1');
    expect(keys).toContain('deering_md_1981');
    expect(keys.indexOf('deering_md_1981')).toBeLessThan(keys.indexOf('bender_dc_1972'));
    expect(keys.indexOf('deering_md_1981')).toBeLessThan(keys.indexOf('mosley_va_1994'));
  });

  it('regression: federal §417(e)(3) PV block still leads the coverture group (block order unaffected)', () => {
    const keys = s6Keys('F1');
    expect(keys.indexOf('irc_417e3')).toBeLessThan(keys.indexOf('deering_md_1981'));
    // PIT block remains first; the jurisdiction sort never reorders across blocks
    expect(keys.indexOf('sutherland_pit')).toBeLessThan(keys.indexOf('irc_417e3'));
  });
});

describe('sortCitationsByJurisdiction — the render-time within-group sort', () => {
  // tier_3 persisted order is DC → VA → MD
  const group = ['bender_dc_1972', 'mosley_va_1994', 'deering_md_1981'];

  it('leads with the matter jurisdiction, stable for the rest (MD / VA / DC)', () => {
    expect(sortCitationsByJurisdiction(group, 'MD')).toEqual(['deering_md_1981', 'bender_dc_1972', 'mosley_va_1994']);
    expect(sortCitationsByJurisdiction(group, 'VA')).toEqual(['mosley_va_1994', 'bender_dc_1972', 'deering_md_1981']);
    expect(sortCitationsByJurisdiction(group, 'DC')).toEqual(['bender_dc_1972', 'mosley_va_1994', 'deering_md_1981']);
  });

  it('fallback: a group with no matter-jurisdiction authority keeps existing order', () => {
    expect(sortCitationsByJurisdiction(group, 'CA')).toEqual(group); // no CA authority
    expect(sortCitationsByJurisdiction(group, null)).toEqual(group); // no jurisdiction
    expect(sortCitationsByJurisdiction(group, undefined)).toEqual(group);
    // the deferred-comp carrier's CA cases are untouched for a DMV matter
    expect(sortCitationsByJurisdiction(['hug_1984', 'nelson_1986'], 'MD')).toEqual(['hug_1984', 'nelson_1986']);
  });

  it('is a stable permutation — never adds or drops a key', () => {
    for (const j of ['MD', 'VA', 'DC', 'CA', null]) {
      const out = sortCitationsByJurisdiction(group, j);
      expect([...out].sort()).toEqual([...group].sort());
    }
  });
});

describe('jurisdiction-aware footnote ordering — general invariant + branches', () => {
  it.each(['F1', 'F2', 'F3', 'F4b'])(
    '%s: within the §6 coverture group, the matter jurisdiction precedes every other state',
    (id) => {
      const jur = FIXTURES[id].clientState;
      const cov = s6Keys(id).filter((k) => COVERTURE[k]);
      if (cov.length <= 1) return; // no multi-jurisdiction coverture group (F2/F3/F4b)
      const matter = cov.filter((k) => COVERTURE[k] === jur);
      if (matter.length === 0) return; // matter jurisdiction not among the coverture cases
      const lastMatter = Math.max(...matter.map((k) => cov.indexOf(k)));
      const firstOther = Math.min(...cov.filter((k) => COVERTURE[k] !== jur).map((k) => cov.indexOf(k)));
      expect(lastMatter).toBeLessThan(firstOther);
    },
  );

  it('F2 (VA) and F3 (DC) carry no multi-jurisdiction coverture group (VA/DC lead is covered by the sort unit test)', () => {
    expect(s6Keys('F2').filter((k) => COVERTURE[k])).toEqual([]);
    expect(s6Keys('F3').filter((k) => COVERTURE[k])).toEqual([]);
  });

  it('F4b (no methodology authorities): Appendix A no-authorities branch unchanged', () => {
    expect(PLANS['F4b'].methodology.entries.length).toBe(0);
    expect(PLANS['F4b'].methodology.intro).toMatch(/cites no external methodology authorities/);
  });
});
