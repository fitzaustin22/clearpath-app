'use client';

// The "Path to Clarity" hero: a serpentine SVG trail through seven module
// stations with a "You are here" pin on the current step. Geometry is the
// design handoff's (see pathGeometry.js); station states are derived upstream
// (see deriveJourney.js) — this component is presentational.
//
// Responsive: the map is authored at its native 1180x250 and uniformly scaled
// to fit its container (transform: scale), so the whole thing — trail, nodes,
// labels, type — shrinks proportionally on tablet rather than reflowing. The
// keyframe/focus CSS lives in the parent island's <style> block (cp-dash-*).

import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { T } from '@/src/lib/brand/tokens';
import { smooth, nodeCenters, PATH_W, PATH_H } from './pathGeometry';

const PLAYFAIR = "var(--font-playfair), 'Playfair Display', Georgia, serif";

// Run layout measurement before paint on the client; fall back to a no-op on the
// server so the fixed-size canvas never flashes un-scaled.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const EYEBROW = {
  fontFamily: T.FONT_BODY, fontSize: 11, fontWeight: 700,
  letterSpacing: 1, textTransform: 'uppercase', color: T.PILL_TEXT,
};

function statusWord(status, locked) {
  if (status === 'current') return 'Current step';
  if (status === 'done') return 'Completed';
  if (locked) return 'Locked — upgrade to unlock';
  return 'Not started';
}

function Station({ node }) {
  const { x, y, status, title, n, locked, href } = node;
  const done = status === 'done';
  const cur = status === 'current';
  const size = cur ? 58 : done ? 46 : 40;

  // Label sits BELOW the pin for the current node (the badge owns the space
  // above) and for any node in the upper half of the wave; otherwise above.
  // Verbatim logic from the reference — current-always-below was a fixed bug.
  const labelBelow = cur || y < PATH_H / 2;
  const gap = cur ? 'calc(100% + 14px)' : 'calc(100% + 10px)';
  const labelPos = labelBelow ? { top: gap } : { bottom: gap };

  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', zIndex: cur ? 3 : 1 }}>
      {cur && (
        <div
          style={{
            position: 'absolute', left: '50%', bottom: 'calc(100% + 12px)', transform: 'translateX(-50%)',
            whiteSpace: 'nowrap', background: T.NAVY, color: '#fff', fontFamily: T.FONT_BODY,
            fontSize: 11, fontWeight: 600, letterSpacing: 0.4, padding: '5px 11px', borderRadius: 999,
          }}
        >
          You are here
          <span style={{ position: 'absolute', left: '50%', top: '100%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `6px solid ${T.NAVY}` }} />
        </div>
      )}

      <Link
        href={href}
        className="cp-dash-station cp-dash-focusable"
        aria-label={`Module ${n}: ${title}. ${statusWord(status, locked)}.`}
        style={{ display: 'block', textDecoration: 'none', borderRadius: 999 }}
      >
        <div
          className={`cp-dash-node${cur ? ' cp-dash-halo' : ''}`}
          style={{
            width: size, height: size, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: done || cur ? T.GOLD : T.CARD,
            border: cur ? `3px solid ${T.GOLD}` : done ? 'none' : `2px solid ${T.NAVY_12}`,
            boxShadow: cur ? `0 0 0 6px ${T.GOLD_FOCUS_RING}, ${T.SHADOW_CARD}` : done ? T.SHADOW_CARD : 'none',
          }}
        >
          {done
            ? <Check size={22} color={T.NAVY} strokeWidth={2.6} aria-hidden="true" />
            : <span style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: cur ? 19 : 15, color: cur ? T.NAVY : T.NAVY_38 }}>{n}</span>}
        </div>

        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 132, textAlign: 'center', ...labelPos }}>
          <div style={{ fontFamily: T.FONT_BODY, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: done || cur ? T.PILL_TEXT : T.MUTED }}>Module {n}</div>
          <div style={{ fontFamily: T.FONT_DISPLAY, fontWeight: cur ? 700 : 600, fontSize: 13.5, color: done || cur ? T.NAVY : T.NAVY_38, lineHeight: 1.2, marginTop: 1 }}>{title}</div>
        </div>
      </Link>
    </div>
  );
}

export default function PathMap({ modules, doneTrailEndIndex }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);

  useIsoLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(Math.min(1, w / PATH_W));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const centers = nodeCenters(modules.length);
  const nodes = modules.map((m, i) => ({ ...m, x: centers[i].x, y: centers[i].y }));
  const fullD = smooth(centers);
  const doneD = doneTrailEndIndex >= 1 ? smooth(centers.slice(0, doneTrailEndIndex + 1)) : '';
  const last = centers[centers.length - 1];

  return (
    <div ref={wrapRef} style={{ width: '100%', maxWidth: PATH_W, margin: '0 auto', position: 'relative', height: PATH_H * scale }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: PATH_W, height: PATH_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <svg width={PATH_W} height={PATH_H} viewBox={`0 0 ${PATH_W} ${PATH_H}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} aria-hidden="true">
          <path d={fullD} fill="none" stroke={T.NAVY_12} strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round" />
          {doneD && (
            <path className="cp-dash-trail" d={doneD} fill="none" stroke={T.GOLD} strokeWidth={3.5} strokeLinecap="round" pathLength={1} />
          )}
        </svg>

        {/* end caption above the final station */}
        <div style={{ position: 'absolute', left: last.x, top: last.y - 58, transform: 'translateX(-50%)', width: 130, textAlign: 'center' }}>
          <div style={EYEBROW}>Clarity &amp; export</div>
        </div>

        {nodes.map((node) => (
          <Station key={node.key} node={node} />
        ))}
      </div>
    </div>
  );
}
