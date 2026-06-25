// Type contract for the shared ModuleLanding system. JSDoc typedefs (the repo's
// component idiom is JS + JSDoc) so per-module configs can reference a single
// shape. The static half lives in a module's *Landing.config.js; the dynamic half
// (per-worksheet progress) comes from its *Landing.adapter.js as a normalized
// ProgressEntry[] consumed by deriveModuleJourney.

/**
 * One worksheet/tool row in the journey (variable count per module).
 * @typedef {Object} ModuleLandingWorksheet
 * @property {string} id          store key, matches a ProgressEntry.id
 * @property {string} stepLabel   card eyebrow, e.g. 'Step 1 · Gather documents'
 * @property {string} title
 * @property {string} description
 * @property {string} route       worksheet href, e.g. '/modules/m2/checklist'
 * @property {string} ctaCopy     the not_started CTA verb, e.g. 'Start checklist'
 */

/**
 * Normalized per-worksheet progress emitted by a module's adapter. The status enum
 * is 3-state for v1. A 4th 'locked' value is planned for the wholesale-locked
 * modules (M4/M5) but is deliberately NOT built here — and it is NOT a pure data
 * addition: wiring it up means new branches in deriveModuleJourney (the
 * firstNonComplete "recommended next" skip, plus the node + CTA mapping) and new
 * StatusPill/JourneyNode arms in ModuleJourney, so a locked worksheet never becomes
 * the gold next-step linking to a gated route. Phase 2 adds those branches; until
 * then no adapter emits 'locked'.
 * @typedef {Object} ProgressEntry
 * @property {string} id
 * @property {'not_started'|'in_progress'|'complete'} status
 * @property {number} pct   0-100
 */

/**
 * Static content for one module landing page.
 * @typedef {Object} ModuleLandingConfig
 * @property {string} module                                   e.g. 'm2'; namespaces test ids.
 * @property {string} eyebrow                                  e.g. 'Module 02 · Your Tools'.
 * @property {{text:string, goldWord:string}} headline         goldWord (a unique whole word in text) renders gold-italic.
 * @property {string} lead                                     hero paragraph.
 * @property {{copy:string, pills:string[]}} readiness         callout body + STATIC pills.
 * @property {ModuleLandingWorksheet[]} worksheets             journey rows (length N).
 * @property {?('essentials'|'navigator')} tierGate            upgrade-promo threshold; null = no promo.
 * @property {?{headline:string, body:string, ctaCopy:string}} upgrade  promo copy; null = no promo.
 * @property {{dashboard:string, blueprint:string, upgrade:string}} links  nav targets.
 */

export {};
