/**
 * Shared brand tokens + style fragments for the Support Estimator UI.
 * Mirrors the m4 inline-style idiom (FilingStatusOptimizer, PITTaxDiscountCalculator).
 * No Tailwind — every visual treatment composes these tokens.
 */

export const NAVY      = '#1B2A4A';
export const GOLD      = '#C8A96E';
export const PARCHMENT = '#FAF8F2';
export const WHITE     = '#FFFFFF';
export const AMBER     = '#D4A843';
export const GREEN     = '#2D8A4E';
export const RED       = '#C0392B';
export const MUTED     = '#6B7280';
export const BORDER    = '#CBD5E1';
export const BORDER_DIM = '#D1D5DB';
export const SURFACE_DIM = '#F3F4F6';

export const SOURCE   = '"Source Sans Pro", -apple-system, system-ui, sans-serif';
export const PLAYFAIR = '"Playfair Display", Georgia, serif';

// Banner variants — mirror m4 InfoBanner with explicit error + warning additions.
export const BANNER_VARIANTS = {
  gold:    { bg: '#FBF4E3', border: GOLD,  text: NAVY },
  navy:    { bg: '#F0F4FA', border: NAVY,  text: NAVY },
  amber:   { bg: '#FFF8E1', border: AMBER, text: NAVY },
  red:     { bg: '#FBEAE8', border: RED,   text: NAVY },
};
