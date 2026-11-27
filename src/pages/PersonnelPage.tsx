
import React, { useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, Smartphone, UserCog, X } from 'lucide-react';
import { RoleTag } from '../components/StatusBadge';
import { createStaffAccount, logActivity, updateStaffUser } from '../lib/auth';
import { useWaste } from '../lib/store';
import { AppUser, Role } from '../lib/types';
import {
  formatShortDate,
  formatShortDateTime,
  friendlyError,
  initialsOf,
  normalizePH,
  roleLabel,
} from '../lib/utils';

type RoleFilter = 'all' | Role;

const TEAM_OPTIONS = ['Team Alpha', 'Team Bravo', 'Team Charlie'];

export const PersonnelPage: React.FC = () => {
  const { user, users, smsDevices, reloadUsers, forgetSmsDevice, requestConfirm } = useWaste();

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Add account panel
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'driver' as Role,
    barangay: '',
    team: '',
    phone: '',
    smsNumber: '',
    smsDeviceId: '',
  });
  const [addBusy, setAddBusy] = useState(false);
  const [addMsg, setAddMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Edit account modal
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'driver' as Role,
    barangay: '',
    team: '',
    phone: '',
    smsNumber: '',
    smsDeviceId: '',
    active: true,
  });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');

  const shown = useMemo(() => {
    const q = query.toLowerCase().trim();

    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;

      return [u.name, u.email, u.barangay, u.team, u.role].some((v) =>
        String(v).toLowerCase().includes(q)
      );
    });
  }, [users, query, roleFilter]);

  const isMe = (u: AppUser) => u.uid === user?.uid;

  const validateSmsFields = (
    f: { phone: string; smsNumber: string; smsDeviceId: string; barangay: string },
    selfUid: string
  ): string => {
    if (!f.barangay.trim()) return 'A Barangay Head must be assigned to a barangay.';
    if (f.phone.trim() && !normalizePH(f.phone))
      return 'Official cellphone must look like 09171234567.';
    if (f.smsNumber.trim() && !normalizePH(f.smsNumber))
      return 'SMS receiving number must look like 09171234567.';

    const others = users.filter(
      (x) => x.uid !== selfUid && x.role === 'barangay_head' && x.active
    );

    const dev = f.smsDeviceId.trim();

    if (dev && others.some((x) => x.smsDeviceId === dev))
      return 'That gateway phone is already linked to another Barangay Head.';

    const num = normalizePH(f.smsNumber);

    if (num && others.some((x) => x.smsNumber === num))
      return 'That SMS receiving number is already used by another Barangay Head.';

    return '';
  };

  const openEdit = (u: AppUser) => {
    setEditing(u);
    setEditForm({
      name: u.name,
      role: u.role,
      barangay: u.barangay,
      team: u.team,
      phone: u.phone,
      smsNumber: u.smsNumber,
      smsDeviceId: u.smsDeviceId,
      active: u.active,
    });
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editing || !user) return;

    if (editForm.name.trim().length < 2) {
      setEditError('Please enter the full name.');
      return;
    }

    if (editForm.role === 'driver' && !TEAM_OPTIONS.includes(editForm.team)) {
      setEditError('Please select an assigned team.');
      return;
    }

    if (editForm.role === 'barangay_head') {
      const err = validateSmsFields(editForm, editing.uid);

      if (err) {
        setEditError(err);
        return;
      }
    }

    setEditBusy(true);
    setEditError('');

    try {
      const patch: Record<string, unknown> = {
        name: editForm.name.trim(),
        barangay: editForm.role === 'barangay_head' ? editForm.barangay.trim() : '',
        team: editForm.role === 'driver' ? editForm.team : '',
      };

      if (editForm.role === 'barangay_head') {
        patch['phone'] = normalizePH(editForm.phone);
        patch['smsNumber'] = normalizePH(editForm.smsNumber);
        patch['smsDeviceId'] = editForm.smsDeviceId.trim();
      }

      if (!isMe(editing)) {
        patch['role'] = editForm.role;
        patch['active'] = editForm.active;
      }

      await updateStaffUser(user, editing.uid, patch);

      void logActivity(
        user,
        'Updated an account',
        `${editForm.name.trim()} (${roleLabel(editForm.role)})`
      );

      if (editForm.role === 'barangay_head' && editForm.smsDeviceId.trim()) {
        await forgetSmsDevice(editForm.smsDeviceId.trim());
      }

      setEditing(null);
      await reloadUsers();

      setMessage({
        ok: true,
        text: `Saved changes for ${editForm.name.trim()}.`,
      });
    } catch (err) {
      setEditError(friendlyError(err));
    } finally {
      setEditBusy(false);
    }
  };

  const handleToggleActive = (u: AppUser) => {
    if (isMe(u) || !user) return;

    const next = !u.active;

    requestConfirm({
      title: `${next ? 'Reactivate' : 'Deactivate'} Staff Account`,
      message: `${next ? 'Reactivate' : 'Deactivate'} the account for ${u.name || u.email}? ${
        next
          ? 'They will regain access to the system.'
          : 'Deactivated users cannot sign in.'
      }`,
      confirmLabel: next ? 'Reactivate' : 'Deactivate',
      danger: !next,

      onConfirm: async () => {
        try {
          await updateStaffUser(user, u.uid, { active: next });

          void logActivity(
            user,
            next ? 'Reactivated an account' : 'Deactivated an account',
            u.name || u.email
          );

          await reloadUsers();

          setMessage({
            ok: true,
            text: `${u.name || u.email} is now ${next ? 'active' : 'deactivated'}.`,
          });
        } catch (err) {
          setMessage({
            ok: false,
            text: friendlyError(err),
          });
        }
      },
    });
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    setAddMsg(null);

    if (addForm.name.trim().length < 2) {
      setAddMsg({ ok: false, text: 'Please enter the full name.' });
      return;
    }

    if (addForm.role === 'driver' && !TEAM_OPTIONS.includes(addForm.team)) {
      setAddMsg({ ok: false, text: 'Please select an assigned team.' });
      return;
    }

    if (addForm.role === 'barangay_head') {
      const err = validateSmsFields(addForm, '');

      if (err) {
        setAddMsg({ ok: false, text: err });
        return;
      }
    }

    setAddBusy(true);

    try {
      await createStaffAccount(user, {
        ...addForm,
        team: addForm.role === 'driver' ? addForm.team : '',
        phone: normalizePH(addForm.phone),
        smsNumber: normalizePH(addForm.smsNumber),
      });

      if (addForm.role === 'barangay_head' && addForm.smsDeviceId.trim()) {
        await forgetSmsDevice(addForm.smsDeviceId.trim());
      }

      const createdEmail = addForm.email.trim();
      const createdName = addForm.name.trim();
      const createdRole = addForm.role;

      void logActivity(
        user,
        'Created an account',
        `${createdName} (${roleLabel(createdRole)})`
      );

      setAddForm({
        name: '',
        email: '',
        password: '',
        role: 'driver',
        barangay: '',
        team: '',
        phone: '',
        smsNumber: '',
        smsDeviceId: '',
      });

      setAddMsg({
        ok: true,
        text: `Account created for ${createdEmail}.`,
      });

      await reloadUsers();
    } catch (err) {
      setAddMsg({
        ok: false,
        text: friendlyError(err),
      });
    } finally {
      setAddBusy(false);
    }
  };

  const filters: { id: RoleFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'admin', label: 'Admins' },
    { id: 'driver', label: 'Waste Collectors' },
    { id: 'barangay_head', label: 'Barangay Heads' },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white dark:border-[#1E2D26] dark:bg-[#121C18]">
        <div className="flex flex-col gap-4 border-b border-neutral-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E2D26]">
          <div>
            <h2 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Staff Accounts
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Manage municipal personnel, assign waste collector teams, and link barangay SMS gateways.
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
                placeholder="Search name, email, team..."
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 sm:w-56 dark:border-[#24362E] dark:bg-[#0E1713] dark:text-neutral-100"
              />
            </div>

            <button
              type="button"
              onClick={reloadUsers}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-200"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAdd((v) => !v);
                setAddMsg(null);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              {showAdd ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showAdd ? 'Close Form' : 'Add Account'}
            </button>
          </div>
        </div>

        <div className="border-b border-neutral-200 px-5 py-3 dark:border-[#1E2D26]">
          <div className="inline-flex flex-wrap gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-[#0E1612]">
            {filters.map((f) => {
              const count = users.filter(
                (u) => f.id === 'all' || u.role === f.id
              ).length;

              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setRoleFilter(f.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    roleFilter === f.id
                      ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#1C2C25] dark:text-neutral-100'
                      : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className="tabular-nums text-[11px] opacity-70">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {message && (
          <div
            className={`mx-5 mt-4 rounded-lg border px-3.5 py-2.5 text-xs font-medium ${
              message.ok
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
                : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-semibold tracking-wide text-neutral-500 uppercase dark:border-[#1E2D26] dark:bg-[#0E1612] dark:text-neutral-400">
                <th className="px-5 py-3">Person</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Assignment</th>
                <th className="px-5 py-3">Mobile</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100 dark:divide-[#1E2D26]">
              {shown.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400"
                  >
                    No staff accounts found.
                  </td>
                </tr>
              ) : (
                shown.map((u) => (
                  <tr
                    key={u.uid}
                    className={`hover:bg-neutral-50/80 dark:hover:bg-white/[0.02] ${
                      !u.active ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {u.photo ? (
                          <img
                            src={u.photo}
                            alt={u.name || u.email}
                            referrerPolicy="no-referrer"
                            className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-neutral-200 dark:ring-[#24362E]"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-700/15 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {initialsOf(u)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {u.name || '(no name)'}

                            {isMe(u) && (
                              <span className="ml-2 text-xs font-normal text-emerald-700 dark:text-emerald-400">
                                (you)
                              </span>
                            )}
                          </p>

                          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                            {u.email || 'Email not recorded'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <RoleTag role={u.role} />
                    </td>

                    <td className="px-5 py-3.5 text-xs text-neutral-700 dark:text-neutral-300">
                      {u.role === 'barangay_head' && (
                        <div>
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">
                            {u.barangay}
                          </span>

                          <p className="mt-0.5 tabular-nums text-[11px] text-neutral-500 dark:text-neutral-400">
                            SMS {u.smsNumber || 'not set'} ·{' '}
                            <span
                              className={
                                u.smsDeviceId
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-amber-700 dark:text-amber-400'
                              }
                            >
                              {u.smsDeviceId
                                ? 'Gateway linked'
                                : 'Gateway unlinked'}
                            </span>
                          </p>
                        </div>
                      )}

                      {u.role === 'driver' &&
                        (u.team || 'No team assigned')}

                      {u.role === 'admin' && 'Municipal Office'}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-xs text-neutral-600 tabular-nums dark:text-neutral-300">
                      {u.phone || '—'}
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs font-semibold ${
                          u.active
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {u.active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-200"
                        >
                          <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
                          Manage
                        </button>

                        {!isMe(u) && (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(u)}
                            className="whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-200"
                          >
                            {u.active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Unrouted SMS Gateways */}
      {smsDevices.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <Smartphone
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400"
              aria-hidden="true"
            />

            <div className="flex-1">
              <h3 className="font-display text-sm font-semibold text-amber-900 dark:text-amber-200">
                Gateway phones awaiting assignment
              </h3>

              <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
                These devices forwarded SMS traffic without a linked Barangay Head.
                Open Manage on the corresponding Barangay Head and select the device ID.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {smsDevices.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-3.5 py-2.5 dark:border-[#24362E] dark:bg-[#121C18]"
                  >
                    <code className="font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {d.deviceId}
                    </code>

                    <span className="tabular-nums text-[11px] text-neutral-500 dark:text-neutral-400">
                      {formatShortDateTime(d.lastSeen)} · {d.count} msg
                      {d.count === 1 ? '' : 's'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Create Staff Account Panel */}
      {showAdd && (
        <section className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-[#1E2D26] dark:bg-[#121C18]">
          <div className="border-b border-neutral-200 pb-4 dark:border-[#1E2D26]">
            <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Create Staff Account
            </h3>

            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Provision a new Firebase Auth account and role profile without signing out of your admin session.
            </p>
          </div>

          <form
            onSubmit={handleCreateStaff}
            className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Full Name *
              </label>

              <input
                type="text"
                required
                value={addForm.name}
                onChange={(e) =>
                  setAddForm({ ...addForm, name: e.target.value })
                }
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Email Address *
              </label>

              <input
                type="email"
                required
                value={addForm.email}
                onChange={(e) =>
                  setAddForm({ ...addForm, email: e.target.value })
                }
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Temporary Password (min 6 chars) *
              </label>

              <input
                type="password"
                required
                minLength={6}
                value={addForm.password}
                onChange={(e) =>
                  setAddForm({ ...addForm, password: e.target.value })
                }
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Role *
              </label>

              <select
                value={addForm.role}
                onChange={(e) =>
                  setAddForm({ ...addForm, role: e.target.value as Role, team: '' })
                }
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
              >
                <option value="driver">Waste Collector</option>
                <option value="barangay_head">Barangay Head</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {addForm.role === 'driver' && (
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Assigned Team *
                </label>

                <select
                  required
                  value={addForm.team}
                  onChange={(e) =>
                    setAddForm({ ...addForm, team: e.target.value })
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
                >
                  <option value="">Select a team</option>

                  {TEAM_OPTIONS.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {addForm.role === 'barangay_head' && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Barangay *
                  </label>

                  <input
                    type="text"
                    required
                    value={addForm.barangay}
                    onChange={(e) =>
                      setAddForm({ ...addForm, barangay: e.target.value })
                    }
                    placeholder="e.g. Poblacion"
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Official Cellphone
                  </label>

                  <input
                    type="tel"
                    value={addForm.phone}
                    onChange={(e) =>
                      setAddForm({ ...addForm, phone: e.target.value })
                    }
                    placeholder="09171234567"
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    SMS Receiving Number
                  </label>

                  <input
                    type="tel"
                    value={addForm.smsNumber}
                    onChange={(e) =>
                      setAddForm({ ...addForm, smsNumber: e.target.value })
                    }
                    placeholder="09171234567"
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    SMS Gateway Device ID
                  </label>

                  <input
                    type="text"
                    value={addForm.smsDeviceId}
                    onChange={(e) =>
                      setAddForm({ ...addForm, smsDeviceId: e.target.value })
                    }
                    placeholder="Optional — link now or later"
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
                  />

                  {smsDevices.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {smsDevices.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() =>
                            setAddForm({ ...addForm, smsDeviceId: d.deviceId })
                          }
                          className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-[11px] text-neutral-700 hover:bg-neutral-100 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-300"
                        >
                          {d.deviceId}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {addMsg && (
              <p
                className={`text-xs font-medium sm:col-span-2 ${
                  addMsg.ok
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {addMsg.text}
              </p>
            )}

            <div className="flex justify-end pt-2 sm:col-span-2">
              <button
                type="submit"
                disabled={addBusy}
                className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {addBusy ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Manage Account Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setEditing(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-[#1E2D26] dark:bg-[#121C18]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4 dark:border-[#1E2D26]">
              <div>
                <h2 className="font-display text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Manage Account
                </h2>

                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {editing.email || 'Email not recorded'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {(editing.phone ||
              editing.position ||
              editing.vehicle ||
              editing.address ||
              editing.createdAt) && (
              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-neutral-50 p-3.5 text-xs dark:bg-[#0E1612]">
                {editing.phone && (
                  <div>
                    <dt className="text-neutral-500">Mobile</dt>
                    <dd className="mt-0.5 font-mono font-medium text-neutral-900 dark:text-neutral-100">
                      {editing.phone}
                    </dd>
                  </div>
                )}

                {editing.position && (
                  <div>
                    <dt className="text-neutral-500">Position</dt>
                    <dd className="mt-0.5 font-medium text-neutral-900 dark:text-neutral-100">
                      {editing.position}
                    </dd>
                  </div>
                )}

                {editing.vehicle && (
                  <div>
                    <dt className="text-neutral-500">Vehicle</dt>
                    <dd className="mt-0.5 font-mono font-medium text-neutral-900 dark:text-neutral-100">
                      {editing.vehicle}
                    </dd>
                  </div>
                )}

                {editing.createdAt && (
                  <div>
                    <dt className="text-neutral-500">Member since</dt>
                    <dd className="mt-0.5 font-medium text-neutral-900 dark:text-neutral-100">
                      {formatShortDate(editing.createdAt)}
                    </dd>
                  </div>
                )}
              </dl>
            )}

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Full Name *
                </label>

                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Role
                </label>

                <select
                  value={editForm.role}
                  disabled={isMe(editing)}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      role: e.target.value as Role,
                      team: '',
                    })
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-[#24362E] dark:bg-[#0E1713]"
                >
                  <option value="driver">Waste Collector</option>
                  <option value="barangay_head">Barangay Head</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {editForm.role === 'driver' && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Assigned Team *
                  </label>

                  <select
                    required
                    value={editForm.team}
                    onChange={(e) =>
                      setEditForm({ ...editForm, team: e.target.value })
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
                  >
                    <option value="">Select a team</option>

                    {TEAM_OPTIONS.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editForm.role === 'barangay_head' && (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Barangay *
                    </label>

                    <input
                      type="text"
                      required
                      value={editForm.barangay}
                      onChange={(e) =>
                        setEditForm({ ...editForm, barangay: e.target.value })
                      }
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Official Cellphone
                      </label>

                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm({ ...editForm, phone: e.target.value })
                        }
                        placeholder="09171234567"
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        SMS Receiving Number
                      </label>

                      <input
                        type="tel"
                        value={editForm.smsNumber}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            smsNumber: e.target.value,
                          })
                        }
                        placeholder="09171234567"
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      SMS Gateway Device ID
                    </label>

                    <input
                      type="text"
                      value={editForm.smsDeviceId}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          smsDeviceId: e.target.value,
                        })
                      }
                      placeholder="Paste device ID or pick below"
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm dark:border-[#24362E] dark:bg-[#0E1713]"
                    />

                    {smsDevices.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {smsDevices.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() =>
                              setEditForm({
                                ...editForm,
                                smsDeviceId: d.deviceId,
                              })
                            }
                            className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-[11px] text-neutral-700 hover:bg-neutral-100 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-300"
                          >
                            {d.deviceId}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {!isMe(editing) ? (
                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-neutral-200 px-3.5 py-2.5 dark:border-[#24362E]">
                  <div>
                    <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      Account Active
                    </span>

                    <span className="block text-xs text-neutral-500">
                      Deactivated users cannot sign in.
                    </span>
                  </div>

                  <input
                    type="checkbox"
                    checked={editForm.active}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        active: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-neutral-300 text-emerald-700"
                  />
                </label>
              ) : (
                <p className="text-xs text-neutral-500">
                  This is your own account, so its role and active status cannot be altered here.
                </p>
              )}

              {editError && (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                  {editError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-4 dark:border-[#1E2D26]">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-300"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={editBusy}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {editBusy ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
