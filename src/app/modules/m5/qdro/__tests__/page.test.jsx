/**
 * /modules/m5/qdro page tests — PR4 §3.2 mount.
 *
 * The QDGPacketReadyCallout mounts at top-of-page, above the classifier /
 * asset cards, and self-conditions on selectQDROPacketReady (PR4-4).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import QDROPage from '../page.jsx';
import { useM2Store } from '@/src/stores/m2Store';
import { useM5Store } from '@/src/stores/m5Store';

const dcParticipantComplete = {
  userRole: 'participant', planType: 'dc', planName: 'MegaCorp 401(k)', employer: 'MegaCorp',
  pvSource: null, _prePopSources: {},
  decisions: { allocationType: 'percentage', allocationValue: 50, receiptMethod: null, valuationDate: { type: 'divorce', date: '2026-01-01' } },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};

beforeEach(() => {
  localStorage.clear();
  useM2Store.persist?.rehydrate?.();
  useM5Store.persist?.rehydrate?.();
  useM2Store.setState((s) => ({ maritalEstateInventory: { ...s.maritalEstateInventory, items: [] } }));
  useM5Store.setState((s) => ({ qdroDecision: { ...s.qdroDecision, assets: {} } }));
});

describe('QDROPage — packet-ready callout mount (§3.2 / PR4-4)', () => {
  it('renders the packet-ready callout above the classifier when the packet is ready', () => {
    useM5Store.setState((s) => ({
      qdroDecision: { ...s.qdroDecision, assets: { a1: dcParticipantComplete } },
    }));
    render(<QDROPage />);

    const callout = screen.getByTestId('qdg-packet-ready');
    const classifier = screen.getByTestId('qdro-classifier');
    expect(callout).toBeInTheDocument();
    expect(classifier).toBeInTheDocument();
    // callout precedes classifier in document order ("top-of-page, above asset cards")
    expect(
      callout.compareDocumentPosition(classifier) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('does not render the callout when the packet is not ready, but still renders the classifier', () => {
    render(<QDROPage />);
    expect(screen.queryByTestId('qdg-packet-ready')).not.toBeInTheDocument();
    expect(screen.getByTestId('qdro-classifier')).toBeInTheDocument();
  });
});
