import React from 'react';
import { CheckCircle2, Clock3, Loader2, ShieldAlert, Truck, UserCheck, UserCog, XCircle } from 'lucide-react';
import { ConcernStatus, Role, Status } from '../lib/types';
import { roleLabel } from '../lib/utils';

export const ScheduleStatusTag: React.FC<{ status: Status }> = ({ status }) => {
  switch (status) {
    case 'Completed':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-500/30 whitespace-nowrap shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Completed
        </span>
      );
    case 'In Progress':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-500/30 whitespace-nowrap shrink-0">
          <Loader2 className="h-3.5 w-3.5" aria-hidden="true" />
          In Progress
        </span>
      );
    case 'Cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-500/30 whitespace-nowrap shrink-0">
          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-500/30 whitespace-nowrap shrink-0">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          Scheduled
        </span>
      );
  }
};

export const ConcernStatusTag: React.FC<{ status: ConcernStatus }> = ({ status }) => {
  switch (status) {
    case 'Resolved':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-500/30 whitespace-nowrap shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Resolved
        </span>
      );
    case 'In Review':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-500/30 whitespace-nowrap shrink-0">
          <Loader2 className="h-3.5 w-3.5" aria-hidden="true" />
          In Review
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-500/30 whitespace-nowrap shrink-0">
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
          Pending
        </span>
      );
  }
};

export const RoleTag: React.FC<{ role: Role | string }> = ({ role }) => {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
        <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
        {roleLabel(role)}
      </span>
    );
  }
  if (role === 'driver') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 whitespace-nowrap">
        <Truck className="h-3.5 w-3.5" aria-hidden="true" />
        {roleLabel(role)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
      <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {roleLabel(role)}
    </span>
  );
};
