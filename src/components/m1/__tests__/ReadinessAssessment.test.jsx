import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import ReadinessAssessment from '@/src/components/m1/ReadinessAssessment';
import * as RA from '@/src/components/m1/ReadinessAssessment';
import { useM1Store } from '@/src/stores/m1Store';
import useBlueprintStore from '@/src/stores/blueprintStore';

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
const COMPONENT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../ReadinessAssessment.jsx'
);

// jsdom has no matchMedia. Default the flow tests to reduced-motion = true so
// auto-advance is OFF and a deterministic Continue button drives navigation
// (no timers). The auto-advance / input-lock tests opt OUT (reduced=false) and
// use fake timers explicitly.
function mockReducedMotion(reduced) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: reduced && /reduced-motion/.test(query),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

const Q_IDS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'];

// Build the m1Store answers array ([{questionId, score}]) from a per-id map.
function answersFromMap(map) {
  return Q_IDS.filter((id) => map[id] !== undefined).map((id) => ({
    questionId: id,
    score: map[id],
  }));
}

function seedCompleted(results, { budgetGapCompleted = false } = {}) {
  useM1Store.setState({
    readinessAssessment: {
      answers: results.__answers || [],
      completed: true,
      results: {
        totalScore: results.totalScore,
        domainScores: results.domainScores,
        tier: results.tier,
      },
    },
    budgetGap: {
      inputs: {},
      completed: budgetGapCompleted,
      results: budgetGapCompleted ? { adjustedMonthlyIncome: 1, totalMonthlyExpenses: 1, monthlyGap: 0, gapPercent: 0 } : null,
      emailCaptured: false,
    },
  });
}

// Click the option at a given Likert score (0..3 == row order) then advance via
// the Continue / final button (reduced-motion deterministic path).
function answerCurrent(score, { last = false } = {}) {
  const radios = screen.getAllByRole('radio');
  fireEvent.click(radios[score]);
  const btn = screen.getByRole('button', {
    name: last ? /See my snapshot/i : /Continue/i,
  });
  fireEvent.click(btn);
}

beforeEach(() => {
  window.scrollTo = vi.fn();
  mockReducedMotion(true);
  useM1Store.setState({
    readinessAssessment: { answers: [], completed: false, results: null },
    budgetGap: { inputs: {}, completed: false, results: null, emailCaptured: false },
  });
  // Reset the §1 blueprint section to a known-empty baseline.
  const bp = useBlueprintStore.getState();
  bp.updatePersonalProfile({ assessment: null, budgetGap: null });
});

afterEach(() => {
  vi.useRealTimers();
});

// ═════════════════════════════════════════════════════════════════
// PRESERVED LOGIC — scoring / classification (preservation proof)
// ═════════════════════════════════════════════════════════════════
describe('ReadinessAssessment — preserved scoring logic', () => {
  it('exports the pure classify + computeResults helpers', () => {
    expect(typeof RA.classify).toBe('function');
    expect(typeof RA.computeResults).toBe('function');
  });

  it('classify honors the ≤10 / ≤20 / else tier thresholds at the boundaries', () => {
    expect(RA.classify(0)).toBe('exploring');
    expect(RA.classify(10)).toBe('exploring');
    expect(RA.classify(11)).toBe('preparing');
    expect(RA.classify(20)).toBe('preparing');
    expect(RA.classify(21)).toBe('ready');
    expect(RA.classify(30)).toBe('ready');
  });

  it('computeResults sums per-domain and total from the array answer shape', () => {
    const answers = answersFromMap({
      q1: 2, q2: 1, q3: 2, q4: 1, q5: 2, q6: 2, q7: 0, q8: 1, q9: 3, q10: 2,
    });
    const r = RA.computeResults(answers);
    expect(r.domainScores).toEqual({
      incomeAwareness: 3,
      debtAwareness: 3,
      assetAwareness: 4,
      documentAccess: 1,
      professionalReadiness: 5,
    });
    expect(r.totalScore).toBe(16);
    expect(r.tier).toBe('preparing');
  });

  it('computeResults: all-zero → 0 total, exploring', () => {
    const r = RA.computeResults(answersFromMap(Object.fromEntries(Q_IDS.map((id) => [id, 0]))));
    expect(r.totalScore).toBe(0);
    expect(r.tier).toBe('exploring');
    Object.values(r.domainScores).forEach((v) => expect(v).toBe(0));
  });

  it('computeResults: all-three → 30 total, ready', () => {
    const r = RA.computeResults(answersFromMap(Object.fromEntries(Q_IDS.map((id) => [id, 3]))));
    expect(r.totalScore).toBe(30);
    expect(r.tier).toBe('ready');
  });
});

