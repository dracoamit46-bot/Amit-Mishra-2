import React, { useEffect, useState, useCallback } from 'react';
import { AttendanceRecord, WeekOffRequest, Property } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getAttendanceByUser,
  getWeekOffRequestsByUser,
  createWeekOffRequest,
  getPropertyById,
} from '../services/dataService';
import {
  Palmtree,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Building2,
  CalendarDays,
  Sparkles,
  RefreshCw,
  Send,
  XCircle,
  HelpCircle,
} from 'lucide-react';

export default function StaffWeekOffRequest() {
  const { currentUser } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [weekOffRequests, setWeekOffRequests] = useState<WeekOffRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form state
  const [dateInput, setDateInput] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // 1. Load attendance records and user's week-off requests
  const loadData = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const [records, requests, prop] = await Promise.all([
        getAttendanceByUser(currentUser.id),
        getWeekOffRequestsByUser(currentUser.id),
        currentUser.propertyId ? getPropertyById(currentUser.propertyId) : Promise.resolve(null),
      ]);

      setAttendanceRecords(records);
      // Sort requests latest first
      setWeekOffRequests(requests.reverse());
      setProperty(prop);
    } catch (err) {
      console.error('Failed to load week off data', err);
      setNotification({
        type: 'error',
        message: 'Could not load your week-off balance or request history.',
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Balance calculations:
  // Each staff member is entitled to 4 week-offs per calendar month.
  const today = new Date();
  const currentYearMonth = today.toISOString().slice(0, 7); // e.g. "2026-08"
  const currentMonthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  // 1. Used this month: count attendance records with status === 'week_off' in current month
  const usedThisMonth = attendanceRecords.filter(
    (r) => r.date.startsWith(currentYearMonth) && r.status === 'week_off'
  ).length;

  const remainingThisMonth = Math.max(0, 4 - usedThisMonth);

  // 2. Carried forward balance from prior months in mock data:
  // Group prior attendance records by month (excluding current month)
  const priorMonthsSet = new Set<string>();
  attendanceRecords.forEach((r) => {
    const ym = r.date.slice(0, 7);
    if (ym < currentYearMonth) {
      priorMonthsSet.add(ym);
    }
  });

  let carriedForwardBalance = 0;
  priorMonthsSet.forEach((ym) => {
    const usedInMonth = attendanceRecords.filter(
      (r) => r.date.startsWith(ym) && r.status === 'week_off'
    ).length;
    const unusedInMonth = Math.max(0, 4 - usedInMonth);
    carriedForwardBalance += unusedInMonth;
  });

  // Total available week-offs
  const totalAvailableBalance = remainingThisMonth + carriedForwardBalance;

  // Add date to selection
  const handleAddDate = () => {
    if (!dateInput) return;
    if (selectedDates.includes(dateInput)) {
      setNotification({
        type: 'error',
        message: `${dateInput} is already added to your request.`,
      });
      return;
    }
    const updated = [...selectedDates, dateInput].sort();
    setSelectedDates(updated);
    setNotification(null);
  };

  // Remove date from selection
  const handleRemoveDate = (dateToRemove: string) => {
    setSelectedDates((prev) => prev.filter((d) => d !== dateToRemove));
  };

  // Quick preset: Add consecutive days
  const handleAddNextNDays = (daysCount: number) => {
    const baseDate = dateInput ? new Date(dateInput) : new Date();
    const newDates: string[] = [];
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const str = d.toISOString().split('T')[0];
      if (!selectedDates.includes(str) && !newDates.includes(str)) {
        newDates.push(str);
      }
    }
    const merged = Array.from(new Set([...selectedDates, ...newDates])).sort();
    setSelectedDates(merged);
    setNotification(null);
  };

  // Submit request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (selectedDates.length === 0) {
      setNotification({
        type: 'error',
        message: 'Please select at least one date for your week-off request.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const newReq = await createWeekOffRequest({
        userId: currentUser.id,
        requestedDates: selectedDates,
        reason: null,
        status: 'pending',
        reviewedBy: null,
      });

      setWeekOffRequests((prev) => [newReq, ...prev]);
      setSelectedDates([]);
      setNotification({
        type: 'success',
        message: `Successfully submitted week-off request for ${newReq.requestedDates.length} day(s)! Status: Pending Manager Review.`,
      });

      setTimeout(() => {
        setNotification(null);
      }, 5000);
    } catch (err) {
      console.error('Failed to submit week-off request', err);
      setNotification({
        type: 'error',
        message: 'Failed to submit week-off request. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Palmtree className="w-5 h-5 text-sky-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Staff Week-Off Requests
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Request upcoming weekly offs using your monthly quota and carried-forward balance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold">{property?.name || 'Property'}</span>
          </div>
        </div>
      </div>

      {/* Global Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-2.5 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-800/80 text-emerald-200'
              : 'bg-rose-950/80 border border-rose-800/80 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-[11px] opacity-70 hover:opacity-100 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Week-Off Balance Context Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Current Month Usage */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {currentMonthName}
            </span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {usedThisMonth} of 4
            </span>
            <span className="text-xs text-slate-400">used this month</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
            <div
              className="bg-sky-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (usedThisMonth / 4) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 pt-1">
            {remainingThisMonth} of 4 monthly quota remaining
          </p>
        </div>

        {/* Card 2: Carried Forward Balance */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Carried Forward
            </span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-purple-300">
              +{carriedForwardBalance}
            </span>
            <span className="text-xs text-slate-400">from prior months</span>
          </div>
          <p className="text-[11px] text-slate-500 pt-3">
            Accumulated unused week-offs from previous work cycles.
          </p>
        </div>

        {/* Card 3: Total Available Balance */}
        <div className="rounded-2xl bg-slate-900/90 border border-sky-900/50 bg-linear-to-b from-slate-900 to-sky-950/20 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
              Total Available
            </span>
            <Palmtree className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-white">
              {totalAvailableBalance}
            </span>
            <span className="text-xs text-sky-300">Days Ready to Request</span>
          </div>
          <p className="text-[11px] text-slate-400 pt-1">
            4 monthly quota + carried forward balance
          </p>
        </div>
      </div>

      {/* 2. "Request Week Off" Form */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-base text-white">Submit a Week-Off Request</h3>
          </div>
          <span className="text-xs text-slate-500">Single day or bulk dates</span>
        </div>

        <form onSubmit={handleSubmitRequest} className="space-y-4">
          {/* Date Picker Input Row */}
          <div className="space-y-2">
            <label htmlFor="weekoff-date-picker" className="block text-xs font-semibold text-slate-300">
              Select Date(s) to Request
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus-within:border-sky-500">
                <Calendar className="w-4 h-4 text-slate-400 mr-2" />
                <input
                  id="weekoff-date-picker"
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
                />
              </div>

              <button
                type="button"
                id="btn-add-date"
                onClick={handleAddDate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 hover:border-slate-600 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                Add Date
              </button>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                <span className="text-[11px] text-slate-500 hidden sm:inline">Quick Add:</span>
                <button
                  type="button"
                  onClick={() => handleAddNextNDays(2)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
                >
                  +2 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleAddNextNDays(3)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
                >
                  +3 Days
                </button>
              </div>
            </div>
          </div>

          {/* Selected Dates Chips List */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>Selected Dates in this Request ({selectedDates.length}):</span>
              {selectedDates.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDates([])}
                  className="text-[11px] text-slate-500 hover:text-rose-400 cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            {selectedDates.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 border-dashed text-xs text-slate-500 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-slate-600" />
                <span>No dates selected yet. Pick a date above and click &quot;Add Date&quot;.</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                {selectedDates.map((dateStr) => (
                  <span
                    key={dateStr}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/80 border border-sky-800 text-sky-200 text-xs font-mono font-semibold"
                  >
                    <Calendar className="w-3 h-3 text-sky-400" />
                    {dateStr}
                    <button
                      type="button"
                      onClick={() => handleRemoveDate(dateStr)}
                      className="ml-1 text-sky-400 hover:text-rose-400 transition cursor-pointer"
                      title="Remove date"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              id="submit-weekoff-request-btn"
              disabled={submitting || selectedDates.length === 0}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-sky-600/20 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting
                ? 'Submitting...'
                : `Submit Request (${selectedDates.length} ${
                    selectedDates.length === 1 ? 'day' : 'days'
                  })`}
            </button>
          </div>
        </form>
      </div>

      {/* 3. User's Own WeekOffRequests History List */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="font-bold text-base text-white">Your Week-Off Requests</h3>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            title="Refresh history"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading request history...</span>
          </div>
        ) : weekOffRequests.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-500 space-y-1">
            <Palmtree className="w-6 h-6 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-400">No week-off requests submitted yet.</p>
            <p>Use the form above to submit your first request.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {weekOffRequests.map((req) => (
              <div
                key={req.id}
                id={`request-item-${req.id}`}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Requested Dates details */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      Requested {req.requestedDates.length}{' '}
                      {req.requestedDates.length === 1 ? 'Day' : 'Days'}:
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {req.requestedDates.map((d) => (
                      <span
                        key={d}
                        className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300"
                      >
                        {d}
                      </span>
                    ))}
                  </div>

                  {req.reason && (
                    <p className="text-[11px] text-rose-400/90 font-medium">
                      Note / Reason: {req.reason}
                    </p>
                  )}
                  {req.reviewedBy && (
                    <p className="text-[11px] text-slate-500">
                      Reviewed by: {req.reviewedBy}
                    </p>
                  )}
                </div>

                {/* Status Badge */}
                <div className="self-start sm:self-center shrink-0">
                  {req.status === 'approved' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Approved
                    </span>
                  ) : req.status === 'rejected' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs font-semibold">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      Rejected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/80 border border-amber-800/80 text-amber-300 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Pending Review
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
