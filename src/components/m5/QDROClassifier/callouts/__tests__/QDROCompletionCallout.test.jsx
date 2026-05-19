/**
 * QDROCompletionCallout tests — PR5-5.
 *
 * Gated on BOTH selectQDROPacketReady === true AND qdroBlueprint.savedAt !== null.
 * No projection / stale logic — completion copy is stable once both conditions met.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useM5Store } from '@/src/stores/m5Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { T } from '@/src/lib/brand/tokens';
import QDROCompletionCallout from '../QDROCompletionCallout.jsx';

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

function seedSaved() {
  useBlueprintStore.getState().writeQDROToBlueprint({
    perspective: 'participant',
    assets: [],
    generatedAt: null,
  });
}

beforeEach(() => {
  localStorage.clear();
  useM5Store.persist?.rehydrate?.();
  useBlueprintStore.persist.rehydrate();
  // Reset m5 assets to empty (not-ready state)
  useM5Store.setState((s) => ({ qdroDecision: { ...s.qdroDecision, assets: {} } }));
  // Reset blueprint QDRO slice
  useBlueprintStore.getState().resetBlueprint();
});

// ---------------------------------------------------------------------------
// 1. NOT ready + savedAt set → renders nothing
// ---------------------------------------------------------------------------
describe('QDROCompletionCallout — gating: not ready', () => {
  it('renders nothing when packet is not ready (empty assets), even if savedAt is set', () => {
    // No seedReady — assets remain empty
    act(() => {
      seedSaved();
    });
    const { container } = render(<QDROCompletionCallout />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('qdro-completion')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Ready + savedAt === null → renders nothing
// ---------------------------------------------------------------------------
describe('QDROCompletionCallout — gating: ready but not saved', () => {
  it('renders nothing when packet is ready but savedAt is null (never saved)', () => {
    seedReady();
    // Blueprint not saved — savedAt remains null from beforeEach reset
    const { container } = render(<QDROCompletionCallout />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('qdro-completion')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Ready + savedAt !== null → renders the callout
// ---------------------------------------------------------------------------
describe('QDROCompletionCallout — renders when both conditions met', () => {
  it('renders the callout when packet is ready AND savedAt is non-null', () => {
    seedReady();
    act(() => {
      seedSaved();
    });
    render(<QDROCompletionCallout />);
    expect(screen.getByTestId('qdro-completion')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. Verbatim copy
// ---------------------------------------------------------------------------
const EXPECTED_PARA =
  "With your handoff packet and Blueprint entry both saved, you have what you need to move this forward. Share the packet with your divorce attorney or a QDRO specialist — they'll use it to draft the order that gets filed with the court. Your QDRO decisions will appear in the final ClearPath Blueprint at the end of the program.";

describe('QDROCompletionCallout — verbatim copy', () => {
  beforeEach(() => {
    seedReady();
    act(() => {
      seedSaved();
    });
  });

  it('renders an <h2> with exact textContent "Next Steps"', () => {
    render(<QDROCompletionCallout />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBe('Next Steps');
  });

  it('renders a <p> with exact full paragraph text', () => {
    render(<QDROCompletionCallout />);
    const root = screen.getByTestId('qdro-completion');
    const para = root.querySelector('p');
    expect(para).not.toBeNull();
    expect(para.textContent).toBe(EXPECTED_PARA);
  });

  it('paragraph contains the substring "you have what you need to move this forward"', () => {
    render(<QDROCompletionCallout />);
    expect(
      screen.getByText(/you have what you need to move this forward/),
    ).toBeInTheDocument();
  });

  it('paragraph contains the substring "appear in the final ClearPath Blueprint at the end of the program"', () => {
    render(<QDROCompletionCallout />);
    expect(
      screen.getByText(/appear in the final ClearPath Blueprint at the end of the program/),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 5. Does NOT gate on stale: mutation does not hide the callout
// ---------------------------------------------------------------------------
describe('QDROCompletionCallout — stale-independence', () => {
  it('still renders after m5 decision mutation (completion is not stale-gated)', () => {
    seedReady();
    act(() => {
      seedSaved();
    });
    render(<QDROCompletionCallout />);

    expect(screen.getByTestId('qdro-completion')).toBeInTheDocument();

    // Mutate m5 so decisions differ from any saved projection
    act(() => {
      useM5Store.getState().updateQDRODecision('a1', { allocationValue: 75 });
    });

    // Completion callout MUST still be in the document
    expect(screen.getByTestId('qdro-completion')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 6. Semantic HTML + brand tokens
// ---------------------------------------------------------------------------
function normalizeCss(property, value) {
  const el = document.createElement('div');
  el.style[property] = value;
  return el.style[property];
}

describe('QDROCompletionCallout — semantics and brand tokens', () => {
  beforeEach(() => {
    seedReady();
    act(() => {
      seedSaved();
    });
  });

  it('root has role="status" and a non-empty aria-label', () => {
    render(<QDROCompletionCallout />);
    const root = screen.getByTestId('qdro-completion');
    expect(root).toHaveAttribute('role', 'status');
    expect(root).toHaveAttribute('aria-label');
    expect(root.getAttribute('aria-label').length).toBeGreaterThan(0);
  });

  it('contains exactly one <h2> and one <p> within the root', () => {
    render(<QDROCompletionCallout />);
    const root = screen.getByTestId('qdro-completion');
    expect(root.querySelectorAll('h2').length).toBe(1);
    expect(root.querySelectorAll('p').length).toBe(1);
  });

  it('<h2> inline style fontFamily equals T.FONT_DISPLAY', () => {
    render(<QDROCompletionCallout />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.style.fontFamily).toBe(T.FONT_DISPLAY);
  });

  it('<h2> color is a T.* token value (T.NAVY)', () => {
    render(<QDROCompletionCallout />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.style.color).toBe(normalizeCss('color', T.NAVY));
  });

  it('<p> inline style fontFamily equals T.FONT_BODY', () => {
    render(<QDROCompletionCallout />);
    const root = screen.getByTestId('qdro-completion');
    const para = root.querySelector('p');
    expect(para.style.fontFamily).toBe(T.FONT_BODY);
  });

  it('root inline style uses T.PARCHMENT background (no hardcoded hex)', () => {
    render(<QDROCompletionCallout />);
    const root = screen.getByTestId('qdro-completion');
    expect(root.style.background).toBe(normalizeCss('background', T.PARCHMENT));
  });

  it('root border contains the T.GOLD_BORDER token value (no hardcoded hex)', () => {
    render(<QDROCompletionCallout />);
    const root = screen.getByTestId('qdro-completion');
    expect(root.style.border).toContain(normalizeCss('borderColor', T.GOLD_BORDER));
  });
});
