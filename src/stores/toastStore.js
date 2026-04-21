import { create } from 'zustand';

/**
 * toastStore — ephemeral toast notifications. NOT persisted.
 *
 * State:
 *   toasts: Array<{ id, message, actionLabel?, onAction?, duration, variant, createdAt }>
 *
 * Actions:
 *   show(toast)   — adds a toast with generated id/createdAt, schedules auto-dismiss
 *                   (duration default 5000ms). Caps visible toasts at 3; if a 4th
 *                   arrives, the oldest is dropped.
 *   dismiss(id)   — removes the toast with the given id.
 */
const MAX_TOASTS = 3;
const DEFAULT_DURATION = 5000;

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
};

const useToastStore = create((set, get) => ({
  toasts: [],

  show: (toast) => {
    const id = generateId();
    const createdAt = Date.now();
    const duration = toast?.duration ?? DEFAULT_DURATION;
    const variant = toast?.variant ?? 'info';

    const next = {
      id,
      message: toast?.message ?? '',
      actionLabel: toast?.actionLabel,
      onAction: toast?.onAction,
      duration,
      variant,
      createdAt,
    };

    set((state) => {
      let toasts = [...state.toasts, next];
      if (toasts.length > MAX_TOASTS) {
        toasts = toasts.slice(toasts.length - MAX_TOASTS);
      }
      return { toasts };
    });

    if (duration > 0) {
      setTimeout(() => {
        const stillThere = get().toasts.some((t) => t.id === id);
        if (stillThere) get().dismiss(id);
      }, duration);
    }

    return id;
  },

  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export default useToastStore;
