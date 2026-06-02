'use client';

/**
 * Dev page — PVA orchestrator end-to-end exercise harness.
 *
 * URL: `/dev/m5/pva` (idle: AssetPicker bound to m2Store inventory)
 *      `/dev/m5/pva?seed=<variant>` (seeded: bypasses m2/m3, drives a fixture)
 *
 * Seed-handler is gated on `process.env.NODE_ENV === 'development'` so a
 * production build of this route would render the bare orchestrator with
 * no seed shortcut.
 *
 * Pattern: force-dynamic dev page with `useSearchParams` consumer wrapped in
 * `<Suspense>` to satisfy Next 16 static-rendering CSR-bailout requirement.
 */

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PVA from '@/src/components/m5/PVA/PVA';
import { SEED_VARIANTS, SEED_KEYS } from '@/src/components/m5/PVA/__fixtures__/seedVariants';
import { T } from '@/src/lib/brand/tokens';

function PVADevContent() {
  const searchParams = useSearchParams();
  const seedKey = searchParams.get('seed');

  const isDev = process.env.NODE_ENV === 'development';
  const seedOverride = isDev && seedKey && SEED_VARIANTS[seedKey] ? SEED_VARIANTS[seedKey] : null;

  return (
    <>
      <header style={{ marginBottom: 16, maxWidth: 960 }}>
        <h1
          style={{
            fontFamily: T.FONT_DISPLAY,
            color: T.NAVY,
            fontSize: '1.75rem',
            margin: 0,
          }}
        >
          PVA — Dev Page {seedKey ? `(seed: ${seedKey})` : ''}
        </h1>
        <p
          style={{
            color: T.NAVY_70,
            fontSize: 14,
            marginTop: 8,
          }}
        >
          Visual QA harness for the §13 step 4 / PR 2 build. Append{' '}
          <code style={{ fontFamily: T.FONT_BODY }}>?seed=&lt;variant&gt;</code> to
          load a fixture; omit it to drive the orchestrator off the live
          m2Store inventory.
        </p>
        {isDev && (
          <details
            style={{
              marginTop: 8,
              fontFamily: T.FONT_BODY,
              color: T.NAVY,
              fontSize: 13,
            }}
          >
            <summary style={{ cursor: 'pointer', color: T.GOLD }}>
              Available seeds ({SEED_KEYS.length})
            </summary>
            <ul style={{ marginTop: 8 }}>
              {SEED_KEYS.map((k) => (
                <li key={k} style={{ marginBottom: 4 }}>
                  <Link
                    href={`/dev/m5/pva?seed=${k}`}
                    style={{
                      color: seedKey === k ? T.GOLD : T.NAVY,
                      fontWeight: seedKey === k ? 600 : 400,
                    }}
                  >
                    {k}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
        {seedKey && !seedOverride && (
          <div
            style={{
              marginTop: 8,
              padding: 12,
              background: T.AMBER_BG,
              border: `1px solid ${T.AMBER_BORDER}`,
              borderRadius: 6,
              fontSize: 13,
              color: T.NAVY,
            }}
          >
            Seed <code>{seedKey}</code> not found {isDev ? '' : '(seeds only available in development mode)'}.
          </div>
        )}
      </header>

      <div style={{ maxWidth: 960 }}>
        <PVA seedOverride={seedOverride} />
      </div>
    </>
  );
}

export default function PVADevPage() {
  return (
    <div
      style={{
        background: T.PARCHMENT,
        minHeight: '100vh',
        padding: '2rem',
        fontFamily: T.FONT_BODY,
      }}
    >
      <Suspense fallback={null}>
        <PVADevContent />
      </Suspense>
    </div>
  );
}
