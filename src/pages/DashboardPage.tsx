import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  MessageSquareWarning,
  Plus,
  Truck,
  UserCog,
  Users,
} from 'lucide-react';
import { ConcernStatusTag, ScheduleStatusTag } from '../components/StatusBadge';
import { useWaste } from '../lib/store';
import { Status } from '../lib/types';
import { daysUntil, formatShortDateTime, time12, todayIso } from '../lib/utils';

export const DashboardPage: React.FC = () => {
  const {
    user,
    schedules,
    visibleSchedules,
    myTeamSchedules,
    concerns,
    users,
    recentActivity,
    notifications,
    navigate,
    changeScheduleStatus,
    changeConcernStatus,
    setTeamOnly,
  } = useWaste();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }, []);

  if (!user) return null;

  const t = todayIso();
  const byDT = (a: { date: string; time: string }, b: { date: string; time: string }) =>
    (a.date + a.time).localeCompare(b.date + b.time);

  const completedCount = visibleSchedules.filter((s) => s.status === 'Completed').length;
  const scheduledCount = visibleSchedules.filter((s) => s.status === 'Scheduled').length;
  const inProgressCount = visibleSchedules.filter((s) => s.status === 'In Progress').length;
  const cancelledCount = visibleSchedules.filter((s) => s.status === 'Cancelled').length;
  const totalVisible = visibleSchedules.length;
  const percentDone = totalVisible ? Math.round((completedCount / totalVisible) * 100) : 0;

  const todays = visibleSchedules.filter((s) => s.date === t).sort(byDT);
  const overdueAll = schedules
    .filter((s) => s.date < t && (s.status === 'Scheduled' || s.status === 'In Progress'))
    .sort(byDT);

  // Admin: Team workload aggregation
  const teamWorkload = useMemo(() => {
    const map = new Map<string, { team: string; total: number; completed: number; active: number }>();
    for (const s of schedules) {
      const key = s.team.trim() || 'Unassigned';
      const row = map.get(key) ?? { team: key, total: 0, completed: 0, active: 0 };
      row.total++;
      if (s.status === 'Completed') row.completed++;
      if (s.status === 'In Progress') row.active++;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [schedules]);

  const activeAccounts = users.filter((u) => u.active).length;

  const attentionItems = useMemo(() => {
    const items: {
      tone: 'red' | 'amber' | 'blue';
      title: string;
      text: string;
      target: 'records' | 'personnel';
    }[] = [];

    if (overdueAll.length) {
      items.push({
        tone: 'red',
        title: `${overdueAll.length} overdue collection${overdueAll.length > 1 ? 's' : ''}`,
        text: `${overdueAll[0].area} (${overdueAll[0].date}) is still ${overdueAll[0].status.toLowerCase()}.`,
        target: 'records',
      });
    }
    const notStarted = todays.filter((s) => s.status === 'Scheduled');
    if (notStarted.length) {
      items.push({
        tone: 'amber',
        title: `${notStarted.length} collection${notStarted.length > 1 ? 's' : ''} today not started`,
        text: notStarted
          .map((s) => s.area)
          .slice(0, 3)
          .join(', '),
        target: 'records',
      });
    }
    const unassignedDrivers = users.filter((u) => u.role === 'driver' && u.active && !u.team);
    if (unassignedDrivers.length) {
      items.push({
        tone: 'blue',
        title: `${unassignedDrivers.length} driver${unassignedDrivers.length > 1 ? 's' : ''} without a team`,
        text: `${unassignedDrivers[0].name || unassignedDrivers[0].email} cannot view team routes yet.`,
        target: 'personnel',
      });
    }
    return items;
  }, [overdueAll, todays, users]);

  // Driver metrics
  const myToday = myTeamSchedules.filter((s) => s.date === t).sort(byDT);
  const myUpcoming = myTeamSchedules
    .filter((s) => s.date > t && s.status !== 'Completed' && s.status !== 'Cancelled')
    .sort(byDT);
  const myOverdue = myTeamSchedules
    .filter((s) => s.date < t && (s.status === 'Scheduled' || s.status === 'In Progress'))
    .sort(byDT);
  const myDoneToday = myToday.filter((s) => s.status === 'Completed').length;
  const myActive = myTeamSchedules.filter((s) => s.status === 'In Progress').length;

  // Barangay Head metrics
  const headNext = visibleSchedules
    .filter((s) => s.date >= t && (s.status === 'Scheduled' || s.status === 'In Progress'))
    .sort(byDT)[0];
  const headUpcoming = visibleSchedules
    .filter((s) => s.date > t && s.status !== 'Completed' && s.status !== 'Cancelled')
    .sort(byDT)
    .slice(0, 5);
  const openConcerns = concerns.filter((c) => c.status !== 'Resolved');

  const formatCountdown = (dateStr: string) => {
    const d = daysUntil(dateStr);
    if (d === 0) return 'Today';
    if (d === 1) return 'Tomorrow';
    if (d < 0) return `${-d} day${d === -1 ? '' : 's'} overdue`;
    return `In ${d} days`;
  };

  return (
    <div className="space-y-6">
      {/* Greeting Strip */}
      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E2D26] dark:bg-[#121C18]">
        <div>
          <h2 className="font-display text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {greeting}, {user.name || user.email}
          </h2>
          <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
            {user.role === 'admin' && 'Municipal dispatch overview across all barangays and collection teams.'}
            {user.role === 'driver' &&
              (user.team
                ? `Assigned dispatch unit: ${user.team}${user.vehicle ? ` · Vehicle ${user.vehicle}` : ''}`
                : 'No team assigned yet — contact your administrator.')}
            {user.role === 'barangay_head' &&
              `Barangay ${user.barangay} operations · Live collection status and resident reports.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => navigate('schedules', { openAdd: true })}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Schedule
            </button>
          )}
         {/* Record Concern button removed from Barangay Head Dashboard */}
          {user.role === 'driver' && (
            <button
              type="button"
              onClick={() => navigate('records')}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
            >
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
              Open Route Records
            </button>
          )}
        </div>
      </div>

      {/* ================= ADMIN DASHBOARD ================= */}
      {user.role === 'admin' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => navigate('schedules')}
              className="group rounded-xl border border-neutral-200 bg-white p-5 text-left transition-colors hover:border-emerald-600/50 dark:border-[#1E2D26] dark:bg-[#121C18] dark:hover:border-emerald-500/50"
            >
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <span>Today&apos;s Schedules</span>
                <CalendarClock className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              </div>
              <p className="tabular-nums font-display mt-3 text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
                {todays.length}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {todays.filter((x) => x.status === 'Completed').length} completed today
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate('records')}
              className="group rounded-xl border border-neutral-200 bg-white p-5 text-left transition-colors hover:border-emerald-600/50 dark:border-[#1E2D26] dark:bg-[#121C18] dark:hover:border-emerald-500/50"
            >
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <span>In Progress</span>
                <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
              <p className="tabular-nums font-display mt-3 text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
                {inProgressCount}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Active routes on dispatch
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate('records')}
              className="group rounded-xl border border-neutral-200 bg-white p-5 text-left transition-colors hover:border-emerald-600/50 dark:border-[#1E2D26] dark:bg-[#121C18] dark:hover:border-emerald-500/50"
            >
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <span>Overdue Routes</span>
                <AlertTriangle
                  className={`h-4 w-4 ${overdueAll.length ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-400'}`}
                  aria-hidden="true"
                />
              </div>
              <p className="tabular-nums font-display mt-3 text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
                {overdueAll.length}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {overdueAll.length ? 'Require follow-up' : 'All schedules on time'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate('personnel')}
              className="group rounded-xl border border-neutral-200 bg-white p-5 text-left transition-colors hover:border-emerald-600/50 dark:border-[#1E2D26] dark:bg-[#121C18] dark:hover:border-emerald-500/50"
            >
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <span>Active Staff</span>
                <Users className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              </div>
              <p className="tabular-nums font-display mt-3 text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
                {activeAccounts}
              </p>
              <p className="tabular-nums mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {users.length} total registered accounts
              </p>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Today's Collections */}
            <section className="lg:col-span-8 rounded-xl border border-neutral-200 bg-white dark:border-[#1E2D26] dark:bg-[#121C18]">
              <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-[#1E2D26]">
                <div>
                  <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    Today&apos;s Collections
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Update dispatch status directly from this table.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('schedules')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400 whitespace-nowrap"
                >
                  All schedules
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-semibold tracking-wide text-neutral-500 uppercase dark:border-[#1E2D26] dark:bg-[#0E1612] dark:text-neutral-400">
                      <th className="px-5 py-3">Area</th>
                      <th className="px-5 py-3">Time</th>
                      <th className="px-5 py-3">Team</th>
                      <th className="px-5 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-[#1E2D26]">
                    {todays.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
                          Nothing is scheduled for today.
                        </td>
                      </tr>
                    ) : (
                      todays.map((s) => (
                        <tr key={s.id} className="hover:bg-neutral-50/80 dark:hover:bg-white/[0.02]">
                          <td className="px-5 py-3 font-medium text-neutral-900 dark:text-neutral-100">{s.area}</td>
                          <td className="tabular-nums px-5 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                            {time12(s.time)}
                          </td>
                          <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">{s.team}</td>
                          <td className="px-5 py-3 text-right">
                            <select
                              aria-label={`Status for ${s.area}`}
                              value={s.status}
                              onChange={(e) => changeScheduleStatus(s, e.target.value as Status)}
                              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 dark:border-[#24362E] dark:bg-[#0E1713] dark:text-neutral-200"
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

            {/* Quick Actions */}
            <section className="lg:col-span-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-[#1E2D26] dark:bg-[#121C18]">
              <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Quick Actions
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                Frequently used administrative tools
              </p>

              <div className="mt-4 space-y-2.5">
                {[
                  {
                    icon: <Plus className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />,
                    title: 'Add Collection Schedule',
                    desc: 'Create a barangay collection plan',
                    onClick: () => navigate('schedules', { openAdd: true }),
                  },
                  {
                    icon: <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
                    title: 'Manage Accounts',
                    desc: 'Roles, teams, SMS gateways',
                    onClick: () => navigate('personnel'),
                  },
                  {
                    icon: <ClipboardCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
                    title: 'Collection Records',
                    desc: 'Track live collection progress',
                    onClick: () => navigate('records'),
                  },
                  {
                    icon: <BarChart3 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />,
                    title: 'Reports & CSV Exports',
                    desc: 'Completion summaries by area',
                    onClick: () => navigate('reports'),
                  },
                ].map((act) => (
                  <button
                    key={act.title}
                    type="button"
                    onClick={act.onClick}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-neutral-200/80 bg-neutral-50/50 px-3.5 py-3 text-left transition-colors hover:border-emerald-600/40 hover:bg-white dark:border-[#1E2D26] dark:bg-[#0E1612] dark:hover:bg-[#16231D]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-neutral-200 dark:bg-[#121C18] dark:border-[#24362E]">
                        {act.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {act.title}
                        </p>
                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{act.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Needs Attention */}
            <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-[#1E2D26] dark:bg-[#121C18]">
              <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Needs Attention
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                Operational items requiring review
              </p>

              <div className="mt-4 space-y-2.5">
                {attentionItems.length === 0 ? (
                  <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>All schedules and assignments are on track.</span>
                  </div>
                ) : (
                  attentionItems.map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => navigate(item.target)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-left transition-colors hover:border-emerald-600/40 dark:border-[#1E2D26] dark:hover:bg-white/[0.02]"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <AlertTriangle
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            item.tone === 'red'
                              ? 'text-rose-600 dark:text-rose-400'
                              : item.tone === 'amber'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p>
                          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">{item.text}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                    </button>
                  ))
                )}
              </div>
            </section>

            {/* Team Workload */}
            <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-[#1E2D26] dark:bg-[#121C18]">
              <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Team Workload
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                Select a team to inspect its assigned schedules
              </p>

              <div className="mt-4 space-y-3">
                {teamWorkload.length === 0 ? (
                  <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">No schedules yet.</p>
                ) : (
                  teamWorkload.slice(0, 5).map((row) => {
                    const pct = row.total ? Math.round((row.completed / row.total) * 100) : 0;
                    return (
                      <button
                        key={row.team}
                        type="button"
                        onClick={() => navigate('schedules', { search: row.team })}
                        className="block w-full rounded-lg p-2 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.03]"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">{row.team}</span>
                          <span className="tabular-nums text-xs text-neutral-500 dark:text-neutral-400">
                            {row.completed}/{row.total} completed
                            {row.active ? ` · ${row.active} active` : ''}
                          </span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-[#1B2B23]">
                          <div
                            className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overall Collection Breakdown */}
            <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-[#1E2D26] dark:bg-[#121C18]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    Collection Status Summary
                  </h3>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    Across all {totalVisible} municipal schedules
                  </p>
                </div>
                <span className="tabular-nums font-display text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
                  {percentDone}%
                </span>
              </div>

              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-[#1B2B23]">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${percentDone}%` }}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-neutral-100 pt-4 dark:border-[#1E2D26]">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Completed</p>
                  <p className="tabular-nums mt-0.5 text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                    {completedCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">In Progress</p>
                  <p className="tabular-nums mt-0.5 text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {inProgressCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Scheduled</p>
                  <p className="tabular-nums mt-0.5 text-lg font-semibold text-amber-600 dark:text-amber-400">
                    {scheduledCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Cancelled</p>
                  <p className="tabular-nums mt-0.5 text-lg font-semibold text-rose-600 dark:text-rose-400">
                    {cancelledCount}
                  </p>
                </div>
              </div>
            </section>

            {/* Recent Activity */}
            <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-[#1E2D26] dark:bg-[#121C18]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    Recent Activity
                  </h3>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    Latest actions by municipal personnel
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('activity')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400 whitespace-nowrap"
                >
                  Full log
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-4 divide-y divide-neutral-100 dark:divide-[#1E2D26]">
                {recentActivity.length === 0 ? (
                  <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    No activity recorded yet.
                  </p>
                ) : (
                  recentActivity.slice(0, 5).map((entry, idx) => (
                    <div key={entry.id ?? idx} className="py-2.5 first:pt-0 last:pb-0">
                      <p className="text-sm text-neutral-900 dark:text-neutral-100">
                        <span className="font-semibold">{entry.name}</span>{' '}
                        <span className="text-neutral-600 dark:text-neutral-400">{entry.action}</span>
                      </p>
                      <p className="tabular-nums mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        {entry.detail ? `${entry.detail} · ` : ''}
                        {formatShortDateTime(entry.time)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {/* ================= DRIVER DASHBOARD ================= */}
      {user.role === 'driver' && (
        <>
          {!user.team && (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/50 dark:bg-amber-950/30">
              <div>
                <h3 className="font-display text-base font-semibold text-amber-900 dark:text-amber-200">
                  Team Assignment Pending
                </h3>
                <p className="mt-0.5 text-sm text-amber-800/80 dark:text-amber-300/80">
                  The administrator assigns drivers to dispatch teams. Until then, you can browse all municipal schedules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTeamOnly(false);
                  navigate('records');
                }}
                className="rounded-lg bg-amber-700 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800 whitespace-nowrap shrink-0"
              >
                Browse All Collections
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-[#1E2D26] dark:bg-[#121C18]">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <span>Today&apos;s Route</span>
                <CalendarClock className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              </div>
              <p className="tabular-nums font-display mt-3 text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
                {myToday.length}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {myDoneToday} completed today
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-[#1E2D26] dark:bg-[#121C18]">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <span>In Progress</span>
                <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
              <p className="tabular-nums font-display mt-3 text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
                {myActive}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Currently on route</p>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-[#1E2D26] dark:bg-[#121C18]">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <span>Upcoming</span>
                <Clock3 className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              </div>
              <p className="tabular-nums font-display mt-3 text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
                {myUpcoming.length}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Scheduled ahead</p>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-[#1E2D26] dark:bg-[#121C18]">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <span>Overdue</span>
                <AlertTriangle
                  className={`h-4 w-4 ${myOverdue.length ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-400'}`}
                  aria-hidden="true"
                />
              </div>
              <p className="tabular-nums font-display mt-3 text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
                {myOverdue.length}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {myOverdue.length ? 'Pending completion' : 'All caught up'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-8 rounded-xl border border-neutral-200 bg-white p-5 dark:border-[#1E2D26] dark:bg-[#121C18]">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-[#1E2D26]">
                <div>
                  <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    Today&apos;s Dispatch Route
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Start or complete collections as you reach each area.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('records')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400 whitespace-nowrap"
                >
                  All records
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {myToday.length === 0 ? (
                  <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    No routes assigned for today.
                  </p>
                ) : (
                  myToday.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E2D26]"
                    >
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100">{s.area}</p>
                        <p className="tabular-nums mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                          {time12(s.time)} · {s.team}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <ScheduleStatusTag status={s.status} />
                        {s.status === 'Scheduled' && (
                          <button
                            type="button"
                            onClick={() => changeScheduleStatus(s, 'In Progress')}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
                          >
                            Start Route
                          </button>
                        )}
                        {s.status !== 'Completed' && s.status !== 'Cancelled' && (
                          <button
                            type="button"
                            onClick={() => changeScheduleStatus(s, 'Completed')}
                            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="lg:col-span-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-[#1E2D26] dark:bg-[#121C18]">
              <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Quick Actions
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">Driver shortcuts</p>
              <div className="mt-4 space-y-2.5">
                {[
                  {
                    icon: <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
                    title: 'Collection Schedules',
                    desc: 'View planned municipal routes',
                    onClick: () => navigate('schedules'),
                  },
                  {
                    icon: <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
                    title: 'Notifications',
                    desc: `${notifications.length} active reminder${notifications.length === 1 ? '' : 's'}`,
                    onClick: () => navigate('notifications'),
                  },
                  {
                    icon: <UserCog className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />,
                    title: 'Profile & Vehicle',
                    desc: user.vehicle ? `Vehicle ${user.vehicle}` : 'Add your vehicle plate',
                    onClick: () => navigate('profile'),
                  },
                ].map((act) => (
                  <button
                    key={act.title}
                    type="button"
                    onClick={act.onClick}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-neutral-200/80 bg-neutral-50/50 px-3.5 py-3 text-left transition-colors hover:border-emerald-600/40 hover:bg-white dark:border-[#1E2D26] dark:bg-[#0E1612] dark:hover:bg-[#16231D]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-neutral-200 dark:bg-[#121C18] dark:border-[#24362E]">
                        {act.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {act.title}
                        </p>
                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{act.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-neutral-200 bg-white dark:border-[#1E2D26] dark:bg-[#121C18]">
            <div className="border-b border-neutral-200 px-5 py-4 dark:border-[#1E2D26]">
              <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Coming Up
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Your upcoming assigned collections</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-semibold tracking-wide text-neutral-500 uppercase dark:border-[#1E2D26] dark:bg-[#0E1612] dark:text-neutral-400">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">Area</th>
                    <th className="px-5 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-[#1E2D26]">
                  {myUpcoming.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                        No upcoming collections.
                      </td>
                    </tr>
                  ) : (
                    myUpcoming.slice(0, 6).map((s) => (
                      <tr key={s.id}>
                        <td className="tabular-nums px-5 py-3">
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">{s.date}</span>
                          <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                            {formatCountdown(s.date)}
                          </span>
                        </td>
                        <td className="tabular-nums px-5 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                          {time12(s.time)}
                        </td>
                        <td className="px-5 py-3 font-medium text-neutral-900 dark:text-neutral-100">{s.area}</td>
                        <td className="px-5 py-3 text-right">
                          <ScheduleStatusTag status={s.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* ================= BARANGAY HEAD DASHBOARD ================= */}
      {user.role === 'barangay_head' && (
        <>
          <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E2D26] dark:bg-[#121C18]">
            {headNext ? (
              <>
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-emerald-50 px-3.5 py-2.5 text-center dark:bg-emerald-950/50">
                    <span className="block text-[11px] font-semibold text-emerald-700 uppercase dark:text-emerald-400">
                      Next Pickup
                    </span>
                    <strong className="tabular-nums font-display text-lg font-semibold text-emerald-900 dark:text-emerald-200">
                      {formatCountdown(headNext.date)}
                    </strong>
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                      {headNext.area}
                    </h3>
                    <p className="tabular-nums mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                      {headNext.date} at {time12(headNext.time)} · {headNext.team}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ScheduleStatusTag status={headNext.status} />
                  <button
                    type="button"
                    onClick={() => navigate('schedules')}
                    className="rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-200 whitespace-nowrap"
                  >
                    Full Schedule
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    No upcoming collection scheduled
                  </h3>
                  <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                    Nothing is planned for {user.barangay} yet. Municipal administrators set collection schedules.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('schedules')}
                  className="rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-200 whitespace-nowrap shrink-0"
                >
                  View Schedules
                </button>
              </>
            )}
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => navigate('schedules')}
              className="rounded-xl border border-neutral-200 bg-white p-5 text-left transition-colors hover:border-emerald-600/50 dark:border-[#1E2D26] dark:bg-[#121C18]"
            >
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <span>Upcoming</span>
                <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              </div>
              <p className="tabular-nums font-display mt-3 text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
                {headUpcoming.length}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Planned collections</p>
            </button>

            <button
              type="button"
              onClick={() => navigate('schedules')}
              className="rounded-xl border border-neutral-200 bg-white p-5 text-left transition-colors hover:border-emerald-600/50 dark:border-[#1E2D26] dark:bg-[#121C18]"
            >
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <span>Completed</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              </div>
              <p className="tabular-nums font-display mt-3 text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
                {completedCount}
              </p>
              <p className="tabular-nums mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {percentDone}% of total
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate('concerns')}
              className="rounded-xl border border-neutral-200 bg-white p-5 text-left transition-colors hover:border-emerald-600/50 dark:border-[#1E2D26] dark:bg-[#121C18]"
            >
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <span>Open Concerns</span>
                <MessageSquareWarning className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
              <p className="tabular-nums font-display mt-3 text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
                {openConcerns.length}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Pending or in review</p>
            </button>

            <button
              type="button"
              onClick={() => navigate('schedules')}
              className="rounded-xl border border-neutral-200 bg-white p-5 text-left transition-colors hover:border-emerald-600/50 dark:border-[#1E2D26] dark:bg-[#121C18]"
            >
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <span>All Schedules</span>
                <ClipboardCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              </div>
              <p className="tabular-nums font-display mt-3 text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
                {totalVisible}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">In {user.barangay}</p>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-8 rounded-xl border border-neutral-200 bg-white p-5 dark:border-[#1E2D26] dark:bg-[#121C18]">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4 dark:border-[#1E2D26]">
                <div>
                  <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    Open Resident Concerns
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Inbound SMS reports from residents appear live.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('concerns')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400 whitespace-nowrap"
                >
                  Open all
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-[#1E2D26]">
                {openConcerns.length === 0 ? (
                  <p className="py-8 text-center text-sm text-emerald-700 dark:text-emerald-400">
                    No open concerns in {user.barangay}.
                  </p>
                ) : (
                  openConcerns.slice(0, 4).map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {c.subject}
                          {c.source === 'sms' && (
                            <span className="ml-2 font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                              SMS
                            </span>
                          )}
                        </p>
                        <p className="tabular-nums mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                          {c.resident}
                          {c.senderPhone ? ` · ${c.senderPhone}` : ''} ·{' '}
                          {formatShortDateTime(c.receivedAt || c.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <ConcernStatusTag status={c.status} />
                        {c.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => changeConcernStatus(c, 'In Review')}
                            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-200 whitespace-nowrap"
                          >
                            Review
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => changeConcernStatus(c, 'Resolved')}
                          className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="lg:col-span-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-[#1E2D26] dark:bg-[#121C18]">
              <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Quick Actions
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">Barangay desk shortcuts</p>
              <div className="mt-4 space-y-2.5">
                {[
                  {
                    icon: <Plus className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
                    title: 'Record a Concern',
                    desc: 'Walk-in or phone call report',
                    onClick: () => navigate('concerns', { openConcern: true }),
                  },
                  {
                    icon: <CalendarClock className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />,
                    title: 'Collection Schedule',
                    desc: `Planned dates for ${user.barangay}`,
                    onClick: () => navigate('schedules'),
                  },
                  {
                    icon: <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
                    title: 'Notifications',
                    desc: `${notifications.length} active reminder${notifications.length === 1 ? '' : 's'}`,
                    onClick: () => navigate('notifications'),
                  },
                  {
                    icon: <UserCog className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />,
                    title: 'Profile & Settings',
                    desc: 'Contact details and security',
                    onClick: () => navigate('profile'),
                  },
                ].map((act) => (
                  <button
                    key={act.title}
                    type="button"
                    onClick={act.onClick}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-neutral-200/80 bg-neutral-50/50 px-3.5 py-3 text-left transition-colors hover:border-emerald-600/40 hover:bg-white dark:border-[#1E2D26] dark:bg-[#0E1612] dark:hover:bg-[#16231D]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-neutral-200 dark:bg-[#121C18] dark:border-[#24362E]">
                        {act.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {act.title}
                        </p>
                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{act.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};
