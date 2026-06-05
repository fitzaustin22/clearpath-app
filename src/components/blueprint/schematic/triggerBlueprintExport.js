/**
 * triggerBlueprintExport — the same M7 Blueprint export entry point that
 * BlueprintExport.jsx uses. Extracted so both the existing standalone
 * BlueprintExport control AND the new schematic sidebar's Preview/Export
 * buttons call into one shared trigger function — preserving the single
 * marker-scoped print pipeline (D13) without duplicating logic.
 *
 * Sets `body.exporting-blueprint` (which the marker-scoped @media print rules
 * in BlueprintView depend on), invokes window.print(), and clears the marker
 * on `afterprint`. SSR-safe (no-ops if window/document are undefined).
 */

import { EXPORTING_MARKER_CLASS } from '../BlueprintExport';

export function triggerBlueprintExport() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  document.body.classList.add(EXPORTING_MARKER_CLASS);
  const clear = () => {
    document.body.classList.remove(EXPORTING_MARKER_CLASS);
    window.removeEventListener('afterprint', clear);
  };
  window.addEventListener('afterprint', clear);
  window.print();
}
