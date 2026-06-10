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

  it('emits every audit-pin slot as the PIN_PENDING_FITZ literal or a finite pinned number', () => {
    const pins = fixture.auditPins;
    expect(isPlainObject(pins)).toBe(true);
    for (const [slot, pinValue] of Object.entries(pins)) {
      // A slot is either awaiting Fitz's hand-computed pin (the literal) or is
      // already pinned to a finite number. Anything else (null, NaN, other
      // strings) is a corrupt slot. Pinning remains Fitz's pass — this spec
      // must never turn his first pinned value into a red main.
      const valid =
        pinValue === PIN_LITERAL || (typeof pinValue === 'number' && Number.isFinite(pinValue));
      expect(
        valid,
        `auditPins.${slot} must be PIN_PENDING_FITZ or a finite number, got: ${JSON.stringify(pinValue)}`
      ).toBe(true);
    }
    // F4 generates no document (below the D-V2-6 floor) and therefore pins nothing;
    // every other fixture must carry at least one pin slot.
    if (id === 'F4') {
      expect(Object.keys(pins)).toHaveLength(0);
    } else {
      expect(Object.keys(pins).length).toBeGreaterThan(0);
    }
  });

  it('emits every audit-assertion slot as the PIN_PENDING_FITZ literal or a non-empty string', () => {
    // Categorical lane: design truths that are labels, not numbers (e.g. a
    // readiness tier, an AAML duration band). Same pending semantics as
    // auditPins; once pinned, the expected value is an exact string the A1
    // runner compares with strict ===. Numbers belong in auditPins.
    const assertions = fixture.auditAssertions ?? {};
    expect(isPlainObject(assertions)).toBe(true);
    for (const [slot, expectedValue] of Object.entries(assertions)) {
      const valid =
        expectedValue === PIN_LITERAL ||
        (typeof expectedValue === 'string' && expectedValue.trim().length > 0);
      expect(
        valid,
        `auditAssertions.${slot} must be PIN_PENDING_FITZ or a non-empty string, got: ${JSON.stringify(expectedValue)}`
      ).toBe(true);
      expect(
        typeof expectedValue,
        `auditAssertions.${slot} must be a string (numeric pins belong in auditPins)`
      ).toBe('string');
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

it('slot counts by block: 19 numeric pins + 2 categorical assertions, per fixture', () => {
  // The two label-shaped design truths (F4b readiness tier, F1 AAML duration
  // band) live in auditAssertions; every numeric audit value stays in
  // auditPins. Counts are pinned per fixture so a slot silently moving or
  // vanishing reds this spec.
  const EXPECTED_SLOT_COUNTS = {
    F1: { pins: 9, assertions: 1 },
    F2: { pins: 3, assertions: 0 },
    F3: { pins: 6, assertions: 0 },
    F4: { pins: 0, assertions: 0 },
    F4b: { pins: 1, assertions: 1 },
  };
  let totalPins = 0;
  let totalAssertions = 0;
  for (const { id, fixture } of FIXTURES) {
    const pins = Object.keys(fixture.auditPins ?? {}).length;
    const assertions = Object.keys(fixture.auditAssertions ?? {}).length;
    expect({ id, pins, assertions }).toEqual({ id, ...EXPECTED_SLOT_COUNTS[id] });
    totalPins += pins;
    totalAssertions += assertions;
  }
  expect(totalPins).toBe(19);
  expect(totalAssertions).toBe(2);
});
