// Structure-only tests for the §8.7 PDF packet (PR4-1: @react-pdf/renderer,
// client-side). We assert the React element tree only — never rasterize or
// generate PDF bytes (jsdom cannot, and PR4-1 generation is browser-side).
//
// QDROHandoffPacketPDF is a pure, hook-free function component, so we invoke
// it directly and walk the returned element tree.

import { describe, it, expect } from 'vitest';
import { Document, Page, Text } from '@react-pdf/renderer';
import QDROHandoffPacketPDF from '../pdf.jsx';
import { QDG_DISCLAIMER_BULLETS } from '@/src/lib/qdro';

const GEN_AT = '2026-05-19T12:00:00.000Z';

const dc = {
  userRole: 'participant', planType: 'dc', planName: 'MegaCorp 401(k)', employer: 'MegaCorp',
  pvSource: null, _prePopSources: {},
  decisions: { allocationType: 'percentage', allocationValue: 50, receiptMethod: null, valuationDate: { type: 'divorce', date: '2026-01-01' } },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};
const ira = {
  userRole: 'alternatePayee', planType: 'ira', planName: 'Spouse IRA', employer: null,
  pvSource: null, _prePopSources: {},
  decisions: { decreeLanguageConfirmed: 'yes', custodian: 'Vanguard', custodianNotes: '' },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};
const privateDb = {
  userRole: 'participant', planType: 'private_db', planName: 'Acme Pension', employer: 'Acme',
  pvSource: null, _prePopSources: {}, decisions: {},
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};
const govFlag = {
  userRole: 'alternatePayee', planType: 'gov_civilian', planName: 'FERS Pension', employer: 'OPM',
  pvSource: null, _prePopSources: {},
  decisions: { starterQuestionResponses: [{ questionId: 'gov_civilian_q1', response: 'marital fraction' }] },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};

const LOCKED_ROUTING_HEADER =
  'The following retirement assets require specialist drafting. Engage attorneys experienced with each regime; generalist domestic-relations counsel often runs into rejection.';

function tree(state) {
  const acc = { types: [], text: [] };
  (function walk(node) {
    if (node == null || typeof node === 'boolean') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (typeof node === 'string' || typeof node === 'number') {
      acc.text.push(String(node));
      return;
    }
    acc.types.push(node.type);
    walk(node.props?.children);
  })(QDROHandoffPacketPDF({ state, generatedAt: GEN_AT }));
  return { ...acc, joined: acc.text.join('\n') };
}

describe('QDROHandoffPacketPDF — structure (no rasterization)', () => {
  it('root element is a React-PDF Document containing ≥1 Page', () => {
    const el = QDROHandoffPacketPDF({ state: { qdroDecision: { assets: { d: dc } } }, generatedAt: GEN_AT });
    expect(el.type).toBe(Document);
    const { types } = tree({ qdroDecision: { assets: { d: dc } } });
    expect(types.filter((t) => t === Page).length).toBeGreaterThanOrEqual(1);
    expect(types).toContain(Text);
  });

  it('Text content includes the packet title and the §8.7.3 summary counts', () => {
    const { joined } = tree({ qdroDecision: { assets: { d: dc, i: ira } } });
    expect(joined).toContain('Attorney Handoff Packet');
    expect(joined).toContain('1 DC account(s)');
    expect(joined).toContain(GEN_AT);
  });

  it('includes the LOCKED §8.7.5 routing header when a flag-only asset is present', () => {
    expect(tree({ qdroDecision: { assets: { f: govFlag } } }).joined).toContain(LOCKED_ROUTING_HEADER);
  });

  it('omits the routing header when no flag-only asset is present', () => {
    expect(tree({ qdroDecision: { assets: { d: dc } } }).joined).not.toContain(LOCKED_ROUTING_HEADER);
  });

  it('renders the §8.6.3 PV-missing warning for a private_db asset with null pvSource', () => {
    expect(tree({ qdroDecision: { assets: { p: privateDb } } }).joined).toContain(
      'PV not yet computed for 1 private DB asset(s).',
    );
  });

  it('includes all 4 LOCKED §8.9.2 disclaimer bullets', () => {
    const { joined } = tree({ qdroDecision: { assets: { d: dc } } });
    for (const b of QDG_DISCLAIMER_BULLETS) expect(joined).toContain(b);
  });

  it('orders sections per §8.7.2: title → private_db → dc → ira → specialist-routing → disclaimer', () => {
    const { text } = tree({ qdroDecision: { assets: { d: dc, i: ira, p: privateDb, f: govFlag } } });
    const at = (needle) => text.findIndex((t) => t.includes(needle));
    expect(at('Attorney Handoff Packet')).toBeLessThan(at('Acme Pension'));
    expect(at('Acme Pension')).toBeLessThan(at('MegaCorp 401(k)'));
    expect(at('MegaCorp 401(k)')).toBeLessThan(at('Spouse IRA'));
    expect(at('Spouse IRA')).toBeLessThan(at(LOCKED_ROUTING_HEADER));
    expect(at(LOCKED_ROUTING_HEADER)).toBeLessThan(at(QDG_DISCLAIMER_BULLETS[0]));
  });
});
