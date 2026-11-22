import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useWaste } from '../lib/store';

export const ConcernModal: React.FC = () => {
  const { user, concernModalOpen, setConcernModalOpen, saveManualConcern } = useWaste();
  const [resident, setResident] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!concernModalOpen) return;
    setResident('');
    setPhone('');
    setSubject('');
    setDetails('');
    setError('');
  }, [concernModalOpen]);

  if (!concernModalOpen || user?.role !== 'barangay_head') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const err = await saveManualConcern({ resident, phone, subject, details });
    if (err) setError(err);
    setBusy(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={() => setConcernModalOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="concern-modal-title"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-[#1E2D26] dark:bg-[#121C18]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4 dark:border-[#1E2D26]">
          <div>
            <h2
              id="concern-modal-title"
              className="font-display text-lg font-semibold text-neutral-900 dark:text-neutral-100"
            >
              Record Resident Concern
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              For walk-in or phone reports. Inbound SMS messages appear automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConcernModalOpen(false)}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/5 dark:hover:text-neutral-200"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Resident Name *
              </label>
              <input
                type="text"
                value={resident}
                onChange={(e) => setResident(e.target.value)}
                maxLength={80}
                required
                placeholder="Full name"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-600 dark:border-[#24362E] dark:bg-[#0E1713] dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Mobile Number (optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={20}
                placeholder="09171234567"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-mono text-neutral-900 focus:border-emerald-600 dark:border-[#24362E] dark:bg-[#0E1713] dark:text-neutral-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Barangay
            </label>
            <input
              type="text"
              value={user.barangay}
              disabled
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500 dark:border-[#24362E] dark:bg-[#0B120F] dark:text-neutral-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={120}
              required
              placeholder="e.g. Missed collection on Purok 4"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-600 dark:border-[#24362E] dark:bg-[#0E1713] dark:text-neutral-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Details
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="What happened? Specific street or landmark?"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-600 dark:border-[#24362E] dark:bg-[#0E1713] dark:text-neutral-100"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-4 dark:border-[#1E2D26]">
            <button
              type="button"
              onClick={() => setConcernModalOpen(false)}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-300 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {busy ? 'Saving...' : 'Save Concern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
