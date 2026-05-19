/**
 * QDGBlueprintSavedCallout tests — PR5-3, PR5-4, PR5-6.
 *
 * Three render states: State 1 (not yet saved), State 2 (saved + fresh),
 * State 3 (saved + stale). Gated by selectQDROPacketReady. Memoized stale
 * check via useMemo([m5State]) — verifies selector call-count stability
 * across no-op rerenders.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useM5Store } from '@/src/stores/m5Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { selectQDROBlueprintProjection } from '@/src/lib/qdro/blueprint/projection';
import * as projMod from '@/src/lib/qdro/blueprint/projection';
import { T } from '@/src/lib/brand/tokens';
import QDGBlueprintSavedCallout from '../QDGBlueprintSavedCallout.jsx';

// ---------------------------------------------------------------------------
// Fixture — a complete DC participant that satisfies selectQDROPacketReady
// ---------------------------------------------------------------------------
const dcComplete = {
  userRole: 'participant',
  planType: 'dc',
  planName: 'MegaCorp 401(k)',
  employer: 'MegaCorp',
  pvSource: null,
  _prePopSources: {},
  decisions: {
    allocationType: 'percentage',
    allocationValue: 50,
    receiptMethod: null,
    valuationDate: { type: 'divorce', date: '2026-01-01' },
  },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};

function seedReady() {
  useM5Store.setState((s) => ({
    qdroDecision: { ...s.qdroDecision, assets: { a1: dcComplete } },
  }));
}

beforeEach(() => {
  localStorage.clear();
  useM5Store.persist?.rehydrate?.();
  useBlueprintStore.persist.rehydrate();
  // Reset m5 assets to empty (not-ready state)
  useM5Store.setState((s) => ({ qdroDecision: { ...s.qdroDecision, assets: {} } }));
  // Reset blueprint QDRO slice
  useBlueprintStore.setState({ qdroBlueprint: { savedProjection: null, savedAt: null } });
});

// ---------------------------------------------------------------------------
// 1. Gating
// ---------------------------------------------------------------------------
describe('QDGBlueprintSavedCallout — gating', () => {
  it('renders nothing when packet is not ready (no assets)', () => {
    const { container } = render(<QDGBlueprintSavedCallout />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('qdg-blueprint-saved')).toBeNull();
  });

  it('renders when packet is ready (classifier-independent)', () => {
    seedReady();
    render(<QDGBlueprintSavedCallout />);
    expect(screen.getByTestId('qdg-blueprint-saved')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. State 1 — not yet saved
// ---------------------------------------------------------------------------
describe('QDGBlueprintSavedCallout — State 1 (not yet saved)', () => {
  it('shows the correct body copy for State 1', () => {
    seedReady();
    render(<QDGBlueprintSavedCallout />);
    expect(
      screen.getByText('Save your QDRO decisions to your ClearPath Blueprint.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Saved to your Blueprint on/)).toBeNull();
  });

  it('renders a "Save to Blueprint" button in State 1', () => {
    seedReady();
    render(<QDGBlueprintSavedCallout />);
    expect(screen.getByRole('button', { name: 'Save to Blueprint' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. State 1 click — writes projection to blueprint
// ---------------------------------------------------------------------------
describe('QDGBlueprintSavedCallout — State 1 click', () => {
  it('clicking "Save to Blueprint" writes the current projection to blueprintStore', () => {
    seedReady();
    render(<QDGBlueprintSavedCallout />);

    expect(useBlueprintStore.getState().qdroBlueprint.savedAt).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save to Blueprint' }));

    const { savedAt, savedProjection } = useBlueprintStore.getState().qdroBlueprint;
    expect(savedAt).not.toBeNull();

    const currentProjection = selectQDROBlueprintProjection(useM5Store.getState());
    expect(savedProjection).toEqual({ ...currentProjection, generatedAt: savedAt });
  });
});

// ---------------------------------------------------------------------------
// 4. State 2 — saved + fresh
// ---------------------------------------------------------------------------
describe('QDGBlueprintSavedCallout — State 2 (saved + fresh)', () => {
  it('shows "Saved to your Blueprint on {timestamp}" and NO save button', () => {
    seedReady();
    // Write a saved projection so saved == current
    act(() => {
      useBlueprintStore
        .getState()
        .writeQDROToBlueprint(selectQDROBlueprintProjection(useM5Store.getState()));
    });

    render(<QDGBlueprintSavedCallout />);

    const { savedAt } = useBlueprintStore.getState().qdroBlueprint;
    const expectedFormatted = new Intl.DateTimeFormat(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(new Date(savedAt));

    expect(
      screen.getByText(`Saved to your Blueprint on ${expectedFormatted}.`),
    ).toBeInTheDocument();
    // No save button in fresh state
    expect(screen.queryByTestId('qdg-blueprint-save-btn')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. State 3 — saved + stale
// ---------------------------------------------------------------------------
describe('QDGBlueprintSavedCallout — State 3 (saved + stale)', () => {
  it('shows stale body copy and "Save updated decisions" button after mutation', () => {
    seedReady();
    // Write current projection as saved
    act(() => {
      useBlueprintStore
        .getState()
        .writeQDROToBlueprint(selectQDROBlueprintProjection(useM5Store.getState()));
    });

    const { savedAt } = useBlueprintStore.getState().qdroBlueprint;
    const expectedFormatted = new Intl.DateTimeFormat(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(new Date(savedAt));

    render(<QDGBlueprintSavedCallout />);

    // Mutate m5 so current != saved
    act(() => {
      useM5Store.getState().updateQDRODecision('a1', { allocationValue: 75 });
    });

    expect(
      screen.getByText(
        `Your decisions have changed since you last saved on ${expectedFormatted}.`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save updated decisions' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 6. State 3 click — re-saves and transitions to State 2
// ---------------------------------------------------------------------------
describe('QDGBlueprintSavedCallout — State 3 click', () => {
  it('clicking "Save updated decisions" writes post-mutation projection and transitions to State 2', () => {
    seedReady();
    // Save initial projection
    act(() => {
      useBlueprintStore
        .getState()
        .writeQDROToBlueprint(selectQDROBlueprintProjection(useM5Store.getState()));
    });

    render(<QDGBlueprintSavedCallout />);

    // Mutate so stale
    act(() => {
      useM5Store.getState().updateQDRODecision('a1', { allocationValue: 75 });
    });

    // Verify button present (State 3)
    expect(screen.getByRole('button', { name: 'Save updated decisions' })).toBeInTheDocument();

    // Click to re-save
    fireEvent.click(screen.getByRole('button', { name: 'Save updated decisions' }));

    const { savedAt: newSavedAt, savedProjection } =
      useBlueprintStore.getState().qdroBlueprint;
    const postMutationProjection = selectQDROBlueprintProjection(useM5Store.getState());
    // Must store post-mutation data
    expect(savedProjection).toEqual({ ...postMutationProjection, generatedAt: newSavedAt });

    // Component should now show State 2 (no save button)
    expect(screen.queryByTestId('qdg-blueprint-save-btn')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 7. Timestamp format — locale-deterministic
// ---------------------------------------------------------------------------
describe('QDGBlueprintSavedCallout — timestamp format (PR5-4)', () => {
  it('formats savedAt using Intl.DateTimeFormat with month/day/hour/minute', () => {
    seedReady();
    const fixedIso = '2026-05-19T18:47:00.000Z';
    const currentProjection = selectQDROBlueprintProjection(useM5Store.getState());
    // Set qdroBlueprint with matching projection so State 2 (fresh)
    useBlueprintStore.setState({
      qdroBlueprint: {
        savedProjection: { ...currentProjection, generatedAt: fixedIso },
        savedAt: fixedIso,
      },
    });

    render(<QDGBlueprintSavedCallout />);

    const expectedFormatted = new Intl.DateTimeFormat(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(new Date(fixedIso));

    expect(
      screen.getByText(`Saved to your Blueprint on ${expectedFormatted}.`),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 8. Memoization (PR5-6) — selector call-count stable across no-op rerender
// ---------------------------------------------------------------------------
describe('QDGBlueprintSavedCallout — memoization (PR5-6)', () => {
  it('does not re-invoke selectQDROBlueprintProjection on a no-op rerender', () => {
    seedReady();
    const spy = vi.spyOn(projMod, 'selectQDROBlueprintProjection');

    const { rerender } = render(<QDGBlueprintSavedCallout />);
    const callsAfterMount = spy.mock.calls.length;

    // Trigger a no-op rerender without changing m5Store
    rerender(<QDGBlueprintSavedCallout />);

    // useMemo([m5State]) should short-circuit; call count must not increase
    expect(spy.mock.calls.length).toBe(callsAfterMount);

    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// 9. ARIA / semantics
// ---------------------------------------------------------------------------
describe('QDGBlueprintSavedCallout — a11y', () => {
  it('root has role="status" and an aria-label', () => {
    seedReady();
    render(<QDGBlueprintSavedCallout />);
    const root = screen.getByTestId('qdg-blueprint-saved');
    expect(root).toHaveAttribute('role', 'status');
    expect(root).toHaveAttribute('aria-label');
    expect(root.getAttribute('aria-label').length).toBeGreaterThan(0);
  });

  it('action buttons are real <button type="button"> elements with accessible names', () => {
    seedReady();
    render(<QDGBlueprintSavedCallout />);
    const buttons = screen.getAllByRole('button');
    for (const btn of buttons) {
      expect(btn.tagName).toBe('BUTTON');
      expect(btn).toHaveAttribute('type', 'button');
      expect(btn).toHaveAccessibleName();
    }
  });
});

// ---------------------------------------------------------------------------
// 10. Brand tokens — T.* in inline styles, no hardcoded hex
// jsdom normalizes CSS values (hex → rgb, rgba 0.10 → 0.1), so we set the
// same T.* token on a temporary element and read back what jsdom produces.
// This keeps the assertion derivation 100% token-based (no hardcoded hex).
// ---------------------------------------------------------------------------
function normalizeCss(property, value) {
  const el = document.createElement('div');
  el.style[property] = value;
  return el.style[property];
}

describe('QDGBlueprintSavedCallout — brand tokens', () => {
  it('root inline style uses T.FONT_BODY and T.PARCHMENT values', () => {
    seedReady();
    render(<QDGBlueprintSavedCallout />);
    const root = screen.getByTestId('qdg-blueprint-saved');
    expect(root.style.fontFamily).toBe(T.FONT_BODY);
    expect(root.style.background).toBe(normalizeCss('background', T.PARCHMENT));
  });

  it('save button inline style uses T.GOLD_BORDER and T.GOLD_TINT values', () => {
    seedReady();
    render(<QDGBlueprintSavedCallout />);
    const btn = screen.getByTestId('qdg-blueprint-save-btn');
    // border contains the normalized T.GOLD_BORDER value
    expect(btn.style.border).toContain(normalizeCss('borderColor', T.GOLD_BORDER));
    // backgroundColor is normalized T.GOLD_TINT
    expect(btn.style.backgroundColor).toBe(normalizeCss('backgroundColor', T.GOLD_TINT));
  });
});
