/**
 * BlueprintCover — §7.7 unit surface for the print-only cover/disclaimer page.
 *
 * Covers cover content (identity + Generated date + disclaimer), the empty-name
 * fallback, and the no-metadata-leak guard. Visibility (display:none until the
 * marker is set, in print) is a Cowork browser-pass concern — jsdom does not
 * apply @media print, and RTL queries find the element regardless of CSS
 * visibility, which is exactly what we want for content assertions.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const { mockUseUser } = vi.hoisted(() => ({ mockUseUser: vi.fn() }));
vi.mock('@clerk/nextjs', () => ({ useUser: mockUseUser }));

import BlueprintCover from '../BlueprintCover.jsx';
import { EXPORT_COVER_COPY, EXPORT_DISCLAIMER } from '../exportCopy.js';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('BlueprintCover — content (test 4)', () => {
  it('TC-M7B-COVER-1: renders brand + document title + user name + Generated date + disclaimer', () => {
    mockUseUser.mockReturnValue({ user: { firstName: 'Jane', lastName: 'Doe' } });
    render(<BlueprintCover />);
    const text = screen.getByTestId('blueprint-cover').textContent;

    expect(text).toContain('ClearPath'); // product name
    expect(text).toContain(EXPORT_COVER_COPY.brand); // ClearPath for Women
    expect(text).toContain(EXPORT_COVER_COPY.documentTitle); // Financial Blueprint
    expect(text).toContain('Prepared for Jane Doe');
    expect(text).toContain(EXPORT_DISCLAIMER);

    // Date = the EXPORT moment, labeled — NOT lastUpdated.
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    expect(text).toContain(`${EXPORT_COVER_COPY.generatedLabel} ${today}`);
  });

  it('TC-M7B-COVER-2: carries no advice / verdict / recommendation language', () => {
    mockUseUser.mockReturnValue({ user: { firstName: 'Jane', lastName: 'Doe' } });
    render(<BlueprintCover />);
    const text = screen.getByTestId('blueprint-cover').textContent.toLowerCase();

    // The disclaimer DISCLAIMS advice ("not legal, tax, or financial advice");
    // what must be absent is advice-GIVING / verdict / recommendation phrasing.
    expect(text).not.toMatch(/\brecommend/);
    expect(text).not.toMatch(/\bverdict\b/);
    expect(text).not.toMatch(/\byou should\b/);
    expect(text).not.toMatch(/\bwe advise\b/);
    expect(text).not.toMatch(/\bbest (option|choice|path|outcome)\b/);
  });
});

describe('BlueprintCover — empty-name fallback (test 5)', () => {
  it('TC-M7B-COVER-3: null user → applies fallback, never prints "undefined" or a blank name', () => {
    mockUseUser.mockReturnValue({ user: null });
    render(<BlueprintCover />);
    const text = screen.getByTestId('blueprint-cover').textContent;

    expect(text).not.toContain('undefined');
    expect(text).toContain(`Prepared for ${EXPORT_COVER_COPY.fallbackName}`);
  });

  it('TC-M7B-COVER-3b: user present but blank names → still applies the fallback', () => {
    mockUseUser.mockReturnValue({ user: { firstName: '', lastName: '' } });
    render(<BlueprintCover />);
    const text = screen.getByTestId('blueprint-cover').textContent;

    expect(text).not.toContain('undefined');
    expect(text).toContain(`Prepared for ${EXPORT_COVER_COPY.fallbackName}`);
  });
});

describe('BlueprintCover — no metadata leak (test 7)', () => {
  it('TC-M7B-COVER-4: emits no meta / citation / formula apparatus', () => {
    mockUseUser.mockReturnValue({ user: { firstName: 'Jane', lastName: 'Doe' } });
    render(<BlueprintCover />);
    const text = screen.getByTestId('blueprint-cover').textContent.toLowerCase();

    expect(text).not.toContain('formula');
    expect(text).not.toContain('citation');
    expect(text).not.toContain('statute');
    expect(text).not.toMatch(/\bmetadata\b/);
  });
});
