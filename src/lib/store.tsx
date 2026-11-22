import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  changeOwnPassword,
  fetchAllActivity,
  listAllUsers,
  logActivity,
  loginWithEmail,
  logoutAuth,
  saveOwnProfile,
  watchAuth,
} from './auth';
import {
  ActivityEntry,
  AppNotification,
  AppUser,
  Concern,
  ConcernStatus,
  PageId,
  Schedule,
  SelfEditable,
  SmsDevice,
  Status,
} from './types';
import { canAccessPage, normalizePH, sameText, time12, todayIso } from './utils';

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
}

interface WasteContextValue {
  user: AppUser | null;
  authReady: boolean;
  page: PageId;
  pageAnchor: string | null;
  navigate: (page: PageId, opts?: { search?: string; openAdd?: boolean; openConcern?: boolean; anchor?: string }) => void;

  theme: 'light' | 'dark';
  toggleTheme: () => void;

  schedules: Schedule[];
  schedulesLoading: boolean;
  concerns: Concern[];
  users: AppUser[];
  recentActivity: ActivityEntry[];
  smsDevices: SmsDevice[];

  notice: { text: string; tone?: 'ok' | 'bad' | 'info' } | null;
  setNotice: (n: { text: string; tone?: 'ok' | 'bad' | 'info' } | null) => void;

  searchText: string;
  setSearchText: (v: string) => void;
  teamOnly: boolean;
  setTeamOnly: (v: boolean) => void;

  scheduleModalOpen: boolean;
  setScheduleModalOpen: (v: boolean) => void;
  editingSchedule: Schedule | null;
  openAddSchedule: () => void;
  openEditSchedule: (s: Schedule) => void;

  concernModalOpen: boolean;
  setConcernModalOpen: (v: boolean) => void;
  openConcernModal: () => void;

  confirmState: ConfirmState | null;
  requestConfirm: (c: ConfirmState) => void;
  closeConfirm: () => void;

  visibleSchedules: Schedule[];
  myTeamSchedules: Schedule[];
  mySchedules: Schedule[];
  notifications: AppNotification[];
  unreadCount: number;
  isRead: (n: AppNotification) => boolean;
  markRead: (n: AppNotification) => void;
  markAllRead: () => void;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  saveProfile: (patch: SelfEditable) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;

  reloadSchedules: () => Promise<void>;
  reloadUsers: () => Promise<void>;
  reloadActivity: () => Promise<void>;
  forgetSmsDevice: (deviceId: string) => Promise<void>;

  saveSchedule: (data: Omit<Schedule, 'id'>, existingId?: string | null) => Promise<void>;
  deleteSchedule: (s: Schedule) => void;
  changeScheduleStatus: (s: Schedule, status: Status) => Promise<void>;

  saveManualConcern: (data: { resident: string; phone: string; subject: string; details: string }) => Promise<string>;
  changeConcernStatus: (c: Concern, status: ConcernStatus) => Promise<void>;
  verifySender: (c: Concern, name: string, purok: string, consent: boolean) => Promise<string>;
}

const WasteContext = createContext<WasteContextValue | null>(null);

