import { describe, it, expect } from 'vitest';
import { smooth, nodeCenter, nodeCenters, PATH_W, PATH_H } from './pathGeometry.js';

describe('smooth', () => {
  it('returns empty string for fewer than 2 points', () => {
    expect(smooth([])).toBe('');
    expect(smooth([{ x: 0, y: 0 }])).toBe('');
  });

  it('opens with a moveto at the first point then a cubic segment', () => {
    expect(smooth([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toMatch(/^M 0 0 C /);
  });

  it('emits one cubic (C) segment per gap between points', () => {
    const d = smooth([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }, { x: 3, y: 1 }]);
    expect((d.match(/C/g) || []).length).toBe(3);
  });
});

describe('nodeCenter', () => {
  it('places station 0 at x=70 (the left margin)', () => {
    expect(nodeCenter(0).x).toBe(70);
  });

  it('places the final station (i=6) at x=1110 (right margin)', () => {
    expect(nodeCenter(6).x).toBeCloseTo(1110, 6);
  });

  it('spaces stations by (W-140)/6 horizontally', () => {
    expect(nodeCenter(3).x).toBeCloseTo(590, 6);
  });

  it('applies the serpentine y = H/2 + 64*sin(i*0.92 + 0.3)', () => {
    expect(nodeCenter(0).y).toBeCloseTo(143.913, 2); // 125 + 64*sin(0.3)
    expect(nodeCenter(6).y).toBeCloseTo(96.40, 1);   // 125 + 64*sin(5.82)
  });
});

describe('nodeCenters', () => {
  it('returns one centre per requested station', () => {
    expect(nodeCenters(7)).toHaveLength(7);
  });

  it('spans from the left margin to the right margin', () => {
    const c = nodeCenters(7);
    expect(c[0].x).toBe(70);
    expect(c[6].x).toBeCloseTo(PATH_W - 70, 6);
  });

  it('keeps every node within the vertical canvas', () => {
    for (const { y } of nodeCenters(7)) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(PATH_H);
    }
  });
});
