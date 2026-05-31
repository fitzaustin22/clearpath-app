import { describe, it, expect, beforeEach } from 'vitest';
import { useM6Store } from '@/src/stores/m6Store';
import useBlueprintStore from '@/src/stores/blueprintStore';

// M2-minted stubs (the analyzer resolves these in place; it never mints them).
// strikePrice non-null only for stockOptions; corporateIncentives carry null.
const STUB_OPTION = {
  id: 'dcs_opt_1',
  category: 'stockOptions',
  company: 'Acme',
  grantDate: '2022-01-01',
  sharesGranted: 400,
  vestingSchedule: '4-year graded, 25%/yr',
  strikePrice: 10,
};

const seedStub = (stub) => useBlueprintStore.getState().addDeferredCompStub(stub);
const dca = () => useM6Store.getState().deferredCompAnalyzer;
const stubById = (id) => useBlueprintStore.getState().deferredCompStubs.find((s) => s.id === id);

beforeEach(() => {
  localStorage.clear();
  useM6Store.getState().resetAnalysis();
  useBlueprintStore.getState().resetBlueprint();
});

describe('deferredCompAnalyzer slice — selectStub (§9.2)', () => {
  it('prefills analysis (incl. grantDate) from the stub and sets stubId', () => {
    seedStub(STUB_OPTION);
    useM6Store.getState().selectStub('dcs_opt_1');
    expect(dca().stubId).toBe('dcs_opt_1');
    expect(dca().analysis).toMatchObject({
      grantDate: '2022-01-01', // prefilled from the stub
      hireDate: null,
      separationDate: null,
      state: null,
      fmv: null,
      intentNote: '',
    });
    expect(dca().analysis.tranches).toEqual([]);
  });

  it('no-op for an unknown stub id (analysis stays null)', () => {
    useM6Store.getState().selectStub('nope');
    expect(dca().stubId).toBe(null);
    expect(dca().analysis).toBe(null);
  });
});

describe('deferredCompAnalyzer slice — field + tranche edits (§9.2)', () => {
  beforeEach(() => {
    seedStub(STUB_OPTION);
    useM6Store.getState().selectStub('dcs_opt_1');
  });

  it('setAnalysisField sets top-level fields', () => {
    useM6Store.getState().setAnalysisField('hireDate', '2018-01-01');
    useM6Store.getState().setAnalysisField('fmv', 50);
    expect(dca().analysis.hireDate).toBe('2018-01-01');
    expect(dca().analysis.fmv).toBe(50);
  });

  it('addTranche appends a tranche with a makeId("tranche") id; removeTranche drops it', () => {
    useM6Store.getState().addTranche();
    expect(dca().analysis.tranches).toHaveLength(1);
    const t = dca().analysis.tranches[0];
    expect(t.id).toMatch(/^tranche_/);
    expect(t).toMatchObject({ vestDate: '', shares: null });
    useM6Store.getState().removeTranche(t.id);
    expect(dca().analysis.tranches).toHaveLength(0);
  });

  it('setAnalysisField edits a tranche field by id path (tranches.<id>.<field>)', () => {
    useM6Store.getState().addTranche();
    const id = dca().analysis.tranches[0].id;
    useM6Store.getState().setAnalysisField(`tranches.${id}.vestDate`, '2026-01-01');
    useM6Store.getState().setAnalysisField(`tranches.${id}.shares`, '100');
    expect(dca().analysis.tranches[0]).toMatchObject({ vestDate: '2026-01-01', shares: '100' });
  });

  it('resetAnalysis clears stubId and analysis', () => {
    useM6Store.getState().addTranche();
    useM6Store.getState().resetAnalysis();
    expect(dca()).toEqual({ stubId: null, analysis: null });
  });
});

