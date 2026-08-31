import React, { useEffect, useState, useCallback } from 'react';
import { LeaveRequest, Property, RequestStatus, User } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getLeaveRequests,
  getLeaveRequestsByUser,
  createLeaveRequest,
  updateLeaveRequestStatus,
  getProperties,
  getPropertyById,
  getUsers,
  getUsersByProperty,
} from '../services/dataService';
import {
  Calendar,
  CalendarCheck,
  CalendarRange,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  User as UserIcon,
  ChevronUp,
  Send,
  ThumbsUp,
  X,
  Hourglass,
  Filter,
  Check,
  Palmtree,
  ShieldAlert,
  ArrowRight,
  Info,
  Activity,
} from 'lucide-react';

export default function UnifiedLeaveManagement() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isOwner = currentUser.role === 'owner';
  const isManager = currentUser.role === 'manager';
  const isStaffOrInvMgr = currentUser.role === 'staff' || currentUser.role === 'inventory_manager';

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [properties, setProperties] = useState<Property[]>([]);
  const [property, setProperty] = useState<Property | null>(null);
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('all');

  // Active status filter tab for Manager/Owner view
  const [statusTab, setStatusTab] = useState<'pending' | 'history' | 'all'>('pending');

  // Request Leave Form state (Staff / Inventory Manager)
  const [showRequestForm, setShowRequestForm] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [leaveType, setLeaveType] = useState<'casual' | 'sick'>('casual');
  const [reason, setReason] = useState<string>('');
  const [submittingRequest, setSubmittingRequest] = useState<boolean>(false);

  // Reject Modal state (Manager)
  const [rejectingRequest, setRejectingRequest] = useState<LeaveRequest | null>(null);
  const [rejectionNote, setRejectionNote] = useState<string>('');
  const [rejectSubmitting, setRejectSubmitting] = useState<boolean>(false);

  // Processing action ID
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  // Load data according to role
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      let fetchedProperties: Property[] = [];
      let fetchedUsers: User[] = [];
      let fetchedRequests: LeaveRequest[] = [];

      if (isOwner) {
        fetchedProperties = await getProperties();
        setProperties(fetchedProperties);
        fetchedUsers = await getUsers();
        fetchedRequests = await getLeaveRequests();
      } else if (isManager && currentUser.propertyId) {
        const prop = await getPropertyById(currentUser.propertyId);
        setProperty(prop);
        fetchedUsers = await getUsersByProperty(currentUser.propertyId);
        const allRequests = await getLeaveRequests();

        // Cross-reference all leave requests with users belonging to manager's property
        const propertyUserIds = new Set(fetchedUsers.map((u) => u.id));
        fetchedRequests = allRequests.filter((r) => propertyUserIds.has(r.userId));
      } else {
        // Staff or Inventory Manager: own requests
        if (currentUser.propertyId) {
          const prop = await getPropertyById(currentUser.propertyId);
          setProperty(prop);
        }
        fetchedUsers = await getUsers();
        fetchedRequests = await getLeaveRequestsByUser(currentUser.id);
      }

      const uMap: Record<string, User> = {};
      fetchedUsers.forEach((u) => {
        uMap[u.id] = u;
      });
      setUsersMap(uMap);
      setLeaveRequests(fetchedRequests);
    } catch (err) {
      console.error('Failed to load leave management data', err);
      showNotification('error', 'Failed to load leave records. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, isOwner, isManager]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper resolvers
  const getUserName = (userId: string | null) => {
    if (!userId) return 'Unknown';
    const user = usersMap[userId];
    if (!user) return 'Staff Member';
    return `${user.name} (${user.role.replace('_', ' ')})`;
  };

  const getPropertyName = (propertyId: string | null) => {
    if (!propertyId) return 'N/A';
    if (property && property.id === propertyId) return property.name;
    const p = properties.find((item) => item.id === propertyId);
    return p ? p.name : propertyId;
  };

  // Helper date duration
  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e.getTime() - s.getTime();
    if (diffTime < 0) return 0;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Handle Leave Request Submit
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      showNotification('error', 'Please select both start and end dates.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      showNotification('error', 'End date cannot be earlier than start date.');
      return;
    }

    if (!reason.trim()) {
      showNotification('error', 'Please provide a reason for the leave request.');
      return;
    }

    try {
      setSubmittingRequest(true);
      await createLeaveRequest({
        userId: currentUser.id,
        startDate,
        endDate,
        leaveType,
        reason: reason.trim(),
        status: 'pending',
        reviewedBy: null,
      });

      showNotification('success', 'Leave request submitted successfully. Awaiting Manager approval.');
      setStartDate('');
      setEndDate('');
      setLeaveType('casual');
      setReason('');
      setShowRequestForm(false);
      await loadData();
    } catch (err) {
      console.error('Failed to submit leave request', err);
      showNotification('error', 'Failed to submit leave request. Please try again.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Handle Manager Approve
  const handleApprove = async (request: LeaveRequest) => {
    try {
      setProcessingId(request.id);
      await updateLeaveRequestStatus(request.id, 'approved', currentUser.id);
      showNotification('success', `Leave request for ${getUserName(request.userId)} approved.`);
      await loadData();
    } catch (err) {
      console.error('Failed to approve leave request', err);
      showNotification('error', 'Failed to approve leave request.');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Manager Reject Submit
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequest) return;

    if (!rejectionNote.trim()) {
      showNotification('error', 'Please enter a rejection reason.');
      return;
    }

    try {
      setRejectSubmitting(true);
      // Preserve the original reason and append manager rejection note
      const combinedReason = `${rejectingRequest.reason} (Rejection Note: ${rejectionNote.trim()})`;

      await updateLeaveRequestStatus(
        rejectingRequest.id,
        'rejected',
        currentUser.id,
        combinedReason
      );

      showNotification('success', `Leave request for ${getUserName(rejectingRequest.userId)} rejected.`);
      setRejectingRequest(null);
      setRejectionNote('');
      await loadData();
    } catch (err) {
      console.error('Failed to reject leave request', err);
      showNotification('error', 'Failed to reject leave request.');
    } finally {
      setRejectSubmitting(false);
    }
  };

  // Filter requests for display
  const filteredRequests = leaveRequests.filter((req) => {
    // Owner Property filter
    if (isOwner && selectedPropertyFilter !== 'all') {
      const user = usersMap[req.userId];
      if (user?.propertyId !== selectedPropertyFilter) {
        return false;
      }
    }

    // Status filter for Manager / Owner
    if (isManager || isOwner) {
      if (statusTab === 'pending') {
        return req.status === 'pending';
      }
      if (statusTab === 'history') {
        return req.status === 'approved' || req.status === 'rejected';
      }
    }

    return true;
  });

  const pendingCount = leaveRequests.filter((r) => r.status === 'pending').length;
  const approvedCount = leaveRequests.filter((r) => r.status === 'approved').length;
  const rejectedCount = leaveRequests.filter((r) => r.status === 'rejected').length;

  return (
    <div id="unified-leave-management" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
              <Palmtree className="w-4 h-4" />
              <span>Staff Schedule &amp; Time Off</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              Leave Management
              {!isOwner && property && (
                <span className="text-sm font-normal px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {property.name}
                </span>
              )}
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              {isStaffOrInvMgr
                ? 'Apply for multi-day leave and track approval status.'
                : isManager
                ? 'Review, approve, or reject employee leave applications for your branch.'
                : 'Monitor leave requests and staff availability across all hostel properties.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Owner Property Filter */}
            {isOwner && properties.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2">
                <Filter className="w-4 h-4 text-emerald-400 shrink-0" />
                <select
                  id="leave-property-filter"
                  value={selectedPropertyFilter}
                  onChange={(e) => setSelectedPropertyFilter(e.target.value)}
                  className="bg-transparent text-xs md:text-sm text-slate-200 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">
                    All Properties ({properties.length})
                  </option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 1. Staff / Inventory Manager "Request Leave" Button */}
            {isStaffOrInvMgr && (
              <button
                id="btn-request-leave-toggle"
                onClick={() => setShowRequestForm(!showRequestForm)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs md:text-sm font-semibold flex items-center gap-2 transition cursor-pointer shadow-md shadow-emerald-900/30"
              >
                {showRequestForm ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Close Request Form
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    Request Leave
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div
            className={`mt-4 p-3.5 rounded-xl border flex items-center gap-2.5 text-xs md:text-sm transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* 1. Request Leave Form (Staff & Inventory Manager) */}
        {isStaffOrInvMgr && showRequestForm && (
          <form
            id="form-request-leave"
            onSubmit={handleRequestSubmit}
            className="mt-5 p-5 bg-slate-950/80 border border-emerald-900/40 rounded-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-emerald-400" />
                Submit New Leave Application
              </h3>
              <span className="text-xs text-slate-400">
                Staff: <span className="text-emerald-300 font-medium">{currentUser.name}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Start Date <span className="text-rose-400">*</span>
                </label>
                <input
                  id="leave-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  End Date <span className="text-rose-400">*</span>
                </label>
                <input
                  id="leave-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Leave Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Leave Type <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    leaveType === 'casual'
                      ? 'bg-purple-950/40 border-purple-600/80 text-purple-200 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="leaveType"
                    value="casual"
                    checked={leaveType === 'casual'}
                    onChange={() => setLeaveType('casual')}
                    className="mt-0.5 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <div className="text-xs md:text-sm font-semibold text-white flex items-center gap-1.5">
                      <span>Casual Leave</span>
                      <span className="text-[11px] px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50">
                        Unpaid (LOP)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Vacation, personal errands, or family events. Deducted as Loss of Pay.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    leaveType === 'sick'
                      ? 'bg-teal-950/40 border-teal-600/80 text-teal-200 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="leaveType"
                    value="sick"
                    checked={leaveType === 'sick'}
                    onChange={() => setLeaveType('sick')}
                    className="mt-0.5 text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <div className="text-xs md:text-sm font-semibold text-white flex items-center gap-1.5">
                      <span>Sick Leave</span>
                      <span className="text-[11px] px-1.5 py-0.2 rounded bg-teal-900/60 text-teal-300 border border-teal-700/50">
                        Paid Leave
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Medical appointments, recovery, or illnesses. Full daily wages paid.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Policy Info Note */}
            <div className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>Leave Policy:</strong> Sick leave is paid. Casual leave, Absent, and unmarked days are currently unpaid (Loss of Pay).
              </span>
            </div>

            {startDate && endDate && (
              <div className="text-xs text-emerald-400 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-900/40 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Total requested duration:{' '}
                  <strong className="font-semibold text-white">
                    {calculateDays(startDate, endDate)} day(s)
                  </strong>{' '}
                  ({startDate} to {endDate})
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Reason for Leave <span className="text-rose-400">*</span>
              </label>
              <textarea
                id="leave-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Specify the reason for leave (e.g. personal family event, medical appointment, travel)..."
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-y"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRequestForm(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingRequest}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                {submittingRequest ? (
                  <>
                    <Hourglass className="w-3.5 h-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. LEAVE REQUESTS LIST / TABS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Navigation Tabs for Manager / Owner */}
        {(isManager || isOwner) && (
          <div className="flex items-center border-b border-slate-800 overflow-x-auto bg-slate-950/50 p-2 gap-1.5">
            <button
              id="tab-leave-pending"
              onClick={() => setStatusTab('pending')}
              className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
                statusTab === 'pending'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Hourglass className="w-3.5 h-3.5" />
              Pending Review
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  statusTab === 'pending'
                    ? 'bg-amber-800 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {pendingCount}
              </span>
            </button>

            <button
              id="tab-leave-history"
              onClick={() => setStatusTab('history')}
              className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
                statusTab === 'history'
                  ? 'bg-slate-700 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Reviewed History
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  statusTab === 'history'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {approvedCount + rejectedCount}
              </span>
            </button>

            <button
              id="tab-leave-all"
              onClick={() => setStatusTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
                statusTab === 'all'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              All Records
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  statusTab === 'all'
                    ? 'bg-blue-800 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {leaveRequests.length}
              </span>
            </button>
          </div>
        )}

        {/* Section title for Staff/Inventory Manager */}
        {isStaffOrInvMgr && (
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              My Leave History &amp; Applications
            </h2>
            <span className="text-xs text-slate-400">
              Total Applications: <strong className="text-white">{leaveRequests.length}</strong>
            </span>
          </div>
        )}

        {/* Content List */}
        <div className="p-4 md:p-6">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Hourglass className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="text-sm">Loading leave applications...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <Palmtree className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-medium text-slate-400">
                No leave requests found.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isStaffOrInvMgr
                  ? 'Click "Request Leave" above to apply for time off.'
                  : 'New employee leave applications will appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredRequests.map((req) => {
                const requester = usersMap[req.userId];
                const days = calculateDays(req.startDate, req.endDate);
                const isProcessing = processingId === req.id;

                return (
                  <div
                    key={req.id}
                    className="p-4 md:p-5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 transition space-y-3"
                  >
                    {/* Header Row: User Info, Dates & Status Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                          #{req.id.slice(-6).toUpperCase()}
                        </span>

                        {(isManager || isOwner) && (
                          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                            <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                            {getUserName(req.userId)}
                          </span>
                        )}

                        {isOwner && requester?.propertyId && (
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-blue-400" />
                            {getPropertyName(requester.propertyId)}
                          </span>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        {/* Leave Type Pill */}
                        {req.leaveType === 'sick' ? (
                          <span className="px-2 py-0.5 rounded-full bg-teal-950/80 text-teal-300 border border-teal-800/60 text-[11px] font-bold flex items-center gap-1">
                            <Activity className="w-3 h-3 text-teal-400" />
                            Sick Leave (Paid)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60 text-[11px] font-bold flex items-center gap-1">
                            <Palmtree className="w-3 h-3 text-purple-400" />
                            Casual Leave (LOP)
                          </span>
                        )}

                        {req.status === 'pending' ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 text-xs font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            Pending Review
                          </span>
                        ) : req.status === 'approved' ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Approved
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/60 text-xs font-bold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dates & Duration Banner */}
                    <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-semibold">{req.startDate}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-semibold">{req.endDate}</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-medium">
                        {days} Day{days !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Reason / Notes */}
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-slate-400">Reason:</div>
                      <p className="text-xs md:text-sm text-slate-200 leading-relaxed bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                        {req.reason}
                      </p>
                    </div>

                    {/* Footer: Reviewer info & Actions */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 text-xs">
                      <div className="text-slate-400">
                        {req.reviewedBy && (
                          <span>
                            Reviewed by:{' '}
                            <strong className="text-slate-200 font-medium">
                              {getUserName(req.reviewedBy)}
                            </strong>
                          </span>
                        )}
                      </div>

                      {/* Manager Actions (Approve / Reject) for Pending Requests */}
                      {isManager && req.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            disabled={isProcessing}
                            onClick={() => handleApprove(req)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow"
                          >
                            {isProcessing ? (
                              <Hourglass className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ThumbsUp className="w-3.5 h-3.5" />
                            )}
                            Approve
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => {
                              setRejectingRequest(req);
                              setRejectionNote('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      )}

                      {/* Read-only indicator for Owner & closed requests */}
                      {(!isManager || req.status !== 'pending') && (
                        <span className="text-slate-500 italic text-[11px]">
                          {req.status === 'pending' ? 'Awaiting Manager Review' : 'Closed Record'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* REJECT MODAL FOR MANAGER */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Reject Leave Request
              </h3>
              <button
                onClick={() => setRejectingRequest(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
              <div>
                <strong>Applicant:</strong> {getUserName(rejectingRequest.userId)}
              </div>
              <div>
                <strong>Duration:</strong> {rejectingRequest.startDate} to {rejectingRequest.endDate}
              </div>
              <div>
                <strong>Applicant Reason:</strong> {rejectingRequest.reason}
              </div>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Rejection Reason / Manager Note <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  required
                  placeholder="Explain why this leave application is being rejected (e.g. operational staffing shortage)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingRequest(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectSubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {rejectSubmitting ? (
                    <>
                      <Hourglass className="w-3.5 h-3.5 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5" />
                      Confirm Rejection
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
