'use client';

/**
 * BigNumber — hero-number treatment for use OUTSIDE ResultsSummaryCard
 * (e.g. PV reveal, fair buyout hero block).
 */

const PLAYFAIR = '"Playfair Display", Georgia, serif';
const SOURCE_SANS = '"Source Sans 3", "Source Sans Pro", sans-serif';

const COLORS = {
  gold: '#C8A96E',
  navy: '#1B2A4A',
  red: '#C0392B',
  green: '#2D8A4E',
};

const SIZES = {
  large: '48px',
  medium: '36px',
};

export default function BigNumber({ value, label, color = 'gold', size = 'large' }) {
  const resolvedColor = COLORS[color] ?? COLORS.gold;
  const resolvedSize = SIZES[size] ?? SIZES.large;

  return (
    <div className="text-center">
      <div
        style={{
          fontFamily: PLAYFAIR,
          fontWeight: 700,
          fontSize: resolvedSize,
          color: resolvedColor,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div className="border-t-2 border-[#C8A96E] w-24 mx-auto my-3" />
      <div className="text-gray-500" style={{ fontFamily: SOURCE_SANS, fontSize: '14px' }}>
        {label}
      </div>
    </div>
  );
}
