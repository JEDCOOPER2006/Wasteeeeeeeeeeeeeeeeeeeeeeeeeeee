/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Recycle } from 'lucide-react';
import { AppShell } from './components/AppShell';
import { ConcernModal } from './components/ConcernModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ScheduleModal } from './components/ScheduleModal';
import { WasteProvider, useWaste } from './lib/store';
import { ActivityLogPage } from './pages/ActivityLogPage';
import { CollectionRecordsPage } from './pages/CollectionRecordsPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PersonnelPage } from './pages/PersonnelPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReportsPage } from './pages/ReportsPage';
import { ResidentConcernsPage } from './pages/ResidentConcernsPage';
import { SchedulesPage } from './pages/SchedulesPage';

const AppRouter: React.FC = () => {
  const { user, authReady, page } = useWaste();

  if (!authReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#F6F8F7] text-neutral-600 dark:bg-[#0B120F] dark:text-neutral-400">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 text-white">
          <Recycle className="h-6 w-6 animate-spin" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium">Restoring municipal session...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <AppShell>
      {page === 'dashboard' && <DashboardPage />}
      {page === 'schedules' && <SchedulesPage />}
      {page === 'personnel' && <PersonnelPage />}
      {page === 'records' && <CollectionRecordsPage />}
      {page === 'concerns' && <ResidentConcernsPage />}
      {page === 'notifications' && <NotificationsPage />}
      {page === 'reports' && <ReportsPage />}
      {page === 'activity' && <ActivityLogPage />}
      {page === 'profile' && <ProfilePage />}

      <ScheduleModal />
      <ConcernModal />
      <ConfirmModal />
    </AppShell>
  );
};

export default function App() {
  return (
    <WasteProvider>
      <AppRouter />
    </WasteProvider>
  );
}
