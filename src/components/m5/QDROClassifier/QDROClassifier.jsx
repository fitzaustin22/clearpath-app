'use client';

/**
 * QDROClassifier — the QDRO Decision Guide classifier orchestrator
 * (§8.1.4 pre-flow, §8.2.4 banner, Q-C1/Q-C3 layout).
 *
 * On mount it runs a ONE-SHOT pre-pop (PVA §7.3.7 / HDA freshness-gate
 * idiom): if the qdroDecision slice is completely empty AND M2 carries
 * `category ∈ {pensions, retirement}` items, it folds them in via
 * prePopulateQDROInputs → seedQDROAssetsFromM2. If the slice already has
 * any asset (user-added or rehydrated), pre-pop never re-triggers. The
 * cross-store wiring lives here, not in m5Store (PVA/HDA precedent), and
 * m1/m3 are passed null since prePopulateQDROInputs ignores them (PVA.jsx
 * idiom).
 *
 * Layout (Q-C1 sequential stacked / Q-C3 header): mixed-perspective banner
 * (self-gating) → progress header → one QDROAssetCard per asset in stable
 * M2-insertion order (synthetic wizard adds appended after). No continue
 * affordance (Q-C7) — classifier completion is the visible end-state; PR3
 * wires the next step. Minimal route copy is PR5's job (Q-C4).
 *
 * @returns {JSX.Element}
 */

import { useEffect, useMemo } from 'react';
import { useM2Store } from '@/src/stores/m2Store';
import { useM5Store } from '@/src/stores/m5Store';
import { prePopulateQDROInputs } from '@/src/stores/prePopulate';
import { T } from '@/src/lib/brand/tokens';
import QDROEmptyState from './QDROEmptyState.jsx';
import QDROProgressHeader from './QDROProgressHeader.jsx';
import QDROMixedPerspectiveBanner from './QDROMixedPerspectiveBanner.jsx';
import QDROAssetCard from './QDROAssetCard.jsx';
import { QDGNotLegalOrder } from './callouts';

// §8.1.4 — the two M2 categories that feed the QDRO flow.
const QDRO_M2_CATEGORIES = new Set(['pensions', 'retirement']);

function syntheticAssetId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `qdro-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function QDROClassifier() {
  const m2Items = useM2Store((s) => s.maritalEstateInventory?.items);
  const assets = useM5Store((s) => s.qdroDecision.assets);
  const seedQDROAssetsFromM2 = useM5Store((s) => s.seedQDROAssetsFromM2);
  const addQDROAsset = useM5Store((s) => s.addQDROAsset);

  const retirementItems = useMemo(() => {
    if (!Array.isArray(m2Items)) return [];
    return m2Items.filter((i) => i && QDRO_M2_CATEGORIES.has(i.category));
  }, [m2Items]);

  // One-shot pre-pop. Freshness gate via imperative getState() (PVA/HDA):
  // only ever seeds when the slice is entirely empty, so it never
  // re-triggers once the user has any asset.
  useEffect(() => {
    if (Object.keys(useM5Store.getState().qdroDecision.assets).length > 0) {
      return;
    }
    if (retirementItems.length === 0) return;
    const result = prePopulateQDROInputs({
      m1Store: null,
      m2Store: { maritalEstateInventory: { items: retirementItems } },
      m3Store: null,
    });
    seedQDROAssetsFromM2(result);
  }, [retirementItems, seedQDROAssetsFromM2]);

  const m2ById = useMemo(() => {
    const map = {};
    for (const i of retirementItems) map[i.id] = i;
    return map;
  }, [retirementItems]);

  const orderedIds = useMemo(() => {
    const sliceIds = Object.keys(assets || {});
    const m2Ids = retirementItems.map((i) => i.id).filter((id) => assets[id]);
    const seen = new Set(m2Ids);
    const extra = sliceIds.filter((id) => !seen.has(id));
    return [...m2Ids, ...extra];
  }, [assets, retirementItems]);

  const handleAddAsset = () => addQDROAsset(syntheticAssetId());

  const showEmptyState =
    orderedIds.length === 0 && retirementItems.length === 0;

  return (
    <div
      data-testid="qdro-classifier"
      style={{
        fontFamily: T.FONT_BODY,
        color: T.NAVY,
        background: T.PARCHMENT,
        padding: '1.5rem',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <QDGNotLegalOrder />
      {showEmptyState ? (
        <QDROEmptyState onAddAsset={handleAddAsset} />
      ) : orderedIds.length > 0 ? (
        <>
          <QDROMixedPerspectiveBanner />
          <QDROProgressHeader />
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            {orderedIds.map((id) => (
              <QDROAssetCard key={id} assetId={id} m2Item={m2ById[id]} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
