import React, { useMemo } from 'react';
import { Search } from 'lucide-react';
import { ScheduleStatusTag } from '../components/StatusBadge';
import { useWaste } from '../lib/store';
import { Status } from '../lib/types';
import { time12 } from '../lib/utils';

export const CollectionRecordsPage: React.FC = () => {
  const {
    user,
    visibleSchedules,
    myTeamSchedules,
    teamOnly,
    setTeamOnly,
    searchText,
    setSearchText,
    changeScheduleStatus,
  } = useWaste();

  const isDriver = user?.role === 'driver';

  const rows = useMemo(() => {
    const base = isDriver && teamOnly ? myTeamSchedules : visibleSchedules;
    const q = searchText.toLowerCase().trim();
    return base
      .filter((s) =>
        !q ? true : [s.area, s.date, s.time, s.team, s.status].some((v) => String(v).toLowerCase().includes(q))
      )
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [isDriver, teamOnly, myTeamSchedules, visibleSchedules, searchText]);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white dark:border-[#1E2D26] dark:bg-[#121C18]">
      <div className="flex flex-col gap-4 border-b border-neutral-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E2D26]">
        <div>
          <h2 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Collection Operations
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Update the operational status of each scheduled route.
          </p>
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search records..."
            className="w-full sm:w-64 rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 dark:border-[#24362E] dark:bg-[#0E1713] dark:text-neutral-100"
          />
        </div>
      </div>

      {isDriver && (
        <div className="space-y-3 border-b border-neutral-200 px-5 py-3.5 dark:border-[#1E2D26]">
          <div className="inline-flex rounded-lg bg-neutral-100 p-1 dark:bg-[#0E1612]">
            <button
              type="button"
              onClick={() => setTeamOnly(true)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                teamOnly
                  ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#1C2C25] dark:text-neutral-100'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
              }`}
            >
              My team{user?.team ? ` (${user.team})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setTeamOnly(false)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                !teamOnly
                  ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#1C2C25] dark:text-neutral-100'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
              }`}
            >
              All teams
            </button>
          </div>

          {teamOnly && !user?.team && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              You have not been assigned to a team yet. Ask your administrator, or switch to All teams.
            </p>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-semibold tracking-wide text-neutral-500 uppercase dark:border-[#1E2D26] dark:bg-[#0E1612] dark:text-neutral-400">
              <th className="px-5 py-3">Area</th>
              <th className="px-5 py-3">Date &amp; Time</th>
              <th className="px-5 py-3">Team</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-[#1E2D26]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  No collection records found.
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={s.id} className="hover:bg-neutral-50/80 dark:hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 font-medium text-neutral-900 dark:text-neutral-100">{s.area}</td>
                  <td className="tabular-nums px-5 py-3.5">
                    <span className="block font-mono text-xs font-medium text-neutral-900 dark:text-neutral-100">
                      {s.date}
                    </span>
                    <span className="block font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                      {time12(s.time)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-neutral-700 dark:text-neutral-300">{s.team}</td>
                  <td className="px-5 py-3.5">
                    <ScheduleStatusTag status={s.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <select
                      aria-label={`Update status for ${s.area}`}
                      value={s.status}
                      onChange={(e) => changeScheduleStatus(s, e.target.value as Status)}
                      className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 dark:border-[#24362E] dark:bg-[#0E1713] dark:text-neutral-200"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
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
