import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import DeferredCompAnalyzer from '../DeferredCompAnalyzer';
import StepReview from '../StepReview';
import StepSave from '../StepSave';
import { useM6Store } from '@/src/stores/m6Store';
import useBlueprintStore from '@/src/stores/blueprintStore';

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

// Seed a fully-built analysis through the real store actions (slice-2 verified):
// hire 2018 / grant 2022 / sep 2024, one tranche vest 2026 × 100 shares, fmv 50,
// strike 10 → Hug 75 marital shares ($3,000 intrinsic), Nelson 50 ($2,000).
function seedFullAnalysis(state = 'VA') {
  seedStub(STUB_OPTION);
  const s = useM6Store.getState();
  s.selectStub('dcs_opt_1');
  s.setAnalysisField('hireDate', '2018-01-01');
  s.setAnalysisField('separationDate', '2024-01-01');
  s.setAnalysisField('state', state);
  s.setAnalysisField('fmv', 50);
  s.addTranche();
  const id = dca().analysis.tranches[0].id;
  s.setAnalysisField(`tranches.${id}.vestDate`, '2026-01-01');
  s.setAnalysisField(`tranches.${id}.shares`, '100');
}

const BANNED_ASSERTIONS = ['you get', "you'll receive", 'your share is', '50-50', 'half of'];

beforeEach(() => {
  localStorage.clear();
  useM6Store.getState().resetAnalysis();
  useBlueprintStore.getState().resetBlueprint();
});

describe('DeferredCompAnalyzer — tier gating', () => {
  it.each(['free', 'essentials'])('shows the locked teaser (no wizard) for %s', (tier) => {
    render(<DeferredCompAnalyzer userTier={tier} />);
    expect(screen.getByTestId('deferred-comp-locked-teaser')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Unlock with Full Access/i })).toHaveAttribute('href', '/upgrade');
    expect(screen.queryByTestId('dca-step-select')).toBeNull();
  });

  it.each(['navigator', 'signature'])('shows the wizard (Select grant first) for %s', (tier) => {
    render(<DeferredCompAnalyzer userTier={tier} />);
    expect(screen.getByTestId('dca-step-select')).toBeInTheDocument();
    expect(screen.queryByTestId('deferred-comp-locked-teaser')).toBeNull();
  });
});

describe('DeferredCompAnalyzer — Select step', () => {
  it('shows the empty state when no deferred-comp stubs exist', () => {
    render(<DeferredCompAnalyzer userTier="navigator" />);
    expect(screen.getByTestId('dca-select-empty')).toBeInTheDocument();
  });

  it('lists each unresolved stub and advances to Dates on Analyze (selectStub wired)', () => {
    seedStub(STUB_OPTION);
    render(<DeferredCompAnalyzer userTier="navigator" />);
    fireEvent.click(screen.getByTestId('dca-analyze-dcs_opt_1'));
    expect(useM6Store.getState().deferredCompAnalyzer.stubId).toBe('dcs_opt_1');
    expect(screen.getByTestId('dca-step-dates')).toBeInTheDocument();
  });
});

describe('DeferredCompAnalyzer — Review step (Hug/Nelson side by side, portion only)', () => {
  it('shows both formulas with marital-share counts and the intrinsic estimate', () => {
    seedFullAnalysis('VA');
    render(<StepReview onBack={() => {}} onNext={() => {}} />);

    const hug = screen.getByTestId('dca-review-hug');
    const nelson = screen.getByTestId('dca-review-nelson');
    expect(within(hug).getByText(/Hug/)).toBeInTheDocument();
    expect(within(nelson).getByText(/Nelson/)).toBeInTheDocument();
    // Marital PORTION counts (Hug 75 / Nelson 50) — never a post-split figure.
    expect(within(hug).getByTestId('dca-hug-marital-shares')).toHaveTextContent('75');
    expect(within(nelson).getByTestId('dca-nelson-marital-shares')).toHaveTextContent('50');
    // Intrinsic-value estimate of the marital portion ($3,000 / $2,000).
    expect(within(hug).getByTestId('dca-hug-intrinsic')).toHaveTextContent('$3,000');
    expect(within(nelson).getByTestId('dca-nelson-intrinsic')).toHaveTextContent('$2,000');
  });

  it('renders the disclaimer and the state-framing line', () => {
    seedFullAnalysis('VA');
    render(<StepReview onBack={() => {}} onNext={() => {}} />);
    expect(screen.getByTestId('dca-disclaimer')).toHaveTextContent(/not the final split/i);
    expect(screen.getByTestId('dca-state-framing')).toHaveTextContent(/equitable-distribution state/i);
  });

  it('frames community-property states distinctly', () => {
    seedFullAnalysis('CA');
    render(<StepReview onBack={() => {}} onNext={() => {}} />);
    expect(screen.getByTestId('dca-state-framing')).toHaveTextContent(/community-property state/i);
  });

  it('TC-14: the rendered review asserts no split — none of the banned vocabulary appears', () => {
    seedFullAnalysis('VA');
    const { container } = render(<StepReview onBack={() => {}} onNext={() => {}} />);
    const text = container.textContent.toLowerCase();
    for (const phrase of BANNED_ASSERTIONS) {
      expect(text).not.toContain(phrase.toLowerCase());
    }
  });
});

describe('DeferredCompAnalyzer — Save step', () => {
  it('saves the analysis to the Blueprint (stub resolved) and shows success', () => {
    seedFullAnalysis('VA');
    render(<StepSave onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('dca-save-confirm'));
    const stub = useBlueprintStore.getState().deferredCompStubs.find((s) => s.id === 'dcs_opt_1');
    expect(stub.resolved).toBe(true);
    expect(stub.metadata.maritalShares).toEqual({ hug: 75, nelson: 50 });
    expect(screen.getByTestId('dca-save-success')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View your Blueprint/i })).toHaveAttribute('href', '/blueprint');
  });
});
