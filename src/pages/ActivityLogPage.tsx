import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import { RoleTag } from '../components/StatusBadge';
import { fetchAllActivity } from '../lib/auth';
import { ActivityEntry, Role } from '../lib/types';
import { downloadCsv, formatShortDate, formatTimeOnly, friendlyError, roleLabel } from '../lib/utils';

type RoleFilter = 'all' | Role;

export const ActivityLogPage: React.FC = () => {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setEntries(await fetchAllActivity(300));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const q = query.toLowerCase().trim();
    return entries.filter(
      (e) =>
        (role === 'all' || e.role === role) &&
        (!q || [e.name, e.user, e.action, e.detail].some((v) => String(v).toLowerCase().includes(q)))
    );
  }, [entries, query, role]);

  const handleExport = () => {
    const rows = shown.map((e) => [e.time, e.name, e.user, roleLabel(e.role), e.action, e.detail]);
    downloadCsv('activity-log.csv', [['Time', 'Name', 'Email', 'Role', 'Action', 'Detail'], ...rows]);
  };

  const roles: { id: RoleFilter; label: string }[] = [
    { id: 'all', label: 'Everyone' },
    { id: 'admin', label: 'Admins' },
    { id: 'driver', label: 'Drivers' },
    { id: 'barangay_head', label: 'Barangay Heads' },
  ];

  return (
    <section className="rounded-xl border border-neutral-200 bg-white dark:border-[#1E2D26] dark:bg-[#121C18]">
      <div className="flex flex-col gap-4 border-b border-neutral-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E2D26]">
        <div>
          <h2 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
            System Activity
          </h2>
          <p className="tabular-nums mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Latest {entries.length} recorded operational actions. Newest first.
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search activity..."
              className="w-full sm:w-56 rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 dark:border-[#24362E] dark:bg-[#0E1713] dark:text-neutral-100"
            />
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-200 whitespace-nowrap"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={shown.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-200 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="border-b border-neutral-200 px-5 py-3 dark:border-[#1E2D26]">
        <div className="inline-flex flex-wrap gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-[#0E1612]">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                role === r.id
                  ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#1C2C25] dark:text-neutral-100'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mx-5 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-semibold tracking-wide text-neutral-500 uppercase dark:border-[#1E2D26] dark:bg-[#0E1612] dark:text-neutral-400">
              <th className="px-5 py-3">Time</th>
              <th className="px-5 py-3">Person</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-[#1E2D26]">
            {shown.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  {loading ? 'Loading activity...' : 'No activity recorded yet.'}
                </td>
              </tr>
            ) : (
              shown.map((e, idx) => (
                <tr key={e.id ?? idx} className="hover:bg-neutral-50/80 dark:hover:bg-white/[0.02]">
                  <td className="tabular-nums px-5 py-3.5 font-mono text-xs">
                    <span className="block text-neutral-900 dark:text-neutral-100">{formatShortDate(e.time)}</span>
                    <span className="block text-neutral-500 dark:text-neutral-400">{formatTimeOnly(e.time)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="block font-medium text-neutral-900 dark:text-neutral-100">{e.name}</span>
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400">{e.user}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <RoleTag role={e.role} />
                  </td>
                  <td className="px-5 py-3.5 font-medium text-neutral-800 dark:text-neutral-200">{e.action}</td>
                  <td className="px-5 py-3.5 text-xs text-neutral-600 dark:text-neutral-400">{e.detail || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
