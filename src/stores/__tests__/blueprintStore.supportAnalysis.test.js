import { describe, it, expect, beforeEach } from 'vitest';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { isSectionIncluded } from '@/src/components/blueprint/sectionInclusion';

const samplePayload = () => ({
  totalMonthlySupport: 8322,
  spousalSupport: { monthly: 5922, duration: '20+ years (permanent)', basis: 'AAML benchmark' },
  childSupport: { monthly: 2400, children: 1, basis: 'Maryland child-support guidelines' },
  metadata: {
    formulaId: 'aaml_30_20_with_40pct_cap',
    state: 'MD',
    temporal: 'post_divorce',
    citations: ['Md. Fam. Law §11-106', 'Boemio v. Boemio, 414 Md. 118 (2010)'],
    asOfDateForStatutoryConstants: '2026-06-01T00:00:00.000Z',
    imputationApplied: { partyA: false, partyB: false },
  },
});

describe('blueprintStore.updateSupportAnalysis — §8 writer (V2 Phase 2)', () => {
  beforeEach(() => {
    useBlueprintStore.getState().resetBlueprint();
  });

  it('writes s8.data, marks complete, returns { status }, and makes s8 included', () => {
    const ret = useBlueprintStore.getState().updateSupportAnalysis(samplePayload());
    expect(ret).toEqual({ status: 'complete' });
    const s8 = useBlueprintStore.getState().sections.s8;
    expect(s8.status).toBe('complete');
    expect(s8.data.totalMonthlySupport).toBe(8322);
    expect(s8.data.spousalSupport.monthly).toBe(5922);
    expect(s8.data.childSupport.children).toBe(1);
    expect(s8.data.metadata.citations).toContain('Md. Fam. Law §11-106');
    expect(isSectionIncluded('s8', useBlueprintStore.getState().sections)).toBe(true);
  });

  it('preserves the s8 label and static sourceModule (no clobber)', () => {
    useBlueprintStore.getState().updateSupportAnalysis(samplePayload());
    const s8 = useBlueprintStore.getState().sections.s8;
    expect(s8.label).toBe('Support Analysis');
    expect(s8.sourceModule).toBe('m5');
  });

  it('a null payload leaves s8 empty (and excluded)', () => {
    const ret = useBlueprintStore.getState().updateSupportAnalysis(null);
    expect(ret).toEqual({ status: 'empty' });
    expect(useBlueprintStore.getState().sections.s8.status).toBe('empty');
    expect(isSectionIncluded('s8', useBlueprintStore.getState().sections)).toBe(false);
  });

  it('resetBlueprint clears s8 back to empty / null', () => {
    useBlueprintStore.getState().updateSupportAnalysis(samplePayload());
    useBlueprintStore.getState().resetBlueprint();
    expect(useBlueprintStore.getState().sections.s8.status).toBe('empty');
    expect(useBlueprintStore.getState().sections.s8.data).toBeNull();
  });
});
