import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useWaste } from '../lib/store';

export const ConfirmModal: React.FC = () => {
  const { confirmState, closeConfirm } = useWaste();
  const [busy, setBusy] = useState(false);

  if (!confirmState) return null;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await confirmState.onConfirm();
      closeConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={closeConfirm}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-[#1E2D26] dark:bg-[#121C18]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                confirmState.danger
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
              }`}
            >
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="confirm-title" className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {confirmState.title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {confirmState.message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeConfirm}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/5 dark:hover:text-neutral-200"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={closeConfirm}
            disabled={busy}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-300 dark:hover:bg-[#1C2C25] whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 ${
              confirmState.danger
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-700 hover:bg-emerald-800'
            }`}
          >
            {busy ? 'Processing...' : confirmState.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
