/**
 * SchematicInset — smoke tests for the dark recessed schematic panel:
 *
 *   1. Renders all 12 schematic cards with the relabeled design copy verbatim.
 *   2. Marks exactly one card ACTIVE when at least one section is non-complete.
 *   3. Marks zero cards ACTIVE when every section is complete.
 *   4. Title-block CLIENT row carries the real Clerk userName, uppercased.
 *   5. Title-block STATUS row carries the verbatim "NOT LEGAL ADVICE" string.
 *   6. No design placeholder ("SARAH M.") ever appears.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import SchematicInset from '../SchematicInset.jsx';

function buildSections(overrides = {}) {
  const empty = (label, sourceModule) => ({ status: 'empty', label, sourceModule, data: null });
  const base = {
    s1:  empty('Personal Profile', 'm1'),
    s2:  empty('Income Analysis', 'm3'),
    s3:  empty('Asset Inventory', 'm2'),
    s4:  empty('Tax Analysis', 'm4'),
    s5:  empty('Property Division', 'm2+m4'),
    s6:  empty('Retirement Plan Division', null),
    s7:  empty('Expense Analysis', 'm3'),
    s8:  empty('Support Analysis', 'm5'),
    s9:  empty('Home Decision', 'm5'),
    s10: empty('Negotiation Strategy', 'm6'),
    s11: empty('Settlement Offer Overview', 'm6'),
    s12: empty('Action Plan & Timeline', 'm7'),
  };
  for (const [k, v] of Object.entries(overrides)) base[k] = { ...base[k], ...v };
  return base;
}

afterEach(() => cleanup());

describe('SchematicInset', () => {
  it('renders all 12 cards with the relabeled design copy', () => {
    render(<SchematicInset sections={buildSections()} clientName="Jane Doe" lastUpdatedISO={null} />);
    const cards = screen.getAllByTestId('schematic-card');
    expect(cards).toHaveLength(12);
    const labels = cards.map((c) => c.getAttribute('data-card-label'));
    expect(labels).toEqual([
      'Your Story & Goals',
      'Asset Inventory',
      'Home Decision',
      'Income Analysis',
      'Property Division',
      'Retirement & Pensions',
      'Expense & Budget',
      'Tax Impact',
      'Support Analysis',
      'Priorities & Trade-offs',
      'Settlement Scenarios',
      'Action Plan',
    ]);
  });

  it('marks exactly one card ACTIVE when at least one section is non-complete', () => {
    render(<SchematicInset sections={buildSections()} clientName="Jane" lastUpdatedISO={null} />);
    const activeCards = screen.getAllByTestId('schematic-card').filter((c) => c.getAttribute('data-active') === 'true');
    expect(activeCards).toHaveLength(1);
    // s1 is first in card order and empty → ACTIVE
    expect(activeCards[0].getAttribute('data-card-label')).toBe('Your Story & Goals');
  });

  it('marks zero cards ACTIVE when every section is complete', () => {
    const all = buildSections();
    for (const k of Object.keys(all)) all[k] = { ...all[k], status: 'complete' };
    render(<SchematicInset sections={all} clientName="Jane" lastUpdatedISO={null} />);
    const activeCards = screen.getAllByTestId('schematic-card').filter((c) => c.getAttribute('data-active') === 'true');
    expect(activeCards).toHaveLength(0);
  });

  it('ACTIVE follows the first non-complete card in zone order (not section number order)', () => {
    // Card order is s1, s3, s9, s2, s5, ... — so if s1 + s3 + s9 are complete, ACTIVE is s2.
    const sections = buildSections({
      s1: { status: 'complete' },
      s3: { status: 'complete' },
      s9: { status: 'complete' },
    });
    render(<SchematicInset sections={sections} clientName="Jane" lastUpdatedISO={null} />);
    const activeCards = screen.getAllByTestId('schematic-card').filter((c) => c.getAttribute('data-active') === 'true');
    expect(activeCards).toHaveLength(1);
    expect(activeCards[0].getAttribute('data-card-label')).toBe('Income Analysis');
  });

  it('renders the title-block with CLIENT = uppercased Clerk userName and STATUS = "NOT LEGAL ADVICE"', () => {
    render(<SchematicInset sections={buildSections()} clientName="Sarah Mitchell" lastUpdatedISO="2026-06-01T12:00:00Z" />);
    const inset = screen.getByTestId('schematic-inset');
    const text = inset.textContent;
    expect(text).toContain('CLIENT');
    expect(text).toContain('SARAH MITCHELL'); // uppercased real name
    expect(text).toContain('STATUS');
    expect(text).toContain('NOT LEGAL ADVICE');
    expect(text).not.toContain('SARAH M.'); // never the design placeholder
  });

  it('renders a "—" placeholder when no Clerk name is available (never hardcodes a name)', () => {
    render(<SchematicInset sections={buildSections()} clientName="" lastUpdatedISO={null} />);
    const inset = screen.getByTestId('schematic-inset');
    expect(inset.textContent).toContain('CLIENT');
    expect(inset.textContent).toContain('—');
    expect(inset.textContent).not.toContain('SARAH');
  });

  it('renders the design ACTIVE-glow class only on the ACTIVE card', () => {
    render(<SchematicInset sections={buildSections()} clientName="Jane" lastUpdatedISO={null} />);
    const cards = screen.getAllByTestId('schematic-card');
    for (const c of cards) {
      const isActive = c.getAttribute('data-active') === 'true';
      if (isActive) {
        expect(c.className).toContain('is-active');
      } else {
        expect(c.className).not.toContain('is-active');
      }
    }
  });

  it('includes the inline #glass-distortion SVG filter once', () => {
    const { container } = render(<SchematicInset sections={buildSections()} clientName="Jane" lastUpdatedISO={null} />);
    expect(container.querySelectorAll('#glass-distortion')).toHaveLength(1);
  });
});
