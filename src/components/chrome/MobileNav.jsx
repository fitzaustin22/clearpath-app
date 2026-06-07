'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { T } from '@/src/lib/brand/tokens';
import { isActive } from './isActive';

// Mobile (<768px) primary nav: hamburger button + navy slide-down sheet. Client
// island owning its own open/closed state. The parent layout gates VISIBILITY
// with Tailwind `md:hidden`, so this component does no viewport detection.
//
// `href` / `route` mirror PrimaryNav (Modules → /modules/m1 entry; route stays
// /modules so the rail lights across /modules/*). `num` is the §-style ordinal.
const LINKS = [
  { label: 'Dashboard', href: '/dashboard', route: '/dashboard', num: '01' },
  { label: 'Modules', href: '/modules/m1', route: '/modules', num: '02' },
  { label: 'Blueprint', href: '/blueprint', route: '/blueprint', num: '03' },
];

const SHEET_ID = 'cp-mobile-nav-sheet';

// Scoped CSS (cp-mnav-*). IMPORTANT: this <style> is unlayered, so its rules win
// over Tailwind's @layer utilities. We therefore never set `display` on the root
// wrapper here — the parent's Tailwind `md:hidden` must remain free to toggle it.
// (Only .cp-mnav-toggle, which Tailwind never toggles, sets display.)
//
// The sheet is position:fixed at top:72px (mirrors the marketing SiteNav drawer),
// so it drops just below the 72px chrome. Closed state keeps it out of the tab
// order (visibility:hidden after the fade) and out of the a11y tree (aria-hidden).
const CSS = `
.cp-mnav-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 6px;
  margin: 0;
  cursor: pointer;
  line-height: 0;
  color: ${T.GOLD};
}
.cp-mnav-toggle:focus { outline: none; }
.cp-mnav-toggle:focus-visible {
  outline: 2px solid ${T.GOLD};
  outline-offset: 2px;
  border-radius: 6px;
}
.cp-mnav-sheet {
  position: fixed;
  top: 72px;
  left: 0;
  right: 0;
  z-index: 50;
  background: ${T.NAVY};
  border-top: 1px solid rgba(200, 169, 110, 0.14);
  border-bottom: 1px solid rgba(200, 169, 110, 0.14);
  padding: 8px 0;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-12px);
  pointer-events: none;
  transition: opacity 160ms ease, transform 160ms ease, visibility 0s linear 160ms;
}
.cp-mnav-sheet.is-open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  pointer-events: auto;
  transition: opacity 160ms ease, transform 160ms ease, visibility 0s;
}
.cp-mnav-link {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 16px 32px;
  border-left: 3px solid transparent; /* reserves the rail width on every link */
  text-decoration: none;
  color: rgba(250, 248, 242, 0.78);
  font-family: ${T.FONT_BODY};
  font-size: 1.05rem;
  letter-spacing: 0.01em;
}
.cp-mnav-link:hover { color: rgba(250, 248, 242, 0.95); }
.cp-mnav-link:focus { outline: none; }
.cp-mnav-link:focus-visible { outline: 2px solid ${T.GOLD}; outline-offset: -2px; }
.cp-mnav-link[aria-current="page"] {
  border-left-color: ${T.GOLD};
  color: ${T.GOLD};
}
.cp-mnav-num {
  font-family: ${T.FONT_NUMERIC};
  font-variant-numeric: lining-nums tabular-nums;
  font-size: 0.85rem;
  color: ${T.GOLD};
  opacity: 0.7;
}
.cp-mnav-link[aria-current="page"] .cp-mnav-num { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .cp-mnav-sheet, .cp-mnav-sheet.is-open { transition: none; }
}
`;

function MenuIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export default function MobileNav({ className = '' }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || '';
  const sheetRef = useRef(null);
  const buttonRef = useRef(null);
  const close = () => setOpen(false);

  // While open: ESC closes; a pointer-down outside both the sheet and the toggle
  // closes. Listeners are attached only while open and torn down on close.
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onPointerDown(e) {
      if (sheetRef.current?.contains(e.target)) return;
      if (buttonRef.current?.contains(e.target)) return; // the toggle handles itself
      setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  return (
    <div className={className}>
      <style>{CSS}</style>
      <button
        ref={buttonRef}
        type="button"
        className="cp-mnav-toggle"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls={SHEET_ID}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      <nav
        id={SHEET_ID}
        ref={sheetRef}
        aria-label="Primary"
        aria-hidden={!open}
        className={`cp-mnav-sheet ${open ? 'is-open' : ''}`.trim()}
      >
        {LINKS.map((l) => {
          const active = isActive(pathname, l.route);
          return (
            <Link
              key={l.route}
              href={l.href}
              aria-current={active ? 'page' : undefined}
              className="cp-mnav-link"
              onClick={close}
              tabIndex={open ? undefined : -1}
            >
              <span className="cp-mnav-num" aria-hidden="true">{l.num}</span>
              <span className="cp-mnav-label">{l.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
