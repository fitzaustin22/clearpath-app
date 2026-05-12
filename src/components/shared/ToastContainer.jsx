'use client';

import useToastStore from '@/src/stores/toastStore';
import Toast from './Toast';

/**
 * ToastContainer — mount once at app root. Reads toasts from toastStore
 * and renders them stacked top-right.
 *
 * CRITICAL: selector returns the `toasts` array reference directly — Zustand
 * compares references, so we must NOT do .map()/.filter() in the selector.
 * We iterate the array in JSX below (safe — only triggers re-render when the
 * array identity changes, i.e. when show/dismiss runs).
 */
export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
