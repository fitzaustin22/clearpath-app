'use client';

import { useState, useEffect } from 'react';

/**
 * Shared responsive breakpoint hook for the M5 wizard foundation.
 *
 * Single mobile-collapse boundary at 720px per
 * Roadmap/Architecture/Wizard-Design-Spec.md: viewport width < 720 is
 * treated as mobile. Consolidates the inline useIsDesktop/useBreakpoints
 * duplication idiom (m3/m4/m5, at 640/1024) into one shared hook — but
 * those 7 copies are NOT migrated here (foundation-only scope; deferred
 * to the wizard polish PR). Returns only { isMobile } (YAGNI — superset
 * tiers added only if a wizard component genuinely needs them).
 */

const MOBILE_MAX_WIDTH = 720;

/**
 * SSR-safe mobile check and single source of truth for the 720 boundary.
 * Returns false when window is unavailable (server render) so the first
 * post-mount effect can correct it without a hydration mismatch.
 *
 * @returns {boolean} true when the viewport is narrower than 720px
 */
export function getIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_MAX_WIDTH;
}

/**
 * @returns {{ isMobile: boolean }} live mobile flag, updated on resize
 */
export function useBreakpoints() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(getIsMobile());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return { isMobile };
}

export default useBreakpoints;
