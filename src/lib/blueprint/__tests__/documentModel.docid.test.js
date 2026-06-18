import { describe, it, expect } from 'vitest';
import F1 from '../../../test/fixtures/v2-golden/F1.json';
import { seedFixtureStores, buildToolInputs } from '../../../test/fixtures/v2-golden/seedFixtureStores.js';
import { buildDocumentModel } from '../documentModel.js';

function buildWithGeneratedAt(ts) {
  const state = seedFixtureStores(F1);
  const s = JSON.parse(
    JSON.stringify({
      sections: state.sections,
      deferredCompStubs: state.deferredCompStubs,
      qdroBlueprint: state.qdroBlueprint,
      costBasisEntries: state.costBasisEntries,
    }),
  );
  if (s.qdroBlueprint?.savedProjection) s.qdroBlueprint.savedProjection.generatedAt = ts;
  return buildDocumentModel(s, {
    jurisdiction: F1.clientState,
    preparedDate: '2026-06-01',
    toolInputs: buildToolInputs(F1),
  });
}

describe('document ID determinism (wall-clock excluded from the content hash)', () => {
  it('is identical across renders despite differing QDRO generatedAt timestamps', () => {
    const a = buildWithGeneratedAt('2026-06-18T00:34:40.562Z');
    const b = buildWithGeneratedAt('2026-06-19T11:22:33.999Z');
    expect(a.documentId).toBe(b.documentId);
    expect(a.documentId).toMatch(/^CP-BP-2026-\d{4}$/);
  });

  it('still changes when a real financial value changes (hash is not degenerate)', () => {
    const a = buildWithGeneratedAt('2026-06-18T00:00:00.000Z');
    const state = seedFixtureStores(F1);
    const s = JSON.parse(
      JSON.stringify({
        sections: state.sections,
        deferredCompStubs: state.deferredCompStubs,
        qdroBlueprint: state.qdroBlueprint,
        costBasisEntries: state.costBasisEntries,
      }),
    );
    // perturb a real value (net worth feeder) — doc ID must move
    s.sections.s3.data.netWorth = (s.sections.s3.data.netWorth ?? 0) + 1;
    const b = buildDocumentModel(s, {
      jurisdiction: F1.clientState,
      preparedDate: '2026-06-01',
      toolInputs: buildToolInputs(F1),
    });
    expect(b.documentId).not.toBe(a.documentId);
  });
});
