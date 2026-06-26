import Link from 'next/link';
import { ArrowLeft, Bookmark } from 'lucide-react';
import { T } from '@/src/lib/brand/tokens';
import ReadinessAssessment from '@/src/components/m1/ReadinessAssessment';
import BudgetGapCalculator from '@/src/components/m1/BudgetGapCalculator';

// Hero H1 + Card 2 title bind to Playfair via the same --font-playfair CSS var
// the #95 ReadinessAssessment redesign uses (its module-private PLAYFAIR const)
// — NOT T.FONT_DISPLAY, which resolves to Newsreader. Kept byte-identical so the
// hero reads as one family with the welcome screen rendered directly beneath it.
const PLAYFAIR = "var(--font-playfair), 'Playfair Display', Georgia, serif";

// M1 landing — visual reskin of the page FRAME only (hero band + two stacked
// family cards). The two tools render inline and untouched: Card 1 wraps the
// self-contained ReadinessAssessment (no card header — the component owns its
// welcome); Card 2 carries a fuller header for the headerless BudgetGapCalculator.
// The bottom compliance line is intentionally omitted — the (app) shell footer
// already renders it. M1 is ungated: no locked/promo chrome anywhere.
export default function M1Page() {
  return (
    <main
      style={{
        backgroundColor: T.PARCHMENT,
        minHeight: '100vh',
        padding: '56px 24px 96px',
        fontFamily: T.FONT_BODY,
        color: T.NAVY,
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {/* Quiet escape hatch back to the dashboard. */}
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: T.FONT_BODY,
            fontSize: 14,
            color: T.NAVY_55,
            textDecoration: 'none',
            marginBottom: 38,
          }}
        >
          <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
          Back to Dashboard
        </Link>

        {/* Hero band — left-aligned, single column. */}
        <div style={{ maxWidth: 760, marginBottom: 44 }}>
          <div
            style={{
              fontFamily: T.FONT_BODY,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: T.PILL_TEXT,
              marginBottom: 20,
            }}
          >
            Module 1
          </div>
          <h1
            style={{
              fontFamily: PLAYFAIR,
              fontWeight: 700,
              fontSize: 'clamp(33px, 5.2vw, 46px)',
              lineHeight: 1.08,
              letterSpacing: '-0.015em',
              color: T.NAVY,
              margin: '0 0 22px',
            }}
          >
            Permission to{' '}
            <span style={{ fontStyle: 'italic', fontWeight: 600, color: T.GOLD }}>Explore</span>
          </h1>
          <p
            style={{
              fontFamily: T.FONT_BODY,
              fontSize: 'clamp(16px, 2.2vw, 18.5px)',
              lineHeight: 1.62,
              color: T.INK_2,
              maxWidth: 620,
              margin: '0 0 26px',
            }}
          >
            This is the first room you step into &mdash; no forms to finish, no decisions to make
            today. Take a quiet look at where you stand, and begin whenever you feel ready.
          </p>
          {/* Optional orienting affordance — a free on-ramp reassurance (never a
              paywall nudge). Links to the Blueprint (route confirmed). */}
          <Link
            href="/blueprint"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              fontFamily: T.FONT_BODY,
              fontSize: 13.5,
              lineHeight: 1.4,
              color: T.INK_2,
              textDecoration: 'none',
              padding: '9px 15px 9px 13px',
              backgroundColor: T.CARD,
              border: `1px solid ${T.LINE}`,
              borderRadius: 999,
              boxShadow: T.SHADOW_CARD,
            }}
          >
            <Bookmark size={14} strokeWidth={2} color={T.GOLD} aria-hidden="true" />
            <span>
              Anything you explore here quietly builds{' '}
              <strong style={{ fontWeight: 600, color: T.NAVY }}>Your Blueprint</strong> &mdash;
              yours to keep.
            </span>
          </Link>
        </div>

        {/* Card 1 — Readiness Assessment (flagship, first). No card header: the
            component's own welcome screen is the centerpiece. */}
        <section
          style={{
            backgroundColor: T.CARD,
            border: `1px solid ${T.LINE}`,
            borderRadius: 12,
            boxShadow: T.SHADOW_CARD,
            padding: 'clamp(32px, 5vw, 64px) clamp(24px, 4vw, 56px)',
            marginBottom: 30,
          }}
        >
          <ReadinessAssessment />
        </section>

        {/* Card 2 — Budget Gap Calculator (second). Fuller header: the component
            has no welcome screen of its own. */}
        <section
          style={{
            backgroundColor: T.CARD,
            border: `1px solid ${T.LINE}`,
            borderRadius: 12,
            boxShadow: T.SHADOW_CARD,
            padding: 'clamp(28px, 4vw, 44px) clamp(24px, 4vw, 48px) clamp(32px, 4vw, 48px)',
            marginBottom: 36,
          }}
        >
          <div style={{ marginBottom: 28, maxWidth: 640 }}>
            <h2
              style={{
                fontFamily: PLAYFAIR,
                fontWeight: 700,
                fontSize: 'clamp(24px, 3.4vw, 30px)',
                lineHeight: 1.18,
                letterSpacing: '-0.01em',
                color: T.NAVY,
                margin: '0 0 10px',
              }}
            >
              Budget Gap Calculator
            </h2>
            <p style={{ fontFamily: T.FONT_BODY, fontSize: 16, lineHeight: 1.6, color: T.INK_2, margin: 0 }}>
              See the distance between the income you&rsquo;d have on your own and what your month
              actually costs &mdash; in one clear number.
            </p>
          </div>
          <BudgetGapCalculator />
        </section>
      </div>
    </main>
  );
}
