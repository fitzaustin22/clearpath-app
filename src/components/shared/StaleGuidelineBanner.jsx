'use client';

import { AlertTriangle } from 'lucide-react';

/**
 * StaleGuidelineBanner — warns when a state's support guidelines haven't
 * been reviewed recently. Not dismissible.
 */
export default function StaleGuidelineBanner({ months, state }) {
  return (
    <div
      className="bg-[#FEF3C7] border-l-4 border-[#F59E0B] p-3 text-sm flex items-start gap-2"
      role="status"
    >
      <AlertTriangle size={20} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
      <div className="text-[#78350F]">
        ⚠ {state} guidelines were last reviewed {months} months ago. State support guidelines change
        frequently — verify current values before relying on these estimates.
      </div>
    </div>
  );
}
