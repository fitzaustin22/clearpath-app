import { T } from '@/src/lib/brand/tokens';

export default function AlimonyFirstOrdering() {
  return (
    <div style={{
      margin: '4px 0 4px 40px',
      padding: '10px 14px',
      background: T.GOLD_TINT,
      borderLeft: `2px solid ${T.GOLD}`,
      borderRadius: '0 4px 4px 0',
      fontFamily: T.FONT_BODY, fontSize: 12.5, lineHeight: 1.55,
      color: T.NAVY_70,
    }}>
      <strong style={{ color: T.NAVY }}>Alimony-first ordering applies.</strong>{' '}
      Maintenance is computed first, then payor gross is reduced by the
      maintenance figure before child-support pass — required by MD/DC/NY when
      both obligations are present.
    </div>
  );
}
