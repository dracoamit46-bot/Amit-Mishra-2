import React, { useEffect, useState, useCallback } from 'react';
import { WeekOffRequest, User, Property } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getUsersByProperty,
  getWeekOffRequests,
  updateWeekOffRequestStatus,
  getPropertyById,
} from '../services/dataService';
import {
  Palmtree,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  AlertCircle,
  Check,
  X,
  History,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';

interface RequestWithUser {
  request: WeekOffRequest;
  user: User;
}

export default function ManagerWeekOffApproval() {
  const { currentUser } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingItems, setPendingItems] = useState<RequestWithUser[]>([]);
  const [historyItems, setHistoryItems] = useState<RequestWithUser[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Rejection modal / inline input state
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Load property staff and cross-reference with all week-off requests
  const loadData = useCallback(async () => {
    if (!currentUser?.propertyId) return;

    try {
      setLoading(true);
      const [prop, users, allRequests] = await Promise.all([
        getPropertyById(currentUser.propertyId),
        getUsersByProperty(currentUser.propertyId),
        getWeekOffRequests(),
      ]);

      setProperty(prop);

      // Create lookup map of staff/inventory managers at this property
      const userMap = new Map<string, User>();
      users.forEach((u) => {
        if (u.role === 'staff' || u.role === 'inventory_manager') {
          userMap.set(u.id, u);
        }
      });

      // Filter requests belonging only to this property's staff
      const propertyRequests: RequestWithUser[] = [];
      allRequests.forEach((req) => {
        const user = userMap.get(req.userId);
        if (user) {
          propertyRequests.push({
            request: req,
            user,
          });
        }
      });

      // Separate into Pending and Reviewed (Approved/Rejected)
      const pending = propertyRequests.filter((item) => item.request.status === 'pending');
      const history = propertyRequests.filter((item) => item.request.status !== 'pending');

      // Sort pending oldest first (FIFO queue) or latest first
      pending.sort((a, b) => (b.request.id > a.request.id ? 1 : -1));
      // Sort history latest reviewed first
      history.sort((a, b) => (b.request.id > a.request.id ? 1 : -1));

      setPendingItems(pending);
      setHistoryItems(history);
    } catch (err) {
      console.error('Failed to load manager week-off requests', err);
      setNotification({
        type: 'error',
        message: 'Failed to load week-off requests for your property.',
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser?.propertyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Approve
  const handleApprove = async (item: RequestWithUser) => {
    if (!currentUser) return;
    try {
      setUpdatingId(item.request.id);
      const updated = await updateWeekOffRequestStatus(
        item.request.id,
        'approved',
        currentUser.id,
        null
      );

      if (updated) {
        // Move from pending to history
        setPendingItems((prev) => prev.filter((p) => p.request.id !== item.request.id));
        setHistoryItems((prev) => [{ request: updated, user: item.user }, ...prev]);
        setNotification({
          type: 'success',
          message: `Approved week-off request for ${item.user.name} (${item.request.requestedDates.length} day(s)).`,
        });
      }
    } catch (err) {
      console.error('Failed to approve week-off request', err);
      setNotification({
        type: 'error',
        message: `Failed to approve request for ${item.user.name}.`,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Open Reject Input
  const handleOpenReject = (requestId: string) => {
    setRejectingRequestId(requestId);
    setRejectionReason('');
  };

  // Submit Rejection with Reason
  const handleConfirmReject = async (item: RequestWithUser) => {
    if (!currentUser) return;
    const trimmedReason = rejectionReason.trim();
    if (!trimmedReason) {
      setNotification({
        type: 'error',
        message: 'Please provide a short reason for rejecting this request.',
      });
      return;
    }

    try {
      setUpdatingId(item.request.id);
      const updated = await updateWeekOffRequestStatus(
        item.request.id,
        'rejected',
        currentUser.id,
        trimmedReason
      );

      if (updated) {
        setPendingItems((prev) => prev.filter((p) => p.request.id !== item.request.id));
        setHistoryItems((prev) => [{ request: updated, user: item.user }, ...prev]);
        setRejectingRequestId(null);
        setRejectionReason('');
        setNotification({
          type: 'success',
          message: `Rejected week-off request for ${item.user.name}. Reason logged.`,
        });
      }
    } catch (err) {
      console.error('Failed to reject week-off request', err);
      setNotification({
        type: 'error',
        message: `Failed to reject request for ${item.user.name}.`,
      });
    } finally {
      setUpdatingId(null);
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
              Week-Off Approvals
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Review, approve, or reject week-off requests submitted by on-ground staff at your property.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold">{property?.name || 'Property'}</span>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            title="Refresh requests"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notification Banner */}
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

      {/* 1. Pending Requests Section */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-base text-white">
              Pending Requests ({pendingItems.length})
            </h3>
          </div>
          <span className="text-xs text-amber-400/90 font-medium">Action Required</span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading pending requests...</span>
          </div>
        ) : pendingItems.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-500 space-y-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-500/80 mx-auto mb-2" />
            <p className="font-semibold text-slate-300">All caught up!</p>
            <p>There are no pending week-off requests to review right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingItems.map((item) => {
              const { request, user } = item;
              const isUpdating = updatingId === request.id;
              const isRejecting = rejectingRequestId === request.id;

              return (
                <div
                  key={request.id}
                  id={`pending-request-${request.id}`}
                  className={`p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4 transition-all ${
                    isUpdating ? 'opacity-60 pointer-events-none' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Requester Details */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                          {user.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white tracking-tight">
                              {user.name}
                            </h4>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-medium text-slate-300">
                              {user.role === 'inventory_manager'
                                ? 'Inventory Manager'
                                : user.staffType || 'Staff'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">Phone: {user.phone}</p>
                        </div>
                      </div>

                      {/* Dates requested */}
                      <div className="pt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-400 mr-1">
                          Requested {request.requestedDates.length}{' '}
                          {request.requestedDates.length === 1 ? 'Day' : 'Days'}:
                        </span>
                        {request.requestedDates.map((d) => (
                          <span
                            key={d}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950/80 border border-sky-800 text-sky-200 text-xs font-mono font-semibold"
                          >
                            <Calendar className="w-3 h-3 text-sky-400" />
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons: Approve & Reject */}
                    {!isRejecting && (
                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        <button
                          id={`btn-approve-${request.id}`}
                          onClick={() => handleApprove(item)}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>

                        <button
                          id={`btn-reject-open-${request.id}`}
                          onClick={() => handleOpenReject(request.id)}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-rose-300 hover:text-rose-200 border border-slate-700 hover:border-rose-800 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Inline Rejection Reason Box */}
                  {isRejecting && (
                    <div className="pt-3 border-t border-slate-800/80 space-y-3 bg-rose-950/20 p-3.5 rounded-xl border-rose-900/40">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                        <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                        <span>Specify Reason for Rejection</span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          id={`input-reject-reason-${request.id}`}
                          type="text"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="e.g. Operational requirement, staff shortage, or clash with schedule..."
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                        />

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            id={`btn-confirm-reject-${request.id}`}
                            onClick={() => handleConfirmReject(item)}
                            disabled={isUpdating || !rejectionReason.trim()}
                            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
                          >
                            Confirm Rejection
                          </button>

                          <button
                            type="button"
                            onClick={() => setRejectingRequestId(null)}
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Request Review History Section */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="font-bold text-base text-white">Review History ({historyItems.length})</h3>
          </div>
          <span className="text-xs text-slate-500">Past decisions for your property</span>
        </div>

        {historyItems.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-500">
            No past week-off decisions recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {historyItems.map(({ request, user }) => (
              <div
                key={request.id}
                id={`history-item-${request.id}`}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{user.name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-[10px] font-medium text-slate-400 border border-slate-800">
                      {user.role === 'inventory_manager' ? 'Inventory Manager' : user.staffType || 'Staff'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">
                      Requested {request.requestedDates.length} {request.requestedDates.length === 1 ? 'day' : 'days'}:
                    </span>
                    {request.requestedDates.map((d) => (
                      <span
                        key={d}
                        className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300"
                      >
                        {d}
                      </span>
                    ))}
                  </div>

                  {request.status === 'rejected' && request.reason && (
                    <div className="text-xs text-rose-300/90 font-medium flex items-center gap-1 mt-1">
                      <span className="text-slate-400">Rejection Reason:</span>
                      <span className="italic">{request.reason}</span>
                    </div>
                  )}

                  {request.reviewedBy && (
                    <div className="text-[10px] text-slate-500">
                      Reviewed by: {request.reviewedBy === currentUser?.id ? 'You' : request.reviewedBy}
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div className="self-start sm:self-center shrink-0">
                  {request.status === 'approved' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs font-semibold">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      Rejected
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
