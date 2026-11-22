import { deleteApp, initializeApp } from 'firebase/app';
import {
  EmailAuthProvider,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from './firebase';
import { ActivityEntry, AdminEditable, AppUser, Prefs, Role, SelfEditable } from './types';

const ROLES: Role[] = ['admin', 'driver', 'barangay_head'];
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function toIso(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  const t = v as { toDate?: () => Date };
  return typeof t.toDate === 'function' ? t.toDate().toISOString() : '';
}

function readPrefs(v: unknown): Prefs {
  const p = (v && typeof v === 'object' ? v : {}) as Partial<Prefs>;
  return {
    notifyToday: p.notifyToday !== false,
    notifyUpcoming: p.notifyUpcoming !== false,
    notifyCancelled: p.notifyCancelled !== false,
    notifyConcerns: p.notifyConcerns !== false,
  };
}

function toAppUser(uid: string, d: Record<string, unknown>, email: string, lastSignIn: string): AppUser | null {
  const role = d['role'] as Role;
  if (!ROLES.includes(role)) return null;
  const barangay = str(d['barangay']);
  if (role === 'barangay_head' && !barangay) return null;
  return {
    uid,
    email: email || str(d['email']),
    name: str(d['name']),
    role,
    barangay,
    phone: str(d['phone']),
    address: str(d['address']),
    bio: str(d['bio']),
    position: str(d['position']),
    vehicle: str(d['vehicle']),
    team: str(d['team']),
    smsNumber: str(d['smsNumber']),
    smsDeviceId: str(d['smsDeviceId']),
    photo: str(d['photo']),
    active: d['active'] !== false,
    createdAt: toIso(d['createdAt']),
    lastSignIn,
    prefs: readPrefs(d['prefs']),
  };
}

export async function loadProfile(user: User): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) return null;
  const t = user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime) : null;
  const lastSignIn = t && !Number.isNaN(t.getTime()) ? t.toISOString() : '';
  return toAppUser(user.uid, snap.data() as Record<string, unknown>, user.email ?? '', lastSignIn);
}

export async function loginWithEmail(email: string, password: string): Promise<AppUser> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  const profile = await loadProfile(cred.user);
  if (!profile) {
    await signOut(auth);
    throw new Error('NO_PROFILE');
  }
  if (!profile.active) {
    await signOut(auth);
    throw new Error('ACCOUNT_DISABLED');
  }
  return profile;
}

export function watchAuth(callback: (u: AppUser | null) => void): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return callback(null);
    try {
      const p = await loadProfile(user);
      if (p && !p.active) {
        await signOut(auth);
        return callback(null);
      }
      callback(p);
    } catch {
      callback(null);
    }
  });
}

export function logoutAuth(): Promise<void> {
  return signOut(auth);
}

export async function saveOwnProfile(uid: string, patch: SelfEditable): Promise<AppUser> {
  await updateDoc(doc(db, 'users', uid), { ...patch });
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');
  const fresh = await loadProfile(user);
  if (!fresh) throw new Error('NO_PROFILE');
  return fresh;
}

export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Not signed in.');
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function listAllUsers(): Promise<AppUser[]> {
  const snap = await getDocs(collection(db, 'users'));
  const out: AppUser[] = [];
  snap.forEach((d) => {
    const u = toAppUser(d.id, d.data() as Record<string, unknown>, '', '');
    if (u) out.push(u);
  });
  return out.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
}

export async function updateStaffUser(current: AppUser | null, uid: string, patch: AdminEditable): Promise<void> {
  if (current?.role !== 'admin') throw new Error('Only the administrator can change accounts.');
  if (uid === current.uid && (patch.role !== undefined || patch.active !== undefined)) {
    throw new Error('You cannot change your own role or deactivate your own account.');
  }
  if (patch.role === 'barangay_head' && !(patch.barangay ?? '').trim()) {
    throw new Error('A Barangay Head must be assigned to a barangay.');
  }
  await updateDoc(doc(db, 'users', uid), { ...patch });
}

export async function createStaffAccount(
  current: AppUser | null,
  input: {
    email: string;
    password: string;
    name: string;
    role: Role;
    barangay: string;
    team?: string;
    phone?: string;
    smsNumber?: string;
    smsDeviceId?: string;
  }
): Promise<void> {
  if (current?.role !== 'admin') throw new Error('Only the administrator can create accounts.');
  if (!ROLES.includes(input.role)) throw new Error('Invalid role.');
  if (input.role === 'barangay_head' && !input.barangay.trim()) {
    throw new Error('A Barangay Head must be assigned to a barangay.');
  }
  if (input.password.length < 6) throw new Error('Password must be at least 6 characters.');
  const temp = initializeApp(firebaseConfig, 'staff-creator-' + Date.now());
  try {
    const cred = await createUserWithEmailAndPassword(getAuth(temp), input.email.trim(), input.password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      name: input.name.trim(),
      email: input.email.trim(),
      role: input.role,
      barangay: input.role === 'barangay_head' ? input.barangay.trim() : '',
      team: input.role === 'driver' ? (input.team ?? '').trim() : '',
      phone: input.phone ?? '',
      smsNumber: input.role === 'barangay_head' ? (input.smsNumber ?? '') : '',
      smsDeviceId: input.role === 'barangay_head' ? (input.smsDeviceId ?? '').trim() : '',
      active: true,
      createdAt: serverTimestamp(),
    });
    await signOut(getAuth(temp));
  } finally {
    await deleteApp(temp);
  }
}

export async function logActivity(user: AppUser | null, action: string, detail = ''): Promise<void> {
  if (!user) return;
  try {
    await addDoc(collection(db, 'audit'), {
      user: user.email,
      name: user.name || user.email,
      role: user.role,
      action,
      detail: detail.slice(0, 200),
      time: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Activity log skipped:', e);
  }
}

function sortDesc(list: ActivityEntry[]): ActivityEntry[] {
  return [...list].sort((a, b) => String(b.time).localeCompare(String(a.time)));
}

export async function fetchMyActivity(email: string, max = 30): Promise<ActivityEntry[]> {
  const snap = await getDocs(query(collection(db, 'audit'), where('user', '==', email), limit(200)));
  return sortDesc(snap.docs.map((d) => ({ ...(d.data() as ActivityEntry), id: d.id }))).slice(0, max);
}

export async function fetchAllActivity(max = 200): Promise<ActivityEntry[]> {
  const snap = await getDocs(query(collection(db, 'audit'), orderBy('time', 'desc'), limit(max)));
  return sortDesc(snap.docs.map((d) => ({ ...(d.data() as ActivityEntry), id: d.id })));
}
