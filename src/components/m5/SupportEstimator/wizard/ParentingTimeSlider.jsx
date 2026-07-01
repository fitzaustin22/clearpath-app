'use client';
import { T } from '@/src/lib/brand/tokens';
import { SLIDER_TRACK } from './copy';

export default function ParentingTimeSlider({ value, onChange }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const nightsYou = Math.round((pct / 100) * 365);
  const nightsSpouse = 365 - nightsYou;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
        <div>
          <div data-testid="se-parenting-pct-you" style={{ fontFamily: T.FONT_NUMERIC, fontWeight: 700, fontSize: 32, color: T.GOLD }}>{pct}%</div>
          <div data-testid="se-parenting-you" style={{ fontFamily: T.FONT_BODY, fontSize: 13, color: T.INK_2 }}>with you · about {nightsYou} nights a year</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div data-testid="se-parenting-spouse" style={{ fontFamily: T.FONT_NUMERIC, fontWeight: 600, fontSize: 20, color: T.INK_2 }}>{100 - pct}%</div>
          <div style={{ fontFamily: T.FONT_BODY, fontSize: 13, color: T.MUTED }}>with your spouse · {nightsSpouse} nights</div>
        </div>
      </div>
      <input data-testid="se-parenting-input" type="range" min="0" max="100" step="5" value={pct}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: T.GOLD }} aria-label="Overnights with you"
        aria-valuetext={`${pct}% — about ${nightsYou} nights with you`} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6,
        fontFamily: T.FONT_BODY, fontSize: 12, color: T.MUTED }}>
        {SLIDER_TRACK.map((l) => <span key={l}>{l}</span>)}
      </div>
    </div>
  );
}
