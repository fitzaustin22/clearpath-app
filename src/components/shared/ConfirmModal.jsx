'use client';

import { useEffect, useRef } from 'react';

/**
 * ConfirmModal — accessible confirmation dialog with optional checkbox.
 *
 * Props:
 *   isOpen, onClose, title, body,
 *   checkboxLabel?, checkboxChecked?, onCheckboxChange?,
 *   confirmLabel, cancelLabel,
 *   confirmVariant: 'primary' | 'danger',
 *   onConfirm
 *
 * Behavior:
 *   - Esc closes
 *   - Click on overlay closes; clicks inside modal do not
 *   - Focuses first focusable element on open; returns focus on close
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  title,
  body,
  checkboxLabel,
  checkboxChecked,
  onCheckboxChange,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'primary',
  onConfirm,
}) {
  const modalRef = useRef(null);
  const previousActiveRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveRef.current = document.activeElement;

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKey);

    // Focus first focusable element inside the modal.
    const focusables = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables && focusables.length > 0) {
      focusables[0].focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKey);
      if (previousActiveRef.current && typeof previousActiveRef.current.focus === 'function') {
        previousActiveRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const confirmBg =
    confirmVariant === 'danger'
      ? 'bg-[#C0392B] hover:bg-[#9E2E22] text-white'
      : 'bg-[#1B2A4A] hover:bg-[#0F1A2E] text-white';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-white rounded-lg shadow-xl p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-modal-title"
          className="text-[#1B2A4A] mb-3"
          style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '24px', fontWeight: 700 }}
        >
          {title}
        </h2>
        <div className="text-[#1B2A4A] mb-5" style={{ fontSize: '16px', whiteSpace: 'pre-line' }}>
          {body}
        </div>

        {checkboxLabel && (
          <label className="flex items-start gap-2 mb-5 cursor-pointer text-[#1B2A4A] text-sm">
            <input
              type="checkbox"
              checked={!!checkboxChecked}
              onChange={(e) => onCheckboxChange?.(e.target.checked)}
              className="mt-1"
            />
            <span>{checkboxLabel}</span>
          </label>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[#1B2A4A] hover:bg-gray-50 rounded"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded ${confirmBg}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
