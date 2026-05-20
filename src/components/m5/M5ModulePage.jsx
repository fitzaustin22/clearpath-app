'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { T } from '@/src/lib/brand/tokens';
import { hasAccess } from '@/src/lib/plans';

const EDU_PARAGRAPH =
  "Some of the most consequential assets in a divorce can't be valued at face — a pension, the marital home, a support obligation, the mechanics of dividing a retirement account without triggering tax or penalty. Each takes real analysis to understand what it's actually worth and how a given choice plays out over time. The four tools in this module give you CDFA-grade valuations and decision frameworks for exactly these assets, so you negotiate from clarity rather than guesswork.";

// §1.6 verbatim tool inventory — order locked per §2 (SE, PVA, QDRO, HDA).
// SE and PVA routes carried as debt — currently /dev/* (Clerk-gated), to be
// migrated to /modules/m5/* in a follow-up. Do not rename in PR1.
const TOOLS = [
  {
    id: 'support-estimator',
    title: 'Support Estimator',
    line: 'Estimate state-specific child and spousal support — pendente lite or post-divorce.',
    href: '/dev/m5-support-estimator',
  },
  {
    id: 'pension-valuation',
    title: 'Pension Valuation Analyzer',
    line: 'Value a defined-benefit pension at present value, with marital-portion and sensitivity ranges.',
    href: '/dev/m5/pva',
  },
  {
    id: 'qdro',
    title: 'QDRO Decision Guide',
    line: 'Map how each retirement account divides, and produce an attorney handoff packet.',
    href: '/modules/m5/qdro',
  },
  {
    id: 'home-decision',
    title: 'Home Decision Analyzer',
    line: 'Compare keep, sell, and deferred-sale outcomes for the marital home across 3-, 6-, and 10-year horizons.',
    href: '/modules/m5/home-decision',
  },
];

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return isDesktop;
}

function ToolCard({ title, line, href }) {
  return (
    <div
      data-testid="m5-tool-card"
      style={{
        backgroundColor: T.CARD,
        border: `1px solid ${T.LINE}`,
        borderRadius: 8,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: T.SHADOW_CARD,
      }}
    >
      <h2
        style={{
          fontFamily: T.FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 20,
          color: T.NAVY,
          margin: 0,
          lineHeight: 1.3,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontFamily: T.FONT_BODY,
          fontSize: 14,
          color: T.INK_2,
          margin: 0,
          lineHeight: 1.5,
          flex: 1,
        }}
      >
        {line}
      </p>
      <div>
        <Link
          href={href}
          style={{
            display: 'inline-block',
            backgroundColor: T.NAVY,
            color: T.CARD,
            fontFamily: T.FONT_BODY,
            fontWeight: 600,
            fontSize: 14,
            padding: '8px 18px',
            borderRadius: 6,
            textDecoration: 'none',
          }}
        >
          Open
        </Link>
      </div>
    </div>
  );
}

export default function M5ModulePage({ userTier = 'essentials' }) {
  const isFullAccess = hasAccess(userTier, 'navigator');
  const isDesktop = useIsDesktop();

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: isDesktop ? 'repeat(2, minmax(0, 1fr))' : '1fr',
    gap: 16,
  };

  return (
    <div
      style={{
        backgroundColor: T.PARCHMENT,
        minHeight: '100vh',
        fontFamily: T.FONT_BODY,
        color: T.INK,
        padding: '40px 20px',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <section>
          <h1
            style={{
              fontFamily: T.FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 32,
              color: T.NAVY,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            M5 — Value What Matters
          </h1>
        </section>

        <section style={{ marginTop: 24 }}>
          <p
            style={{
              fontFamily: T.FONT_BODY,
              fontSize: 16,
              color: T.INK_2,
              margin: 0,
              lineHeight: 1.6,
              maxWidth: 720,
            }}
          >
            {EDU_PARAGRAPH}
          </p>
        </section>

        {isFullAccess && (
          <section style={{ marginTop: 40 }}>
            <div style={gridStyle}>
              {TOOLS.map((tool) => (
                <ToolCard
                  key={tool.id}
                  title={tool.title}
                  line={tool.line}
                  href={tool.href}
                />
              ))}
            </div>
          </section>
        )}

        {!isFullAccess && (
          <section style={{ marginTop: 32 }}>
            <Link
              href="/upgrade"
              style={{
                display: 'inline-block',
                backgroundColor: T.GOLD,
                color: T.NAVY,
                fontFamily: T.FONT_BODY,
                fontWeight: 700,
                fontSize: 15,
                padding: '12px 24px',
                borderRadius: 8,
                textDecoration: 'none',
                letterSpacing: 0.3,
              }}
            >
              Unlock with Full Access
            </Link>
          </section>
        )}

        <footer
          role="contentinfo"
          style={{
            marginTop: 56,
            paddingTop: 24,
            borderTop: `1px solid ${T.LINE}`,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            fontFamily: T.FONT_BODY,
            fontSize: 14,
          }}
        >
          <Link
            href="/modules/m2"
            style={{ color: T.NAVY_70, textDecoration: 'none' }}
          >
            ← Module 2: Know What You Own
          </Link>
          <Link
            href="/modules/m4"
            style={{ color: T.NAVY_70, textDecoration: 'none' }}
          >
            ← Module 4: Tax Landscape
          </Link>
        </footer>
      </div>
    </div>
  );
}
