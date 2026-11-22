import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, MessageSquare, Plus, Search, ShieldAlert } from 'lucide-react';
import { ConcernStatusTag } from '../components/StatusBadge';
import { useWaste } from '../lib/store';
import { Concern, ConcernStatus } from '../lib/types';
import { concernRef, formatShortDate, formatTimeOnly } from '../lib/utils';

type ConcernFilter = 'all' | 'sms' | 'manual' | 'unverified';

export const ResidentConcernsPage: React.FC = () => {
  const {
    user,
    concerns,
    searchText,
    setSearchText,
    openConcernModal,
    changeConcernStatus,
    verifySender,
  } = useWaste();

  const [filter, setFilter] = useState<ConcernFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [vName, setVName] = useState('');
  const [vPurok, setVPurok] = useState('');
  const [vConsent, setVConsent] = useState(false);
  const [vError, setVError] = useState('');
  const [vBusy, setVBusy] = useState(false);

  const isSms = (c: Concern) => c.source === 'sms';
  const isUnverified = (c: Concern) => isSms(c) && c.verified === false;

  const matchesFilter = (c: Concern, f: ConcernFilter) => {
    if (f === 'sms') return isSms(c);
    if (f === 'manual') return !isSms(c);
    if (f === 'unverified') return isUnverified(c);
    return true;
  };

  const shown = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    return concerns.filter((c) => {
      if (!matchesFilter(c, filter)) return false;
      if (!q) return true;
      return [
        c.resident,
        c.area,
        c.subject,
        c.details,
        c.status,
        c.senderPhone ?? '',
        c.source ?? 'manual',
      ].some((v) => String(v).toLowerCase().includes(q));
    });
  }, [concerns, filter, searchText]);

  const toggleExpand = (c: Concern) => {
    if (expandedId === c.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(c.id);
    setVName('');
    setVPurok('');
    setVConsent(false);
    setVError('');
  };

  const handleVerify = async (e: React.FormEvent, c: Concern) => {
    e.preventDefault();
    setVBusy(true);
    const err = await verifySender(c, vName, vPurok, vConsent);
    setVError(err);
    setVBusy(false);
  };

  const ackText = (c: Concern) => {
    switch (c.ackStatus) {
      case 'sent':
        return 'Confirmation SMS sent to the resident.';
      case 'failed':
        return 'Confirmation SMS could not be sent (check Semaphore credits).';
      case 'skipped-rate-limit':
        return 'No confirmation sent: this number texted frequently within the last hour.';
      case 'pending':
        return 'Confirmation SMS is queued...';
      default:
        return '';
    }
  };

  const filterTabs: { id: ConcernFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'sms', label: 'SMS' },
    { id: 'manual', label: 'Manual' },
    { id: 'unverified', label: 'Unverified senders' },
  ];

  return (
    <div className="space-y-4">
      {!user?.smsDeviceId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <strong className="font-semibold">SMS gateway not linked yet.</strong> Ask your administrator to link your
          gateway phone under Personnel so residents can submit concerns via SMS.
        </div>
      )}

      <section className="rounded-xl border border-neutral-200 bg-white dark:border-[#1E2D26] dark:bg-[#121C18]">
        <div className="flex flex-col gap-4 border-b border-neutral-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E2D26]">
          <div>
            <h2 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Barangay {user?.barangay} Concerns
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Texts sent to your barangay&apos;s SMS number appear here in real time. Click any row to inspect details.
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
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search name, number, concern..."
                className="w-full sm:w-60 rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 dark:border-[#24362E] dark:bg-[#0E1713] dark:text-neutral-100"
              />
            </div>
            <button
              type="button"
              onClick={openConcernModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Record Concern
            </button>
          </div>
        </div>

        <div className="border-b border-neutral-200 px-5 py-3 dark:border-[#1E2D26]">
          <div className="inline-flex flex-wrap gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-[#0E1612]">
            {filterTabs.map((tab) => {
              const count = concerns.filter((c) => matchesFilter(c, tab.id)).length;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    filter === tab.id
                      ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#1C2C25] dark:text-neutral-100'
                      : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="tabular-nums text-[11px] opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-semibold tracking-wide text-neutral-500 uppercase dark:border-[#1E2D26] dark:bg-[#0E1612] dark:text-neutral-400">
                <th className="px-5 py-3">Ref</th>
                <th className="px-5 py-3">Resident</th>
                <th className="px-5 py-3">Mobile</th>
                <th className="px-5 py-3">Concern</th>
                <th className="px-5 py-3">Received</th>
                <th className="px-5 py-3">Channel</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-[#1E2D26]">
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    No resident concerns found.
                  </td>
                </tr>
              ) : (
                shown.map((c) => {
                  const isOpen = expandedId === c.id;
                  const receivedIso = c.receivedAt || c.createdAt;
                  return (
                    <React.Fragment key={c.id}>
                      <tr
                        onClick={() => toggleExpand(c)}
                        className="cursor-pointer hover:bg-neutral-50/90 dark:hover:bg-white/[0.02]"
                      >
                        <td className="tabular-nums px-5 py-3.5 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                          <span className="inline-flex items-center gap-1.5">
                            {isOpen ? (
                              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {concernRef(c.id)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">{c.resident}</span>
                          {isSms(c) && (
                            <span
                              className={`mt-0.5 flex items-center gap-1 text-[11px] font-medium ${
                                c.verified
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {c.verified ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Verified sender
                                </>
                              ) : (
                                <>
                                  <ShieldAlert className="h-3 w-3" aria-hidden="true" /> Unverified sender
                                </>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="tabular-nums px-5 py-3.5 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                          {c.senderPhone || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-neutral-800 dark:text-neutral-200">{c.subject}</td>
                        <td className="tabular-nums px-5 py-3.5 text-xs">
                          <span className="block text-neutral-900 dark:text-neutral-100">
                            {formatShortDate(receivedIso)}
                          </span>
                          <span className="block text-neutral-500 dark:text-neutral-400">
                            {formatTimeOnly(receivedIso)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                          {isSms(c) ? (
                            <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400">
                              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> SMS
                            </span>
                          ) : (
                            'Manual'
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <ConcernStatusTag status={c.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <select
                            aria-label={`Update status for ${c.subject}`}
                            value={c.status}
                            onChange={(e) => changeConcernStatus(c, e.target.value as ConcernStatus)}
                            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 dark:border-[#24362E] dark:bg-[#0E1713] dark:text-neutral-200"
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Review">In Review</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="bg-neutral-50/80 dark:bg-[#0E1612]">
                          <td colSpan={8} className="px-6 py-5">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                              <div className={isUnverified(c) ? 'lg:col-span-7' : 'lg:col-span-12'}>
                                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                  {isSms(c) ? 'SMS Message Received' : 'Concern Details'}
                                </p>
                                <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-3.5 text-sm leading-relaxed text-neutral-800 whitespace-pre-wrap dark:border-[#24362E] dark:bg-[#121C18] dark:text-neutral-200">
                                  {c.details || 'No additional details provided.'}
                                </div>
                                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                                  {isSms(c) ? ackText(c) : `Recorded by ${c.createdBy}`}
                                </p>
                              </div>

                              {isUnverified(c) && (
                                <form
                                  onSubmit={(e) => handleVerify(e, c)}
                                  className="lg:col-span-5 space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20"
                                >
                                  <div>
                                    <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                      Verify this sender
                                    </h4>
                                    <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
                                      This number is not in your residents list yet. Confirm who texted before acting.
                                    </p>
                                  </div>
                                  <input
                                    type="text"
                                    value={vName}
                                    onChange={(e) => setVName(e.target.value)}
                                    placeholder="Resident's full name"
                                    maxLength={80}
                                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 dark:border-[#24362E] dark:bg-[#121C18] dark:text-neutral-100"
                                  />
                                  <input
                                    type="text"
                                    value={vPurok}
                                    onChange={(e) => setVPurok(e.target.value)}
                                    placeholder="Purok / zone (needed to register)"
                                    maxLength={40}
                                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 dark:border-[#24362E] dark:bg-[#121C18] dark:text-neutral-100"
                                  />
                                  <label className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={vConsent}
                                      onChange={(e) => setVConsent(e.target.checked)}
                                      className="mt-0.5 rounded border-neutral-300 text-emerald-700"
                                    />
                                    <span>
                                      The resident agreed to receive SMS updates and be saved in the residents list
                                    </span>
                                  </label>
                                  {vError && (
                                    <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{vError}</p>
                                  )}
                                  <button
                                    type="submit"
                                    disabled={vBusy}
                                    className="w-full rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                                  >
                                    {vBusy ? 'Saving...' : 'Confirm Sender'}
                                  </button>
                                </form>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
