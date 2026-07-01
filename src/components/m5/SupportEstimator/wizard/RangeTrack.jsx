'use client';
import { T } from '@/src/lib/brand/tokens';

const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');

export default function RangeTrack({ low, likely, high }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <Cell label="Low" value={money(low)} testid="se-range-low" flex={1} muted />
        <Cell label="Most likely" value={money(likely)} testid="se-range-likely" flex={1.3} />
        <Cell label="High" value={money(high)} testid="se-range-high" flex={1} muted />
      </div>
      <div style={{ position: 'relative', height: 4, borderRadius: 999, backgroundColor: T.LINE, margin: '16px 8% 0' }}>
        <div style={{ position: 'absolute', left: '18%', right: '18%', top: 0, bottom: 0, borderRadius: 999,
          background: `linear-gradient(90deg, ${T.GOLD}, ${T.GOLD_SOFT})` }} />
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 12, height: 12, marginLeft: -6, marginTop: -6,
          borderRadius: '50%', backgroundColor: T.GOLD, border: '2px solid #fff', boxShadow: '0 1px 4px rgba(27,42,74,.25)' }} />
      </div>
    </div>
  );
}

function Cell({ label, value, testid, flex, muted }) {
  return (
    <div style={{ flex, textAlign: 'center' }}>
      <div style={{ fontFamily: T.FONT_BODY, fontSize: 11, fontWeight: muted ? 400 : 700,
        color: muted ? T.MUTED : T.PILL_TEXT, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
      <div data-testid={testid} style={{ fontFamily: T.FONT_NUMERIC, fontWeight: muted ? 600 : 700,
        fontSize: muted ? 21 : 36, color: muted ? T.INK_2 : T.GOLD }}>{value}</div>
    </div>
  );
}
