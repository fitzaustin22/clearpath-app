'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { T } from '@/src/lib/brand/tokens';
import { hasAccess } from '@/src/lib/plans';

// Canonical M7 tool routes. Phase A ships the Action Plan & Timeline tool
// (the Blueprint §12 writer); the finished Blueprint is exported from the
// top-level /blueprint route, surfaced as a link below (NOT a tool card).
const TOOLS = [
  {
    id: 'action-plan',
    title: 'Action Plan & Timeline',
    line: 'Turn everything you have decided into concrete next steps, the professionals who will help, and the dates that matter.',
    route: '/modules/m7/action-plan',
    available: true,
  },
];

function ToolCard({ title, line, route, locked, comingSoon }) {
  return (
    <div
      data-testid="m7-tool-card"
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
          data-testid="m7-tool-card-lock"
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
            data-testid="m7-tool-card-coming-soon"
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

export default function M7ModulePage({ userTier = 'essentials' }) {
  // Full Access gate — mirrors M6ModulePage's contract ('navigator' is the
  // Full-Access tier level; a legacy 'signature' value also passes).
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
            M7 — Put It All Together
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

          {isFullAccess ? (
            <div style={{ marginTop: 24 }}>
              <Link
                href="/blueprint"
                data-testid="m7-blueprint-link"
                style={{
                  display: 'inline-block',
                  fontFamily: T.FONT_BODY,
                  fontWeight: 600,
                  fontSize: 14,
                  color: T.NAVY,
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                View your ClearPath Financial Blueprint →
              </Link>
            </div>
          ) : (
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