// ═════════════════════════════════════════════════════════════════
// WELCOME phase (new screen)
// ═════════════════════════════════════════════════════════════════
describe('ReadinessAssessment — welcome phase', () => {
  it('a new/incomplete user lands on the welcome screen with the gold-italic payoff + expectation cards + Begin', () => {
    render(<ReadinessAssessment />);
    expect(screen.getByText('Life Transition Readiness')).toBeInTheDocument();
    expect(screen.getByText(/Divorce brings a lot of unknowns/)).toBeInTheDocument();
    expect(screen.getByText(/This is where you start sorting them out/)).toBeInTheDocument();
    expect(screen.getByText('About 5 minutes')).toBeInTheDocument();
    expect(screen.getByText('Completely private')).toBeInTheDocument();
    expect(screen.getByText('No right answers')).toBeInTheDocument();
    expect(screen.getByText(/Certified Divorce Financial Analyst/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Begin the assessment/i })).toBeInTheDocument();
  });

  it('Begin moves to the first unanswered question', () => {
    render(<ReadinessAssessment />);
    fireEvent.click(screen.getByRole('button', { name: /Begin the assessment/i }));
    expect(screen.getByText('Question 1 of 10')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Do you know your household.s gross monthly income/i })
    ).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════
// QUESTION phase
// ═════════════════════════════════════════════════════════════════
describe('ReadinessAssessment — question phase', () => {
  function begin() {
    render(<ReadinessAssessment />);
    fireEvent.click(screen.getByRole('button', { name: /Begin the assessment/i }));
  }

  it('renders a 4-option radiogroup, the dimension eyebrow, and an aria progressbar', () => {
    begin();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByText('Income Awareness')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '1');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
    expect(screen.getByText(/no right answers here/i)).toBeInTheDocument();
  });

  it('writes each selection to the m1 store via setReadinessAnswer (array shape)', () => {
    begin();
    fireEvent.click(screen.getAllByRole('radio')[2]); // score 2
    const answers = useM1Store.getState().readinessAssessment.answers;
    expect(answers).toContainEqual({ questionId: 'q1', score: 2 });
  });

  it('reduced-motion: a Continue button appears after selecting and advances to Q2', () => {
    begin();
    fireEvent.click(screen.getAllByRole('radio')[1]);
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    expect(screen.getByText('Question 2 of 10')).toBeInTheDocument();
  });

  it('Back from Q1 returns to the welcome screen', () => {
    begin();
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(screen.getByRole('button', { name: /Begin the assessment/i })).toBeInTheDocument();
  });

  it('the final question shows a "See my snapshot" affordance', () => {
    begin();
    for (let i = 0; i < 9; i++) answerCurrent(0);
    expect(screen.getByText('Question 10 of 10')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('radio')[0]);
    expect(screen.getByRole('button', { name: /See my snapshot/i })).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════
// AUTO-ADVANCE + input-lock safeguard (motion path, fake timers)
// ═════════════════════════════════════════════════════════════════
describe('ReadinessAssessment — auto-advance + input-lock', () => {
  it('auto-advances ~520ms after a selection when motion is allowed', () => {
    vi.useFakeTimers();
    mockReducedMotion(false);
    render(<ReadinessAssessment />);
    fireEvent.click(screen.getByRole('button', { name: /Begin the assessment/i }));
    fireEvent.click(screen.getAllByRole('radio')[0]);
    expect(screen.getByText('Question 1 of 10')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(520 + 200); });
    expect(screen.getByText('Question 2 of 10')).toBeInTheDocument();
  });

  it('ignores a tap on the freshly-shown next question for ~250ms (mistap guard), then accepts it', () => {
    vi.useFakeTimers();
    mockReducedMotion(false);
    render(<ReadinessAssessment />);
    fireEvent.click(screen.getByRole('button', { name: /Begin the assessment/i }));
    fireEvent.click(screen.getAllByRole('radio')[0]); // answer Q1
    act(() => { vi.advanceTimersByTime(520 + 200); }); // now on Q2, input briefly locked

    // Immediate (locked) tap must NOT register an answer for q2…
    fireEvent.click(screen.getAllByRole('radio')[3]);
    act(() => { vi.advanceTimersByTime(520 + 200); });
    expect(screen.getByText('Question 2 of 10')).toBeInTheDocument(); // did not advance
    expect(
      useM1Store.getState().readinessAssessment.answers.find((a) => a.questionId === 'q2')
    ).toBeUndefined();

    // …but after the lock window a tap is accepted and advances.
    act(() => { vi.advanceTimersByTime(300); });
    fireEvent.click(screen.getAllByRole('radio')[3]);
    act(() => { vi.advanceTimersByTime(520 + 200); });
    expect(screen.getByText('Question 3 of 10')).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════
// RESULTS phase — readiness bars (no radar), tiers, CTAs
// ═════════════════════════════════════════════════════════════════
describe('ReadinessAssessment — results phase', () => {
  it('a completed user lands directly on results (skips welcome)', () => {
    seedCompleted({
      totalScore: 16,
      domainScores: { incomeAwareness: 3, debtAwareness: 3, assetAwareness: 4, documentAccess: 1, professionalReadiness: 5 },
      tier: 'preparing',
    });
    render(<ReadinessAssessment />);
    expect(screen.getByText('Your Readiness Snapshot')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Begin the assessment/i })).not.toBeInTheDocument();
  });

  it('renders five horizontal readiness bars + the screen-reader scores table (no radar)', () => {
    seedCompleted({
      totalScore: 16,
      domainScores: { incomeAwareness: 3, debtAwareness: 3, assetAwareness: 4, documentAccess: 1, professionalReadiness: 5 },
      tier: 'preparing',
    });
    const { container } = render(<ReadinessAssessment />);
    expect(container.querySelectorAll('[data-testid="readiness-bar"]')).toHaveLength(5);
    expect(screen.getByText(/scores across five financial awareness domains/i)).toBeInTheDocument();
    // The radar is gone — no recharts surface/responsive container should mount.
    expect(container.querySelector('.recharts-responsive-container')).toBeNull();
  });

  it('exploring tier: headline, all-five weak cards, italic Budget-Gap teaser + CTA → /modules/m1/budget-gap', () => {
    seedCompleted({
      totalScore: 0,
      domainScores: { incomeAwareness: 0, debtAwareness: 0, assetAwareness: 0, documentAccess: 0, professionalReadiness: 0 },
      tier: 'exploring',
    });
    render(<ReadinessAssessment />);
    expect(screen.getByText(/at the beginning/i)).toBeInTheDocument();
    expect(screen.getByText('Where to start')).toBeInTheDocument();
    expect(screen.getByText(/Module 3 walks you through every income source/)).toBeInTheDocument();
    expect(screen.getByText(/Can I afford to live on my own/)).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /Budget Gap Calculator/i });
    expect(cta).toHaveAttribute('href', '/modules/m1/budget-gap');
  });

  it('preparing tier: production intro copy + Budget-Gap CTA shown when budgetGap not completed', () => {
    seedCompleted({
      totalScore: 16,
      domainScores: { incomeAwareness: 3, debtAwareness: 3, assetAwareness: 4, documentAccess: 1, professionalReadiness: 5 },
      tier: 'preparing',
    });
    render(<ReadinessAssessment />);
    expect(screen.getByText(/know more than you think/i)).toBeInTheDocument();
    expect(screen.getByText(/or continue exploring:/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Budget Gap Calculator/i })).toHaveAttribute(
      'href',
      '/modules/m1/budget-gap'
    );
  });

  it('preparing tier: Budget-Gap CTA is hidden once budgetGap is completed', () => {
    seedCompleted(
      {
        totalScore: 16,
        domainScores: { incomeAwareness: 3, debtAwareness: 3, assetAwareness: 4, documentAccess: 1, professionalReadiness: 5 },
        tier: 'preparing',
      },
      { budgetGapCompleted: true }
    );
    render(<ReadinessAssessment />);
    expect(screen.queryByRole('link', { name: /Budget Gap Calculator/i })).not.toBeInTheDocument();
  });

  it('ready tier: production all-strong message + Full Access / Essentials CTAs with upgrade routes', () => {
    seedCompleted({
      totalScore: 30,
      domainScores: { incomeAwareness: 6, debtAwareness: 6, assetAwareness: 6, documentAccess: 6, professionalReadiness: 6 },
      tier: 'ready',
    });
    render(<ReadinessAssessment />);
    expect(screen.getByText(/strong financial awareness/i)).toBeInTheDocument();
    expect(screen.getByText(/AI-guided access to the full curriculum/)).toBeInTheDocument();
    expect(screen.queryByText('Where to start')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explore Full Access/i })).toHaveAttribute(
      'href',
      '/upgrade?plan=navigator'
    );
    expect(screen.getByRole('link', { name: /start with Essentials/i })).toHaveAttribute(
      'href',
      '/upgrade?plan=essentials'
    );
  });

  it('keeps the gold-rail "Not legal advice" disclaimer and a Retake control', () => {
    seedCompleted({
      totalScore: 30,
      domainScores: { incomeAwareness: 6, debtAwareness: 6, assetAwareness: 6, documentAccess: 6, professionalReadiness: 6 },
      tier: 'ready',
    });
    render(<ReadinessAssessment />);
    expect(screen.getByText(/does not constitute financial, legal, or tax advice/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retake assessment/i })).toBeInTheDocument();
  });

  it('Retake clears the store and restarts at Q1', () => {
    seedCompleted({
      totalScore: 30,
      domainScores: { incomeAwareness: 6, debtAwareness: 6, assetAwareness: 6, documentAccess: 6, professionalReadiness: 6 },
      tier: 'ready',
    });
    render(<ReadinessAssessment />);
    fireEvent.click(screen.getByRole('button', { name: /Retake assessment/i }));
    expect(screen.getByText('Question 1 of 10')).toBeInTheDocument();
    expect(useM1Store.getState().readinessAssessment.completed).toBe(false);
    expect(useM1Store.getState().readinessAssessment.answers).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════
// STORE / BLUEPRINT side effects on completion
// ═════════════════════════════════════════════════════════════════
describe('ReadinessAssessment — completion side effects', () => {
  it('on finishing all 10, completes the m1 store and writes §1 of the blueprint', () => {
    // Answer with score 1 (total 10, still the `exploring` tier, every domain 2).
    // A non-zero total is used deliberately: blueprintStore maps `totalScore || null`,
    // so an all-zero (total 0) write would land as null — a pre-existing store quirk
    // that is out of scope for this redesign.
    render(<ReadinessAssessment />);
    fireEvent.click(screen.getByRole('button', { name: /Begin the assessment/i }));
    for (let i = 0; i < 10; i++) answerCurrent(1, { last: i === 9 });

    const ra = useM1Store.getState().readinessAssessment;
    expect(ra.completed).toBe(true);
    expect(ra.results.totalScore).toBe(10);
    expect(ra.results.tier).toBe('exploring');

    const s1 = useBlueprintStore.getState().sections.s1;
    expect(s1.data.tier).toBe('exploring');
    expect(s1.data.totalScore).toBe(10);
    expect(s1.data.domainScores).toEqual({
      incomeAwareness: 2, debtAwareness: 2, assetAwareness: 2, documentAccess: 2, professionalReadiness: 2,
    });
    expect(s1.data.assessmentCompletedAt).toBeTruthy();
  });
});

// ═════════════════════════════════════════════════════════════════
// A11y — focus restoration across transitions + live regions
// ═════════════════════════════════════════════════════════════════
describe('ReadinessAssessment — focus management + live regions', () => {
  it('moves keyboard focus to the question heading when the flow begins', () => {
    render(<ReadinessAssessment />);
    fireEvent.click(screen.getByRole('button', { name: /Begin the assessment/i }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();
  });

  it('re-homes focus to the next question heading after an auto-advance', () => {
    vi.useFakeTimers();
    mockReducedMotion(false);
    render(<ReadinessAssessment />);
    fireEvent.click(screen.getByRole('button', { name: /Begin the assessment/i }));
    fireEvent.click(screen.getAllByRole('radio')[0]);
    act(() => { vi.advanceTimersByTime(520 + 200); });
    expect(screen.getByText('Question 2 of 10')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();
  });

  it('moves focus to the results heading when results appear', () => {
    seedCompleted({
      totalScore: 30,
      domainScores: { incomeAwareness: 6, debtAwareness: 6, assetAwareness: 6, documentAccess: 6, professionalReadiness: 6 },
      tier: 'ready',
    });
    render(<ReadinessAssessment />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('announces the loading beat via a live region (role=status)', () => {
    vi.useFakeTimers();
    mockReducedMotion(false);
    useM1Store.setState({
      readinessAssessment: {
        answers: answersFromMap({ q1: 1, q2: 1, q3: 1, q4: 1, q5: 1, q6: 1, q7: 1, q8: 1, q9: 1 }),
        completed: false,
        results: null,
      },
      budgetGap: { inputs: {}, completed: false, results: null, emailCaptured: false },
    });
    render(<ReadinessAssessment />);
    fireEvent.click(screen.getByRole('button', { name: /Begin the assessment/i }));
    expect(screen.getByText('Question 10 of 10')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('radio')[1]); // answers q10 → all 10 done
    act(() => { vi.advanceTimersByTime(520 + 200); }); // auto-advance → loading
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(600 + 200); }); // loading beat → results
    expect(screen.getByText('Your Readiness Snapshot')).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════
// recharts removal guard (scoped to this file)
// ═════════════════════════════════════════════════════════════════
describe('ReadinessAssessment — recharts removed', () => {
  it('the component source no longer imports or uses recharts', () => {
    const src = readFileSync(COMPONENT_PATH, 'utf8');
    expect(src).not.toMatch(/from\s+['"]recharts['"]/);
    expect(src).not.toMatch(/require\(\s*['"]recharts['"]\s*\)/);
    expect(src).not.toMatch(/\bRadarChart\b/);
  });
});
