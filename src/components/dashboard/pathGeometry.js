// Pure SVG path geometry for the dashboard "Path to Clarity" map.
//
// The smooth() helper is copied VERBATIM from the design handoff's
// reference/ConceptPath.jsx (Catmull-Rom -> cubic bezier; control points =
// neighbour deltas / 6). The handoff names this the one place with deliberate
// curve freedom, so it is kept byte-for-byte identical to the reference.
//
// Node centres follow the handoff formula exactly, in a 1180x250 coordinate
// space (W = 1180, H = 250):
//   x = 70 + i * ((W - 140) / 6)        // -> 70, 243.3, 416.7, 590, 763.3, 936.7, 1110
//   y = H/2 + 64 * sin(i * 0.92 + 0.3)  // a calm serpentine; H/2 = 125

export const PATH_W = 1180;
export const PATH_H = 250;

// Catmull-Rom -> cubic bezier through the given {x, y} points. Verbatim from the
// design reference; do not "improve" it — the exact curve is intentional.
export function smooth(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

// Centre of station i (0-based) in the W x H coordinate space.
export function nodeCenter(i, W = PATH_W, H = PATH_H) {
  return {
    x: 70 + i * ((W - 140) / 6),
    y: H / 2 + 64 * Math.sin(i * 0.92 + 0.3),
  };
}

// Centres for `count` evenly-indexed stations (count = 7 for M1-M7).
export function nodeCenters(count, W = PATH_W, H = PATH_H) {
  return Array.from({ length: count }, (_, i) => nodeCenter(i, W, H));
}
