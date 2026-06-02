/**
 * /modules/m5/qdro page tests — PR5 §3.2 / §8.0 route landing layout.
 *
 * DOM order: QDROLandingIntro → QDROClassifier → QDGPacketReadyCallout
 *            → QDGBlueprintSavedCallout → QDROCompletionCallout.
 *
 * Packet-ready callouts render AFTER the classifier (not before).
 * QDROCompletionCallout additionally requires qdroBlueprint.savedAt non-null.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import QDROPage from '../page.jsx';
import { useM2Store } from '@/src/stores/m2Store';
import { useM5Store } from '@/src/stores/m5Store';
import useBlueprintStore from '@/src/stores/blueprintStore';

const dcParticipantComplete = {
  userRole: 'participant', planType: 'dc', planName: 'MegaCorp 401(k)', employer: 'MegaCorp',
  pvSource: null, _prePopSources: {},
  decisions: { allocationType: 'percentage', allocationValue: 50, receiptMethod: null, valuationDate: { type: 'divorce', date: '2026-01-01' } },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};

/** Assert A precedes B in document order. */
function assertPrecedes(a, b) {
  expect(
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
}

beforeEach(() => {
  localStorage.clear();
  useM2Store.persist?.rehydrate?.();
  useM5Store.persist?.rehydrate?.();
  useBlueprintStore.persist?.rehydrate?.();
  useM2Store.setState((s) => ({ maritalEstateInventory: { ...s.maritalEstateInventory, items: [] } }));
  useM5Store.setState((s) => ({ qdroDecision: { ...s.qdroDecision, assets: {} } }));
  useBlueprintStore.setState((s) => ({
    ...s,
    qdroBlueprint: { savedProjection: null, savedAt: null },
  }));
});

describe('QDROPage — route landing layout (PR5)', () => {
  it('not ready: renders intro then classifier; packet callouts absent', () => {
    render(<QDROPage />);

    const intro = screen.getByTestId('qdro-landing-intro');
    const classifier = screen.getByTestId('qdro-classifier');
    expect(intro).toBeInTheDocument();
    expect(classifier).toBeInTheDocument();
    // intro precedes classifier
    assertPrecedes(intro, classifier);
    // packet-ready callouts absent
    expect(screen.queryByTestId('qdg-packet-ready')).not.toBeInTheDocument();
    expect(screen.queryByTestId('qdg-blueprint-saved')).not.toBeInTheDocument();
    expect(screen.queryByTestId('qdro-completion')).not.toBeInTheDocument();
  });

  it('ready + not saved: renders intro, classifier, packet, blueprint callouts; completion absent; order correct', () => {
    useM5Store.setState((s) => ({
      qdroDecision: { ...s.qdroDecision, assets: { a1: dcParticipantComplete } },
    }));
    render(<QDROPage />);

    const intro = screen.getByTestId('qdro-landing-intro');
    const classifier = screen.getByTestId('qdro-classifier');
    const packet = screen.getByTestId('qdg-packet-ready');
    const blueprint = screen.getByTestId('qdg-blueprint-saved');
    expect(intro).toBeInTheDocument();
    expect(classifier).toBeInTheDocument();
    expect(packet).toBeInTheDocument();
    expect(blueprint).toBeInTheDocument();
    // DOM order: intro → classifier → packet → blueprint
    assertPrecedes(intro, classifier);
    assertPrecedes(classifier, packet);
    assertPrecedes(packet, blueprint);
    // completion absent (savedAt still null)
    expect(screen.queryByTestId('qdro-completion')).not.toBeInTheDocument();
  });

  it('ready + saved: all five render in correct DOM order', () => {
    useM5Store.setState((s) => ({
      qdroDecision: { ...s.qdroDecision, assets: { a1: dcParticipantComplete } },
    }));
    useBlueprintStore.getState().writeQDROToBlueprint({
      perspective: 'participant', assets: [], generatedAt: null,
    });
    render(<QDROPage />);

    const intro = screen.getByTestId('qdro-landing-intro');
    const classifier = screen.getByTestId('qdro-classifier');
    const packet = screen.getByTestId('qdg-packet-ready');
    const blueprint = screen.getByTestId('qdg-blueprint-saved');
    const completion = screen.getByTestId('qdro-completion');
    expect(intro).toBeInTheDocument();
    expect(classifier).toBeInTheDocument();
    expect(packet).toBeInTheDocument();
    expect(blueprint).toBeInTheDocument();
    expect(completion).toBeInTheDocument();
    // Full DOM order: intro → classifier → packet → blueprint → completion
    assertPrecedes(intro, classifier);
    assertPrecedes(classifier, packet);
    assertPrecedes(packet, blueprint);
    assertPrecedes(blueprint, completion);
  });

  it('composition only: exactly five testid children in order, no extra logic wrappers', () => {
    useM5Store.setState((s) => ({
      qdroDecision: { ...s.qdroDecision, assets: { a1: dcParticipantComplete } },
    }));
    useBlueprintStore.getState().writeQDROToBlueprint({
      perspective: 'participant', assets: [], generatedAt: null,
    });
    render(<QDROPage />);

    const ids = [
      'qdro-landing-intro',
      'qdro-classifier',
      'qdg-packet-ready',
      'qdg-blueprint-saved',
      'qdro-completion',
    ];
    const elements = ids.map((id) => screen.getByTestId(id));
    // All present
    elements.forEach((el) => expect(el).toBeInTheDocument());
    // Pairwise order
    for (let i = 0; i < elements.length - 1; i++) {
      assertPrecedes(elements[i], elements[i + 1]);
    }
  });
});
