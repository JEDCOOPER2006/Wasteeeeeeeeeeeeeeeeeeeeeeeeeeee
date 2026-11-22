import React, { useMemo } from 'react';
import { Download } from 'lucide-react';
import { useWaste } from '../lib/store';
import { downloadCsv } from '../lib/utils';

export const ReportsPage: React.FC = () => {
  const { visibleSchedules } = useWaste();

  const byArea = useMemo(() => {
    const map = new Map<
      string,
      { area: string; total: number; completed: number; inProgress: number; scheduled: number; cancelled: number }
    >();
    for (const s of visibleSchedules) {
      const key = s.area.trim() || 'Unspecified';
      const r = map.get(key) ?? {
        area: key,
        total: 0,
        completed: 0,
        inProgress: 0,
        scheduled: 0,
        cancelled: 0,
      };
      r.total++;
      if (s.status === 'Completed') r.completed++;
      else if (s.status === 'In Progress') r.inProgress++;
      else if (s.status === 'Cancelled') r.cancelled++;
      else r.scheduled++;
      map.set(key, r);
    }
    return [...map.values()]
      .map((r) => ({ ...r, rate: r.total ? Math.round((r.completed / r.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [visibleSchedules]);

  const exportAreas = () => {
    const rows = byArea.map((r) => [
      r.area,
      String(r.total),
      String(r.completed),
      String(r.inProgress),
      String(r.scheduled),
      String(r.cancelled),
      `${r.rate}%`,
    ]);
    downloadCsv('collection-summary-by-area.csv', [
      ['Area', 'Total', 'Completed', 'In Progress', 'Scheduled', 'Cancelled', 'Completion Rate'],
      ...rows,
    ]);
  };

  const exportSchedules = () => {
    const rows = visibleSchedules.map((s) => [s.area, s.date, s.time, s.team, s.status]);
    downloadCsv('waste-collection-schedules.csv', [['Area', 'Date', 'Time', 'Team', 'Status'], ...rows]);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white dark:border-[#1E2D26] dark:bg-[#121C18]">
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E2D26]">
          <div>
            <h2 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Collections by Area
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Completion performance across every barangay and collection zone.
            </p>
          </div>
          <button
            type="button"
            onClick={exportAreas}
            disabled={byArea.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-200 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export Area Summary CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-semibold tracking-wide text-neutral-500 uppercase dark:border-[#1E2D26] dark:bg-[#0E1612] dark:text-neutral-400">
                <th className="px-5 py-3">Area</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-right">Completed</th>
                <th className="px-5 py-3 text-right">In Progress</th>
                <th className="px-5 py-3 text-right">Scheduled</th>
                <th className="px-5 py-3 text-right">Cancelled</th>
                <th className="px-5 py-3">Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-[#1E2D26]">
              {byArea.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    No collection schedules available yet.
                  </td>
                </tr>
              ) : (
                byArea.map((r) => (
                  <tr key={r.area} className="hover:bg-neutral-50/80 dark:hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 font-medium text-neutral-900 dark:text-neutral-100">{r.area}</td>
                    <td className="tabular-nums px-5 py-3.5 text-right font-mono text-xs">{r.total}</td>
                    <td className="tabular-nums px-5 py-3.5 text-right font-mono text-xs text-emerald-700 dark:text-emerald-400">
                      {r.completed}
                    </td>
                    <td className="tabular-nums px-5 py-3.5 text-right font-mono text-xs text-blue-600 dark:text-blue-400">
                      {r.inProgress}
                    </td>
                    <td className="tabular-nums px-5 py-3.5 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                      {r.scheduled}
                    </td>
                    <td className="tabular-nums px-5 py-3.5 text-right font-mono text-xs text-rose-600 dark:text-rose-400">
                      {r.cancelled}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-neutral-100 dark:bg-[#1B2B23]">
                          <div
                            className="h-full rounded-full bg-emerald-600"
                            style={{ width: `${r.rate}%` }}
                          />
                        </div>
                        <span className="tabular-nums font-mono text-xs text-neutral-600 dark:text-neutral-300">
                          {r.rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E2D26] dark:bg-[#121C18]">
        <div>
          <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Full Schedule Export
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Download every live Firestore collection schedule as a spreadsheet-ready CSV file.
          </p>
        </div>
        <button
          type="button"
          onClick={exportSchedules}
          disabled={visibleSchedules.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-40 whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Download Schedules CSV
        </button>
      </section>
    </div>
  );
};
