'use client';

import { useState } from 'react';
import Link from 'next/link';
// This project's @clerk/nextjs (v7) exposes auth gating via <Show when="…">,
// NOT <SignedIn>/<SignedOut> — mirror the old root header's Clerk usage.
import { Show, UserButton } from '@clerk/nextjs';
import { T } from '@/src/lib/brand/tokens';

// Fixed glass-nav height. MUST stay in sync with the paddingTop wrapper in
// src/app/(marketing)/layout.tsx so page content clears the fixed nav.
const NAV_HEIGHT = 72;

// v1 marketing nav links — REAL paths. /about /services /resources /contact
// intentionally 404 until those pages ship; they are NOT stubbed.
const LINKS = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Resources', href: '/resources' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Contact', href: '/contact' },
];

const linkStyle = {
  fontFamily: T.FONT_BODY,
  color: T.NAVY_DEEP,
  fontSize: '0.9rem',
  fontWeight: 500,
  textDecoration: 'none',
  letterSpacing: '0.01em',
};

const signInStyle = {
  fontFamily: T.FONT_BODY,
  color: T.NAVY_DEEP,
  fontSize: '0.9rem',
  fontWeight: 500,
  textDecoration: 'none',
};

const ctaStyle = {
  fontFamily: T.FONT_BODY,
  backgroundColor: T.GOLD,
  color: T.NAVY_DEEP,
  fontSize: '0.9rem',
  fontWeight: 700,
  textDecoration: 'none',
  padding: '8px 20px',
  borderRadius: '4px',
};

function MenuIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.NAVY_DEEP} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.NAVY_DEEP} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

// Auth-aware controls, shared by the desktop bar and the mobile drawer.
// Mirrors how the old root header gated on Clerk auth state. `block` renders
// stacked full-width controls for the drawer.
function AuthControls({ block = false, onNavigate }) {
  const linkProps = block
    ? { style: { ...signInStyle, display: 'block', padding: '12px 0' }, onClick: onNavigate }
    : { style: signInStyle };
  const ctaProps = block
    ? { style: { ...ctaStyle, display: 'block', textAlign: 'center' }, onClick: onNavigate }
    : { style: ctaStyle };
  return (
    <>
      <Show when="signed-out">
        <Link href="/login" {...linkProps}>Sign In</Link>
        <Link href="/signup" {...ctaProps}>Get Started</Link>
      </Show>
      <Show when="signed-in">
        <Link href="/dashboard" {...linkProps}>Dashboard</Link>
        <UserButton />
      </Show>
    </>
  );
}

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav
      className="fixed top-0 w-full z-50"
      style={{
        height: NAV_HEIGHT,
        boxSizing: 'border-box',
        backgroundColor: T.GLASS,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${T.LINE}`,
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ height: '100%', maxWidth: '1280px', margin: '0 auto', padding: '0 32px', boxSizing: 'border-box' }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{ fontFamily: T.FONT_DISPLAY, color: T.NAVY_DEEP, fontSize: '1.5rem', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.01em' }}
        >
          ClearPath
        </Link>

        {/* Desktop: link row + auth (hidden below md) */}
        <div className="hidden md:flex items-center" style={{ gap: '32px' }}>
          <div className="flex items-center" style={{ gap: '28px' }}>
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} style={linkStyle}>{l.label}</Link>
            ))}
          </div>
          <div className="flex items-center" style={{ gap: '16px' }}>
            <AuthControls />
          </div>
        </div>

        {/* Mobile: hamburger (hidden at md and up) */}
        <button
          type="button"
          className="md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', lineHeight: 0 }}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile drawer — rendered only when open; md:hidden also guards a desktop resize */}
      {open ? (
        <div
          className="md:hidden"
          style={{
            position: 'fixed',
            top: NAV_HEIGHT,
            left: 0,
            right: 0,
            backgroundColor: T.PARCHMENT,
            borderBottom: `1px solid ${T.LINE}`,
            padding: '8px 32px 20px',
            zIndex: 49,
          }}
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={close}
              style={{ ...linkStyle, display: 'block', padding: '12px 0', borderBottom: `1px solid ${T.LINE}` }}
            >
              {l.label}
            </Link>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <AuthControls block onNavigate={close} />
          </div>
        </div>
      ) : null}
    </nav>
  );
}
