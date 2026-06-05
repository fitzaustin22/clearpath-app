/**
 * BlueprintSidebar — smoke tests for the right-column sidebar:
 *
 *   1. Full Access shows Preview + Export buttons (both wire to one trigger).
 *   2. Free / Essentials shows the inline locked CTA, no Preview/Export buttons.
 *   3. The stat number reflects deriveProgressCopy's percentage.
 *   4. The progress copy never mentions "attorney" (D1 consumer framing rule).
 *   5. UP NEXT card surfaces the ACTIVE card label and the right module copy.
 *   6. UP NEXT continue-link href targets the active section's source module.
 *   7. All-complete state shows the "Every section is written" sentinel and no
 *      Continue link.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import BlueprintSidebar from '../BlueprintSidebar.jsx';

function buildSections() {
  const empty = (label, sourceModule) => ({ status: 'empty', label, sourceModule, data: null });
  return {
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
}

afterEach(() => cleanup());

describe('BlueprintSidebar — tier gating', () => {
  it('Full Access (navigator) shows BOTH Preview and Export buttons', () => {
    render(
      <BlueprintSidebar
        sections={buildSections()}
        completedCount={4}
        partialCount={2}
        activeStoreKey="s4"
        userTier="navigator"
      />
    );
    expect(screen.getByTestId('schematic-preview-button')).toBeTruthy();
    expect(screen.getByTestId('schematic-export-button')).toBeTruthy();
    expect(screen.queryByTestId('schematic-export-locked')).toBeNull();
  });

  it('Full Access (signature legacy) gets the same unlocked buttons', () => {
    render(
      <BlueprintSidebar
        sections={buildSections()}
        completedCount={4}
        partialCount={2}
        activeStoreKey="s4"
        userTier="signature"
      />
    );
    expect(screen.getByTestId('schematic-preview-button')).toBeTruthy();
    expect(screen.getByTestId('schematic-export-button')).toBeTruthy();
  });

  it('Essentials shows the locked CTA, NOT the Preview/Export buttons', () => {
    render(
      <BlueprintSidebar
        sections={buildSections()}
        completedCount={4}
        partialCount={2}
        activeStoreKey="s4"
        userTier="essentials"
      />
    );
    expect(screen.getByTestId('schematic-export-locked')).toBeTruthy();
    expect(screen.queryByTestId('schematic-preview-button')).toBeNull();
    expect(screen.queryByTestId('schematic-export-button')).toBeNull();
  });

  it('Free tier also shows the locked CTA', () => {
    render(
      <BlueprintSidebar
        sections={buildSections()}
        completedCount={0}
        partialCount={0}
        activeStoreKey="s1"
        userTier="free"
      />
    );
    expect(screen.getByTestId('schematic-export-locked')).toBeTruthy();
  });
});

describe('BlueprintSidebar — stat copy', () => {
  it('renders the percentage as the stat number', () => {
    render(
      <BlueprintSidebar
        sections={buildSections()}
        completedCount={4}
        partialCount={2}
        activeStoreKey="s4"
        userTier="navigator"
      />
    );
    const sidebar = screen.getByTestId('schematic-sidebar');
    // 4/12 = 33%
    expect(sidebar.textContent).toContain('33');
    expect(sidebar.textContent).toContain('%');
    expect(sidebar.textContent).toContain('complete');
  });

  it('never uses attorney framing in the stat copy (D1)', () => {
    render(
      <BlueprintSidebar
        sections={buildSections()}
        completedCount={4}
        partialCount={2}
        activeStoreKey="s4"
        userTier="navigator"
      />
    );
    const txt = screen.getByTestId('schematic-sidebar').textContent.toLowerCase();
    expect(txt).not.toContain('attorney');
    expect(txt).not.toContain('hand to');
  });

  it('renders the consumer-framed reference sentence (4 written, 2 underway, 6 to go)', () => {
    render(
      <BlueprintSidebar
        sections={buildSections()}
        completedCount={4}
        partialCount={2}
        activeStoreKey="s4"
        userTier="navigator"
      />
    );
    const txt = screen.getByTestId('schematic-sidebar').textContent;
    expect(txt).toContain('Four sections written, two underway.');
    expect(txt).toContain('Six still to go before your Blueprint is complete.');
  });
});

describe('BlueprintSidebar — UP NEXT', () => {
  it('shows the active card label and the source module copy', () => {
    render(
      <BlueprintSidebar
        sections={buildSections()}
        completedCount={3}
        partialCount={0}
        activeStoreKey="s4"
        userTier="navigator"
      />
    );
    const txt = screen.getByTestId('schematic-sidebar').textContent;
    // Active store key s4 → schematic label "Tax Impact"; source module m4 → "Module 4 Tax Landscape"
    expect(txt).toContain('Writes Tax Impact');
    expect(txt).toContain('UP NEXT · MODULE 4 TAX LANDSCAPE');
  });

  it('continue-link href routes to the active section’s source module path', () => {
    render(
      <BlueprintSidebar
        sections={buildSections()}
        completedCount={3}
        partialCount={0}
        activeStoreKey="s4"
        userTier="navigator"
      />
    );
    const link = screen.getByTestId('schematic-continue-link');
    expect(link.getAttribute('href')).toBe('/modules/m4');
  });

  it('falls back to /dashboard when the active section’s source module is multi-feeder', () => {
    render(
      <BlueprintSidebar
        sections={buildSections()}
        completedCount={4}
        partialCount={0}
        activeStoreKey="s5"            // s5 sourceModule is "m2+m4"
        userTier="navigator"
      />
    );
    const link = screen.getByTestId('schematic-continue-link');
    expect(link.getAttribute('href')).toBe('/dashboard');
  });

  it('shows the all-complete sentinel and no Continue link when activeStoreKey is null', () => {
    render(
      <BlueprintSidebar
        sections={buildSections()}
        completedCount={12}
        partialCount={0}
        activeStoreKey={null}
        userTier="navigator"
      />
    );
    const txt = screen.getByTestId('schematic-sidebar').textContent;
    expect(txt).toContain('Every section is written');
    expect(txt).toContain('Blueprint complete');
    expect(screen.queryByTestId('schematic-continue-link')).toBeNull();
  });
});
