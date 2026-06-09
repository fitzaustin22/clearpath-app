import { describe, it, expect } from 'vitest';

import F1 from './F1.json';
import F2 from './F2.json';
import F3 from './F3.json';
import F4 from './F4.json';
import F4b from './F4b.json';
import F1Prov from './F1.fieldProvenance.json';
import F2Prov from './F2.fieldProvenance.json';
import F3Prov from './F3.fieldProvenance.json';
import F4Prov from './F4.fieldProvenance.json';
import F4bProv from './F4b.fieldProvenance.json';

// Design allocation of record: V2-Fixture-Design "Jurisdiction allocation" (D-V2-8).
const DESIGN_STATE_ALLOCATION = { F1: 'MD', F2: 'VA', F3: 'DC', F4: 'VA', F4b: 'VA' };
const DMV = new Set(['MD', 'DC', 'VA']);
const PIN_LITERAL = 'PIN_PENDING_FITZ';

const FIXTURES = [
  { id: 'F1', fixture: F1, sidecar: F1Prov },
  { id: 'F2', fixture: F2, sidecar: F2Prov },
  { id: 'F3', fixture: F3, sidecar: F3Prov },
  { id: 'F4', fixture: F4, sidecar: F4Prov },
  { id: 'F4b', fixture: F4b, sidecar: F4bProv },
];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Leaf-path enumeration with array indices normalized to "[]" so one sidecar
// entry covers every element of a homogeneous array. Empty objects/arrays are
// themselves leaves (their path must still be traced).
function collectLeafPaths(value, path, out) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      out.add(path);
      return;
    }
    for (const element of value) collectLeafPaths(element, `${path}[]`, out);
    return;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      out.add(path);
      return;
    }
    for (const key of keys) collectLeafPaths(value[key], path ? `${path}.${key}` : key, out);
    return;
  }
  out.add(path);
}

describe.each(FIXTURES)('golden fixture $id', ({ id, fixture, sidecar }) => {
  it('parses and identifies itself', () => {
    expect(fixture).toBeTruthy();
    expect(fixture.fixtureId).toBe(id);
  });

  it('carries a DMV client state matching the design allocation (D-V2-8)', () => {
    expect(DMV.has(fixture.clientState)).toBe(true);
    expect(fixture.clientState).toBe(DESIGN_STATE_ALLOCATION[id]);
  });

  it('emits every audit-pin slot as the PIN_PENDING_FITZ literal', () => {
    const pins = fixture.auditPins;
    expect(isPlainObject(pins)).toBe(true);
    for (const [slot, pinValue] of Object.entries(pins)) {
      expect(pinValue, `auditPins.${slot} must stay unpinned until Fitz hand-computes it`).toBe(
        PIN_LITERAL
      );
    }
    // F4 generates no document (below the D-V2-6 floor) and therefore pins nothing;
    // every other fixture must carry at least one pin slot.
    if (id === 'F4') {
      expect(Object.keys(pins)).toHaveLength(0);
    } else {
      expect(Object.keys(pins).length).toBeGreaterThan(0);
    }
  });

  it('has a _fieldProvenance sidecar covering every field path', () => {
    expect(sidecar.fixtureId).toBe(id);
    const provenanceMap = sidecar._fieldProvenance;
    expect(isPlainObject(provenanceMap)).toBe(true);
    const paths = new Set();
    collectLeafPaths(fixture, '', paths);
    const missing = [...paths].filter((path) => !(path in provenanceMap));
    expect(missing).toEqual([]);
  });
});

it('design allocation covers exactly the five golden fixtures', () => {
  expect(Object.keys(DESIGN_STATE_ALLOCATION).sort()).toEqual(['F1', 'F2', 'F3', 'F4', 'F4b']);
});
