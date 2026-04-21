'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * Breadcrumbs — navigation chain rendered as an ordered list. Segments
 * with a non-null `href` render as links; null-href segments render as
 * plain text representing the current page.
 */
export default function Breadcrumbs({ segments = [] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          return (
            <li key={i} className="flex items-center gap-2">
              {seg.href ? (
                <Link
                  href={seg.href}
                  className="text-[#1B2A4A] hover:underline"
                >
                  {seg.label}
                </Link>
              ) : (
                <span className="text-gray-600" aria-current={isLast ? 'page' : undefined}>
                  {seg.label}
                </span>
              )}
              {!isLast && <ChevronRight size={14} className="text-gray-400" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
