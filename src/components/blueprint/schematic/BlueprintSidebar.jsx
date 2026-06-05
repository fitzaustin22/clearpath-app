'use client';

/**
 * BlueprintSidebar — the 372px right column from the schematic design.
 *
 * Reuses the existing M7 export entry point. Per Phase 0 spec, BOTH the
 * "Preview document" (gold) and "Export draft" (outline) buttons wire to the
 * SAME `triggerExport()` defined in BlueprintExport.jsx — no new export
 * capability is invented. For Free / Essentials users the button cluster is
 * replaced with the existing BlueprintExportLockedTeaser inline, preserving
 * the tier-gating contract.
 *
 * Stat card stays on the existing navy palette (T.NAVY). Stat number, progress
 * copy (consumer-framed via deriveProgressCopy), and the up-next title all
 * derive from the same single source of truth — the schematic's `activeKey` +
 * the store's counts — so the sidebar never drifts from the dashboard hero.
 *
 * Section labels in "what writes next" come from blueprintStore.sections so
 * they stay consistent with the canonical store labels even when the schematic
 * card relabels them (e.g. "Home Decision" ↔ s9).
 */

import Link from 'next/link';
import { hasAccess } from '@/src/lib/plans';
import { T } from '@/src/lib/brand/tokens';
import { triggerBlueprintExport } from './triggerBlueprintExport';
import { SCHEMATIC_CARDS } from './sections';
import { deriveProgressCopy } from './deriveProgressCopy';

const MODULE_NAMES = {
  m1: 'Module 1 Permission to Explore',
  m2: 'Module 2 Know What You Own',
  m3: 'Module 3 Know What You Spend',
  m4: 'Module 4 Tax Landscape',
  m5: 'Module 5 Value What Matters',
  m6: 'Module 6 Negotiate from Strength',
  m7: 'Module 7 Your Blueprint',
  'm2+m4': 'Modules 2 and 4',
  'm4+m5': 'Modules 4 and 5',
};

const MODULE_BLURB = {
  m1: 'Begin with your story, goals, and a snapshot of where things stand today.',
  m2: 'Catalog every asset and debt so you know the full marital estate.',
  m3: 'Map the income and expenses that shape what you can afford going forward.',
  m4: 'See how filing status and basis change what your settlement is really worth.',
  m5: 'Value the pieces that matter most — the home, retirement accounts, support.',
  m6: 'Sort your priorities and pressure-test each settlement scenario before you negotiate.',
  m7: 'Pull everything together into a Blueprint you can act on with confidence.',
  'm2+m4': 'Continue the asset division work that bridges Modules 2 and 4.',
  'm4+m5': 'Continue the tax-and-value work that bridges Modules 4 and 5.',
};

