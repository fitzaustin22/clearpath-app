// QDRO Decision Guide callouts barrel. §8.9 callouts: qdg_not_legal_order
// (top-of-page), qdg_attorney_review_required (per-asset, when captured),
// the §8.5.6 branch-level consult-specialist callout for flag-only
// planTypes, and qdg_packet_ready (§8.9.1 — top-of-page packet emission
// surface, PR4).
export { default as QDGNotLegalOrder } from './QDGNotLegalOrder.jsx';
export { default as QDGAttorneyReviewRequired } from './QDGAttorneyReviewRequired.jsx';
export { default as QDGConsultSpecialist } from './QDGConsultSpecialist.jsx';
export { default as QDGPacketReadyCallout } from './QDGPacketReadyCallout.jsx';
export { default as QDGBlueprintSavedCallout } from './QDGBlueprintSavedCallout.jsx';
export { default as QDROCompletionCallout } from './QDROCompletionCallout.jsx';
