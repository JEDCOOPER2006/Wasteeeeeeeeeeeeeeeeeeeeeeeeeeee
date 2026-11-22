import React from 'react';
import { Bell, CalendarClock, CheckCheck, ChevronRight, MessageSquareWarning, XCircle } from 'lucide-react';
import { useWaste } from '../lib/store';
import { AppNotification, PageId } from '../lib/types';

const KIND_LABELS: Record<AppNotification['kind'], string> = {
  today: 'Today',
  upcoming: 'Upcoming',
  cancelled: 'Cancelled',
  concern: 'Resident concern',
};

const KIND_ICONS: Record<AppNotification['kind'], React.ReactNode> = {
  today: <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
  upcoming: <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
  cancelled: <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
  concern: <MessageSquareWarning className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />,
};

export const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, isRead, markRead, markAllRead, navigate } = useWaste();

  const openOne = (n: AppNotification) => {
    markRead(n);
    navigate(n.link as PageId);
  };

  return (
    <div className="space-y-4">
      {notifications.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-3.5 dark:border-[#1E2D26] dark:bg-[#121C18]">
          <p className="tabular-nums text-xs font-medium text-neutral-600 dark:text-neutral-300">
            {unreadCount} unread of {notifications.length} total reminders
          </p>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-200 whitespace-nowrap"
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Mark all as read
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white px-6 py-12 text-center dark:border-[#1E2D26] dark:bg-[#121C18]">
          <p className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
            You&apos;re all caught up
          </p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Nothing needs your attention right now. Customize reminder rules in Notification Preferences.
          </p>
          <button
            type="button"
            onClick={() => navigate('profile', { anchor: 'notifications' })}
            className="mt-4 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-200"
          >
            Open Notification Preferences
          </button>
        </div>
      ) : (
        <div className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:divide-[#1E2D26] dark:border-[#1E2D26] dark:bg-[#121C18]">
          {notifications.map((n) => {
            const unread = !isRead(n);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => openOne(n)}
                className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.02] ${
                  unread ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white dark:border-[#24362E] dark:bg-[#16231D]">
                    {KIND_ICONS[n.kind]}
                  </span>
                  <div className="min-w-0">
                    <p className="tabular-nums text-xs text-neutral-500 dark:text-neutral-400">
                      {KIND_LABELS[n.kind]} · {n.date}
                      {unread && (
                        <span className="ml-2 font-semibold text-emerald-700 dark:text-emerald-400">Unread</span>
                      )}
                    </p>
                    <h3 className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{n.title}</h3>
                    <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">{n.message}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
