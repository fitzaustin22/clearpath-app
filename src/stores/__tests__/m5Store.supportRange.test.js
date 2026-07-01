import { describe, it, expect, beforeEach } from 'vitest';
import { useM5Store } from '@/src/stores/m5Store';
import { makeInitialSupportRangeInputs } from '@/src/lib/supportRange/prefill';

describe('m5Store — supportRange slice', () => {
  beforeEach(() => {
    useM5Store.setState({
      supportRange: { inputs: makeInitialSupportRangeInputs(), _prePopSources: null },
    });
  });

  it('initializes with the documented defaults', () => {
    const s = useM5Store.getState().supportRange;
    expect(s.inputs.region).toBe('MD');
    expect(s.inputs.numChildren).toBe('2');
    expect(s.inputs.parentingPct).toBe(65);
    expect(s._prePopSources).toBeNull();
  });

  it('setSupportRangeInputs partial-merges', () => {
    useM5Store.getState().setSupportRangeInputs({ incomeYou: '5000' });
    expect(useM5Store.getState().supportRange.inputs.incomeYou).toBe('5000');
    expect(useM5Store.getState().supportRange.inputs.region).toBe('MD');
  });

  it('replaceSupportRangeInputs swaps the whole object', () => {
    useM5Store.getState().replaceSupportRangeInputs({ ...makeInitialSupportRangeInputs(), incomeSpouse: '9000' });
    expect(useM5Store.getState().supportRange.inputs.incomeSpouse).toBe('9000');
  });

  it('setSupportRangePrePopSources sets provenance', () => {
    useM5Store.getState().setSupportRangePrePopSources({ incomeYou: { label: 'from M3 Pay Stub Decoder', source: 'm3.payStubDecoder' } });
    expect(useM5Store.getState().supportRange._prePopSources.incomeYou.source).toBe('m3.payStubDecoder');
  });

  it('does not disturb the retained supportEstimator slice', () => {
    expect(useM5Store.getState().supportEstimator).toBeTruthy();
    expect(useM5Store.getState().supportEstimator.inputs).toHaveProperty('partyA');
  });
});
