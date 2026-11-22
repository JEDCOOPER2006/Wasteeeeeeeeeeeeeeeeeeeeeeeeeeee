import React, { useState } from 'react';
import { CalendarClock, Eye, EyeOff, Lock, Mail, MessageSquareText, Recycle, Truck } from 'lucide-react';
import { useWaste } from '../lib/store';
import { friendlyError } from '../lib/utils';

export const LoginPage: React.FC = () => {
  const { login, theme, toggleTheme } = useWaste();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      setPassword('');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#F6F8F7] dark:bg-[#0B120F]">
      {/* Left: Municipal Civic Photography Panel */}
      <div className="relative hidden lg:flex lg:col-span-7 flex-col justify-between overflow-hidden bg-[#0E2419] p-12 text-white">
        {!imgFailed ? (
          <img
            src="/src/assets/images/Villanueva_New_Covered_Court.jpg"
            alt="Municipality of Villanueva coastal boulevard and municipal hall"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F2A1D] via-[#173D2B] to-[#091811]" />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#08150F]/92 via-[#0A1F16]/55 to-[#08150F]/35"
          aria-hidden="true"
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600/90 text-white shadow-sm ring-1 ring-white/20">
            <Recycle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <span className="font-display block text-lg font-semibold tracking-tight">
              Villanueva Waste Operations
            </span>
            <span className="text-xs text-emerald-100/80">
              Municipality of Villanueva · Misamis Oriental
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-xl space-y-8">
          <div className="space-y-3">
            <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-balance">
              Coordinated collection schedules, route dispatch, and barangay response.
            </h1>
            <p className="text-base leading-relaxed text-emerald-50/85">
              Unified municipal workspace connecting administrators, collection drivers, and barangay heads across Villanueva.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-white/15 pt-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Schedule Control</span>
              </div>
              <p className="text-xs leading-relaxed text-emerald-100/75">
                Assign barangay routes, dispatch teams, and track completion rates.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                <Truck className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Field Dispatch</span>
              </div>
              <p className="text-xs leading-relaxed text-emerald-100/75">
                Live route updates directly from collection teams on shift.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                <MessageSquareText className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>SMS Concern Desk</span>
              </div>
              <p className="text-xs leading-relaxed text-emerald-100/75">
                Automatic resident SMS intake and verified status notifications.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Sign-In Form */}
      <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-12 lg:p-14">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white">
              <Recycle className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Villanueva
            </span>
          </div>
          <div className="ml-auto">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-[#1E2D26] dark:bg-[#121C18] dark:text-neutral-300 dark:hover:bg-[#182620] whitespace-nowrap shrink-0"
            >
              {theme === 'dark' ? 'Light theme' : 'Dark theme'}
            </button>
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm py-10">
          <div className="mb-8 space-y-2">
            <p className="text-xs font-semibold tracking-wider text-emerald-700 dark:text-emerald-400">
              Municipal Staff Portal
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Sign in to Operations
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Enter your registered municipal email and password to access your role workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
              >
                Email address
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@villanueva.gov.ph"
                  autoComplete="username"
                  required
                  className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-10 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 dark:border-[#24362E] dark:bg-[#121C18] dark:text-neutral-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-10 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 dark:border-[#24362E] dark:bg-[#121C18] dark:text-neutral-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
            >
              {busy ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-500 dark:text-neutral-500">
          Authorized municipal personnel only · Villanueva, Misamis Oriental
        </p>
      </div>
    </div>
  );
};
