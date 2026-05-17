/**
 * RefiRateInput tests — §9.6.3 Q-11 / TC-HDA-6.
 * Covers the full state machine: force-input empty render, opt-in fill,
 * 90-day staleness boundary (< 90 days = no warning, >= 90 days = warning),
 * user-typed value dual-write, null discipline, and opt-in absent when creditBand=null.
 * Plus direct unit tests of the exported isBandedRateStale pure function.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import RefiRateInput, { isBandedRateStale } from '../RefiRateInput.jsx';
import { BANDED_REFI_RATE_BUILD_DATE } from '@/src/lib/homeDecision';

// ── Helper: build a Date offset by `days` from the BANDED_REFI_RATE_BUILD_DATE ──
function daysAfterBuildDate(days) {
  const d = new Date(BANDED_REFI_RATE_BUILD_DATE);
  d.setDate(d.getDate() + days);
  return d;
}

// ── isBandedRateStale unit tests ──

describe('isBandedRateStale', () => {
  it('returns false when age is exactly 89 days (< 90 → no warning)', () => {
    expect(
      isBandedRateStale({
        buildDateISO: BANDED_REFI_RATE_BUILD_DATE,
        now: daysAfterBuildDate(89),
      }),
    ).toBe(false);
  });

  it('returns true when age is exactly 90 days (= 90 → warning)', () => {
    expect(
      isBandedRateStale({
        buildDateISO: BANDED_REFI_RATE_BUILD_DATE,
        now: daysAfterBuildDate(90),
      }),
    ).toBe(true);
  });

  it('returns true when age is 200 days (>> 90 → warning)', () => {
    expect(
      isBandedRateStale({
        buildDateISO: BANDED_REFI_RATE_BUILD_DATE,
        now: daysAfterBuildDate(200),
      }),
    ).toBe(true);
  });
});

// ── RefiRateInput component tests (TC-HDA-6 state machine) ──

describe('RefiRateInput', () => {
  // 1. Initial render with value=null: input empty, placeholder present,
  //    no staleness warning, opt-in link present when creditBand='good'.
  it('renders empty with placeholder and opt-in link when creditBand is valid; no staleness warning', () => {
    render(
      <RefiRateInput
        value={null}
        creditBand="good"
        provenance={null}
        onChange={vi.fn()}
        now={daysAfterBuildDate(0)}
      />,
    );

    const input = screen.getByTestId('hda-input-refiRate');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(null); // number input with empty string → null value
    expect(input).toHaveAttribute('placeholder', 'Enter your quoted rate (% APR)');

    expect(screen.getByTestId('hda-refiRate-optin')).toBeInTheDocument();
    expect(screen.queryByTestId('hda-refiRate-staleness')).not.toBeInTheDocument();
  });

  // 2. Opt-in click with creditBand='good': asserts onChange called with
  //    ('refiRate', 0.065) and ('refiRateProvenance', 'banded-default-good').
  it('opt-in click fills banded decimal and writes provenance for good band', () => {
    const onChange = vi.fn();
    render(
      <RefiRateInput
        value={null}
        creditBand="good"
        provenance={null}
        onChange={onChange}
        now={daysAfterBuildDate(0)}
      />,
    );

    fireEvent.click(screen.getByTestId('hda-refiRate-optin'));

    expect(onChange).toHaveBeenCalledWith('refiRate', 0.065);
    expect(onChange).toHaveBeenCalledWith('refiRateProvenance', 'banded-default-good');
  });

  // 3. Banded provenance active + now < 90 days after build date → NO staleness warning.
  it('does not show staleness warning when banded provenance active but build date < 90 days old', () => {
    render(
      <RefiRateInput
        value={0.065}
        creditBand="good"
        provenance="banded-default-good"
        onChange={vi.fn()}
        now={daysAfterBuildDate(89)}
      />,
    );

    expect(screen.queryByTestId('hda-refiRate-staleness')).not.toBeInTheDocument();
  });

  // 4. Banded provenance active + now >= 90 days after build date → staleness warning renders
  //    and contains the build-date string.
  it('shows staleness warning when banded provenance active and build date >= 90 days old', () => {
    render(
      <RefiRateInput
        value={0.065}
        creditBand="good"
        provenance="banded-default-good"
        onChange={vi.fn()}
        now={daysAfterBuildDate(90)}
      />,
    );

    const warning = screen.getByTestId('hda-refiRate-staleness');
    expect(warning).toBeInTheDocument();
    expect(warning.textContent).toContain(BANDED_REFI_RATE_BUILD_DATE);
  });

  // 5. User types 0.0725 → onChange('refiRate', 0.0725) and onChange('refiRateProvenance', 'user-quoted');
  //    with provenance='user-quoted' staleness warning is absent even if date is old.
  it('user-typed value writes decimal and user-quoted provenance; no staleness when user-quoted', () => {
    const onChange = vi.fn();
    render(
      <RefiRateInput
        value={null}
        creditBand="good"
        provenance="user-quoted"
        onChange={onChange}
        now={daysAfterBuildDate(200)}
      />,
    );

    fireEvent.change(screen.getByTestId('hda-input-refiRate'), {
      target: { value: '0.0725' },
    });

    expect(onChange).toHaveBeenCalledWith('refiRate', 0.0725);
    expect(onChange).toHaveBeenCalledWith('refiRateProvenance', 'user-quoted');

    // Staleness warning absent even with stale date because provenance is 'user-quoted'
    expect(screen.queryByTestId('hda-refiRate-staleness')).not.toBeInTheDocument();
  });

  // 6. Null discipline: clearing input to '' → onChange('refiRate', null).
  it('clearing the input to empty writes null (null discipline — never 0)', () => {
    const onChange = vi.fn();
    render(
      <RefiRateInput
        value={0.0650}
        creditBand="good"
        provenance="user-quoted"
        onChange={onChange}
        now={daysAfterBuildDate(0)}
      />,
    );

    fireEvent.change(screen.getByTestId('hda-input-refiRate'), {
      target: { value: '' },
    });

    expect(onChange).toHaveBeenCalledWith('refiRate', null);
  });

  // 7. Opt-in link NOT rendered when creditBand=null.
  it('does not render opt-in link when creditBand is null', () => {
    render(
      <RefiRateInput
        value={null}
        creditBand={null}
        provenance={null}
        onChange={vi.fn()}
        now={daysAfterBuildDate(0)}
      />,
    );

    expect(screen.queryByTestId('hda-refiRate-optin')).not.toBeInTheDocument();
  });

  // Bonus: opt-in absent for unknown/undefined creditBand (safety guard)
  it('does not render opt-in link when creditBand is undefined', () => {
    render(
      <RefiRateInput
        value={null}
        creditBand={undefined}
        provenance={null}
        onChange={vi.fn()}
        now={daysAfterBuildDate(0)}
      />,
    );

    expect(screen.queryByTestId('hda-refiRate-optin')).not.toBeInTheDocument();
  });

  // Verify controlled value reflects the prop
  it('reflects provided decimal value in the controlled input', () => {
    render(
      <RefiRateInput
        value={0.0625}
        creditBand="excellent"
        provenance="user-quoted"
        onChange={vi.fn()}
        now={daysAfterBuildDate(0)}
      />,
    );

    expect(screen.getByTestId('hda-input-refiRate')).toHaveValue(0.0625);
  });

  // Verify opt-in works for all 4 valid credit bands
  it.each([
    ['excellent', 0.0625],
    ['good', 0.0650],
    ['fair', 0.0700],
    ['poor', 0.0800],
  ])('opt-in with creditBand=%s writes correct banded decimal %f', (band, expectedRate) => {
    const onChange = vi.fn();
    render(
      <RefiRateInput
        value={null}
        creditBand={band}
        provenance={null}
        onChange={onChange}
        now={daysAfterBuildDate(0)}
      />,
    );

    fireEvent.click(screen.getByTestId('hda-refiRate-optin'));

    expect(onChange).toHaveBeenCalledWith('refiRate', expectedRate);
    expect(onChange).toHaveBeenCalledWith('refiRateProvenance', `banded-default-${band}`);
  });
});

// ── Band-change staleness (H1 hotfix) ──
// A banded default is credit-band-specific. Changing the band after opting in
// leaves refiRate/provenance pointing at the old band's rate — silently stale
// (the 90-day check does not cover this). The effect reverts to force-input.

describe('RefiRateInput band-change staleness (H1 hotfix)', () => {
  it('clears refiRate + provenance when the band changes after a banded opt-in', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <RefiRateInput
        value={0.07}
        creditBand="fair"
        provenance="banded-default-fair"
        onChange={onChange}
        now={daysAfterBuildDate(0)}
      />,
    );
    // Matched band on first render — no clear yet.
    expect(onChange).not.toHaveBeenCalled();

    // User changes credit band Fair → Good; provenance still reflects Fair.
    act(() => {
      rerender(
        <RefiRateInput
          value={0.07}
          creditBand="good"
          provenance="banded-default-fair"
          onChange={onChange}
          now={daysAfterBuildDate(0)}
        />,
      );
    });

    expect(onChange).toHaveBeenCalledWith('refiRate', null);
    expect(onChange).toHaveBeenCalledWith('refiRateProvenance', null);
  });

  it('clears immediately on mount when persisted band/provenance already mismatch', () => {
    // Scenario A smoke: localStorage carried banded-default-fair but the user
    // had since changed the band to good before re-entering HDA.
    const onChange = vi.fn();
    render(
      <RefiRateInput
        value={0.07}
        creditBand="good"
        provenance="banded-default-fair"
        onChange={onChange}
        now={daysAfterBuildDate(0)}
      />,
    );

    expect(onChange).toHaveBeenCalledWith('refiRate', null);
    expect(onChange).toHaveBeenCalledWith('refiRateProvenance', null);
  });

  it('does NOT clear when the band still matches the banded provenance', () => {
    const onChange = vi.fn();
    render(
      <RefiRateInput
        value={0.065}
        creditBand="good"
        provenance="banded-default-good"
        onChange={onChange}
        now={daysAfterBuildDate(0)}
      />,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does NOT clear a user-quoted rate when the band changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <RefiRateInput
        value={0.072}
        creditBand="fair"
        provenance="user-quoted"
        onChange={onChange}
        now={daysAfterBuildDate(0)}
      />,
    );
    act(() => {
      rerender(
        <RefiRateInput
          value={0.072}
          creditBand="good"
          provenance="user-quoted"
          onChange={onChange}
          now={daysAfterBuildDate(0)}
        />,
      );
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does NOT clear when there is no provenance (force-input, never opted in)', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <RefiRateInput
        value={null}
        creditBand="fair"
        provenance={null}
        onChange={onChange}
        now={daysAfterBuildDate(0)}
      />,
    );
    act(() => {
      rerender(
        <RefiRateInput
          value={null}
          creditBand="good"
          provenance={null}
          onChange={onChange}
          now={daysAfterBuildDate(0)}
        />,
      );
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
