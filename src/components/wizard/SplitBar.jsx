'use client';

import { T, ALLOC } from '@/src/lib/brand/tokens';

/**
 * SplitBar — a proportional You / Spouse / Unallocated bar.
 *
 * Reusable across the guided wizard tools. "You" = gold, "Spouse" = navy,
 * "Unallocated" = the 45° hatch (reads as "still to decide", never an error).
 * Values are raw magnitudes (dollars or 0/1 one-sided weights); the bar
 * normalises them. When everything is zero it shows the bare track.
 *
 * Props: you, spouse, unalloc (numbers), height, radius, track, animate.
 */
export default function SplitBar({
  you = 0,
  spouse = 0,
  unalloc = 0,
  height = 10,
  radius = 999,
  track = T.LINE,
  animate = true,
}) {
  const total = you + spouse + unalloc;
  const seg = (value, background, key) => {
    if (value <= 0) return null;
    return (
      <div
        key={key}
        style={{
          width: `${(value / total) * 100}%`,
          height: '100%',
          background,
          transition: animate ? 'width 420ms cubic-bezier(.4,0,.2,1)' : 'none',
        }}
      />
    );
  };
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height,
        borderRadius: radius,
        overflow: 'hidden',
        background: total > 0 ? 'transparent' : track,
      }}
    >
      {total > 0
        ? [seg(you, ALLOC.YOU, 'you'), seg(spouse, ALLOC.SPOUSE, 'spouse'), seg(unalloc, ALLOC.HATCH, 'unalloc')]
        : null}
    </div>
  );
}
