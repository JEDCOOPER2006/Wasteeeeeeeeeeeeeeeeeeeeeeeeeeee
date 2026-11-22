import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Bell,
  Calendar,
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  Moon,
  Recycle,
  ScrollText,
  Sun,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useWaste } from '../lib/store';
import { AppNotification, PageId } from '../lib/types';
import { NAV_ITEMS, initialsOf, roleLabel, todayIso } from '../lib/utils';

const NAV_ICONS: Record<PageId, React.ReactNode> = {
  dashboard: <LayoutDashboard className="h-4 w-4 shrink-0" />,
  schedules: <CalendarClock className="h-4 w-4 shrink-0" />,
  personnel: <Users className="h-4 w-4 shrink-0" />,
  records: <ClipboardCheck className="h-4 w-4 shrink-0" />,
  concerns: <MessageSquareWarning className="h-4 w-4 shrink-0" />,
  notifications: <Bell className="h-4 w-4 shrink-0" />,
  reports: <BarChart3 className="h-4 w-4 shrink-0" />,
  activity: <ScrollText className="h-4 w-4 shrink-0" />,
  profile: <UserCog className="h-4 w-4 shrink-0" />,
};

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    page,
    navigate,
    logout,
    theme,
    toggleTheme,
    notifications,
    unreadCount,
    isRead,
    markRead,
    markAllRead,
    notice,
    setNotice,
  } = useWaste();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBellOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!user) return null;

  const visibleNav = NAV_ITEMS.filter((n) => !n.hidden && n.roles.includes(user.role));
  const currentItem = NAV_ITEMS.find((n) => n.id === page) ?? NAV_ITEMS[0];

  const shownNotifications = (onlyUnread ? notifications.filter((n) => !isRead(n)) : notifications).slice(0, 15);

  const openNotification = (n: AppNotification) => {
    markRead(n);
    setBellOpen(false);
    navigate(n.link as PageId);
  };

  const formatWhen = (at: string) => {
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return at;
    const day = at.slice(0, 10);
    const dayLabel =
      day === todayIso()
        ? 'Today'
        : day === todayIso(1)
        ? 'Tomorrow'
        : day === todayIso(-1)
        ? 'Yesterday'
        : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    return at.length > 10
      ? `${dayLabel}, ${d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`
      : dayLabel;
  };

  const todayFormatted = new Date().toLocaleDateString('en-PH', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleNavClick = (id: PageId) => {
    navigate(id);
    setMobileMenuOpen(false);
  };

  const SidebarBody = (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-[#111A15] border-r border-neutral-200 dark:border-[#1E2D26]">
      <div>
        <div className="flex items-center justify-between px-5 py-5 border-b border-neutral-200/80 dark:border-[#1E2D26]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white">
              <Recycle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="font-display block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Villanueva
              </span>
              <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                Waste Operations
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 lg:hidden dark:hover:bg-white/5"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1" aria-label="Main navigation">
          {visibleNav.map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-100'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0 truncate">
                  {NAV_ICONS[item.id]}
                  <span className="truncate">{item.label}</span>
                </span>
                {active && <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-neutral-200/80 p-3 dark:border-[#1E2D26]">
        <button
          type="button"
          onClick={() => handleNavClick('profile')}
          className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-white/5"
        >
          {user.photo ? (
            <img
              src={user.photo}
              alt={user.name || user.email}
              referrerPolicy="no-referrer"
              className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-neutral-200 dark:ring-[#24362E]"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-xs font-semibold text-white">
              {initialsOf(user)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {user.name || user.email}
            </p>
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
              {roleLabel(user.role)}
              {user.role === 'barangay_head' && user.barangay ? ` · ${user.barangay}` : ''}
              {user.role === 'driver' && user.team ? ` · ${user.team}` : ''}
            </p>
          </div>
        </button>
        <p className="mt-2 px-2 text-[11px] text-neutral-400 dark:text-neutral-500">
          Villanueva, Misamis Oriental
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F6F8F7] text-[#14221B] dark:bg-[#0B120F] dark:text-[#ECF3EE]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {SidebarBody}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-68 max-w-[85vw] h-full">{SidebarBody}</div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar (3 zones) */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-neutral-200 bg-white/95 px-4 backdrop-blur-xs sm:px-8 dark:border-[#1E2D26] dark:bg-[#111A15]/95">
          {/* Zone 1: Menu + Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden dark:text-neutral-300 dark:hover:bg-white/5"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                Waste Operations
              </span>
              <span className="hidden sm:inline text-neutral-300 dark:text-neutral-600" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {currentItem.label}
              </span>
            </div>
          </div>

          {/* Zone 2 & 3: Utility Controls + Primary Sign Out */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-300 dark:hover:bg-[#1C2C25]"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Notifications Popover */}
            <div className="relative" ref={bellRef}>
              <button
                type="button"
                onClick={() => setBellOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={bellOpen}
                aria-label="Notifications"
                className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                  bellOpen
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-300 dark:hover:bg-[#1C2C25]'
                }`}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="tabular-nums absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded bg-emerald-700 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div
                  role="dialog"
                  aria-label="Notifications"
                  className="fixed left-3 right-3 top-18 z-50 sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-96 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-[#1E2D26] dark:bg-[#121C18]"
                >
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div>
                      <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                        Notifications
                      </h3>
                      <p className="tabular-nums text-xs text-neutral-500 dark:text-neutral-400">
                        {unreadCount} unread
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={markAllRead}
                      disabled={unreadCount === 0}
                      className="text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-40 dark:text-emerald-400 whitespace-nowrap"
                    >
                      Mark all as read
                    </button>
                  </div>

                  <div className="px-4 pb-2">
                    <div className="inline-flex rounded-lg bg-neutral-100 p-1 dark:bg-[#18251F]">
                      <button
                        type="button"
                        onClick={() => setOnlyUnread(false)}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                          !onlyUnread
                            ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#22342C] dark:text-neutral-100'
                            : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setOnlyUnread(true)}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                          onlyUnread
                            ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#22342C] dark:text-neutral-100'
                            : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
                        }`}
                      >
                        Unread
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100 px-2 dark:divide-[#1E2D26]">
                    {shownNotifications.length === 0 ? (
                      <div className="py-10 text-center px-4">
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                          {onlyUnread && notifications.length ? 'No unread notifications' : "You're all caught up"}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                          {onlyUnread && notifications.length
                            ? 'Everything has been read.'
                            : 'Nothing needs your attention right now.'}
                        </p>
                      </div>
                    ) : (
                      shownNotifications.map((n) => {
                        const unread = !isRead(n);
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => openNotification(n)}
                            className={`flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-white/5 ${
                              unread ? 'bg-emerald-50/50 dark:bg-emerald-950/25' : ''
                            }`}
                          >
                            <div className="mt-0.5 flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                                  {n.title}
                                </span>
                                {unread && (
                                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                                    New
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2">
                                {n.message}
                              </p>
                              <p className="tabular-nums mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                                {formatWhen(n.at)}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-4 py-2.5 dark:border-[#1E2D26] dark:bg-[#0E1612]">
                    <button
                      type="button"
                      onClick={() => {
                        setBellOpen(false);
                        navigate('notifications');
                      }}
                      className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400 whitespace-nowrap"
                    >
                      See all notifications
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBellOpen(false);
                        navigate('profile', { anchor: 'notifications' });
                      }}
                      className="text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 whitespace-nowrap"
                    >
                      Preferences
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-200 dark:hover:bg-[#1C2C25] whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                {currentItem.label}
              </h1>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {currentItem.subtitle}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 tabular-nums dark:border-[#1E2D26] dark:bg-[#121C18] dark:text-neutral-300 whitespace-nowrap shrink-0">
              <Calendar className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              {todayFormatted}
            </div>
          </div>

          {notice && (
            <div
              role="status"
              className={`mb-6 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
                notice.tone === 'bad'
                  ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-200'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200'
              }`}
            >
              <span className="flex items-center gap-2.5">
                {notice.tone === 'bad' ? (
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span>{notice.text}</span>
              </span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label="Dismiss notice"
                className="rounded p-1 opacity-70 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {children}

          <footer className="mt-10 flex flex-col gap-1 border-t border-neutral-200/80 pt-5 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E2D26] dark:text-neutral-500">
            <span>Villanueva Municipal Waste Operations and Notification System</span>
            <span>Municipality of Villanueva · Misamis Oriental</span>
          </footer>
        </main>
      </div>
    </div>
  );
};