describe('deferredCompAnalyzer slice — saveAnalysisToBlueprint (§9.4 / §9.7 #9, #11)', () => {
  // hire 2018 / grant 2022 / sep 2024 / vest 2026, shares 100, fmv 50, strike 10:
  // Hug 75 marital shares, Nelson 50; intrinsic Hug 75*40=3000, Nelson 50*40=2000.
  const buildAnalysis = () => {
    seedStub(STUB_OPTION);
    useM6Store.getState().selectStub('dcs_opt_1');
    useM6Store.getState().setAnalysisField('hireDate', '2018-01-01');
    useM6Store.getState().setAnalysisField('separationDate', '2024-01-01');
    useM6Store.getState().setAnalysisField('state', 'VA');
    useM6Store.getState().setAnalysisField('fmv', 50);
    useM6Store.getState().setAnalysisField('intentNote', 'retention grant');
    useM6Store.getState().addTranche();
    const id = dca().analysis.tranches[0].id;
    useM6Store.getState().setAnalysisField(`tranches.${id}.vestDate`, '2026-01-01');
    useM6Store.getState().setAnalysisField(`tranches.${id}.shares`, '100');
    return id;
  };

  it('TC-9: patches the stub via updateDeferredCompStub with { resolved, analysis, metadata }', () => {
    buildAnalysis();
    useM6Store.getState().saveAnalysisToBlueprint('dcs_opt_1');
    const stub = stubById('dcs_opt_1');
    expect(stub.resolved).toBe(true);
    expect(stub.analysis.hireDate).toBe('2018-01-01');
    expect(stub.analysis.intentNote).toBe('retention grant');
    expect(stub.metadata).toBeTruthy();
    expect(stub.metadata.formula).toBe('both');
  });

  it('TC-9: additive — every M2-captured stub field is preserved (never overwritten)', () => {
    buildAnalysis();
    useM6Store.getState().saveAnalysisToBlueprint('dcs_opt_1');
    const stub = stubById('dcs_opt_1');
    expect(stub).toMatchObject({
      id: 'dcs_opt_1',
      category: 'stockOptions',
      company: 'Acme',
      grantDate: '2022-01-01',
      sharesGranted: 400,
      vestingSchedule: '4-year graded, 25%/yr',
      strikePrice: 10,
      deferredComp: true,
    });
    expect(stub.createdAt).toBeTruthy();
  });

  it('TC-9: metadata carries fractions, marital-portion counts, intrinsic estimate, fmvSource, citation', () => {
    buildAnalysis();
    useM6Store.getState().saveAnalysisToBlueprint('dcs_opt_1');
    const md = stubById('dcs_opt_1').metadata;
    expect(md.hireDate).toBe('2018-01-01');
    expect(md.grantDate).toBe('2022-01-01');
    expect(md.separationDate).toBe('2024-01-01');
    expect(md.perTrancheFractions).toHaveLength(1);
    expect(md.perTrancheFractions[0].hug).toBeCloseTo(0.75, 2);
    expect(md.perTrancheFractions[0].nelson).toBeCloseTo(0.5, 2);
    expect(md.maritalShares).toEqual({ hug: 75, nelson: 50 });
    expect(md.intrinsicValue).toEqual({ hug: 3000, nelson: 2000 });
    expect(md.fmvSource).toBe('user-entered');
    expect(md.citation).toMatch(/Hug/);
    expect(md.citation).toMatch(/Nelson/);
  });

  it('TC-9: no deferredCompResults slot is created on the Blueprint store', () => {
    buildAnalysis();
    useM6Store.getState().saveAnalysisToBlueprint('dcs_opt_1');
    expect(useBlueprintStore.getState().deferredCompResults).toBeUndefined();
  });

  it('TC-11: vestingSchedule is never parsed — tranches stay exactly the user-entered set', () => {
    buildAnalysis(); // user entered exactly one tranche
    expect(dca().analysis.tranches).toHaveLength(1);
    useM6Store.getState().saveAnalysisToBlueprint('dcs_opt_1');
    const stub = stubById('dcs_opt_1');
    expect(stub.analysis.tranches).toHaveLength(1); // not derived from the 4-period schedule text
    expect(stub.vestingSchedule).toBe('4-year graded, 25%/yr'); // free text untouched
  });

  it('no-op when no analysis is in progress (no stub mutation)', () => {
    seedStub(STUB_OPTION);
    // never selectStub → analysis null
    useM6Store.getState().saveAnalysisToBlueprint('dcs_opt_1');
    expect(stubById('dcs_opt_1').resolved).toBeUndefined();
  });
});
