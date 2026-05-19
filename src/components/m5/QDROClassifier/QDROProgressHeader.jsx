'use client';

/**
 * QDROProgressHeader — Q-C3 ratification: header bar at the top of the QDRO
 * page with a count + "N of M classified" progress.
 *
 * An asset is "classified" once BOTH per-asset classifiers are chosen —
 * userRole (§8.2) AND planType (§8.3). A pre-popped asset carries planType
 * from M2 but no userRole, so it is NOT yet classified. Consumes
 * m5Store.qdroDecision.assets via a primitive Zustand selector (LL-9) and
 * derives N/M by object iteration.
 *
 * Visual mirrors the foundation WizardProgress bar (6px gold-gradient fill
 * on a T.LINE track) but carries the QDRO-specific "N of M classified"
 * label rather than the foundation's "YOUR BLUEPRINT / Step N / M" copy,
 * which is semantically wrong here. Inline T tokens (zero new tokens).
 *
 * @returns {JSX.Element}
 */

import { useM5Store } from '@/src/stores/m5Store';
import { T } from '@/src/lib/brand/tokens';

export default function QDROProgressHeader() {
  const assets = useM5Store((s) => s.qdroDecision.assets);

  const list = Object.values(assets || {});
  const total = list.length;
  const classified = list.filter(
    (a) => a.userRole != null && a.planType != null,
  ).length;
  const pct = total > 0 ? (classified / total) * 100 : 0;

  return (
    <div
      data-testid="qdro-progress-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        background: T.CARD,
        border: `1px solid ${T.LINE}`,
        borderRadius: 8,
        fontFamily: T.FONT_BODY,
      }}
    >
      <span
        data-testid="qdro-progress-header-count"
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: T.INK,
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {classified} of {total} classified
      </span>

      <div
        role="progressbar"
        aria-valuenow={classified}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuetext={`${classified} of ${total} classified`}
        style={{
          flexGrow: 1,
          height: '6px',
          borderRadius: '999px',
          backgroundColor: T.LINE,
          overflow: 'hidden',
        }}
      >
        <div
          data-testid="qdro-progress-header-fill"
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: '999px',
            backgroundImage: `linear-gradient(90deg, ${T.GOLD}, ${T.GOLD_SOFT})`,
            transition: 'width 300ms ease-out',
          }}
        />
      </div>
    </div>
  );
}
