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
 * @property {boolean} [gated]    requires Full Access. When true and the user is
 *        below config.tierGate, deriveModuleJourney resolves this worksheet to the
 *        derived `locked` state (Option C — quiet inline unlock). Default false/absent
 *        => never gated. Per-worksheet so a module can wholesale-gate (M4/M5 mark all)
 *        or mix gated and free rows. The progress adapter stays tier-unaware and never
 *        emits 'locked' — locking is resolved here from this flag + the user's tier.
 */

/**
 * Normalized per-worksheet progress emitted by a module's adapter. The status enum
 * stays 3-state — adapters report real progress and are tier-unaware. `locked` is
 * NOT an adapter status: it is a derived presentation state resolved by
 * deriveModuleJourney from a worksheet's `gated` flag + the user's tier (see
 * DerivedJourneyStep.status). M4/M5 adapters report progress exactly like M2/M3.
 * @typedef {Object} ProgressEntry
 * @property {string} id
 * @property {'not_started'|'in_progress'|'complete'} status
 * @property {number} pct   0-100
 */

/**
 * One rendered journey step produced by deriveModuleJourney. The derived `status`
 * adds a 4th value, `locked` (gated worksheet + a user below the tier gate), to the
 * three input statuses. A locked step renders the Option C "quiet inline unlock"
 * treatment: a lock-glyph node, no pulse, no progress bar, and a single "Unlock"
 * CTA whose href is the module's upgrade target (not the worksheet route). It is
 * never the recommended-next gold step.
 * @typedef {Object} DerivedJourneyStep
 * @property {string} key
 * @property {number} step                       1-based position.
 * @property {string} eyebrow
 * @property {string} title
 * @property {string} description
 * @property {string} href                       worksheet route, or the upgrade route when locked.
 * @property {'not_started'|'in_progress'|'complete'|'locked'} status
 * @property {number} progress                   0-100; always 0 when locked.
 * @property {'next'|'active'|'complete'|'muted'|'locked'} node
 * @property {boolean} pulse
 * @property {'primary'|'secondary'|'locked'} ctaVariant
 * @property {string} ctaLabel
 * @property {boolean} [locked]                  true only for the locked state.
 * @property {string} [subLine]                  locked sub-line, e.g. 'Included in Full Access'.
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
