'use client';

import { useRouter } from 'next/navigation';

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const PARCHMENT = '#FAF8F2';
const WHITE = '#FFFFFF';
const GREEN = '#2D8A4E';
const SOURCE = '"Source Sans Pro", -apple-system, system-ui, sans-serif';
const PLAYFAIR = '"Playfair Display", Georgia, serif';

export default function M2ToolCard({
  toolNumber,
  title,
  description,
  href,
  progress,
  startedAt,
  isComplete,
  isLocked = false,
}) {
  const router = useRouter();

  // ─── Status chip ─────────────────────────────────────────────────────────
  let chipLabel;
  let chipBg;
  let chipColor;
  if (startedAt === null) {
    chipLabel = 'Not started';
    chipBg = `${NAVY}33`;
    chipColor = NAVY;
  } else if (isComplete) {
    chipLabel = 'Complete';
    chipBg = GREEN;
    chipColor = WHITE;
  } else {
    chipLabel = 'In progress';
    chipBg = GOLD;
    chipColor = NAVY;
  }

  const handleClick = () => {
    if (isLocked) return;
    router.push(href);
  };

  const handleKeyDown = (e) => {
    if (isLocked) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      router.push(href);
    }
  };

  const fillColor = isComplete ? GREEN : GOLD;
  const clampedProgress = Math.max(0, Math.min(100, Number(progress) || 0));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 4px 16px ${NAVY}14`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
      style={{
        backgroundColor: WHITE,
        border: `1px solid ${NAVY}1A`,
        borderRadius: 12,
        padding: 24,
        cursor: isLocked ? 'not-allowed' : 'pointer',
        transition: 'box-shadow 0.2s ease',
        maxWidth: 700,
        width: '100%',
        fontFamily: SOURCE,
        color: NAVY,
        boxSizing: 'border-box',
      }}
    >
      {/* Top row: number badge + status chip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: NAVY,
            color: PARCHMENT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: SOURCE,
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {toolNumber}
        </div>
        <span
          style={{
            backgroundColor: chipBg,
            color: chipColor,
            borderRadius: 20,
            padding: '4px 12px',
            fontFamily: SOURCE,
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          {chipLabel}
        </span>
      </div>

      {/* Title */}
      <h3
        style={{
          fontFamily: PLAYFAIR,
          fontWeight: 700,
          fontSize: 20,
          color: NAVY,
          margin: 0,
          marginTop: 16,
        }}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        style={{
          fontFamily: SOURCE,
          fontWeight: 400,
          fontSize: 14,
          color: NAVY,
          opacity: 0.7,
          margin: 0,
          marginTop: 6,
        }}
      >
        {description}
      </p>

      {/* Progress section */}
      <div style={{ marginTop: 16 }}>
        {startedAt === null ? (
          <div
            style={{
              fontFamily: SOURCE,
              fontSize: 13,
              color: NAVY,
              opacity: 0.5,
            }}
          >
            Not started
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontFamily: SOURCE,
                  fontSize: 13,
                  color: NAVY,
                  opacity: 0.6,
                }}
              >
                Progress
              </span>
              <span
                style={{
                  fontFamily: SOURCE,
                  fontWeight: 600,
                  fontSize: 13,
                  color: NAVY,
                }}
              >
                {Math.round(clampedProgress)}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: 6,
                backgroundColor: `${NAVY}14`,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${clampedProgress}%`,
                  height: '100%',
                  backgroundColor: fillColor,
                  borderRadius: 3,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Arrow */}
      <div
        style={{
          marginTop: 16,
          textAlign: 'right',
          fontFamily: SOURCE,
          fontWeight: 600,
          fontSize: 16,
          color: GOLD,
        }}
      >
        →
      </div>
    </div>
  );
}
