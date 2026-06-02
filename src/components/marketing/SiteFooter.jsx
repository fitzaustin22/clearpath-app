import Link from 'next/link';
import { T } from '@/src/lib/brand/tokens';

// Footer columns — editable {label, href} arrays. /about /services /resources
// /contact /privacy /terms intentionally 404 until those pages ship.
const COLUMNS = [
  {
    heading: 'Explore',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Resources', href: '/resources' },
      { label: 'About', href: '/about' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Services', href: '/services' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  },
];

const headingStyle = {
  fontFamily: T.FONT_BODY,
  color: T.GOLD,
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  margin: '0 0 20px',
};

const linkStyle = {
  fontFamily: T.FONT_BODY,
  color: T.PARCHMENT,
  fontSize: '0.875rem',
  textDecoration: 'none',
  display: 'block',
  marginBottom: '14px',
};

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.PARCHMENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

export default function SiteFooter() {
  return (
    <footer style={{ backgroundColor: T.NAVY_DEEP, padding: '64px 32px 32px' }}>
      <div className="grid grid-cols-1 md:grid-cols-4" style={{ maxWidth: '1280px', margin: '0 auto', gap: '40px' }}>
        {/* Brand column */}
        <div>
          <div style={{ fontFamily: T.FONT_DISPLAY, color: T.PARCHMENT, fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px' }}>
            ClearPath
          </div>
          <p style={{ fontFamily: T.FONT_BODY, color: T.PARCHMENT, fontSize: '0.875rem', lineHeight: 1.6, opacity: 0.85, margin: '0 0 20px', maxWidth: '260px' }}>
            Empowering women with clarity and confidence through the most complex financial transitions.
          </p>
          <Link
            href="/contact"
            aria-label="Contact us by email"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '9999px', border: `1px solid ${T.PARCHMENT}` }}
          >
            <MailIcon />
          </Link>
        </div>

        {/* Link columns */}
        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <h3 style={headingStyle}>{col.heading}</h3>
            {col.links.map((l) => (
              <Link key={l.href} href={l.href} style={linkStyle}>{l.label}</Link>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{ maxWidth: '1280px', margin: '40px auto 0', paddingTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.15)' }}>
        <p style={{ fontFamily: T.FONT_BODY, color: T.PARCHMENT, fontSize: '0.75rem', opacity: 0.6, margin: 0 }}>
          © 2026 ClearPath Divorce Financial. This is not investment advice.
        </p>
      </div>
    </footer>
  );
}
