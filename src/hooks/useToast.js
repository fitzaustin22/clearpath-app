'use client';

import useToastStore from '@/src/stores/toastStore';

/**
 * useToast — thin hook over toastStore so components don't have to import
 * the store directly. Selectors are stable primitive refs so re-renders are
 * scoped only to components that call show/dismiss.
 */
export function useToast() {
  const show = useToastStore((s) => s.show);
  const dismiss = useToastStore((s) => s.dismiss);
  return { show, dismiss };
}

export default useToast;
