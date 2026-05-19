import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { T } from '@/src/lib/brand/tokens';
import QDROLandingIntro from '../QDROLandingIntro';

// All apostrophes below are ASCII U+0027 — task spec is explicit on this.
// Using template literals so the ' character never interacts with string delimiters.
const P1 = `Dividing retirement accounts in divorce isn't like splitting a checking account. Each plan type — 401(k), pension, IRA — has its own legal mechanism, tax treatment, and paperwork. Getting it wrong can cost years of growth or trigger an unexpected tax bill.`;

const P2 = `This guide walks you through the decisions a QDRO specialist needs to draft your order correctly. You'll classify each retirement asset by plan type and perspective, capture the key facts that drive the division structure, and walk away with a handoff packet your attorney or QDRO specialist can work from directly.`;

// jsdom normalises hex colour values to rgb() — convert T hex tokens for comparison
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

describe('QDROLandingIntro', () => {
  it('renders an h1 with exact text "QDRO Decision Guide"', () => {
    render(<QDROLandingIntro />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('QDRO Decision Guide');
  });

  it('renders paragraph 1 verbatim — distinctive substring and full string', () => {
    const { container } = render(<QDROLandingIntro />);
    expect(container.textContent).toContain("isn't like splitting a checking account");
    const paras = container.querySelectorAll('p');
    const p1 = Array.from(paras).find((p) => p.textContent.includes("isn't like splitting"));
    expect(p1.textContent).toBe(P1);
  });

  it('renders paragraph 2 verbatim — distinctive substring and full string', () => {
    const { container } = render(<QDROLandingIntro />);
    expect(container.textContent).toContain(
      'handoff packet your attorney or QDRO specialist can work from directly',
    );
    const paras = container.querySelectorAll('p');
    const p2 = Array.from(paras).find((p) =>
      p.textContent.includes('handoff packet your attorney'),
    );
    expect(p2.textContent).toBe(P2);
  });

  it('renders exactly two <p> elements and h1 precedes both in DOM order', () => {
    const { container } = render(<QDROLandingIntro />);
    expect(container.querySelectorAll('p').length).toBe(2);
    const all = Array.from(container.querySelectorAll('h1, p'));
    expect(all[0].tagName).toBe('H1');
    expect(all[1].tagName).toBe('P');
    expect(all[2].tagName).toBe('P');
  });

  it('uses real h1 and p semantic tags (not styled divs)', () => {
    const { container } = render(<QDROLandingIntro />);
    expect(container.querySelectorAll('h1').length).toBe(1);
    expect(container.querySelectorAll('p').length).toBe(2);
  });

  it('consumes brand tokens on heading fontFamily, paragraph fontFamily, and heading color', () => {
    const { container } = render(<QDROLandingIntro />);
    const h1 = container.querySelector('h1');
    const p = container.querySelector('p');
    expect(h1.style.fontFamily).toBe(T.FONT_DISPLAY);
    expect(p.style.fontFamily).toBe(T.FONT_BODY);
    // jsdom converts hex to rgb(); convert T token values before comparison
    // so the test pins token usage without hardcoding raw hex in test assertions
    const headingColor = h1.style.color;
    const navyRgb = hexToRgb(T.NAVY);
    const inkRgb = hexToRgb(T.INK);
    const navyDeepRgb = hexToRgb(T.NAVY_DEEP);
    expect([navyRgb, inkRgb, navyDeepRgb].includes(headingColor)).toBe(true);
  });

  it('root element has data-testid="qdro-landing-intro"', () => {
    render(<QDROLandingIntro />);
    expect(screen.getByTestId('qdro-landing-intro')).toBeTruthy();
  });
});
