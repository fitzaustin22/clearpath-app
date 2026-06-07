'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { T } from '@/src/lib/brand/tokens';
import { isActive } from './isActive';

// First primary nav for the authenticated (app) chrome — Claude Design variant D
// (gold-tint pill). Client island: reads usePathname() to derive active state.
//
// `href` is the navigation target; `route` is the active-detection base (see
// isActive.js). "Modules" links to /modules/m1 — the public curriculum entry —
// because bare /modules has no index page; its route stays /modules so the pill
// lights across every /modules/* path (nested-route case).
//
// Forward-compat: a fourth { label: 'Resources', href: '/resources', route:
// '/resources' } slots into LINKS when marketing /resources ships — the centered
// 1fr·auto·1fr grid in the layout re-centers with zero layout math to change.
const LINKS = [
  { label: 'Dashboard', href: '/dashboard', route: '/dashboard' },
  { label: 'Modules', href: '/modules/m1', route: '/modules' },
  { label: 'Blueprint', href: '/blueprint', route: '/blueprint' },
];

// Scoped CSS (cp-nav-*) — mirrors the project's <style> + namespaced-class idiom
// (cf. DashboardPathView's cp-dash-*). Hover / focus-visible / reduced-motion
// can't be expressed inline, so they live here; static token values are pulled
// in via interpolation. Brand tokens used where an exact one exists
// (T.GOLD = #C8A96E active text + focus outline; T.GOLD_FOCUS_RING =
// rgba(200,169,110,0.20) = both the hover border AND the 4px focus ring); the
// remaining opacity variants (border @ .35, parchment text @ .64/.95) are inline
// rgba per spec, since no 1:1 token exists.
//
// Layout-shift prevention: every link reserves the active (600-weight) width via
// a hidden ::after ghost, and all states share the same padding + 1px border
// footprint. Only border-color and the visible text weight/color change — the
// link box never resizes, so route changes never shift the centered group.
const CSS = `
.cp-nav { display: flex; align-items: center; gap: 40px; }
.cp-nav-link {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 18px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-family: 'Source Sans 3', ${T.FONT_BODY};
  font-size: 15px;
  line-height: 1;
  letter-spacing: 0.01em;
  font-weight: 400;
  color: rgba(250, 248, 242, 0.64);
  text-decoration: none;
  white-space: nowrap;
  transition: border-color 160ms ease, color 140ms ease;
}
/* Bold-weight ghost: reserves the active (600) width so toggling weight never reflows. */
.cp-nav-link::after {
  content: attr(data-label);
  display: block;
  font-weight: 600;
  height: 0;
  overflow: hidden;
  visibility: hidden;
  pointer-events: none;
}
.cp-nav-link:hover {
  border-color: ${T.GOLD_FOCUS_RING};
  color: rgba(250, 248, 242, 0.95);
}
.cp-nav-link:focus { outline: none; }
.cp-nav-link:focus-visible {
  outline: 2px solid ${T.GOLD};
  outline-offset: 2px;
  box-shadow: 0 0 0 4px ${T.GOLD_FOCUS_RING};
}
.cp-nav-link[aria-current="page"] {
  border-color: rgba(200, 169, 110, 0.35);
  color: ${T.GOLD};
  font-weight: 600;
}
/* The active link keeps its gold on hover — don't dim it toward the inactive ghost. */
.cp-nav-link[aria-current="page"]:hover {
  border-color: rgba(200, 169, 110, 0.35);
  color: ${T.GOLD};
}
/* Reduced motion: keep the border-color transition, drop the color fade. */
@media (prefers-reduced-motion: reduce) {
  .cp-nav-link { transition: border-color 160ms ease; }
}
`;

export default function PrimaryNav({ className = '' }) {
  const pathname = usePathname() || '';

  return (
    <nav aria-label="Primary" className={`cp-nav ${className}`.trim()}>
      <style>{CSS}</style>
      {LINKS.map((l) => {
        const active = isActive(pathname, l.route);
        return (
          <Link
            key={l.route}
            href={l.href}
            data-label={l.label}
            aria-current={active ? 'page' : undefined}
            className="cp-nav-link"
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
