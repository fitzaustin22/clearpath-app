'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { T } from '@/src/lib/brand/tokens';
import { hasAccess } from '@/src/lib/plans';

// Canonical M6 tool routes — each tool phase creates exactly these.
// All four are `available: false` at Phase 0a (foundation scaffold).
const TOOLS = [
  {
    id: 'priorities',
    title: 'Priorities Worksheet',
    line: 'Name what matters most, in your own words, so every trade-off lands on a deliberate yardstick.',
    route: '/modules/m6/priorities',
    available: true,
  },
  {
    id: 'trade-off',
    title: 'Trade-Off Analyzer',
    line: "Pair what you most want to keep with what you'd offer to secure it, so every concession is one you chose.",
    route: '/modules/m6/trade-off',
    available: true,
  },
  {
    id: 'offer-organizer',
    title: 'Settlement Offer Organizer',
    line: 'Lay an offer beside your priorities and your Blueprint numbers — see what it covers and what it leaves unsaid.',
    route: '/modules/m6/offer-organizer',
    available: true,
  },
  {
    id: 'deferred-comp',
    title: 'Deferred Compensation Analyzer',
    line: 'Value RSUs, options, and other deferred-comp grants so they do not slip out of the marital ledger.',
    route: '/modules/m6/deferred-comp',
    available: false,
  },
];

function ToolCard({ title, line, route, locked, comingSoon }) {
  return (
    <div
      data-testid="m6-tool-card"
      style={{
        backgroundColor: T.CARD,
        border: `1px solid ${T.LINE}`,
        borderRadius: 8,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: T.SHADOW_CARD,
        opacity: locked ? 0.55 : 1,
        position: 'relative',
      }}
    >
      {locked && (
        <div
          data-testid="m6-tool-card-lock"
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: T.NAVY_55,
          }}
        >
          <Lock size={18} />
        </div>
      )}
      <h2
        style={{
          fontFamily: T.FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 20,
          color: T.NAVY,
          margin: 0,
          lineHeight: 1.3,
          paddingRight: locked ? 28 : 0,
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
        {locked ? (
          <span
            style={{
              display: 'inline-block',
              backgroundColor: T.NAVY_12,
              color: T.NAVY_55,
              fontFamily: T.FONT_BODY,
              fontWeight: 600,
              fontSize: 14,
              padding: '8px 18px',
              borderRadius: 6,
            }}
          >
            Locked
          </span>
        ) : comingSoon ? (
          <span
            data-testid="m6-tool-card-coming-soon"
            aria-label={`${title} — coming soon`}
            style={{
              display: 'inline-block',
              backgroundColor: T.GOLD_TINT,
              color: T.PILL_TEXT,
              fontFamily: T.FONT_BODY,
              fontWeight: 600,
              fontSize: 14,
              padding: '8px 18px',
              borderRadius: 6,
            }}
          >
            Coming soon
          </span>
        ) : (
          <Link
            href={route}
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
        )}
      </div>
    </div>
  );
}

export default function M6ModulePage({ userTier = 'essentials' }) {
  // Full Access gate — see M5ModulePage for the spec ↔ code-reality
  // 'full_access' / 'navigator' rationale; M6 mirrors that contract.
  const isFullAccess = hasAccess(userTier, 'navigator');

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
        <Link
          href="/dashboard"
          style={{
            fontFamily: T.FONT_BODY,
            fontSize: 14,
            color: T.NAVY_55,
            textDecoration: 'none',
            display: 'inline-block',
            marginBottom: 24,
          }}
        >
          ← Back to Dashboard
        </Link>

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
            M6 — Negotiate from Strength
          </h1>
        </section>

        <section style={{ marginTop: 40 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {TOOLS.map((tool) => {
              const locked = !isFullAccess;
              const comingSoon = isFullAccess && !tool.available;
              return (
                <ToolCard
                  key={tool.id}
                  title={tool.title}
                  line={tool.line}
                  route={tool.route}
                  locked={locked}
                  comingSoon={comingSoon}
                />
              );
            })}
          </div>

          {!isFullAccess && (
            <div style={{ marginTop: 24 }}>
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
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
