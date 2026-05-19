/**
 * QDROFlagOnlyCapture tests — §8.4 / §8.5.6 / PR4-5.
 *
 * One WizardSection per asset, the consolidated §8.5.6 consult-specialist
 * callout, and 3 stacked multi-line free-text inputs (native <textarea>
 * fallback — WizardField has no multi-line variant, PR4-5). Verbatim
 * §8.5.6 wording is consumed from the PR1 getFlagOnlyBranch constant.
 * Write-through uses the real m5Store setQDROFlagOnlyAnswers setter
 * (Commit 1) — partial-merge into the locked §8.10.2 array shape.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QDROFlagOnlyCapture from '../QDROFlagOnlyCapture.jsx';
import { useM5Store } from '@/src/stores/m5Store';
import { getFlagOnlyBranch } from '@/src/lib/qdro';

const FLAG_TYPES = ['gov_civilian', 'military', 'state_municipal'];

function asset(overrides = {}) {
  return {
    userRole: 'alternatePayee',
    planType: 'gov_civilian',
    planName: 'Some plan',
    employer: null,
    decisions: {},
    pvSource: null,
    _prePopSources: {},
    metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
    ...overrides,
  };
}
function seedAsset(assetId, payload) {
  useM5Store.setState((state) => ({
    qdroDecision: { ...state.qdroDecision, assets: { ...state.qdroDecision.assets, [assetId]: payload } },
  }));
}
const getAsset = (id) => useM5Store.getState().qdroDecision.assets[id];

beforeEach(() => {
  localStorage.clear();
  useM5Store.persist?.rehydrate?.();
  useM5Store.setState((state) => ({ qdroDecision: { ...state.qdroDecision, assets: {} } }));
});

describe('QDROFlagOnlyCapture — §8.5.6 starter-Q capture (parametrized over flag-only types)', () => {
  for (const planType of FLAG_TYPES) {
    it(`${planType}: renders exactly 3 textareas labelled with verbatim §8.5.6 wording`, () => {
      seedAsset('f1', asset({ planType }));
      render(<QDROFlagOnlyCapture assetId="f1" planType={planType} />);
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(3);
      for (const q of getFlagOnlyBranch(planType).starterQuestions) {
        // a11y: label associated → getByLabelText resolves the textarea
        expect(screen.getByLabelText(q.wording).tagName).toBe('TEXTAREA');
      }
    });

    it(`${planType}: renders the consolidated §8.5.6 consult-specialist callout`, () => {
      seedAsset('f1', asset({ planType }));
      render(<QDROFlagOnlyCapture assetId="f1" planType={planType} />);
      expect(screen.getByTestId('qdg-consult-specialist')).toBeInTheDocument();
    });
  }
});

describe('QDROFlagOnlyCapture — store integration (real setQDROFlagOnlyAnswers)', () => {
  it('writes a typed response through to the locked §8.10.2 array shape', () => {
    seedAsset('f1', asset({ planType: 'military' }));
    render(<QDROFlagOnlyCapture assetId="f1" planType="military" />);
    const q1 = getFlagOnlyBranch('military').starterQuestions[0];
    fireEvent.change(screen.getByLabelText(q1.wording), { target: { value: 'yes 10/10' } });
    expect(getAsset('f1').decisions.starterQuestionResponses).toEqual([
      { questionId: q1.id, response: 'yes 10/10' },
    ]);
  });

  it('reflects existing store state in the textareas', () => {
    const q = getFlagOnlyBranch('gov_civilian').starterQuestions;
    seedAsset(
      'f1',
      asset({
        planType: 'gov_civilian',
        decisions: { starterQuestionResponses: [{ questionId: q[1].id, response: 'full survivor' }] },
      }),
    );
    render(<QDROFlagOnlyCapture assetId="f1" planType="gov_civilian" />);
    expect(screen.getByLabelText(q[1].wording)).toHaveValue('full survivor');
    expect(screen.getByLabelText(q[0].wording)).toHaveValue('');
  });

  it('partial-merge: editing Q2 preserves a previously captured Q1 response', () => {
    const q = getFlagOnlyBranch('state_municipal').starterQuestions;
    seedAsset(
      'f1',
      asset({
        planType: 'state_municipal',
        decisions: { starterQuestionResponses: [{ questionId: q[0].id, response: 'model order obtained' }] },
      }),
    );
    render(<QDROFlagOnlyCapture assetId="f1" planType="state_municipal" />);
    fireEvent.change(screen.getByLabelText(q[1].wording), { target: { value: 'divorce date' } });
    expect(getAsset('f1').decisions.starterQuestionResponses).toEqual([
      { questionId: q[0].id, response: 'model order obtained' },
      { questionId: q[1].id, response: 'divorce date' },
    ]);
  });
});

describe('QDROFlagOnlyCapture — fail-closed guards', () => {
  it('renders nothing for a non-flag planType', () => {
    seedAsset('f1', asset({ planType: 'dc' }));
    const { container } = render(<QDROFlagOnlyCapture assetId="f1" planType="dc" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the asset is absent from the store', () => {
    const { container } = render(<QDROFlagOnlyCapture assetId="missing" planType="gov_civilian" />);
    expect(container).toBeEmptyDOMElement();
  });
});
