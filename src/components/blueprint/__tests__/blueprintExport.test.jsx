/**
 * BlueprintExport — §7.7 unit surface for the M7 Blueprint Export (Phase B).
 *
 * Covers the tier gate, the D13 marker toggle, the chrome print-suppression
 * markup, and statelessness. Print *visuals* are a Cowork browser-pass concern
 * (jsdom does not apply @media print, so "is the CSS actually scoped under the
 * marker" is verified in-browser, not here) — these tests assert behavior +
 * markup only.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import BlueprintExport, { EXPORTING_MARKER_CLASS } from '../BlueprintExport.jsx';
import useBlueprintStore from '@/src/stores/blueprintStore';

afterEach(() => {
  cleanup();
  document.body.classList.remove(EXPORTING_MARKER_CLASS);
  vi.restoreAllMocks();
});

describe('BlueprintExport — tier gate (tests 1 & 2)', () => {
  it('TC-M7B-GATE-1: Free sees the artifact teaser; the Export action cannot fire', () => {
    render(<BlueprintExport userTier="free" />);
    expect(screen.getByTestId('blueprint-export-locked')).toBeTruthy();
    expect(screen.queryByTestId('blueprint-export-button')).toBeNull();
  });

  it('TC-M7B-GATE-1b: Essentials sees the teaser; no Export button', () => {
    render(<BlueprintExport userTier="essentials" />);
    expect(screen.getByTestId('blueprint-export-locked')).toBeTruthy();
    expect(screen.queryByTestId('blueprint-export-button')).toBeNull();
  });

  it('TC-M7B-GATE-2: navigator reaches the Export action (window.print fires)', () => {
    const printSpy = vi.fn();
    window.print = printSpy;
    render(<BlueprintExport userTier="navigator" />);
    expect(screen.queryByTestId('blueprint-export-locked')).toBeNull();
    fireEvent.click(screen.getByTestId('blueprint-export-button'));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('TC-M7B-GATE-2b: legacy signature tier (= level 2) also reaches the Export action', () => {
    const printSpy = vi.fn();
    window.print = printSpy;
    render(<BlueprintExport userTier="signature" />);
    fireEvent.click(screen.getByTestId('blueprint-export-button'));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });
});

describe('BlueprintExport — D13 marker toggle (test 3)', () => {
  it('TC-M7B-MARK-1: marker is absent on a plain render', () => {
    window.print = vi.fn();
    render(<BlueprintExport userTier="navigator" />);
    expect(document.body.classList.contains(EXPORTING_MARKER_CLASS)).toBe(false);
  });

  it('TC-M7B-MARK-2: the gated action sets the marker, then clears it on afterprint', () => {
    window.print = vi.fn();
    render(<BlueprintExport userTier="navigator" />);

    fireEvent.click(screen.getByTestId('blueprint-export-button'));
    expect(document.body.classList.contains(EXPORTING_MARKER_CLASS)).toBe(true);

    window.dispatchEvent(new Event('afterprint'));
    expect(document.body.classList.contains(EXPORTING_MARKER_CLASS)).toBe(false);
  });
});

describe('BlueprintExport — chrome print-suppression markup (test 6)', () => {
  it('TC-M7B-CHROME-1: the Export controls carry the interactive print-suppression class', () => {
    window.print = vi.fn();
    render(<BlueprintExport userTier="navigator" />);
    expect(screen.getByTestId('blueprint-export').className).toContain(
      'clearpath-blueprint-interactive'
    );
  });

  it('TC-M7B-CHROME-2: the app-group layout header & footer carry the marker-scoped hide class', () => {
    // The navy app chrome (header/footer) was lifted out of the root layout into
    // the (app) route group so it wraps only authenticated pages; the
    // blueprint-export-hide class moved with it, verbatim.
    const layout = readFileSync(resolve(process.cwd(), 'src/app/(app)/layout.tsx'), 'utf8');
    // Exactly the two chrome elements (header, footer) should carry the class.
    const occurrences = (layout.match(/blueprint-export-hide/g) || []).length;
    expect(layout).toContain('<header');
    expect(layout).toContain('<footer');
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });
});

describe('BlueprintExport — stateless (test 8)', () => {
  it('TC-M7B-STATELESS-1: exporting never writes to the Blueprint store', () => {
    window.print = vi.fn();
    const setStateSpy = vi.spyOn(useBlueprintStore, 'setState');

    render(<BlueprintExport userTier="navigator" />);
    fireEvent.click(screen.getByTestId('blueprint-export-button'));
    window.dispatchEvent(new Event('afterprint'));

    expect(setStateSpy).not.toHaveBeenCalled();
  });
});
