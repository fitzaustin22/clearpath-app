// src/lib/blueprint/pdf/serializePlan.js
//
// Faithful TEXT serialization of a render plan — the exact words that render on
// the page, in document order. Used to drive the A5-M adversarial review where
// the environment cannot rasterize the PDF (the gating Cat 1–5 review is over
// the document's content/compliance; pure-visual Cat 6 does not gate). Pure.

export function serializeRenderPlan(plan) {
  const L = [];
  L.push('================ COVER ================');
  L.push(plan.cover.wordmark);
  L.push(`${plan.cover.title} — ${plan.cover.edition}`);
  for (const m of plan.cover.matter) L.push(`${m.label}: ${m.value}`);
  L.push(`[${plan.cover.disclaimerLabel}] ${plan.cover.disclaimer}`);
  L.push('');

  if (plan.scope) {
    L.push('================ SCOPE NOTICE ================');
    L.push(`${plan.scope.eyebrow} — ${plan.scope.title}`);
    L.push(plan.scope.intro);
    for (const it of plan.scope.items) L.push(`  • ${it.name}: ${it.reason}`);
    L.push(plan.scope.close);
    L.push('');
  }

  L.push('================ CONTENT ================');
  L.push(`[running header: "${plan.content.headerLeft}"  ·  "Page N of M"]`);
  const block = (b) => {
    L.push('');
    L.push(`---- ${b.number ? `${b.number} — ` : ''}${b.title} ----`);
    for (const r of b.rows) {
      const mk = r.markers.length ? ` [${r.markers.join(',')}]` : '';
      L.push(`  ${r.label}: ${r.value}${mk}`);
    }
    for (const n of b.notes || []) L.push(`  NOTE: ${n}`);
    if (b.sources.length) {
      L.push('  Sources:');
      for (const s of b.sources) {
        L.push(`    ${s.n}. ${s.fullCite}${s.verified ? '' : '  (methodology under review)'}`);
      }
    }
  };
  for (const s of plan.content.sections) block(s);
  for (const cb of plan.content.carriers) block(cb);
  L.push('');

  L.push('================ APPENDIX A — METHODOLOGIES & AUTHORITIES ================');
  L.push(plan.methodology.intro);
  for (const e of plan.methodology.entries) {
    const desc = e.description ? ` — ${e.description}` : '';
    const rev = e.verified ? '' : '  — METHODOLOGY UNDER REVIEW';
    L.push(`  • ${e.name}${desc}\n      ${e.cite}${rev}`);
  }
  L.push(`[${plan.methodology.roundingLabel}] ${plan.methodology.rounding}`);
  L.push(`PROVENANCE: ${plan.methodology.provenance}`);
  L.push('');

  L.push('================ APPENDIX B — INPUTS & ASSUMPTIONS ================');
  L.push(plan.inputs.intro);
  for (const e of plan.inputs.entries) L.push(`  ${e.label}: ${e.value}`);
  if (plan.inputs.assumptions.length) {
    L.push('  DISCLOSED ASSUMPTIONS:');
    for (const a of plan.inputs.assumptions) L.push(`    · ${a}`);
  }
  L.push('');
  L.push(`[footer on every numbered page: "${plan.footer.disclaimer}"  ·  ${plan.footer.documentId}]`);
  return L.join('\n');
}
