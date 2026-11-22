import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Camera, Eye, EyeOff, History, Lock, RefreshCw, Shield, User as UserIcon } from 'lucide-react';
import { RoleTag } from '../components/StatusBadge';
import { fetchMyActivity, logActivity } from '../lib/auth';
import { useWaste } from '../lib/store';
import { ActivityEntry, PageId, Prefs } from '../lib/types';
import { formatShortDate, formatShortDateTime, friendlyError, initialsOf, roleLabel, todayIso } from '../lib/utils';

export const ProfilePage: React.FC = () => {
  const {
    user,
    pageAnchor,
    schedules,
    visibleSchedules,
    myTeamSchedules,
    users,
    concerns,
    notifications,
    saveProfile,
    changePassword,
    logout,
    navigate,
  } = useWaste();

  // Personal info state
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    bio: '',
    position: '',
    vehicle: '',
  });
  const [infoBusy, setInfoBusy] = useState(false);
  const [infoMsg, setInfoMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Photo state
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Password state
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Preferences state
  const [prefMsg, setPrefMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Personal activity
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState('');

  const resetForm = useCallback(() => {
    if (!user) return;
    setForm({
      name: user.name,
      phone: user.phone,
      address: user.address,
      bio: user.bio,
      position: user.position,
      vehicle: user.vehicle,
    });
    setInfoMsg(null);
  }, [user]);

  const loadActivity = useCallback(async () => {
    if (!user?.email) return;
    setEntriesLoading(true);
    setEntriesError('');
    try {
      setEntries(await fetchMyActivity(user.email));
    } catch (err) {
      setEntriesError(friendlyError(err));
    } finally {
      setEntriesLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    resetForm();
    void loadActivity();
  }, [resetForm, loadActivity]);

  useEffect(() => {
    if (!pageAnchor) return;
    const t = setTimeout(() => {
      document.getElementById(pageAnchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => clearTimeout(t);
  }, [pageAnchor]);

  const highlights = useMemo(() => {
    if (!user) return [];
    const today = todayIso();
    if (user.role === 'admin') {
      return [
        { label: 'Schedules', value: schedules.length, target: 'schedules' as PageId },
        { label: 'Accounts', value: users.length, target: 'personnel' as PageId },
        { label: 'Today', value: schedules.filter((s) => s.date === today).length, target: 'records' as PageId },
      ];
    }
    if (user.role === 'driver') {
      return [
        { label: 'Today', value: myTeamSchedules.filter((s) => s.date === today).length, target: 'dashboard' as PageId },
        {
          label: 'Upcoming',
          value: myTeamSchedules.filter((s) => s.date > today && s.status !== 'Completed' && s.status !== 'Cancelled')
            .length,
          target: 'records' as PageId,
        },
        {
          label: 'Completed',
          value: myTeamSchedules.filter((s) => s.status === 'Completed').length,
          target: 'records' as PageId,
        },
      ];
    }
    return [
      {
        label: 'Upcoming',
        value: visibleSchedules.filter((s) => s.date > today && s.status !== 'Completed' && s.status !== 'Cancelled')
          .length,
        target: 'schedules' as PageId,
      },
      {
        label: 'Open concerns',
        value: concerns.filter((c) => c.status !== 'Resolved').length,
        target: 'concerns' as PageId,
      },
      {
        label: 'Completed',
        value: visibleSchedules.filter((s) => s.status === 'Completed').length,
        target: 'schedules' as PageId,
      },
    ];
  }, [user, schedules, users, myTeamSchedules, visibleSchedules, concerns]);

  const pwStrength = useMemo(() => {
    const p = pw.next;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (p.length < 6) score = Math.min(score, 1);
    return score;
  }, [pw.next]);

  const pwStrengthLabel = pw.next ? ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][pwStrength] : '';

  if (!user) return null;

  const dirty =
    form.name !== user.name ||
    form.phone !== user.phone ||
    form.address !== user.address ||
    form.bio !== user.bio ||
    form.position !== user.position ||
    form.vehicle !== user.vehicle;

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const phone = form.phone.trim();
    if (name.length < 2) {
      setInfoMsg({ ok: false, text: 'Please enter your full name.' });
      return;
    }
    if (phone && !/^09\d{9}$/.test(phone)) {
      setInfoMsg({ ok: false, text: 'Mobile number must look like 09171234567.' });
      return;
    }
    setInfoBusy(true);
    try {
      const patch: Record<string, string> = {
        name,
        phone,
        address: form.address.trim(),
        bio: form.bio.trim(),
        position: form.position.trim(),
      };
      if (user.role === 'driver') patch['vehicle'] = form.vehicle.trim().toUpperCase();
      await saveProfile(patch);
      setInfoMsg({ ok: true, text: 'Profile updated.' });
      void logActivity(user, 'Updated profile details');
    } catch (err) {
      setInfoMsg({ ok: false, text: friendlyError(err) });
    } finally {
      setInfoBusy(false);
    }
  };

  const squareThumbnail = (file: File, size: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Could not process image.'));
          return;
        }
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Selected file could not be read as an image.'));
      };
      img.src = url;
    });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoMsg({ ok: false, text: 'Please choose an image file (JPG or PNG).' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoMsg({ ok: false, text: 'Image is too large. Choose one under 8 MB.' });
      return;
    }
    setPhotoBusy(true);
    try {
      const dataUrl = await squareThumbnail(file, 192);
      await saveProfile({ photo: dataUrl });
      setPhotoMsg({ ok: true, text: 'Profile photo updated.' });
      void logActivity(user, 'Changed profile photo');
    } catch (err) {
      setPhotoMsg({ ok: false, text: friendlyError(err) });
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoBusy(true);
    try {
      await saveProfile({ photo: '' });
      setPhotoMsg({ ok: true, text: 'Profile photo removed.' });
      void logActivity(user, 'Removed profile photo');
    } catch (err) {
      setPhotoMsg({ ok: false, text: friendlyError(err) });
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw.current) return setPwMsg({ ok: false, text: 'Enter your current password.' });
    if (pw.next.length < 6) return setPwMsg({ ok: false, text: 'New password must be at least 6 characters.' });
    if (pw.next !== pw.confirm) return setPwMsg({ ok: false, text: 'The new passwords do not match.' });
    if (pw.next === pw.current) return setPwMsg({ ok: false, text: 'Choose a password different from your current one.' });

    setPwBusy(true);
    try {
      await changePassword(pw.current, pw.next);
      setPw({ current: '', next: '', confirm: '' });
      setPwMsg({ ok: true, text: 'Password updated. Use the new password next time you sign in.' });
      void logActivity(user, 'Changed password');
    } catch (err) {
      setPwMsg({ ok: false, text: friendlyError(err) });
    } finally {
      setPwBusy(false);
    }
  };

  const handleTogglePref = async (key: keyof Prefs, val: boolean) => {
    try {
      await saveProfile({ prefs: { ...user.prefs, [key]: val } });
      setPrefMsg({ ok: true, text: 'Notification preference saved.' });
    } catch (err) {
      setPrefMsg({ ok: false, text: friendlyError(err) });
    }
  };

  const allPrefs: { key: keyof Prefs; title: string; text: string; roles: string[] }[] = [
    {
      key: 'notifyToday',
      title: "Today's collections",
      text: "Show reminders for today's collections and overdue items.",
      roles: ['admin', 'driver', 'barangay_head'],
    },
    {
      key: 'notifyUpcoming',
      title: 'Upcoming collections',
      text: 'Show collections scheduled in the next 3 days.',
      roles: ['admin', 'driver', 'barangay_head'],
    },
    {
      key: 'notifyCancelled',
      title: 'Cancelled collections',
      text: 'Show reminders when scheduled collections are cancelled.',
      roles: ['admin', 'driver', 'barangay_head'],
    },
    {
      key: 'notifyConcerns',
      title: 'Resident concerns',
      text: 'Show open concerns that have not yet been resolved.',
      roles: ['barangay_head'],
    },
  ];
  const prefList = allPrefs.filter((p) => p.roles.includes(user.role));

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Identity Card */}
      <aside className="lg:col-span-4 rounded-xl border border-neutral-200 bg-white overflow-hidden dark:border-[#1E2D26] dark:bg-[#121C18]">
        <div className="h-24 bg-gradient-to-r from-[#134E2E] to-[#1D6B42]" />
        <div className="px-6 pb-6 -mt-10 text-center">
          <div className="mx-auto inline-block">
            {user.photo ? (
              <img
                src={user.photo}
                alt={user.name || user.email}
                referrerPolicy="no-referrer"
                className="h-20 w-20 rounded-xl object-cover ring-4 ring-white dark:ring-[#121C18]"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-emerald-700 font-display text-2xl font-semibold text-white ring-4 ring-white dark:ring-[#121C18]">
                {initialsOf(user)}
              </div>
            )}
          </div>
          <h2 className="font-display mt-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {user.name || user.email}
          </h2>
          <div className="mt-1 flex justify-center">
            <RoleTag role={user.role} />
          </div>
          {user.position && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{user.position}</p>}

          <div className="mt-5 grid grid-cols-3 divide-x divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-50/60 py-2.5 dark:divide-[#1E2D26] dark:border-[#1E2D26] dark:bg-[#0E1612]">
            {highlights.map((h) => (
              <button
                key={h.label}
                type="button"
                onClick={() => navigate(h.target)}
                className="px-2 text-center transition-colors hover:text-emerald-700 dark:hover:text-emerald-400"
              >
                <strong className="tabular-nums font-display block text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  {h.value}
                </strong>
                <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">{h.label}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Right Sections */}
      <div className="lg:col-span-8 space-y-6">
        {/* Anchor Navigation */}
        <nav
          aria-label="Profile sections"
          className="flex flex-wrap gap-1.5 rounded-xl border border-neutral-200 bg-white p-2 dark:border-[#1E2D26] dark:bg-[#121C18]"
        >
          {[
            { id: 'personal', label: 'Personal Info', icon: <UserIcon className="h-3.5 w-3.5" /> },
            { id: 'security', label: 'Security', icon: <Lock className="h-3.5 w-3.5" /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell className="h-3.5 w-3.5" /> },
            { id: 'account', label: 'Account Info', icon: <Shield className="h-3.5 w-3.5" /> },
            { id: 'activity', label: 'My Activity', icon: <History className="h-3.5 w-3.5" /> },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => jumpTo(t.id)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        {/* A. Personal Info */}
        <section
          id="personal"
          className="scroll-mt-20 rounded-xl border border-neutral-200 bg-white p-6 dark:border-[#1E2D26] dark:bg-[#121C18]"
        >
          <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Personal Information
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Keep your municipal contact details current.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4 border-b border-neutral-200 pb-5 dark:border-[#1E2D26]">
            {user.photo ? (
              <img
                src={user.photo}
                alt={user.name || user.email}
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-xl object-cover ring-1 ring-neutral-200 dark:ring-[#24362E]"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-700 font-display text-xl font-semibold text-white">
                {initialsOf(user)}
              </div>
            )}
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Profile Picture</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                JPG or PNG under 8 MB. Automatically cropped to a square thumbnail.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-200">
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  {photoBusy ? 'Saving...' : 'Change Photo'}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={photoBusy} hidden />
                </label>
                {user.photo && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={photoBusy}
                    className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                  >
                    Remove
                  </button>
                )}
              </div>
              {photoMsg && (
                <p
                  className={`text-xs font-medium ${
                    photoMsg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {photoMsg.text}
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveInfo} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  maxLength={11}
                  placeholder="09171234567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Email Address (sign-in)
                </label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500 dark:border-[#24362E] dark:bg-[#0B120F] dark:text-neutral-400"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {user.role === 'admin'
                    ? 'Office / Position'
                    : user.role === 'barangay_head'
                    ? 'Barangay Position'
                    : 'Role Title'}
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  placeholder={
                    user.role === 'admin'
                      ? 'e.g. Municipal Environment Officer'
                      : user.role === 'barangay_head'
                      ? 'e.g. Barangay Captain'
                      : 'e.g. Collection Driver'
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
                />
              </div>
            </div>

            {user.role === 'driver' && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Vehicle Plate Number
                </label>
                <input
                  type="text"
                  maxLength={30}
                  placeholder="e.g. ABC 1234"
                  value={form.vehicle}
                  onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm uppercase dark:border-[#24362E] dark:bg-[#0E1713]"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Address
              </label>
              <input
                type="text"
                maxLength={160}
                placeholder="Street / Purok, Barangay"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                About Me
              </label>
              <textarea
                rows={3}
                maxLength={300}
                placeholder="A short note about your operational responsibilities"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
              />
              <p className="tabular-nums mt-1 text-right text-[11px] text-neutral-400">{form.bio.length}/300</p>
            </div>

            {infoMsg && (
              <p
                className={`text-xs font-medium ${
                  infoMsg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {infoMsg.text}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                disabled={!dirty || infoBusy}
                className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-200"
              >
                Discard Changes
              </button>
              <button
                type="submit"
                disabled={!dirty || infoBusy}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
              >
                {infoBusy ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </section>

        {/* B. Security */}
        <section
          id="security"
          className="scroll-mt-20 rounded-xl border border-neutral-200 bg-white p-6 dark:border-[#1E2D26] dark:bg-[#121C18]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Security &amp; Password
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                Update your sign-in password or end your session.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
            >
              {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>

          <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Current Password
              </label>
              <input
                type={showPw ? 'text' : 'password'}
                value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  New Password
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
                />
                {pw.next && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-[#1B2B23]">
                      <div
                        className={`h-full transition-all ${
                          pwStrength <= 1
                            ? 'bg-rose-500'
                            : pwStrength === 2
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                        }`}
                        style={{ width: `${(pwStrength / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-neutral-500">{pwStrengthLabel}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Confirm New Password
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw.confirm}
                  onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
                />
              </div>
            </div>

            {pwMsg && (
              <p
                className={`text-xs font-medium ${
                  pwMsg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {pwMsg.text}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4 dark:border-[#1E2D26]">
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
              >
                Sign Out of Device
              </button>
              <button
                type="submit"
                disabled={pwBusy}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {pwBusy ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </section>

        {/* C. Notification Preferences */}
        <section
          id="notifications"
          className="scroll-mt-20 rounded-xl border border-neutral-200 bg-white p-6 dark:border-[#1E2D26] dark:bg-[#121C18]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Notification Preferences
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                Choose which reminders appear under your notification bell. Changes save immediately.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('notifications')}
              className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400 whitespace-nowrap"
            >
              View all ({notifications.length})
            </button>
          </div>

          <div className="mt-4 divide-y divide-neutral-100 dark:divide-[#1E2D26]">
            {prefList.map((p) => (
              <label
                key={p.key}
                className="flex items-center justify-between gap-4 py-3.5 cursor-pointer"
              >
                <div>
                  <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">{p.title}</span>
                  <span className="block text-xs text-neutral-500 dark:text-neutral-400">{p.text}</span>
                </div>
                <input
                  type="checkbox"
                  checked={user.prefs[p.key]}
                  onChange={(e) => handleTogglePref(p.key, e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-emerald-700"
                />
              </label>
            ))}
          </div>

          {prefMsg && (
            <p
              className={`mt-2 text-xs font-medium ${
                prefMsg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {prefMsg.text}
            </p>
          )}
        </section>

        {/* D. Account Information */}
        <section
          id="account"
          className="scroll-mt-20 rounded-xl border border-neutral-200 bg-white p-6 dark:border-[#1E2D26] dark:bg-[#121C18]"
        >
          <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Account &amp; System Information
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Assigned by the municipal administrator. Contact an admin if your role or barangay needs updating.
          </p>

          <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border border-neutral-200/80 p-3.5 dark:border-[#1E2D26]">
              <dt className="text-xs text-neutral-500 dark:text-neutral-400">Role</dt>
              <dd className="mt-1 font-medium text-neutral-900 dark:text-neutral-100">{roleLabel(user.role)}</dd>
            </div>
            <div className="rounded-lg border border-neutral-200/80 p-3.5 dark:border-[#1E2D26]">
              <dt className="text-xs text-neutral-500 dark:text-neutral-400">Account Status</dt>
              <dd className="mt-1 font-semibold text-emerald-700 dark:text-emerald-400">Active</dd>
            </div>
            {user.role === 'driver' && (
              <div className="rounded-lg border border-neutral-200/80 p-3.5 dark:border-[#1E2D26]">
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Assigned Team</dt>
                <dd className="mt-1 font-medium text-neutral-900 dark:text-neutral-100">
                  {user.team || 'Not assigned yet'}
                </dd>
              </div>
            )}
            {user.role === 'barangay_head' && (
              <>
                <div className="rounded-lg border border-neutral-200/80 p-3.5 dark:border-[#1E2D26]">
                  <dt className="text-xs text-neutral-500 dark:text-neutral-400">Assigned Barangay</dt>
                  <dd className="mt-1 font-medium text-neutral-900 dark:text-neutral-100">{user.barangay}</dd>
                </div>
                <div className="rounded-lg border border-neutral-200/80 p-3.5 dark:border-[#1E2D26]">
                  <dt className="text-xs text-neutral-500 dark:text-neutral-400">SMS Receiving Number</dt>
                  <dd className="mt-1 font-mono text-xs font-medium text-neutral-900 dark:text-neutral-100">
                    {user.smsNumber || 'Not configured'}
                  </dd>
                </div>
                <div className="rounded-lg border border-neutral-200/80 p-3.5 dark:border-[#1E2D26]">
                  <dt className="text-xs text-neutral-500 dark:text-neutral-400">SMS Gateway</dt>
                  <dd
                    className={`mt-1 font-semibold ${
                      user.smsDeviceId ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {user.smsDeviceId ? 'Linked' : 'Not linked'}
                  </dd>
                </div>
              </>
            )}
            {user.createdAt && (
              <div className="rounded-lg border border-neutral-200/80 p-3.5 dark:border-[#1E2D26]">
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Member Since</dt>
                <dd className="tabular-nums mt-1 font-medium text-neutral-900 dark:text-neutral-100">
                  {formatShortDate(user.createdAt)}
                </dd>
              </div>
            )}
            {user.lastSignIn && (
              <div className="rounded-lg border border-neutral-200/80 p-3.5 dark:border-[#1E2D26]">
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Last Sign-In</dt>
                <dd className="tabular-nums mt-1 font-medium text-neutral-900 dark:text-neutral-100">
                  {formatShortDateTime(user.lastSignIn)}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* E. My Recent Activity */}
        <section
          id="activity"
          className="scroll-mt-20 rounded-xl border border-neutral-200 bg-white p-6 dark:border-[#1E2D26] dark:bg-[#121C18]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                My Recent Activity
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                Your latest actions recorded in the system audit trail.
              </p>
            </div>
            <button
              type="button"
              onClick={loadActivity}
              disabled={entriesLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${entriesLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
          </div>

          {entriesError && <p className="mt-3 text-xs text-rose-600 dark:text-rose-400">{entriesError}</p>}

          <div className="mt-4 divide-y divide-neutral-100 dark:divide-[#1E2D26]">
            {entries.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                {entriesLoading ? 'Loading your activity...' : 'No recorded actions yet.'}
              </p>
            ) : (
              entries.map((e, idx) => (
                <div key={e.id ?? idx} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{e.action}</p>
                  {e.detail && <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">{e.detail}</p>}
                  <p className="tabular-nums mt-1 font-mono text-[11px] text-neutral-400 dark:text-neutral-500">
                    {formatShortDateTime(e.time)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
