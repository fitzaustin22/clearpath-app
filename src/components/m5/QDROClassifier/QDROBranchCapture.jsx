'use client';

/**
 * QDROBranchCapture — the per-asset branch-capture routing wrapper
 * (§8.4.1 / Q-B1 / Q-B2 / Q-B5 / D6). Rendered inline inside
 * QDROAssetCard, below the classifier.
 *
 * Q-B2: nothing renders until BOTH classifiers are set — branch capture
 * is hidden entirely before classification. Once classified, route by
 * planType:
 *
 *  - dc                                   → QDROBranchDC (Full, m2Store)
 *  - ira                                  → QDROBranchIRA (Full, m2Store)
 *  - gov_civilian/military/state_municipal→ QDGConsultSpecialist callout
 *      (flag-only — full starter-Q capture is PR4; the locked
 *      consult-specialist copy shows now per Q-B5/D4)
 *  - private_db                           → nothing (silent — §13 step 6,
 *      PVA-dependent; out of PR3 scope)
 *  - anything else                        → nothing (fail closed)
 *
 * Pure prop router — owns no store reads; the branch components read the
 * asset slice themselves.
 *
 * @param {object} props
 * @param {string} props.assetId qdroDecision.assets key
 * @param {'participant'|'alternatePayee'|null} props.userRole §8.2 classifier
 * @param {string|null} props.planType §8.3 classifier
 * @returns {JSX.Element | null}
 */

import QDROBranchDC from './QDROBranchDC.jsx';
import QDROBranchIRA from './QDROBranchIRA.jsx';
import { QDGConsultSpecialist } from './callouts';

const FLAG_ONLY = new Set(['gov_civilian', 'military', 'state_municipal']);

export default function QDROBranchCapture({ assetId, userRole, planType }) {
  // Q-B2 — both classifiers required before any branch capture renders.
  if (userRole == null || planType == null) return null;

  if (planType === 'dc') {
    return <QDROBranchDC assetId={assetId} userRole={userRole} />;
  }
  if (planType === 'ira') {
    return <QDROBranchIRA assetId={assetId} />;
  }
  if (FLAG_ONLY.has(planType)) {
    return <QDGConsultSpecialist planType={planType} />;
  }
  // private_db → §13 step 6 (PVA-dependent); unknown → fail closed.
  return null;
}
