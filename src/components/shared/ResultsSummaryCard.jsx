'use client';

/**
 * ResultsSummaryCard — hero card shown at the end of an M5 tool.
 *
 * Layout: heading, big number, narrative, stats row, CTAs.
 * The caller pre-formats `bigNumber` (e.g. "$4,276/mo").
 */

const PLAYFAIR = '"Playfair Display", Georgia, serif';
const SOURCE_SANS = '"Source Sans 3", "Source Sans Pro", sans-serif';

const BIG_NUMBER_COLOR = {
  gold: '#C8A96E',
  navy: '#1B2A4A',
  red: '#C0392B',
  green: '#2D8A4E',
};

export default function ResultsSummaryCard({
  heading,
  bigNumber,
  bigNumberSubtext,
  bigNumberColor = 'gold',
  narrative,
  stats = [],
  ctas = [],
}) {
  const color = BIG_NUMBER_COLOR[bigNumberColor] ?? BIG_NUMBER_COLOR.gold;

  return (
    <div className="bg-[#FAF8F2] border border-[#C8A96E] rounded-lg p-8">
      <div
        className="uppercase tracking-wider text-gray-500 mb-2"
        style={{ fontFamily: SOURCE_SANS, fontSize: '14px' }}
      >
        {heading}
      </div>

      <div style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: '48px', color, lineHeight: 1.1 }}>
        {bigNumber}
      </div>

      <div className="border-t-2 border-[#C8A96E] w-24 my-3" />

      <div className="text-gray-600 mb-6" style={{ fontFamily: SOURCE_SANS, fontSize: '14px' }}>
        {bigNumberSubtext}
      </div>

      {narrative && (
        <p
          className="text-[#1B2A4A] mb-6 max-w-[600px]"
          style={{ fontFamily: SOURCE_SANS, fontSize: '16px', lineHeight: 1.6 }}
        >
          {narrative}
        </p>
      )}

      {stats.length > 0 && (
        <div className="flex gap-8 pb-6 border-b border-gray-200 mb-6 flex-wrap">
          {stats.map((s, i) => (
            <div key={i}>
              <div
                className="uppercase text-gray-500"
                style={{ fontFamily: SOURCE_SANS, fontSize: '12px' }}
              >
                {s.label}
              </div>
              <div
                className="text-[#1B2A4A]"
                style={{ fontFamily: SOURCE_SANS, fontSize: '20px', fontWeight: 600 }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {ctas.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {ctas.map((cta, i) => (
            <CTA key={i} {...cta} />
          ))}
        </div>
      )}
    </div>
  );
}

function CTA({ label, onClick, variant = 'primary' }) {
  const base = 'transition';
  if (variant === 'primary') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} bg-[#1B2A4A] text-white hover:bg-[#0F1A2E] px-4 py-2 rounded`}
      >
        {label}
      </button>
    );
  }
  if (variant === 'secondary') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} bg-white border border-[#1B2A4A] text-[#1B2A4A] hover:bg-gray-50 px-4 py-2 rounded`}
      >
        {label}
      </button>
    );
  }
  // tertiary
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} text-[#1B2A4A] underline hover:no-underline`}
    >
      {label}
    </button>
  );
}
