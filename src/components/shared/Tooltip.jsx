'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { getTooltipContent } from '@/src/lib/tooltipContent';

/**
 * Tooltip — on-hover (desktop) / on-tap (mobile) popover explaining
 * technical terms. Reads content from src/lib/tooltipContent.js by `term`.
 *
 * When content is missing (or null), renders children unchanged and logs
 * a warning so a downstream session can spot unfilled terms.
 */
export default function Tooltip({ term, children }) {
  const content = getTooltipContent(term);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const popoverId = useId();

  useEffect(() => {
    if (!content) {
      // Only warn once per term per mount — cheap enough to warn here.
      console.warn('[Tooltip] Missing content for term:', term);
    }
  }, [content, term]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleClick = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  if (!content) {
    return <>{children}</>;
  }

  return (
    <span className="relative inline-block">
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-describedby={open ? popoverId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="cursor-help underline decoration-dotted decoration-[#C8A96E] underline-offset-2"
      >
        {children}
      </span>
      {open && (
        <span
          ref={popoverRef}
          id={popoverId}
          role="tooltip"
          className="absolute z-40 left-0 top-full mt-1 w-[280px] bg-white border border-gray-200 rounded shadow-lg p-3"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 md:hidden"
          >
            <X size={14} />
          </button>
          <div className="text-[#1B2A4A] mb-1" style={{ fontSize: '14px', fontWeight: 600 }}>
            {content.title}
          </div>
          <div className="text-[#1B2A4A] mb-2" style={{ fontSize: '14px', lineHeight: 1.5 }}>
            {content.body}
          </div>
          <button
            type="button"
            onClick={() => {
              /* Theo wiring is a later step */
            }}
            className="text-[#1B2A4A] underline hover:no-underline"
            style={{ fontSize: '13px' }}
          >
            Ask Theo about this →
          </button>
        </span>
      )}
    </span>
  );
}
