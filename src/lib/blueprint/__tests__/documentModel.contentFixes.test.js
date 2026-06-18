/**
 * V2 Attorney Blueprint — content / disclosure / label fixes (F1 "Margaret
 * Carter" render). These are presentation-layer changes to the section/
 * supplement writers and renderer copy; they DO NOT touch the recomputers and
 * MUST keep A1/A2/A3/A4/D5 green. Each `it` maps to a numbered task item.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import F1 from '../../../test/fixtures/v2-golden/F1.json';
import F2 from '../../../test/fixtures/v2-golden/F2.json';
import F4b from '../../../test/fixtures/v2-golden/F4b.json';
import { seedFixtureStores, buildToolInputs } from '../../../test/fixtures/v2-golden/seedFixtureStores.js';
import { buildDocumentModel } from '../documentModel.js';
import { buildRenderPlan, collectRenderableStrings } from '../pdf/AttorneyBlueprintDocument.jsx';

function buildPlan(fixture) {
  const state = seedFixtureStores(fixture);
  const snap = {
    sections: JSON.parse(JSON.stringify(state.sections)),
    deferredCompStubs: JSON.parse(JSON.stringify(state.deferredCompStubs)),
    qdroBlueprint: JSON.parse(JSON.stringify(state.qdroBlueprint)),
    costBasisEntries: JSON.parse(JSON.stringify(state.costBasisEntries)),
  };
  const model = buildDocumentModel(snap, {
    jurisdiction: fixture.clientState,
    preparedDate: '2026-06-01',
    toolInputs: buildToolInputs(fixture),
  });
  return { model, plan: buildRenderPlan(model, { clientName: 'Test Client', preparedDate: '2026-06-01' }) };
}

let SNAP;
let MODEL;
let PLAN;
let STRINGS;

const block = (model, secId, id) =>
  model.sections.find((s) => s.id === secId)?.blocks.find((b) => b.id === id);
const carrierBlock = (model, name, id) => model.carriers[name].find((b) => b.id === id);
const sectionNote = (plan, number) =>
  plan.content.sections.find((s) => s.number === number)?.notes ?? [];
const carrier = (plan, title) => plan.content.carriers.find((c) => c.title === title);

beforeAll(() => {
  const state = seedFixtureStores(F1);
  SNAP = {
    sections: JSON.parse(JSON.stringify(state.sections)),
    deferredCompStubs: JSON.parse(JSON.stringify(state.deferredCompStubs)),
    qdroBlueprint: JSON.parse(JSON.stringify(state.qdroBlueprint)),
    costBasisEntries: JSON.parse(JSON.stringify(state.costBasisEntries)),
  };
  MODEL = buildDocumentModel(SNAP, {
    jurisdiction: F1.clientState,
    preparedDate: '2026-06-01',
    toolInputs: buildToolInputs(F1),
  });
  PLAN = buildRenderPlan(MODEL, { clientName: 'Margaret Carter', preparedDate: '2026-06-01' });
  STRINGS = collectRenderableStrings(PLAN);
});

describe('#2 — §4 suppresses unavailable married-filing statuses (Dec-31 determination)', () => {
  it('omits mfj/mfs scenario blocks and keeps single + hoh', () => {
    const s4ids = MODEL.sections.find((s) => s.id === 's4').blocks.map((b) => b.id);
    expect(s4ids).not.toContain('s4.scenario.mfj.netTax');
    expect(s4ids).not.toContain('s4.scenario.mfs.netTax');
    expect(s4ids).toContain('s4.scenario.single.netTax');
    expect(s4ids).toContain('s4.scenario.hoh.netTax');
  });
  it('leaves the projected difference (computed over eligible statuses) untouched', () => {
    expect(block(MODEL, 's4', 's4.maxSavings').value).toBe(3582);
  });
  it('§4 note states married-filing statuses are unavailable given the Dec-31 determination', () => {
    const note = sectionNote(PLAN, 'Section 4').join(' ');
    expect(note).toMatch(/December 31/);
    expect(note.toLowerCase()).toMatch(/unavailable|cannot use|not available/);
    expect(note).not.toMatch(/shown for comparison only/);
  });
});

describe('#7 — §1/§7 cashflow reconciliation (support-aware, from existing values)', () => {
  it('§7 adds a support-aware net-position block = net income + total support − projected expenses', () => {
    const np = block(MODEL, 's7', 's7.supportAwareNetPosition');
    expect(np, 's7.supportAwareNetPosition block').toBeTruthy();
    // Foots against the DISPLAYED page values: 5747.66 (net income) + 7820
    // (total support as shown in §8, whole dollar) − 7960 (projected) = 5607.66,
    // rendered to the whole dollar as $5,608.
    expect(Math.round(np.value * 100) / 100).toBe(5607.66);
    expect(np.valueClass).toBe('currency_projection');
  });
  it('§1 budget-gap figures relabeled as a preliminary self-estimate (superseded)', () => {
    const gap = block(MODEL, 's1', 's1.monthlyGap');
    expect(gap.label.toLowerCase()).toMatch(/preliminary self-estimate/);
    expect(gap.label).not.toMatch(/Module 1/);
  });
  it('§7 reconciliation note points to §1 and §8', () => {
    const note = sectionNote(PLAN, 'Section 7').join(' ');
    expect(note).toMatch(/Section 1/);
    expect(note).toMatch(/Section 8/);
  });
});

describe('#8 — §5 property-division reconciliation disclosure', () => {
  it('cross-references §6 for retirement/pension and discloses debt handled separately', () => {
    const notes = sectionNote(PLAN, 'Section 5').join(' ');
    expect(notes).toMatch(/Section 6/);
    expect(notes.toLowerCase()).toMatch(/debt/);
    expect(notes.toLowerCase()).toMatch(/pension/);
  });
});

describe('#9 — pension excluded from balance-sheet totals, valued in §6', () => {
  it('§3 note explains the pension is valued separately in §6 and excluded from these totals', () => {
    const note = sectionNote(PLAN, 'Section 3').join(' ');
    expect(note).toMatch(/Section 6/);
    expect(note.toLowerCase()).toMatch(/pension/);
    expect(note.toLowerCase()).toMatch(/not included|excluded|separately/);
  });
});

describe('#18 — pension citations: coverture cases on marital portion, §417(e) on total PV', () => {
  it('total PV cites only §417(e); coverture cases removed', () => {
    expect(block(MODEL, 's6', 's6.pva.headlinePV').citations).toEqual(['irc_417e3']);
  });
  it('marital-portion PV carries the coverture-case authorities', () => {
    expect(block(MODEL, 's6', 's6.pva.maritalPV').citations).toEqual(
      expect.arrayContaining(['bender_dc_1972', 'mosley_va_1994', 'deering_md_1981']),
    );
    expect(block(MODEL, 's6', 's6.pva.maritalPV').citations).not.toContain('irc_417e3');
  });
});

describe('#20 — annual gross income consistent (paycheck × periods, not monthly × 12)', () => {
  it('§2 annual gross is 94900 (3650 × 26), monthly figure unchanged', () => {
    expect(block(MODEL, 's2', 's2.annualGrossIncome').value).toBe(94900);
    expect(block(MODEL, 's2', 's2.grossMonthlyIncome').value).toBe(7908.33); // calc figure untouched
  });
});

describe('#14 — offer-silences count agrees with the detail', () => {
  it('the headline count equals the number of priorities the offer does not address (2)', () => {
    const gap = block(MODEL, 's11', 's11.gapCount');
    expect(gap.value).toBe(2);
    const silentRows = MODEL.sections
      .find((s) => s.id === 's11')
      .blocks.filter((b) => b.id.startsWith('s11.map.'));
    expect(silentRows.length).toBe(2);
  });
});

describe('#4 — offer-silent copy reworded to "Not addressed in the offer"', () => {
  it('map rows render the offer posture as "Not addressed in the offer" (not "silent")', () => {
    // #75 renders the priority as the row LABEL and the offer's posture as the VALUE.
    const mapBlocks = MODEL.sections.find((s) => s.id === 's11').blocks
      .filter((b) => b.id.startsWith('s11.map.'));
    expect(mapBlocks.length).toBeGreaterThan(0);
    for (const b of mapBlocks) expect(b.value.toLowerCase()).toMatch(/not addressed in the offer/);
    expect(mapBlocks.map((b) => b.value).join(' ')).not.toMatch(/Offer is silent|— silent/);
  });
  it('§11 legend note explains the "not addressed" status', () => {
    const note = sectionNote(PLAN, 'Section 11').join(' ').toLowerCase();
    expect(note).toMatch(/not addressed/);
  });
});

describe('#15 — professionals detail rendered', () => {
  it('§12 emits a per-professional block with role and name', () => {
    const pro = block(MODEL, 's12', 's12.professional.0');
    expect(pro, 's12.professional.0').toBeTruthy();
    expect(pro.value).toBe('CDFA — A. Fitzpatrick');
  });
});

describe('#5 — net-equity basis label is class-aware', () => {
  it('real estate keeps "(FMV − mortgage)"; working capital uses "(FMV)" only', () => {
    expect(carrierBlock(MODEL, 'costBasisEntries', 'carrier.cbe.realEstate-f1home.baseline').label)
      .toBe('Net-equity valuation basis (FMV − mortgage)');
    expect(carrierBlock(MODEL, 'costBasisEntries', 'carrier.cbe.workingCapital-f1brok.baseline').label)
      .toBe('Net-equity valuation basis (FMV)');
  });
});

describe('#21 — working-capital basis reconciliation note', () => {
  it('Tax-Adjusted Asset Values block notes only cost-basis assets appear (cash excluded)', () => {
    const c = carrier(PLAN, 'Tax-Adjusted Asset Values');
    expect(c).toBeTruthy();
    const note = (c.notes || []).join(' ').toLowerCase();
    expect(note).toMatch(/cost basis|cash|face value|section 3/);
  });
});

describe('#19 — deferred-comp Hug/Nelson method note', () => {
  it('Deferred Compensation block notes Hug and Nelson are alternative time-rule methods', () => {
    const c = carrier(PLAN, 'Deferred Compensation');
    expect(c).toBeTruthy();
    const note = (c.notes || []).join(' ');
    expect(note).toMatch(/Hug/);
    expect(note).toMatch(/Nelson/);
    expect(note.toLowerCase()).toMatch(/time-rule|time rule/);
  });
});

describe('#22 — QDRO supplement date is deterministic (wall-clock excluded from the doc ID)', () => {
  // #75 (merged) solved the doc-ID determinism via shortContentHash's
  // isWallClockBlock filter (the QDRO generatedAt renders as a long date but is
  // excluded from the content hash), rather than this branch's earlier
  // pin-to-preparedDate approach. Assert the shared invariant: the document ID is
  // stable across renders even when the seeded QDRO generatedAt differs.
  it('documentId is stable across renders even when the seeded QDRO generatedAt differs', () => {
    const mutated = JSON.parse(JSON.stringify(SNAP));
    if (mutated.qdroBlueprint?.savedProjection) {
      mutated.qdroBlueprint.savedProjection.generatedAt = '2099-12-31T23:59:59.999Z';
    }
    const a = buildDocumentModel(SNAP, { jurisdiction: 'MD', preparedDate: '2026-06-01' });
    const b = buildDocumentModel(mutated, { jurisdiction: 'MD', preparedDate: '2026-06-01' });
    expect(a.documentId).toBe(b.documentId);
  });
});

describe('#12 — internal-jargon sweep (no Module/PVA/HDA/PIT/DCA tokens on the surface)', () => {
  it('no "Module N" references in any rendered string', () => {
    const leaks = STRINGS.filter((s) => /Module\s*\d/.test(s));
    expect(leaks, `Module-N leaks: ${JSON.stringify(leaks)}`).toEqual([]);
  });
  it('Appendix B assumption labels use plain language, not PVA/HDA/PIT/DCA acronyms', () => {
    const leaks = STRINGS.filter((s) => /\b(PVA|HDA|DCA)\b/.test(s) || /\bPIT assumption\b/.test(s));
    expect(leaks, `acronym leaks: ${JSON.stringify(leaks)}`).toEqual([]);
    // #75 groups Appendix B entries into boxes (header + rows) or inline items;
    // flatten both forms to check the plain-language label prefixes are present.
    const labels = PLAN.inputs.items
      .flatMap((it) => (it.box ? [it.header, ...it.rows.map((r) => r.label)] : [it.label]))
      .join(' ')
      .toLowerCase();
    expect(labels).toMatch(/pension present-value assumptions/);
    expect(labels).toMatch(/point-in-time tax-discount assumptions/);
  });
});

describe('no dangling notes when referenced sections are omitted (A5-M F2/F4b)', () => {
  it('F2 (§8 omitted): §7 has no support-aware line and no note referencing Section 8', () => {
    const { model, plan } = buildPlan(F2);
    const s7 = model.sections.find((s) => s.id === 's7');
    if (s7?.included) {
      expect(s7.blocks.some((b) => b.id === 's7.supportAwareNetPosition')).toBe(false);
    }
    const s7notes = plan.content.sections.find((s) => s.number === 'Section 7')?.notes ?? [];
    expect(s7notes.join(' ')).not.toMatch(/Section 8/);
  });
  it('F4b (§6 + tax-adjusted omitted): §3 has no §6 cross-ref note; §5 has no tax-adjusted note', () => {
    const { plan } = buildPlan(F4b);
    const s3notes = (plan.content.sections.find((s) => s.number === 'Section 3')?.notes ?? []).join(' ');
    expect(s3notes).not.toMatch(/Section 6/);
    const s5notes = (plan.content.sections.find((s) => s.number === 'Section 5')?.notes ?? []).join(' ');
    expect(s5notes.toLowerCase()).not.toMatch(/tax-adjusted figures|present value/);
  });
});

describe('raw-token-leak defense holds for all new copy (A4 parity)', () => {
  it('no camelCase / snake_case / brace tokens in any rendered string', () => {
    const CAMEL = /\b[a-z][a-z0-9]*[A-Z][a-zA-Z0-9]*\b/;
    const SNAKE = /\b[a-z0-9]+_[a-z0-9_]+\b/;
    const BRACES = /[{}]/;
    const hits = STRINGS.filter((s) => CAMEL.test(s) || SNAKE.test(s) || BRACES.test(s));
    expect(hits, `raw-token leaks: ${JSON.stringify(hits)}`).toEqual([]);
  });
});
