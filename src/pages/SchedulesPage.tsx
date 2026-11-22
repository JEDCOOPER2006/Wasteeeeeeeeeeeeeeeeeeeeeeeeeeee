import React, { useMemo, useState } from 'react';
import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { ScheduleStatusTag } from '../components/StatusBadge';
import { useWaste } from '../lib/store';
import { Status } from '../lib/types';
import { downloadCsv, time12 } from '../lib/utils';

type StatusFilter = 'all' | Status;

export const SchedulesPage: React.FC = () => {
  const {
    user,
    visibleSchedules,
    schedulesLoading,
    searchText,
    setSearchText,
    openAddSchedule,
    openEditSchedule,
    deleteSchedule,
  } = useWaste();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const canManage = user?.role === 'admin';

  const filtered = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    return visibleSchedules
      .filter((s) => {
        if (statusFilter !== 'all' && s.status !== statusFilter) return false;
        if (!q) return true;
        return [s.area, s.date, s.time, s.team, s.status].some((v) => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [visibleSchedules, searchText, statusFilter]);

  const handleExport = () => {
    const header = ['Area', 'Date', 'Time', 'Team', 'Status'];
    const rows = filtered.map((s) => [s.area, s.date, s.time, s.team, s.status]);
    downloadCsv('waste-collection-schedules.csv', [header, ...rows]);
  };

  const tabs: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'Scheduled', label: 'Scheduled' },
    { id: 'In Progress', label: 'In Progress' },
    { id: 'Completed', label: 'Completed' },
    { id: 'Cancelled', label: 'Cancelled' },
  ];

  return (
    <section className="rounded-xl border border-neutral-200 bg-white dark:border-[#1E2D26] dark:bg-[#121C18]">
      <div className="flex flex-col gap-4 border-b border-neutral-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E2D26]">
        <div>
          <h2 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
            All Collection Schedules
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {canManage
              ? 'Create, edit, and assign collection routes across barangays.'
              : 'Read-only view of planned waste collection schedules.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:flex-initial">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search area, date, team..."
              className="w-full sm:w-56 rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 dark:border-[#24362E] dark:bg-[#0E1713] dark:text-neutral-100"
            />
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openAddSchedule}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add Schedule
            </button>
          )}

          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-200 dark:hover:bg-[#1C2C25] whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Segmented Filter Tabs */}
      <div className="border-b border-neutral-200 px-5 py-3 dark:border-[#1E2D26]">
        <div className="inline-flex flex-wrap gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-[#0E1612]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#1C2C25] dark:text-neutral-100'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-semibold tracking-wide text-neutral-500 uppercase dark:border-[#1E2D26] dark:bg-[#0E1612] dark:text-neutral-400">
              <th className="px-5 py-3">Area</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Time</th>
              <th className="px-5 py-3">Assigned Team</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-[#1E2D26]">
            {schedulesLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-5 py-4">
                    <div className="h-4 w-full animate-pulse rounded bg-neutral-100 dark:bg-[#1A2821]" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    No matching collection schedules found.
                  </p>
                  {canManage && (
                    <button
                      type="button"
                      onClick={openAddSchedule}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add First Schedule
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-neutral-50/80 dark:hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 font-medium text-neutral-900 dark:text-neutral-100">{s.area}</td>
                  <td className="tabular-nums px-5 py-3.5 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                    {s.date}
                  </td>
                  <td className="tabular-nums px-5 py-3.5 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                    {time12(s.time)}
                  </td>
                  <td className="px-5 py-3.5 text-neutral-700 dark:text-neutral-300">{s.team}</td>
                  <td className="px-5 py-3.5">
                    <ScheduleStatusTag status={s.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {canManage ? (
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditSchedule(s)}
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-200 whitespace-nowrap"
                        >
                          <Pencil className="h-3 w-3" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSchedule(s)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 whitespace-nowrap"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">View only</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
