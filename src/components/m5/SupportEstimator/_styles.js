/**
 * Shared brand tokens + style fragments for the Support Estimator UI.
 * Used by the surviving SE chrome (Banner / PrePopBadge / SectionCard) and
 * by SupportEstimator.jsx / InputsPanel.jsx. Migrated field primitives have
 * moved to the wizard foundation; tokens they alone needed are gone.
 */

export const NAVY      = '#1B2A4A';
export const GOLD      = '#C8A96E';
export const PARCHMENT = '#FAF8F2';
export const WHITE     = '#FFFFFF';
export const MUTED     = '#6B7280';
export const BORDER    = '#CBD5E1';

export const SOURCE = '"Source Sans Pro", -apple-system, system-ui, sans-serif';

const AMBER = '#D4A843';
const RED   = '#C0392B';

export const BANNER_VARIANTS = {
  gold:  { bg: '#FBF4E3', border: GOLD,  text: NAVY },
  navy:  { bg: '#F0F4FA', border: NAVY,  text: NAVY },
  amber: { bg: '#FFF8E1', border: AMBER, text: NAVY },
  red:   { bg: '#FBEAE8', border: RED,   text: NAVY },
};