function FileTextIcon({ size = 18, color = '#8A93A8' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function StatCard({ percentComplete, copy, userTier }) {
  const isFullAccess = hasAccess(userTier, 'navigator');
  return (
    <div
      style={{
        backgroundColor: T.NAVY,
        borderRadius: 14,
        padding: '30px 30px 28px',
        color: T.CARD,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span
          style={{
            fontFamily: "var(--font-playfair), 'Playfair Display', serif",
            fontWeight: 700,
            fontSize: 54,
            color: T.GOLD,
            lineHeight: 1,
          }}
        >
          {percentComplete}
        </span>
        <span
          style={{
            fontFamily: "var(--font-playfair), 'Playfair Display', serif",
            fontWeight: 700,
            fontSize: 22,
            color: T.GOLD,
            lineHeight: 1,
          }}
        >
          %
        </span>
        <span
          style={{
            fontFamily: T.FONT_BODY,
            fontSize: 13,
            color: 'rgba(255,255,255,0.7)',
            marginLeft: 8,
          }}
        >
          complete
        </span>
      </div>
      <p
        style={{
          fontFamily: T.FONT_BODY,
          fontSize: 15,
          lineHeight: 1.5,
          color: 'rgba(255,255,255,0.82)',
          margin: '18px 0 24px',
        }}
      >
        {copy}
      </p>

      {isFullAccess ? (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={triggerBlueprintExport}
            data-testid="schematic-preview-button"
            style={{
              backgroundColor: T.GOLD,
              color: T.NAVY,
              fontFamily: T.FONT_BODY,
              fontWeight: 700,
              fontSize: 13.5,
              padding: '13px 22px',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Preview document
          </button>
          <button
            type="button"
            onClick={triggerBlueprintExport}
            data-testid="schematic-export-button"
            style={{
              backgroundColor: 'transparent',
              color: T.CARD,
              fontFamily: T.FONT_BODY,
              fontWeight: 600,
              fontSize: 13.5,
              padding: '13px 22px',
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Export Blueprint
          </button>
        </div>
      ) : (
        <div data-testid="schematic-export-locked">
          <Link
            href="/upgrade"
            style={{
              display: 'inline-block',
              backgroundColor: T.GOLD,
              color: T.NAVY,
              fontFamily: T.FONT_BODY,
              fontWeight: 700,
              fontSize: 13.5,
              padding: '13px 22px',
              borderRadius: 8,
              textDecoration: 'none',
              letterSpacing: 0.3,
            }}
          >
            Unlock Preview & Export
          </Link>
          <p
            style={{
              fontFamily: T.FONT_BODY,
              fontSize: 12,
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.4,
              margin: '10px 0 0',
            }}
          >
            Full Access unlocks a clean, shareable PDF of your Blueprint with a cover page and disclaimer.
          </p>
        </div>
      )}
    </div>
  );
}

function Eyebrow({ children, marginTop = 30 }) {
  return (
    <div
      style={{
        fontFamily: T.FONT_BODY,
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: T.PILL_TEXT,
        margin: `${marginTop}px 0 14px`,
      }}
    >
      {children}
    </div>
  );
}

function UpNextCard({ activeStoreKey, sections }) {
  if (!activeStoreKey) {
    return (
      <div
        style={{
          backgroundColor: T.PARCHMENT_DEEP,
          border: `1px solid ${T.GOLD_BORDER}`,
          borderRadius: 12,
          padding: 22,
        }}
      >
        <div
          style={{
            fontFamily: T.FONT_BODY,
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: T.PILL_TEXT,
          }}
        >
          Blueprint complete
        </div>
        <div
          style={{
            fontFamily: T.FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 19,
            color: T.NAVY,
            margin: '8px 0',
          }}
        >
          Every section is written
        </div>
        <p
          style={{
            fontFamily: T.FONT_BODY,
            fontSize: 14,
            lineHeight: 1.5,
            color: T.INK_2,
            margin: 0,
          }}
        >
          Use Preview or Export above to review or save a copy of the finished document.
        </p>
      </div>
    );
  }

  const activeCard = SCHEMATIC_CARDS.find((c) => c.storeKey === activeStoreKey);
  const storedSection = sections?.[activeStoreKey];
  const sourceModule = storedSection?.sourceModule;
  const moduleLabel = MODULE_NAMES[sourceModule] || 'the next module';
  const blurb = MODULE_BLURB[sourceModule] || `Continue with ${moduleLabel} to keep building your Blueprint.`;
  const moduleHref = sourceModule && sourceModule.startsWith('m') && !sourceModule.includes('+')
    ? `/modules/${sourceModule}`
    : '/dashboard';

  return (
    <div
      style={{
        backgroundColor: T.PARCHMENT_DEEP,
        border: `1px solid ${T.GOLD_BORDER}`,
        borderRadius: 12,
        padding: 22,
      }}
    >
      <div
        style={{
          fontFamily: T.FONT_BODY,
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: T.PILL_TEXT,
        }}
      >
        UP NEXT · {moduleLabel.toUpperCase()}
      </div>
      <div
        style={{
          fontFamily: T.FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 19,
          color: T.NAVY,
          margin: '8px 0',
        }}
      >
        Writes {activeCard?.label || storedSection?.label || 'the next section'}
      </div>
      <p
        style={{
          fontFamily: T.FONT_BODY,
          fontSize: 14,
          lineHeight: 1.5,
          color: T.INK_2,
          margin: '0 0 16px',
        }}
      >
        {blurb}
      </p>
      <Link
        href={moduleHref}
        data-testid="schematic-continue-link"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: T.NAVY,
          color: T.CARD,
          fontFamily: T.FONT_BODY,
          fontWeight: 600,
          fontSize: 14,
          padding: 15,
          borderRadius: 8,
          textDecoration: 'none',
        }}
      >
        Continue this section →
      </Link>
    </div>
  );
}

function UpcomingList({ activeStoreKey, sections }) {
  if (!activeStoreKey) return null;
  // Show the next two non-complete sections AFTER the active one, in card order.
  const activeIdx = SCHEMATIC_CARDS.findIndex((c) => c.storeKey === activeStoreKey);
  const upcoming = [];
  for (let i = activeIdx + 1; i < SCHEMATIC_CARDS.length && upcoming.length < 2; i += 1) {
    const card = SCHEMATIC_CARDS[i];
    const stored = sections?.[card.storeKey];
    if (stored?.status === 'complete') continue;
    upcoming.push({ card, sourceModule: stored?.sourceModule });
  }
  if (upcoming.length === 0) return null;
  return (
    <div>
      {upcoming.map(({ card, sourceModule }, idx) => (
        <div
          key={card.storeKey}
          style={{
            display: 'flex',
            gap: 12,
            padding: '16px 4px',
            borderTop: idx > 0 ? `1px solid ${T.LINE}` : 'none',
          }}
        >
          <div style={{ flex: '0 0 auto', paddingTop: 2 }}>
            <FileTextIcon size={18} color={T.MUTED} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <div
              style={{
                fontFamily: T.FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 15,
                lineHeight: 1.25,
                color: T.NAVY,
              }}
            >
              {card.label}
            </div>
            <div
              style={{
                fontFamily: T.FONT_BODY,
                fontSize: 13,
                lineHeight: 1.35,
                color: T.MUTED,
              }}
            >
              <span style={{ fontStyle: 'italic' }}>via</span>{' '}
              {MODULE_NAMES[sourceModule] || 'an upcoming module'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BlueprintSidebar({
  sections,
  completedCount,
  partialCount,
  activeStoreKey,
  userTier,
}) {
  const { percentComplete, sentence } = deriveProgressCopy(completedCount, partialCount);
  return (
    <aside data-testid="schematic-sidebar" aria-label="Blueprint progress and next steps">
      <StatCard percentComplete={percentComplete} copy={sentence} userTier={userTier} />
      <Eyebrow>What writes next</Eyebrow>
      <UpNextCard activeStoreKey={activeStoreKey} sections={sections} />
      <UpcomingList activeStoreKey={activeStoreKey} sections={sections} />
    </aside>
  );
}
