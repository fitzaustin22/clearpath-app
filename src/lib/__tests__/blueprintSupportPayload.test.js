import { describe, it, expect } from 'vitest';
import { buildSupportAnalysisPayload } from '../blueprintSupportPayload';

// A synthetic calculateSupport()-shaped result (the engine output the §8 writer
// maps into the consumer S8 / attorney-doc contract). Mirrors
// calculateSupport.js:101-123.
function mdResult(overrides = {}) {
  return {
    combinedMonthly: 8322,
    childMonthly: 2400,
    spousalMonthly: 5922,
    spousalCalc: { formulaUsed: 'aaml_30_20_with_40pct_cap' },
    childCalc: {},
    alimonyFirstOrderingApplied: true,
    metadata: {
      formulaId: 'aaml_30_20_with_40pct_cap',
      state: 'MD',
      temporal: 'post_divorce',
      depth: 'standard',
      imputationApplied: { partyA: false, partyB: false },
      citations: ['Md. Fam. Law §11-106', 'Boemio v. Boemio, 414 Md. 118 (2010)'],
      calculationTimestamp: '2026-06-01T00:00:00.000Z',
      asOfDateForStatutoryConstants: '2026-06-01T00:00:00.000Z',
    },
    ...overrides,
  };
}
const mdInputs = (o = {}) => ({ numChildren: 1, marriageLengthYears: 24, state: 'MD', temporal: 'post_divorce', ...o });

describe('buildSupportAnalysisPayload — consumer S8 contract', () => {
  it('maps combined/spousal/child to the exact consumer shape', () => {
    const p = buildSupportAnalysisPayload(mdResult(), mdInputs());
    expect(p.totalMonthlySupport).toBe(8322);
    expect(p.spousalSupport.monthly).toBe(5922);
    expect(p.childSupport.monthly).toBe(2400);
    expect(p.childSupport.children).toBe(1);
  });

  it('derives the post-divorce AAML duration band from marriage length', () => {
    expect(buildSupportAnalysisPayload(mdResult(), mdInputs()).spousalSupport.duration).toBe(
      '20+ years (permanent)',
    );
    expect(
      buildSupportAnalysisPayload(mdResult(), mdInputs({ marriageLengthYears: 6 })).spousalSupport.duration,
    ).toBe('3-10 years');
  });

  it('omits the duration band for pendente lite (temporary order, no AAML band)', () => {
    const p = buildSupportAnalysisPayload(mdResult(), mdInputs({ temporal: 'pendente_lite' }));
    expect(p.spousalSupport.duration).toBeNull();
  });

  it('null spousal/child sub-blocks when that component is zero', () => {
    const spousalOnly = buildSupportAnalysisPayload(
      mdResult({ childMonthly: 0, combinedMonthly: 5922 }),
      mdInputs({ numChildren: 0 }),
    );
    expect(spousalOnly.childSupport).toBeNull();
    expect(spousalOnly.spousalSupport.monthly).toBe(5922);

    const childOnly = buildSupportAnalysisPayload(
      mdResult({ spousalMonthly: 0, combinedMonthly: 2400 }),
      mdInputs(),
    );
    expect(childOnly.spousalSupport).toBeNull();
    expect(childOnly.childSupport.monthly).toBe(2400);
  });

  it('persists attorney-doc lineage metadata (citations verbatim, formulaId, jurisdiction)', () => {
    const p = buildSupportAnalysisPayload(mdResult(), mdInputs());
    expect(p.metadata.formulaId).toBe('aaml_30_20_with_40pct_cap');
    expect(p.metadata.state).toBe('MD');
    expect(p.metadata.temporal).toBe('post_divorce');
    expect(p.metadata.citations).toEqual([
      'Md. Fam. Law §11-106',
      'Boemio v. Boemio, 414 Md. 118 (2010)',
    ]);
    expect(p.metadata.asOfDateForStatutoryConstants).toBe('2026-06-01T00:00:00.000Z');
  });

  it('carries a basis string for each populated sub-block', () => {
    const p = buildSupportAnalysisPayload(mdResult(), mdInputs());
    expect(typeof p.spousalSupport.basis).toBe('string');
    expect(p.spousalSupport.basis.length).toBeGreaterThan(0);
    expect(typeof p.childSupport.basis).toBe('string');
  });

  it('returns null when there is no engine result', () => {
    expect(buildSupportAnalysisPayload(null, mdInputs())).toBeNull();
  });
});
