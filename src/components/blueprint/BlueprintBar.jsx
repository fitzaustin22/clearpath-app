'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import useBlueprintStore from '@/src/stores/blueprintStore';

const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const SECTION_ORDER = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12'];

function FileTextIcon({ size = 20, color = NAVY }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

export default function BlueprintBar() {
  const router = useRouter();
  const sections = useBlueprintStore((state) => state.sections);
  const getCompletedCount = useBlueprintStore((state) => state.getCompletedCount);

  const [hydrated, setHydrated] = useState(false);
  const [pulsingKeys, setPulsingKeys] = useState(() => new Set());
  const prevStatusesRef = useRef(null);

  // Wait for Zustand persist hydration before tracking transitions — otherwise
  // the empty→complete jump at hydration-time would trigger false pulses.
  useEffect(() => {
    if (useBlueprintStore.persist?.hasHydrated?.()) {
      setHydrated(true);
      return;
    }
    const unsub = useBlueprintStore.persist?.onFinishHydration?.(() => setHydrated(true));
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const current = {};
    for (const k of SECTION_ORDER) current[k] = sections[k].status;

    if (prevStatusesRef.current === null) {
      prevStatusesRef.current = current;
      return;
    }

    const triggered = [];
    for (const k of SECTION_ORDER) {
      const prev = prevStatusesRef.current[k];
      const curr = current[k];
      if (prev === curr) continue;
      if (
        (prev === 'empty' && curr === 'partial') ||
        (prev === 'partial' && curr === 'complete') ||
        (prev === 'empty' && curr === 'complete')
      ) {
        triggered.push(k);
      }
    }
    prevStatusesRef.current = current;

    if (triggered.length === 0) return;

    setPulsingKeys((old) => {
      const next = new Set(old);
      triggered.forEach((k) => next.add(k));
      return next;
    });
    const t = setTimeout(() => {
      setPulsingKeys((old) => {
        const next = new Set(old);
        triggered.forEach((k) => next.delete(k));
        return next;
      });
    }, 400);
    return () => clearTimeout(t);
  }, [sections, hydrated]);

  const completed = getCompletedCount();

  const renderCircle = (key) => {
    const status = sections[key].status;
    const isPulsing = pulsingKeys.has(key);
    const base = {
      width: 8,
      height: 8,
      borderRadius: '50%',
      flexShrink: 0,
      transformOrigin: 'center',
      display: 'inline-block',
    };
    let style;
    if (status === 'complete') {
      style = { ...base, backgroundColor: GOLD };
    } else if (status === 'partial') {
      style = { ...base, backgroundColor: 'transparent', border: `1.5px solid ${GOLD}` };
    } else {
      style = { ...base, backgroundColor: 'rgba(27,42,74,0.15)' };
    }
    return (
      <span
        key={key}
        className={isPulsing ? 'clearpath-circle-pulse' : undefined}
        style={style}
        aria-label={`${sections[key].label}: ${status}`}
      />
    );
  };

  return (
    <>
      <style>{`
        @keyframes clearpath-blueprint-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
          100% { transform: scale(1); }
        }
        .clearpath-circle-pulse {
          animation: clearpath-blueprint-pulse 400ms ease-out;
        }
      `}</style>
      <div
        role="navigation"
        aria-label="Your Blueprint progress"
        className="h-12 sm:h-[52px]"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid rgba(27,42,74,0.08)',
          boxShadow: '0 -2px 8px rgba(27,42,74,0.06)',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          fontFamily: 'Source Sans Pro, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileTextIcon size={20} color={NAVY} />
          <span
            className="hidden sm:inline"
            style={{ color: NAVY, fontWeight: 600, fontSize: 14 }}
          >
            Your Blueprint
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {SECTION_ORDER.map(renderCircle)}
          </div>
          <span style={{ color: 'rgba(27,42,74,0.6)', fontWeight: 400, fontSize: 13 }}>
            {completed} of 12
          </span>
        </div>

        <button
          type="button"
          onClick={() => router.push('/blueprint')}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '6px 8px',
            color: GOLD,
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          View →
        </button>
      </div>
    </>
  );
}
