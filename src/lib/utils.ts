import { AppUser, NavItem, PageId, Role } from './types';

export const ALL_ROLES: Role[] = ['admin', 'driver', 'barangay_head'];

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    subtitle: "Monitor and manage the municipality's waste collection operations.",
    roles: ALL_ROLES,
  },
  {
    id: 'schedules',
    label: 'Collection Schedules',
    subtitle: 'Plan collection activities, assign teams, and manage schedules.',
    roles: ALL_ROLES,
  },
  {
  id: 'personnel',
  label: 'Users',
  subtitle: 'Manage user accounts, roles, barangay assignments, and SMS gateways.',
  roles: ['admin'],
},
  {
    id: 'records',
    label: 'Collection Records',
    subtitle: 'Monitor collection progress and update operational status.',
    roles: ['admin', 'driver'],
  },
  {
    id: 'concerns',
    label: 'Resident Concerns',
    subtitle: 'Review SMS reports and record resident follow-ups.',
    roles: ['barangay_head'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    subtitle: 'Live operational reminders built from active schedules and concerns.',
    roles: ALL_ROLES,
    hidden: true,
  },
  {
    id: 'reports',
    label: 'Reports',
    subtitle: 'Review collection completion summaries by area and export CSV reports.',
    roles: ['admin'],
  },
  {
    id: 'activity',
    label: 'Activity Log',
    subtitle: 'Audit trail of staff actions across schedules, accounts, and records.',
    roles: ['admin'],
  },
  {
    id: 'profile',
    label: 'Profile & Settings',
    subtitle: 'Personal information, security, notification preferences, and account details.',
    roles: ALL_ROLES,
  },
];

export function canAccessPage(role: Role | undefined, page: PageId): boolean {
  if (!role) return false;
  const item = NAV_ITEMS.find((n) => n.id === page);
  return item ? item.roles.includes(role) : false;
}

export function normalizePH(input: string | null | undefined): string {
  const d = String(input ?? '').replace(/\D/g, '');
  if (/^639\d{9}$/.test(d)) return '0' + d.slice(2);
  if (/^09\d{9}$/.test(d)) return d;
  if (/^9\d{9}$/.test(d)) return '0' + d;
  return '';
}

export function todayIso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysUntil(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(y, (m || 1) - 1, d || 1).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86400000);
}

export function time12(t: string): string {
  const [h, m] = (t || '').split(':').map(Number);
  if (Number.isNaN(h)) return t;
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
}

export function roleLabel(role: string): string {
  if (role === 'barangay_head') return 'Barangay Head';
  if (role === 'driver') return 'Driver';
  return 'Administrator';
}

export function initialsOf(u: Pick<AppUser, 'name' | 'email'> | null | undefined): string {
  const src = (u?.name || u?.email || '?').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return src.slice(0, 2).toUpperCase();
}

export function concernRef(id: string): string {
  return '#' + id.slice(-5).toUpperCase();
}

export function formatShortDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatShortDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTimeOnly(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

export function friendlyError(e: unknown): string {
  const err = e as { code?: string; message?: string };
  const code = String(err?.code ?? err?.message ?? '');
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'Incorrect email or password. Verify your credentials or confirm the account exists in Firebase Authentication.';
  if (code.includes('invalid-email')) return 'Please enter a valid email address.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Please wait and try again.';
  if (code.includes('api-key-not-valid') || code.includes('invalid-api-key'))
    return 'Firebase API key is invalid. Check Firebase configuration.';
  if (code.includes('email-already-in-use')) return 'That email already has an account.';
  if (code.includes('weak-password')) return 'Password must be at least 6 characters.';
  if (code.includes('permission-denied'))
    return 'Firestore denied this action. Check your security rules and account role.';
  if (code.includes('ACCOUNT_DISABLED'))
    return 'This account has been deactivated. Contact the administrator.';
  if (code.includes('requires-recent-login')) return 'Please sign in again, then retry.';
  if (code.includes('NO_PROFILE'))
    return 'This account has no valid role. Ask the administrator to set it up.';
  return err?.message ?? 'Something went wrong. Please try again.';
}

export function downloadCsv(filename: string, table: string[][]): void {
  const csv = table
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
