// src/lib/blueprint/pdf/serializePlan.js
//
// Faithful TEXT serialization of a render plan — the exact words that render on
// the page, in document order, following the redesigned LAYOUT (hero · cards ·
// bars · groups · method tables · line items). Used to drive the A5-M
// adversarial review where the environment cannot rasterize the PDF. Pure.

function methodTableLines(L, mt, indent) {
  if (!mt) return;
  L.push(`${indent}${''.padEnd(28)}${mt.columns.map((c) => c.padStart(14)).join('')}`);
  for (const r of mt.rows) {
    L.push(`${indent}${r.label.padEnd(28)}${r.cells.map((c) => String(c).padStart(14)).join('')}`);
  }
}

function rowLines(L, rows, indent) {
  for (const r of rows || []) {
    // Citation markers ride the LABEL (as the @react-pdf kit renders them), not
    // the value — so this faithful serialization matches the page.
    const mk = r.markers && r.markers.length ? ` [${r.markers.join(',')}]` : '';
    L.push(`${indent}${r.label}${mk}: ${r.value}`);
  }
}

function layoutLines(L, layout) {
  if (!layout) return;
  if (layout.hero) {
    const mk = layout.hero.markers && layout.hero.markers.length ? ` [${layout.hero.markers.join(',')}]` : '';
    L.push(`  HERO ▸ ${layout.hero.label}${mk}: ${layout.hero.value}`);
    if (layout.hero.subtitle) L.push(`         ${layout.hero.subtitle}`);
  }
  if (layout.cards && layout.cards.length) {
    L.push('  CARDS:');
    rowLines(L, layout.cards, '    ');
  }
  if (layout.bars && layout.bars.length) {
    L.push('  ASSET MIX:');
    for (const b of layout.bars) L.push(`    ${b.label}: ${b.value} (${Number(b.pct).toFixed(2)}%)`);
  }
  for (const mt of layout.methodTables || []) {
    L.push('  METHOD TABLE:');
    methodTableLines(L, mt, '    ');
  }
  for (const g of layout.groups || []) {
    L.push(`  ${g.header ? g.header.toUpperCase() : 'GROUP'}${g.tone ? ` (${g.tone})` : ''}:`);
    // A full-width group (next steps, trade-offs) renders bare values — no
    // repeated row label — exactly as the kit draws it.
    if (g.display === 'fullWidth') for (const r of g.rows || []) L.push(`    ${r.value}`);
    else rowLines(L, g.rows, '    ');
    methodTableLines(L, g.methodTable, '    ');
  }
  for (const e of layout.entities || []) {
    L.push(`  ▸ ${e.header}`);
    rowLines(L, e.rows, '    ');
    methodTableLines(L, e.methodTable, '    ');
  }
  if (layout.lineItems && layout.lineItems.length) {
    L.push('  (inputs / context):');
    rowLines(L, layout.lineItems, '    ');
  }
  if (layout.rows && layout.rows.length) rowLines(L, layout.rows, '  ');
}

export function serializeRenderPlan(plan) {
  const L = [];
  L.push('================ COVER ================');
  L.push(plan.cover.wordmark);
  L.push(`${plan.cover.title} — ${plan.cover.edition}`);
  for (const m of plan.cover.matter) L.push(`${m.label}: ${m.value}`);
  L.push(`[${plan.cover.disclaimerLabel}] ${plan.cover.disclaimer}`);
  L.push('');

  L.push('================ CONTENTS ================');
  for (const it of plan.toc) L.push(`  ${it.label}${it.page != null ? `  …  ${it.page}` : ''}`);
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
  const sourcesOf = (sources) => {
    if (sources && sources.length) {
      L.push('  Sources:');
      for (const s of sources) {
        L.push(`    ${s.n}. ${s.fullCite}${s.verified ? '' : '  (methodology under review)'}`);
      }
    }
  };
  for (const s of plan.content.sections) {
    L.push('');
    L.push(`---- ${s.number} — ${s.title} ----`);
    layoutLines(L, s.layout);
    for (const n of s.notes || []) L.push(`  NOTE: ${n}`);
    sourcesOf(s.sources);
  }
  for (const cb of plan.content.carriers) {
    L.push('');
    L.push(`---- ${cb.number} — ${cb.title} ----`);
    layoutLines(L, cb.layout);
    sourcesOf(cb.sources);
  }
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
  for (const it of plan.inputs.items) {
    if (it.box) {
      L.push(`  ${it.header}:`);
      for (const r of it.rows) L.push(`    ${r.label}: ${r.value}`);
    } else {
      L.push(`  ${it.label}: ${it.value}`);
    }
  }
  if (plan.inputs.assumptions.length) {
    L.push('  DISCLOSED ASSUMPTIONS:');
    for (const a of plan.inputs.assumptions) L.push(`    · ${a}`);
  }
  L.push('');
  L.push(`[footer on every numbered page: "${plan.footer.disclaimer}"  ·  ${plan.footer.documentId}]`);
  return L.join('\n');
}
