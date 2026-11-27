
export type Role = 'admin' | 'driver' | 'barangay_head';

// Fixed team options used throughout the system
export const TEAM_OPTIONS = [
  'Team Alpha',
  'Team Bravo',
  'Team Charlie',
] as const;

export type Team = (typeof TEAM_OPTIONS)[number];

export interface Prefs {
  notifyToday: boolean;
  notifyUpcoming: boolean;
  notifyCancelled: boolean;
  notifyConcerns: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  notifyToday: true,
  notifyUpcoming: true,
  notifyCancelled: true,
  notifyConcerns: true,
};

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: Role;
  barangay: string;
  phone: string;
  address: string;
  bio: string;
  position: string;
  vehicle: string;
  team: string;
  smsNumber: string;
  smsDeviceId: string;
  photo: string;
  active: boolean;
  createdAt: string;
  lastSignIn: string;
  prefs: Prefs;
}

export type SelfEditable = Partial<
  Pick<AppUser, 'name' | 'phone' | 'address' | 'bio' | 'position' | 'vehicle' | 'photo' | 'email' | 'prefs'>
>;

export type AdminEditable = Partial<
  Pick<AppUser, 'name' | 'role' | 'barangay' | 'team' | 'active' | 'position' | 'phone' | 'smsNumber' | 'smsDeviceId'>
>;

export type Status = 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';

export interface Schedule {
  id: string;
  area: string;
  date: string;
  time: string;
  team: string;
  status: Status;
}

export type ConcernStatus = 'Pending' | 'In Review' | 'Resolved';

export interface Concern {
  id: string;
  resident: string;
  area: string;
  subject: string;
  details: string;
  status: ConcernStatus;
  createdBy: string;
  createdAt: string;
  source?: 'sms' | 'manual';
  senderPhone?: string;
  verified?: boolean;
  receivedAt?: string;
  ackStatus?: string;
  gatewayDeviceId?: string;
}

export interface SmsDevice {
  id: string;
  deviceId: string;
  lastSeen: string;
  count: number;
}

export interface ActivityEntry {
  id?: string;
  user: string;
  name: string;
  role: string;
  action: string;
  detail: string;
  time: string;
}

export interface AppNotification {
  id: string;
  at: string;
  kind: 'today' | 'upcoming' | 'cancelled' | 'concern';
  title: string;
  message: string;
  date: string;
  link: string;
}

export type PageId =
  | 'dashboard'
  | 'schedules'
  | 'personnel'
  | 'records'
  | 'concerns'
  | 'notifications'
  | 'reports'
  | 'activity'
  | 'profile';

export interface NavItem {
  id: PageId;
  label: string;
  subtitle: string;
  roles: Role[];
  hidden?: boolean;
}
