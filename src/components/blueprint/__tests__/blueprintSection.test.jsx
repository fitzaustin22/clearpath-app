/**
 * BlueprintSection — empty-state class hook + reworded CTA copy (export-pagination).
 *
 * Locks the two UNIT-testable surfaces of the "collapse empty sections" change:
 *   1. the `blueprint-section-empty` class hook the print CSS keys off, and
 *   2. the reworded empty-state CTA strings (general, composite, §6, §12).
 *
 * The collapse / compact-margin / trailing-page VISUALS are NOT exercised here:
 * jsdom does not apply @media print, so the @media-print behaviour is validated
 * in a post-merge browser pass. These tests assert the class hook + the copy
 * only. Mirrors the closest()/class-membership style of S6RetirementDivision.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import BlueprintSection from '../BlueprintSection.jsx';

afterEach(cleanup);

describe('BlueprintSection — empty-state class hook', () => {
  it('carries blueprint-section-empty (and base blueprint-section) when status is empty', () => {
    const { container } = render(
      <BlueprintSection number={8} label="Support Analysis" status="empty" sourceModule="m5" />,
    );
    const section = container.querySelector('.blueprint-section');
    expect(section).not.toBeNull();
    expect(section.classList.contains('blueprint-section')).toBe(true);
    expect(section.classList.contains('blueprint-section-empty')).toBe(true);
  });

  it('does NOT carry blueprint-section-empty when status is complete', () => {
    const { container } = render(
      <BlueprintSection number={8} label="Support Analysis" status="complete" sourceModule="m5">
        <div>populated child</div>
      </BlueprintSection>,
    );
    const section = container.querySelector('.blueprint-section');
    expect(section).not.toBeNull();
    expect(section.classList.contains('blueprint-section-empty')).toBe(false);
  });

  it('does NOT carry blueprint-section-empty when status is partial', () => {
    const { container } = render(
      <BlueprintSection number={8} label="Support Analysis" status="partial" sourceModule="m5">
        <div>populated child</div>
      </BlueprintSection>,
    );
    const section = container.querySelector('.blueprint-section');
    expect(section).not.toBeNull();
    expect(section.classList.contains('blueprint-section-empty')).toBe(false);
  });
});

describe('BlueprintSection — reworded empty-state CTA', () => {
  it('renders the general single-module CTA with module label + lowercased topic', () => {
    render(
      <BlueprintSection number={8} label="Support Analysis" status="empty" sourceModule="m5" />,
    );
    expect(
      screen.getByText('Not yet complete — finish Module 5 to add your support analysis.'),
    ).toBeTruthy();
  });

  it('renders the composite multi-module CTA from the map output', () => {
    render(
      <BlueprintSection number={5} label="Property Division" status="empty" sourceModule="m2+m4" />,
    );
    expect(
      screen.getByText('Not yet complete — finish Modules 2 and 4 to add your property division.'),
    ).toBeTruthy();
  });

  it('renders the §6 retirement special case and never says "a future module"', () => {
    render(
      <BlueprintSection number={6} label="Retirement Plan Division" status="empty" sourceModule={null} />,
    );
    expect(
      screen.getByText(
        'Not yet complete — finish Modules 4 and 5 to add your retirement plan division.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/a future module/)).toBeNull();
  });

  it('renders the §12 action-plan special case', () => {
    render(
      <BlueprintSection number={12} label="Action Plan & Timeline" status="empty" sourceModule="m7" />,
    );
    expect(
      screen.getByText(
        'Your Action Plan builds from the sections above — complete them, then Module 7 assembles it here.',
      ),
    ).toBeTruthy();
  });
});
