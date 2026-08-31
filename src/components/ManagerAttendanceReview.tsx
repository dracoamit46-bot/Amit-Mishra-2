import React, { useEffect, useState, useCallback } from 'react';
import { AttendanceRecord, AttendanceStatus, User, Property, AttendanceCorrectionRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getUsersByProperty,
  getAttendanceByUserAndDate,
  markAttendance,
  getPropertyById,
  getAttendanceCorrectionRequestsByProperty,
  updateAttendanceCorrectionRequestStatus,
} from '../services/dataService';
import {
  Calendar,
  CheckCircle2,
  Clock,
  UserX,
  Palmtree,
  CalendarCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Camera,
  MapPin,
  RefreshCw,
  Filter,
  FileEdit,
  Check,
  X,
  Hourglass,
  ArrowRight,
  Info,
} from 'lucide-react';

interface StaffAttendanceItem {
  user: User;
  attendance: AttendanceRecord | null;
}

export default function ManagerAttendanceReview() {
  const { currentUser } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [staffItems, setStaffItems] = useState<StaffAttendanceItem[]>([]);
  const [correctionRequests, setCorrectionRequests] = useState<AttendanceCorrectionRequest[]>([]);
  const [processingCorrectionId, setProcessingCorrectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [filterRole, setFilterRole] = useState<'all' | 'staff' | 'inventory_manager'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [previewSelfie, setPreviewSelfie] = useState<{
    url: string;
    title: string;
    userName: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser?.propertyId) return;

    try {
      setLoading(true);
      const [prop, users, corrections] = await Promise.all([
        getPropertyById(currentUser.propertyId),
        getUsersByProperty(currentUser.propertyId),
        getAttendanceCorrectionRequestsByProperty(currentUser.propertyId),
      ]);

      setProperty(prop);
      setCorrectionRequests(corrections);

      // Filter only Staff and Inventory Managers for the Manager's property
      const targetUsers = users.filter(
        (u) => u.role === 'staff' || u.role === 'inventory_manager'
      );

      // Fetch AttendanceRecord for each person for the selected date
      const items: StaffAttendanceItem[] = await Promise.all(
        targetUsers.map(async (u) => {
          const att = await getAttendanceByUserAndDate(u.id, selectedDate);
          return {
            user: u,
            attendance: att,
          };
        })
      );

      // Sort by role (inventory manager first) then name
      items.sort((a, b) => {
        if (a.user.role === b.user.role) {
          return a.user.name.localeCompare(b.user.name);
        }
        return a.user.role === 'inventory_manager' ? -1 : 1;
      });

      setStaffItems(items);
    } catch (err) {
      console.error('Failed to load attendance review data', err);
      setNotification({
        type: 'error',
        message: 'Failed to load attendance records for this date.',
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser?.propertyId, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Approving Attendance Correction Request
  const handleApproveCorrection = async (req: AttendanceCorrectionRequest, userName: string) => {
    if (!currentUser) return;
    try {
      setProcessingCorrectionId(req.id);

      // 1. Fetch existing attendance for this user and date if any, or create full record
      const existing = await getAttendanceByUserAndDate(req.userId, req.date);

      // Mark the attendance record as shift_completed for that date
      await markAttendance({
        id: existing?.id,
        userId: req.userId,
        date: req.date,
        clockInTime: existing?.clockInTime ?? null,
        clockInSelfieUrl: existing?.clockInSelfieUrl ?? null,
        clockInLat: existing?.clockInLat ?? null,
        clockInLng: existing?.clockInLng ?? null,
        clockOutTime: existing?.clockOutTime ?? null,
        clockOutSelfieUrl: existing?.clockOutSelfieUrl ?? null,
        status: 'shift_completed',
        markedBy: currentUser.id,
      });

      // 2. Update correction request status to approved
      await updateAttendanceCorrectionRequestStatus(req.id, 'approved', currentUser.id);

      setNotification({
        type: 'success',
        message: `Approved attendance correction for ${userName} on ${req.date}. Marked as Shift Completed.`,
      });

      await loadData();
    } catch (err) {
      console.error('Failed to approve correction request', err);
      setNotification({
        type: 'error',
        message: `Failed to approve correction request for ${userName}.`,
      });
    } finally {
      setProcessingCorrectionId(null);
    }
  };

  // Handle Rejecting Attendance Correction Request
  const handleRejectCorrection = async (req: AttendanceCorrectionRequest, userName: string) => {
    if (!currentUser) return;
    try {
      setProcessingCorrectionId(req.id);
      await updateAttendanceCorrectionRequestStatus(req.id, 'rejected', currentUser.id);

      setNotification({
        type: 'success',
        message: `Rejected attendance correction request for ${userName} on ${req.date}.`,
      });

      await loadData();
    } catch (err) {
      console.error('Failed to reject correction request', err);
      setNotification({
        type: 'error',
        message: `Failed to reject correction request for ${userName}.`,
      });
    } finally {
      setProcessingCorrectionId(null);
    }
  };

  // Handle setting attendance status for a person
  const handleSetStatus = async (
    person: User,
    existingRecord: AttendanceRecord | null,
    newStatus: AttendanceStatus
  ) => {
    if (!currentUser) return;
    setUpdatingUserId(person.id);

    try {
      const updated = await markAttendance({
        id: existingRecord?.id,
        userId: person.id,
        date: selectedDate,
        clockInTime: existingRecord?.clockInTime ?? null,
        clockInSelfieUrl: existingRecord?.clockInSelfieUrl ?? null,
        clockInLat: existingRecord?.clockInLat ?? null,
        clockInLng: existingRecord?.clockInLng ?? null,
        clockOutTime: existingRecord?.clockOutTime ?? null,
        clockOutSelfieUrl: existingRecord?.clockOutSelfieUrl ?? null,
        status: newStatus,
        markedBy: currentUser.id,
      });

      setStaffItems((prev) =>
        prev.map((item) =>
          item.user.id === person.id ? { ...item, attendance: updated } : item
        )
      );

      const statusLabels: Record<AttendanceStatus, string> = {
        shift_completed: 'Shift Completed',
        week_off: 'Week Off',
        on_leave: 'On Leave',
        absent: 'Absent',
      };

      setNotification({
        type: 'success',
        message: `Marked ${person.name} as "${statusLabels[newStatus]}" for ${selectedDate}.`,
      });

      setTimeout(() => {
        setNotification(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to update attendance status', err);
      setNotification({
        type: 'error',
        message: `Failed to update status for ${person.name}. Please try again.`,
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Date Navigation helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Compute status summary counts
  const totalCount = staffItems.length;
  const markedCount = staffItems.filter((i) => i.attendance?.status !== null && i.attendance?.status !== undefined).length;
  const pendingCount = totalCount - markedCount;
  const shiftCompletedCount = staffItems.filter((i) => i.attendance?.status === 'shift_completed').length;
  const weekOffCount = staffItems.filter((i) => i.attendance?.status === 'week_off').length;
  const onLeaveCount = staffItems.filter((i) => i.attendance?.status === 'on_leave').length;
  const absentCount = staffItems.filter((i) => i.attendance?.status === 'absent').length;

  // Filtered items
  const filteredStaffItems = staffItems.filter(({ user, attendance }) => {
    if (filterRole !== 'all' && user.role !== filterRole) return false;
    if (filterStatus === 'all') return true;
    if (filterStatus === 'unmarked') return !attendance?.status;
    return attendance?.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              End-of-Day Attendance Review
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Review and mark daily attendance for all on-ground staff &amp; inventory managers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold">{property?.name || 'Property'}</span>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
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

      {/* Pending Attendance Correction Requests Card / Alert */}
      {(() => {
        const pendingCorrections = correctionRequests.filter((r) => r.status === 'pending');
        if (pendingCorrections.length === 0) return null;

        return (
          <div className="rounded-2xl bg-amber-950/40 border border-amber-800/60 p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <FileEdit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                    Pending Attendance Correction Requests
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-xs font-mono">
                      {pendingCorrections.length}
                    </span>
                  </h3>
                  <p className="text-xs text-amber-300/80">
                    Employees requesting you to mark attendance for missed or past shifts.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {pendingCorrections.map((req) => {
                const requestingUser = staffItems.find((i) => i.user.id === req.userId)?.user;
                const userName = requestingUser?.name || 'Staff Member';
                const userRole = requestingUser?.staffType || requestingUser?.role || 'Staff';
                const isProcessing = processingCorrectionId === req.id;

                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl bg-slate-900/90 border border-amber-800/40 flex flex-col justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{userName}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                          {userRole}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Shift Date:</span>
                        <button
                          type="button"
                          onClick={() => setSelectedDate(req.date)}
                          className="font-mono font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                          title="Click to view this date in attendance review"
                        >
                          {req.date}
                        </button>
                      </div>
                      {req.note && (
                        <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 italic">
                          &ldquo;{req.note}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                      <button
                        type="button"
                        onClick={() => handleRejectCorrection(req, userName)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-800 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5 text-rose-400" />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveCorrection(req, userName)}
                        disabled={isProcessing}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-950 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <Hourglass className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Approve &amp; Mark Completed
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Date Selector and Controls Bar */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Date Picker & Prev/Next */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
              <button
                id="btn-prev-day"
                onClick={handlePrevDay}
                title="Previous Day"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 px-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <input
                  id="attendance-date-picker"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
                />
              </div>
              <button
                id="btn-next-day"
                onClick={handleNextDay}
                title="Next Day"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {!isToday && (
              <button
                id="btn-go-today"
                onClick={handleToday}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer"
              >
                Jump to Today
              </button>
            )}

            <button
              onClick={loadData}
              disabled={loading}
              title="Refresh list"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">All Roles</option>
                <option value="staff" className="bg-slate-900">Staff Only</option>
                <option value="inventory_manager" className="bg-slate-900">Inventory Mgr Only</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">All Statuses</option>
                <option value="unmarked" className="bg-slate-900">Pending Review</option>
                <option value="shift_completed" className="bg-slate-900">Shift Completed</option>
                <option value="week_off" className="bg-slate-900">Week Off</option>
                <option value="on_leave" className="bg-slate-900">On Leave</option>
                <option value="absent" className="bg-slate-900">Absent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Breakdown Summary Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2 border-t border-slate-800/60">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
            <div className="text-[11px] text-slate-400 font-medium">Total Staff</div>
            <div className="text-base font-bold text-white font-mono mt-0.5">{totalCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
            <div className="text-[11px] text-amber-400/90 font-medium">Pending Review</div>
            <div className="text-base font-bold text-amber-300 font-mono mt-0.5">{pendingCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
            <div className="text-[11px] text-emerald-400/90 font-medium">Completed</div>
            <div className="text-base font-bold text-emerald-300 font-mono mt-0.5">{shiftCompletedCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
            <div className="text-[11px] text-sky-400/90 font-medium">Week Off</div>
            <div className="text-base font-bold text-sky-300 font-mono mt-0.5">{weekOffCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
            <div className="text-[11px] text-amber-400/90 font-medium">On Leave</div>
            <div className="text-base font-bold text-amber-300 font-mono mt-0.5">{onLeaveCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
            <div className="text-[11px] text-rose-400/90 font-medium">Absent</div>
            <div className="text-base font-bold text-rose-300 font-mono mt-0.5">{absentCount}</div>
          </div>
        </div>

        {/* Payroll LOP Policy Note */}
        <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-start gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            <strong>Payroll Rule:</strong> Sick leave is paid. Casual leave, Absent, and unmarked days are currently unpaid (Loss of Pay).
          </span>
        </div>
      </div>

      {/* Staff Attendance List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading attendance records for {selectedDate}...</p>
        </div>
      ) : filteredStaffItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">No staff found matching filter</h3>
          <p className="text-xs text-slate-500">
            Try adjusting your role or status filter above.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredStaffItems.map(({ user, attendance }) => {
            const currentStatus = attendance?.status;
            const isUpdating = updatingUserId === user.id;

            return (
              <div
                key={user.id}
                id={`staff-review-${user.id}`}
                className={`rounded-2xl bg-slate-900 border p-5 shadow-sm transition-all ${
                  isUpdating ? 'opacity-70 pointer-events-none' : ''
                } ${
                  currentStatus === 'shift_completed'
                    ? 'border-emerald-900/40 bg-slate-900/95'
                    : currentStatus === 'week_off'
                    ? 'border-sky-900/40 bg-slate-900/95'
                    : currentStatus === 'on_leave'
                    ? 'border-amber-900/40 bg-slate-900/95'
                    : currentStatus === 'absent'
                    ? 'border-rose-900/40 bg-slate-900/95'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Person Details & Shift Timings */}
                  <div className="space-y-2 lg:max-w-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                        {user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-tight leading-snug">
                          {user.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[11px] font-medium text-slate-300">
                            {user.role === 'inventory_manager'
                              ? 'Inventory Manager'
                              : user.staffType || 'Staff'}
                          </span>
                          {user.shiftStart && user.shiftEnd && (
                            <span className="text-[11px] text-slate-500 font-mono">
                              ({user.shiftStart}-{user.shiftEnd})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1 pl-1">
                      <span>Phone: {user.phone}</span>
                    </div>

                    {/* Check if this user has a correction request for the current selectedDate */}
                    {(() => {
                      const userDateCorrection = correctionRequests.find(
                        (r) => r.userId === user.id && r.date === selectedDate && r.status === 'pending'
                      );
                      if (!userDateCorrection) return null;

                      return (
                        <div className="mt-2 p-2 rounded-lg bg-amber-950/70 border border-amber-800/80 text-amber-200 text-[11px] space-y-1">
                          <div className="flex items-center gap-1 font-semibold text-amber-300">
                            <FileEdit className="w-3 h-3 text-amber-400" />
                            <span>Correction Requested:</span>
                          </div>
                          {userDateCorrection.note && (
                            <p className="italic text-amber-200/90">&ldquo;{userDateCorrection.note}&rdquo;</p>
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleApproveCorrection(userDateCorrection, user.name)}
                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer"
                            >
                              Approve Shift
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectCorrection(userDateCorrection, user.name)}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-900 text-rose-300 font-medium text-[10px] cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Clock In / Out Logged Data */}
                  <div className="flex flex-wrap items-center gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                    {/* Clock In Info */}
                    <div className="flex items-center gap-2.5 pr-3 border-r border-slate-800">
                      {attendance?.clockInSelfieUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewSelfie({
                              url: attendance.clockInSelfieUrl!,
                              title: `Clock In Selfie (${attendance.clockInTime})`,
                              userName: user.name,
                            })
                          }
                          className="relative group rounded-lg overflow-hidden border border-slate-700 shrink-0 cursor-pointer"
                        >
                          <img
                            src={attendance.clockInSelfieUrl}
                            alt="Clock-in selfie"
                            className="w-10 h-10 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Camera className="w-3.5 h-3.5 text-white" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-slate-600">
                          <Clock className="w-4 h-4" />
                        </div>
                      )}

                      <div className="space-y-0.5 text-xs">
                        <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                          Clock In
                        </div>
                        {attendance?.clockInTime ? (
                          <div className="font-mono font-bold text-blue-400 text-xs">
                            {attendance.clockInTime}
                          </div>
                        ) : (
                          <div className="text-slate-500 italic text-[11px]">Not clocked in</div>
                        )}
                        {attendance?.clockInLat !== null && attendance?.clockInLat !== undefined && (
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <span>GPS Logged</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Clock Out Info */}
                    <div className="flex items-center gap-2.5">
                      {attendance?.clockOutSelfieUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewSelfie({
                              url: attendance.clockOutSelfieUrl!,
                              title: `Clock Out Selfie (${attendance.clockOutTime})`,
                              userName: user.name,
                            })
                          }
                          className="relative group rounded-lg overflow-hidden border border-slate-700 shrink-0 cursor-pointer"
                        >
                          <img
                            src={attendance.clockOutSelfieUrl}
                            alt="Clock-out selfie"
                            className="w-10 h-10 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Camera className="w-3.5 h-3.5 text-white" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-slate-600">
                          <Clock className="w-4 h-4" />
                        </div>
                      )}

                      <div className="space-y-0.5 text-xs">
                        <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                          Clock Out
                        </div>
                        {attendance?.clockOutTime ? (
                          <div className="font-mono font-bold text-emerald-400 text-xs">
                            {attendance.clockOutTime}
                          </div>
                        ) : (
                          <div className="text-slate-500 italic text-[11px]">Not clocked out</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 5. Status Badge & 3. 4 Action Buttons */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
                    {/* Visual Status Indicator Badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Current:</span>
                      {currentStatus === 'shift_completed' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/70 text-emerald-300 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Shift Completed
                        </span>
                      ) : currentStatus === 'week_off' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-950/80 border border-sky-700/70 text-sky-300 text-xs font-semibold">
                          <Palmtree className="w-3.5 h-3.5 text-sky-400" />
                          Week Off
                        </span>
                      ) : currentStatus === 'on_leave' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/80 border border-amber-700/70 text-amber-300 text-xs font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          On Leave
                        </span>
                      ) : currentStatus === 'absent' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950/80 border border-rose-700/70 text-rose-300 text-xs font-semibold">
                          <UserX className="w-3.5 h-3.5 text-rose-400" />
                          Absent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium italic">
                          <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                          Not marked yet
                        </span>
                      )}
                    </div>

                    {/* 4 Status Action Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* 1. Shift Completed */}
                      <button
                        id={`btn-status-completed-${user.id}`}
                        onClick={() => handleSetStatus(user, attendance, 'shift_completed')}
                        disabled={isUpdating}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                          currentStatus === 'shift_completed'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-400'
                            : 'bg-slate-800 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-800'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Shift Completed
                      </button>

                      {/* 2. Week Off */}
                      <button
                        id={`btn-status-weekoff-${user.id}`}
                        onClick={() => handleSetStatus(user, attendance, 'week_off')}
                        disabled={isUpdating}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                          currentStatus === 'week_off'
                            ? 'bg-sky-600 text-white shadow-md shadow-sky-900/40 ring-1 ring-sky-400'
                            : 'bg-slate-800 hover:bg-sky-950/60 text-slate-300 hover:text-sky-300 border border-slate-700 hover:border-sky-800'
                        }`}
                      >
                        <Palmtree className="w-3 h-3" />
                        Week Off
                      </button>

                      {/* 3. On Leave */}
                      <button
                        id={`btn-status-onleave-${user.id}`}
                        onClick={() => handleSetStatus(user, attendance, 'on_leave')}
                        disabled={isUpdating}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                          currentStatus === 'on_leave'
                            ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40 ring-1 ring-amber-400'
                            : 'bg-slate-800 hover:bg-amber-950/60 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-800'
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        On Leave
                      </button>

                      {/* 4. Absent */}
                      <button
                        id={`btn-status-absent-${user.id}`}
                        onClick={() => handleSetStatus(user, attendance, 'absent')}
                        disabled={isUpdating}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                          currentStatus === 'absent'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40 ring-1 ring-rose-400'
                            : 'bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800'
                        }`}
                      >
                        <UserX className="w-3 h-3" />
                        Absent
                      </button>
                    </div>
                  </div>
                </div>

                {/* Audit footnote if marked by manager */}
                {attendance?.markedBy && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Reviewed &amp; marked by Manager ({attendance.markedBy === currentUser?.id ? 'You' : attendance.markedBy})
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Selfie Preview Modal */}
      {previewSelfie && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">{previewSelfie.userName}</h3>
                <p className="text-xs text-slate-400">{previewSelfie.title}</p>
              </div>
              <button
                onClick={() => setPreviewSelfie(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black aspect-4/3 flex items-center justify-center">
              <img
                src={previewSelfie.url}
                alt={previewSelfie.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
