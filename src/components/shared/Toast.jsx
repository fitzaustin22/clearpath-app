'use client';

import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Toast — a single toast card. See ToastContainer for how toasts are
 * orchestrated at the app root.
 */
const VARIANT_CONFIG = {
  success: { border: '#2D8A4E', Icon: CheckCircle2, iconColor: '#2D8A4E' },
  error: { border: '#C0392B', Icon: AlertTriangle, iconColor: '#C0392B' },
  info: { border: '#1B2A4A', Icon: Info, iconColor: '#1B2A4A' },
};

export default function Toast({ toast, onDismiss }) {
  const { id, message, actionLabel, onAction, variant = 'info' } = toast;
  const cfg = VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.info;
  const { Icon } = cfg;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-[360px] bg-white rounded shadow-md flex items-start gap-3 pr-2 animate-in slide-in-from-right-5 duration-200"
      style={{
        borderLeft: `4px solid ${cfg.border}`,
        paddingTop: '10px',
        paddingBottom: '10px',
        paddingLeft: '12px',
      }}
    >
      <Icon size={18} style={{ color: cfg.iconColor, flexShrink: 0, marginTop: '1px' }} />
      <div className="flex-1 text-sm text-[#1B2A4A]" style={{ fontSize: '14px' }}>
        {message}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={() => {
            onAction();
            onDismiss(id);
          }}
          className="text-[#1B2A4A] underline hover:no-underline whitespace-nowrap"
          style={{ fontSize: '14px' }}
        >
          {actionLabel}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onDismiss(id)}
        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}
