import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useWaste } from '../lib/store';
import { Status } from '../lib/types';
import { todayIso } from '../lib/utils';

export const ScheduleModal: React.FC = () => {
  const { scheduleModalOpen, setScheduleModalOpen, editingSchedule, saveSchedule } = useWaste();
  const [area, setArea] = useState('');
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState('07:00');
  const [team, setTeam] = useState('Team Alpha');
  const [status, setStatus] = useState<Status>('Scheduled');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!scheduleModalOpen) return;
    if (editingSchedule) {
      setArea(editingSchedule.area);
      setDate(editingSchedule.date);
      setTime(editingSchedule.time);
      setTeam(editingSchedule.team);
      setStatus(editingSchedule.status);
    } else {
      setArea('');
      setDate(todayIso());
      setTime('07:00');
      setTeam('Team Alpha');
      setStatus('Scheduled');
    }
    setError('');
  }, [scheduleModalOpen, editingSchedule]);

  if (!scheduleModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!area.trim() || !date || !time || !team.trim()) {
      setError('Please complete all required fields.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveSchedule(
        {
          area: area.trim(),
          date,
          time,
          team: team.trim(),
          status,
        },
        editingSchedule?.id ?? null
      );
    } catch (err) {
      console.error('Schedule save error:', err);
      setError('Failed to save schedule. Check permissions and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={() => setScheduleModalOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-[#1E2D26] dark:bg-[#121C18]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4 dark:border-[#1E2D26]">
          <div>
            <h2
              id="schedule-modal-title"
              className="font-display text-lg font-semibold text-neutral-900 dark:text-neutral-100"
            >
              {editingSchedule ? 'Edit Collection Schedule' : 'Add Collection Schedule'}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Assign the barangay collection area, shift date, time, and dispatch team.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setScheduleModalOpen(false)}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/5 dark:hover:text-neutral-200"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Collection Area (Barangay) *
            </label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              maxLength={80}
              placeholder="e.g. Poblacion"
              required
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-600 dark:border-[#24362E] dark:bg-[#0E1713] dark:text-neutral-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Collection Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 tabular-nums focus:border-emerald-600 dark:border-[#24362E] dark:bg-[#0E1713] dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Collection Time *
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 tabular-nums focus:border-emerald-600 dark:border-[#24362E] dark:bg-[#0E1713] dark:text-neutral-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Assigned Team *
              </label>
              <input
                type="text"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                maxLength={80}
                placeholder="e.g. Team Alpha"
                required
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-600 dark:border-[#24362E] dark:bg-[#0E1713] dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-600 dark:border-[#24362E] dark:bg-[#0E1713] dark:text-neutral-100"
              >
                <option value="Scheduled">Scheduled</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-4 dark:border-[#1E2D26]">
            <button
              type="button"
              onClick={() => setScheduleModalOpen(false)}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-300 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {busy ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
