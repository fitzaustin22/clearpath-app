/**
 * QDGPacketReadyCallout tests — §8.9.1 `qdg_packet_ready` + PR4-4/PR4-6.
 *
 * Renders only when selectQDROPacketReady === true; emits the markdown +
 * combined PDF packets via blob-URL download (transient, no persistence).
 * The @react-pdf rasterizer boundary is stubbed (Commit 4 already
 * structure-tests the real PDF tree); URL.createObjectURL is stubbed
 * because jsdom does not implement it.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useM5Store } from '@/src/stores/m5Store';
import { QDG_CALLOUTS } from '@/src/lib/qdro';

vi.mock('@react-pdf/renderer', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    pdf: () => ({ toBlob: async () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }) }),
  };
});

import QDGPacketReadyCallout from '../QDGPacketReadyCallout.jsx';

const dcParticipantComplete = {
  userRole: 'participant', planType: 'dc', planName: 'MegaCorp 401(k)', employer: 'MegaCorp',
  pvSource: null, _prePopSources: {},
  decisions: { allocationType: 'percentage', allocationValue: 50, receiptMethod: null, valuationDate: { type: 'divorce', date: '2026-01-01' } },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};

let createdBlobs;
let anchorClicks;
let clickSpy;

function seedReady() {
  useM5Store.setState((s) => ({
    qdroDecision: { ...s.qdroDecision, assets: { a1: dcParticipantComplete } },
  }));
}

beforeEach(() => {
  localStorage.clear();
  useM5Store.persist?.rehydrate?.();
  useM5Store.setState((s) => ({ qdroDecision: { ...s.qdroDecision, assets: {} } }));

  createdBlobs = [];
  anchorClicks = [];
  globalThis.URL.createObjectURL = vi.fn((blob) => {
    createdBlobs.push(blob);
    return `blob:mock/${createdBlobs.length}`;
  });
  globalThis.URL.revokeObjectURL = vi.fn();
  clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function clickImpl() {
      anchorClicks.push({ download: this.download, href: this.href });
    });
});

afterEach(() => {
  clickSpy.mockRestore();
  vi.clearAllMocks();
});

describe('QDGPacketReadyCallout — visibility (PR4-4)', () => {
  it('renders nothing when the packet is not ready (no assets)', () => {
    const { container } = render(<QDGPacketReadyCallout />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the callout with the LOCKED §8.9.1 body when ready', () => {
    seedReady();
    render(<QDGPacketReadyCallout />);
    expect(screen.getByTestId('qdg-packet-ready')).toBeInTheDocument();
    expect(screen.getByText(QDG_CALLOUTS.qdg_packet_ready.body)).toBeInTheDocument();
  });

  it('exposes "Download markdown" and "Download PDF" buttons', () => {
    seedReady();
    render(<QDGPacketReadyCallout />);
    expect(screen.getByRole('button', { name: /download markdown/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
  });
});

describe('QDGPacketReadyCallout — markdown emission (PR4-6 transient blob)', () => {
  it('downloads a text/markdown blob with the §8 filename convention', async () => {
    seedReady();
    render(<QDGPacketReadyCallout />);
    fireEvent.click(screen.getByRole('button', { name: /download markdown/i }));
    await waitFor(() => expect(createdBlobs).toHaveLength(1));
    expect(createdBlobs[0].type).toBe('text/markdown');
    expect(anchorClicks[0].download).toMatch(
      /^clearpath-qdro-handoff-packet-\d{4}-\d{2}-\d{2}\.md$/,
    );
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('the markdown blob carries the generated packet (title + disclaimer)', async () => {
    seedReady();
    render(<QDGPacketReadyCallout />);
    fireEvent.click(screen.getByRole('button', { name: /download markdown/i }));
    await waitFor(() => expect(createdBlobs).toHaveLength(1));
    const text = await createdBlobs[0].text();
    expect(text).toContain('Attorney Handoff Packet');
    expect(text).toContain('This tool produces a decision-capture and handoff document, NOT a legal order.');
  });
});

describe('QDGPacketReadyCallout — PDF emission (PR4-1 client-side blob)', () => {
  it('downloads an application/pdf blob with the §8 filename convention', async () => {
    seedReady();
    render(<QDGPacketReadyCallout />);
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));
    await waitFor(() => expect(createdBlobs).toHaveLength(1));
    expect(createdBlobs[0].type).toBe('application/pdf');
    expect(anchorClicks[0].download).toMatch(
      /^clearpath-qdro-handoff-packet-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled();
  });
});

describe('QDGPacketReadyCallout — a11y', () => {
  it('the callout is an accessible status region and the actions are real buttons', () => {
    seedReady();
    render(<QDGPacketReadyCallout />);
    const region = screen.getByTestId('qdg-packet-ready');
    expect(region).toHaveAttribute('role');
    expect(region).toHaveAccessibleName();
    for (const b of screen.getAllByRole('button')) {
      expect(b.tagName).toBe('BUTTON');
      expect(b).toHaveAccessibleName();
    }
  });
});