export const WasteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [page, setPage] = useState<PageId>('dashboard');
  const [pageAnchor, setPageAnchor] = useState<string | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('vwo-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      /* ignore */
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem('vwo-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([]);
  const [smsDevices, setSmsDevices] = useState<SmsDevice[]>([]);
  const [notice, setNotice] = useState<{ text: string; tone?: 'ok' | 'bad' | 'info' } | null>(null);

  const [searchText, setSearchText] = useState('');
  const [teamOnly, setTeamOnly] = useState(true);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [concernModalOpen, setConcernModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const clearData = useCallback(() => {
    setSchedules([]);
    setConcerns([]);
    setUsers([]);
    setRecentActivity([]);
    setSmsDevices([]);
    setTeamOnly(true);
    setReadIds(new Set());
  }, []);

  const reloadSchedules = useCallback(async () => {
    setSchedulesLoading(true);
    try {
      const snap = await getDocs(collection(db, 'schedules'));
      setSchedules(snap.docs.map((d) => ({ ...(d.data() as Omit<Schedule, 'id'>), id: d.id })));
    } catch (e) {
      console.error('Schedule load error:', e);
      setNotice({ text: 'Unable to load schedules. Check your connection or permissions.', tone: 'bad' });
    } finally {
      setSchedulesLoading(false);
    }
  }, []);

  const reloadUsers = useCallback(async () => {
    if (user?.role !== 'admin') return;
    try {
      setUsers(await listAllUsers());
    } catch (e) {
      console.error('User load error:', e);
    }
  }, [user?.role]);

  const reloadActivity = useCallback(async () => {
    if (user?.role !== 'admin') return;
    try {
      setRecentActivity(await fetchAllActivity(8));
    } catch (e) {
      console.error('Activity load error:', e);
    }
  }, [user?.role]);

  const loadSmsDevices = useCallback(async () => {
    if (user?.role !== 'admin') return;
    try {
      const snap = await getDocs(collection(db, 'smsUnrouted'));
      const list = snap.docs.map((d) => ({ ...(d.data() as Omit<SmsDevice, 'id'>), id: d.id }));
      setSmsDevices(list.sort((a, b) => String(b.lastSeen).localeCompare(String(a.lastSeen))));
    } catch (e) {
      console.error('Gateway device load error:', e);
    }
  }, [user?.role]);

  useEffect(() => {
    const unsub = watchAuth((u) => {
      setUser(u);
      setAuthReady(true);
      if (!u) {
        clearData();
        setPage('dashboard');
      }
    });
    return unsub;
  }, [clearData]);

  // Load role-scoped data whenever authenticated user changes
  useEffect(() => {
    if (!user) return;
    void reloadSchedules();
    if (user.role === 'admin') {
      void reloadUsers();
      void reloadActivity();
      void loadSmsDevices();
    }
    try {
      const raw = localStorage.getItem('vwo-read-' + user.uid);
      setReadIds(new Set<string>(raw ? JSON.parse(raw) : []));
    } catch {
      setReadIds(new Set());
    }
  }, [user?.uid, user?.role, reloadSchedules, reloadUsers, reloadActivity, loadSmsDevices]);

  // Live listener for Barangay Head resident concerns (only when authenticated as barangay_head)
  useEffect(() => {
    if (!user || user.role !== 'barangay_head' || !user.barangay) {
      setConcerns([]);
      return;
    }
    let known: Set<string> | null = null;
    const q = query(collection(db, 'concerns'), where('area', '==', user.barangay));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as Omit<Concern, 'id'>), id: d.id }));
        if (known) {
          const fresh = list.filter((c) => !known!.has(c.id) && c.source === 'sms');
          if (fresh.length) {
            setNotice({
              text:
                fresh.length === 1
                  ? `New SMS concern received from ${fresh[0].senderPhone}.`
                  : `${fresh.length} new SMS concerns received.`,
              tone: 'info',
            });
          }
        }
        known = new Set(list.map((c) => c.id));
        const when = (c: Concern) => c.receivedAt || c.createdAt || '';
        setConcerns([...list].sort((a, b) => when(b).localeCompare(when(a))));
      },
      (err) => {
        console.error('Concern listener error:', err);
        setNotice({ text: 'Unable to load resident concerns. Check Firestore security rules.', tone: 'bad' });
      }
    );
    return unsub;
  }, [user?.uid, user?.role, user?.barangay]);

  const navigate = useCallback(
    (
      nextPage: PageId,
      opts?: { search?: string; openAdd?: boolean; openConcern?: boolean; anchor?: string }
    ) => {
      if (user && !canAccessPage(user.role, nextPage)) {
        setPage('dashboard');
        return;
      }
      setPage(nextPage);
      setPageAnchor(opts?.anchor ?? null);
      setSearchText(opts?.search ?? '');
      setNotice(null);
      if (opts?.openAdd) {
        setEditingSchedule(null);
        setScheduleModalOpen(true);
      } else {
        setScheduleModalOpen(false);
      }
      setConcernModalOpen(Boolean(opts?.openConcern));
    },
    [user]
  );

  const visibleSchedules = useMemo(() => {
    if (!user) return [];
    if (user.role === 'barangay_head') {
      return schedules.filter((s) => sameText(s.area, user.barangay));
    }
    return schedules;
  }, [user, schedules]);

  const myTeamSchedules = useMemo(() => {
    const team = user?.team ?? '';
    return team ? schedules.filter((s) => sameText(s.team, team)) : [];
  }, [user?.team, schedules]);

  const mySchedules = useMemo(() => {
    return user?.role === 'driver' ? myTeamSchedules : visibleSchedules;
  }, [user?.role, myTeamSchedules, visibleSchedules]);

  const notifications = useMemo<AppNotification[]>(() => {
    if (!user) return [];
    const p = user.prefs;
    const isDriver = user.role === 'driver';
    const whereLabel = (s: Schedule) => (isDriver ? s.area : `${s.area} (${s.team})`);
    const link = isDriver ? 'records' : 'schedules';
    const t = todayIso();
    const soon = todayIso(3);
    const byDT = (a: Schedule, b: Schedule) => (a.date + a.time).localeCompare(b.date + b.time);
    const out: AppNotification[] = [];

    if (p.notifyToday) {
      const todays = mySchedules
        .filter((s) => s.date === t && s.status !== 'Cancelled')
        .sort(byDT);
      for (const s of todays) {
        out.push({
          id: `today|${s.id}|${s.status}`,
          at: `${s.date}T${s.time || '00:00'}`,
          kind: 'today',
          date: s.date,
          link,
          title: s.status === 'Completed' ? 'Collection completed today' : 'Collection today',
          message: `${whereLabel(s)} at ${time12(s.time)} · ${s.status}`,
        });
      }
      const overdue = mySchedules
        .filter((s) => s.date < t && (s.status === 'Scheduled' || s.status === 'In Progress'))
        .sort(byDT);
      for (const s of overdue) {
        out.push({
          id: `overdue|${s.id}|${s.status}`,
          at: `${s.date}T${s.time || '00:00'}`,
          kind: 'today',
          date: s.date,
          link,
          title: 'Overdue collection',
          message: `${whereLabel(s)} was planned for ${s.date} (${s.status})`,
        });
      }
    }

    if (p.notifyUpcoming) {
      const upcoming = mySchedules
        .filter((s) => s.date > t && s.date <= soon && s.status !== 'Completed' && s.status !== 'Cancelled')
        .sort(byDT);
      for (const s of upcoming) {
        out.push({
          id: `upcoming|${s.id}|${s.date}|${s.time}`,
          at: `${s.date}T${s.time || '00:00'}`,
          kind: 'upcoming',
          date: s.date,
          link,
          title: 'Upcoming collection',
          message: `${whereLabel(s)} on ${s.date} at ${time12(s.time)}`,
        });
      }
    }

    if (p.notifyCancelled) {
      for (const s of mySchedules.filter((x) => x.status === 'Cancelled' && x.date >= t)) {
        out.push({
          id: `cancelled|${s.id}`,
          at: `${s.date}T${s.time || '00:00'}`,
          kind: 'cancelled',
          date: s.date,
          link,
          title: 'Collection cancelled',
          message: `${whereLabel(s)} on ${s.date} was cancelled`,
        });
      }
    }

    if (p.notifyConcerns && user.role === 'barangay_head') {
      for (const c of concerns.filter((x) => x.status !== 'Resolved')) {
        out.push({
          id: `concern|${c.id}|${c.status}`,
          at: c.receivedAt || c.createdAt,
          kind: 'concern',
          date: c.createdAt.slice(0, 10),
          link: 'concerns',
          title:
            c.status === 'Pending'
              ? c.source === 'sms'
                ? 'New SMS concern'
                : 'New resident concern'
              : 'Concern under review',
          message: `${c.subject} · ${c.resident}`,
        });
      }
    }

    return out.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  }, [user, mySchedules, concerns]);

  const persistRead = useCallback(
    (nextSet: Set<string>) => {
      if (!user) return;
      const live = new Set(notifications.map((n) => n.id));
      const keep = [...nextSet].filter((id) => live.has(id));
      const pruned = new Set(keep);
      setReadIds(pruned);
      try {
        localStorage.setItem('vwo-read-' + user.uid, JSON.stringify(keep));
      } catch {
        /* ignore */
      }
    },
    [user, notifications]
  );

  const isRead = useCallback((n: AppNotification) => readIds.has(n.id), [readIds]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.has(n.id)).length,
    [notifications, readIds]
  );

  const markRead = useCallback(
    (n: AppNotification) => {
      if (readIds.has(n.id)) return;
      persistRead(new Set([...readIds, n.id]));
    },
    [readIds, persistRead]
  );

  const markAllRead = useCallback(() => {
    persistRead(new Set([...readIds, ...notifications.map((n) => n.id)]));
  }, [readIds, notifications, persistRead]);

  const login = useCallback(async (email: string, password: string) => {
    const profile = await loginWithEmail(email, password);
    setUser(profile);
    setPage('dashboard');
    void logActivity(profile, 'Signed in', profile.email);
  }, []);

  const logout = useCallback(async () => {
    await logoutAuth();
    setUser(null);
    clearData();
    setPage('dashboard');
  }, [clearData]);

  const saveProfile = useCallback(
    async (patch: SelfEditable) => {
      if (!user) throw new Error('Not signed in.');
      const fresh = await saveOwnProfile(user.uid, patch);
      setUser(fresh);
    },
    [user]
  );

  const changePassword = useCallback(async (current: string, next: string) => {
    await changeOwnPassword(current, next);
  }, []);

  const openAddSchedule = useCallback(() => {
    setEditingSchedule(null);
    setScheduleModalOpen(true);
    setNotice(null);
  }, []);

  const openEditSchedule = useCallback((s: Schedule) => {
    setEditingSchedule(s);
    setScheduleModalOpen(true);
    setNotice(null);
  }, []);

  const openConcernModal = useCallback(() => {
    setConcernModalOpen(true);
    setNotice(null);
  }, []);

  const saveSchedule = useCallback(
    async (data: Omit<Schedule, 'id'>, existingId?: string | null) => {
      const id = existingId || String(Date.now());
      await setDoc(doc(db, 'schedules', id), data);
      const saved: Schedule = { ...data, id };
      if (existingId) {
        setSchedules((prev) => prev.map((s) => (s.id === id ? saved : s)));
        setNotice({ text: 'Schedule updated successfully.', tone: 'ok' });
        void logActivity(user, 'Edited a schedule', `${saved.area} - ${saved.date}`);
      } else {
        setSchedules((prev) => [saved, ...prev]);
        setNotice({ text: 'New schedule added successfully.', tone: 'ok' });
        void logActivity(user, 'Added a schedule', `${saved.area} - ${saved.date}`);
      }
      setScheduleModalOpen(false);
      setEditingSchedule(null);
    },
    [user]
  );

  const deleteSchedule = useCallback(
    (s: Schedule) => {
      setConfirmState({
        title: 'Delete Collection Schedule',
        message: `Remove the scheduled collection for ${s.area} on ${s.date}? This cannot be undone.`,
        confirmLabel: 'Delete Schedule',
        danger: true,
        onConfirm: async () => {
          await deleteDoc(doc(db, 'schedules', s.id));
          setSchedules((prev) => prev.filter((item) => item.id !== s.id));
          setNotice({ text: `Schedule for ${s.area} deleted.`, tone: 'ok' });
          void logActivity(user, 'Deleted a schedule', `${s.area} - ${s.date}`);
        },
      });
    },
    [user]
  );

  const changeScheduleStatus = useCallback(
    async (s: Schedule, status: Status) => {
      try {
        const updated: Schedule = { ...s, status };
        if (user?.role === 'driver') {
          await updateDoc(doc(db, 'schedules', s.id), { status });
        } else {
          const { id, ...rest } = updated;
          await setDoc(doc(db, 'schedules', id), rest);
        }
        setSchedules((prev) => prev.map((item) => (item.id === s.id ? updated : item)));
        setNotice({ text: `${s.area}: marked ${status.toLowerCase()}.`, tone: 'ok' });
        void logActivity(user, 'Updated collection status', `${s.area} - ${s.status} to ${status}`);
      } catch (e) {
        console.error('Status update error:', e);
        setNotice({ text: 'Failed to update collection status.', tone: 'bad' });
      }
    },
    [user]
  );

  const saveManualConcern = useCallback(
    async (data: { resident: string; phone: string; subject: string; details: string }): Promise<string> => {
      if (user?.role !== 'barangay_head') return 'Only Barangay Heads can record concerns.';
      const phoneText = data.phone.trim();
      const phone = normalizePH(phoneText);
      if (!data.resident.trim() || !data.subject.trim()) {
        return 'Please enter the resident name and subject.';
      }
      if (phoneText && !phone) {
        return 'Mobile number must look like 09171234567.';
      }
      const nowIso = new Date().toISOString();
      const id = String(Date.now());
      const payload = {
        resident: data.resident.trim(),
        area: user.barangay,
        subject: data.subject.trim(),
        details: data.details.trim(),
        status: 'Pending' as ConcernStatus,
        createdBy: user.email,
        createdAt: nowIso,
        source: 'manual' as const,
        senderPhone: phone,
        verified: true,
        receivedAt: nowIso,
      };
      try {
        await setDoc(doc(db, 'concerns', id), payload);
        setConcernModalOpen(false);
        setNotice({ text: 'Resident concern recorded.', tone: 'ok' });
        void logActivity(user, 'Recorded a resident concern', `${payload.subject} - ${payload.area}`);
        return '';
      } catch (e) {
        console.error('Concern create error:', e);
        return 'Failed to save concern. Check Firestore rules and permissions.';
      }
    },
    [user]
  );

  const changeConcernStatus = useCallback(
    async (c: Concern, status: ConcernStatus) => {
      try {
        await updateDoc(doc(db, 'concerns', c.id), { status });
        setNotice({
          text:
            c.senderPhone && status !== c.status
              ? 'Concern updated. Registered consenting residents are notified automatically via SMS.'
              : 'Resident concern updated.',
          tone: 'ok',
        });
        void logActivity(user, 'Updated a resident concern', `${c.subject} - ${status}`);
      } catch (e) {
        console.error('Concern update error:', e);
        setNotice({ text: 'Failed to update resident concern.', tone: 'bad' });
      }
    },
    [user]
  );

  const verifySender = useCallback(
    async (c: Concern, name: string, purok: string, consent: boolean): Promise<string> => {
      if (user?.role !== 'barangay_head') return 'Only the Barangay Head can verify a sender.';
      const phone = normalizePH(c.senderPhone);
      if (name.trim().length < 2) return "Please enter the resident's full name.";
      if (consent && !purok.trim()) return 'Please enter the purok or zone to register the resident.';
      if (consent && !phone) return 'This sender has no valid mobile number to register.';
      try {
        if (consent) {
          await setDoc(doc(db, 'residents', String(Date.now())), {
            name: name.trim(),
            barangay: c.area,
            purok: purok.trim(),
            mobile: phone,
            consent: true,
            ready: false,
          });
        }
        await updateDoc(doc(db, 'concerns', c.id), {
          resident: name.trim(),
          verified: true,
        });
        void logActivity(user, 'Verified an SMS sender', `${name.trim()} - ${c.area}`);
        setNotice({
          text: consent ? 'Sender verified and registered as a resident.' : 'Sender verified.',
          tone: 'ok',
        });
        return '';
      } catch (e) {
        console.error('Verify error:', e);
        return 'Could not save verification. Check Firestore rules and try again.';
      }
    },
    [user]
  );

  const forgetSmsDevice = useCallback(async (deviceId: string) => {
    const match = smsDevices.find((d) => d.deviceId === deviceId);
    if (!match) return;
    try {
      await deleteDoc(doc(db, 'smsUnrouted', match.id));
      setSmsDevices((prev) => prev.filter((d) => d.id !== match.id));
    } catch (e) {
      console.error('Forget SMS device error:', e);
    }
  }, [smsDevices]);

  const requestConfirm = useCallback((c: ConfirmState) => setConfirmState(c), []);
  const closeConfirm = useCallback(() => setConfirmState(null), []);

  const value: WasteContextValue = {
    user,
    authReady,
    page,
    pageAnchor,
    navigate,
    theme,
    toggleTheme,
    schedules,
    schedulesLoading,
    concerns,
    users,
    recentActivity,
    smsDevices,
    notice,
    setNotice,
    searchText,
    setSearchText,
    teamOnly,
    setTeamOnly,
    scheduleModalOpen,
    setScheduleModalOpen,
    editingSchedule,
    openAddSchedule,
    openEditSchedule,
    concernModalOpen,
    setConcernModalOpen,
    openConcernModal,
    confirmState,
    requestConfirm,
    closeConfirm,
    visibleSchedules,
    myTeamSchedules,
    mySchedules,
    notifications,
    unreadCount,
    isRead,
    markRead,
    markAllRead,
    login,
    logout,
    saveProfile,
    changePassword,
    reloadSchedules,
    reloadUsers,
    reloadActivity,
    forgetSmsDevice,
    saveSchedule,
    deleteSchedule,
    changeScheduleStatus,
    saveManualConcern,
    changeConcernStatus,
    verifySender,
  };

  return <WasteContext.Provider value={value}>{children}</WasteContext.Provider>;
};

export function useWaste(): WasteContextValue {
  const ctx = useContext(WasteContext);
  if (!ctx) throw new Error('useWaste must be used inside WasteProvider');
  return ctx;
}
