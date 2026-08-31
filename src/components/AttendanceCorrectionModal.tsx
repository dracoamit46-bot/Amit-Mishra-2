import React, { useState, useEffect } from 'react';
import { AttendanceCorrectionRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  createAttendanceCorrectionRequest,
  getAttendanceCorrectionRequestsByUser,
  getAttendanceByUserAndDate,
} from '../services/dataService';
import {
  Calendar,
  Clock,
  Send,
  X,
  CheckCircle2,
  XCircle,
  Hourglass,
  AlertCircle,
  FileEdit,
  ShieldCheck,
  CalendarCheck,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  onSubmitted?: () => void;
}

export default function AttendanceCorrectionModal({
  isOpen,
  onClose,
  initialDate,
  onSubmitted,
}: Props) {
  const { currentUser } = useAuth();
  
  // Calculate yesterday's ISO date string
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const [date, setDate] = useState<string>(initialDate || getYesterdayStr());
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userRequests, setUserRequests] = useState<AttendanceCorrectionRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const loadHistory = async () => {
    if (!currentUser) return;
    try {
      setLoadingHistory(true);
      const requests = await getAttendanceCorrectionRequestsByUser(currentUser.id);
      // Sort newest date first
      requests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setUserRequests(requests);
    } catch (err) {
      console.error('Failed to load correction requests', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setDate(initialDate || getYesterdayStr());
      setNote('');
      setError(null);
      setSuccess(null);
      loadHistory();
    }
  }, [isOpen, initialDate, currentUser?.id]);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError('Please select a valid date.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Check if user already marked attendance or has a pending request for this date
      const existingReq = userRequests.find(
        (r) => r.date === date && r.status === 'pending'
      );
      if (existingReq) {
        setError(`You already have a pending correction request for ${date}.`);
        setSubmitting(false);
        return;
      }

      await createAttendanceCorrectionRequest({
        userId: currentUser.id,
        date,
        note: note.trim() ? note.trim() : null,
        status: 'pending',
        reviewedBy: null,
      });

      setSuccess(`Attendance correction request submitted for ${date}. Your Manager will review and mark it.`);
      setNote('');
      await loadHistory();
      if (onSubmitted) onSubmitted();
    } catch (err) {
      console.error('Failed to submit attendance correction request', err);
      setError('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Request Attendance Correction
              </h3>
              <p className="text-xs text-slate-400">
                Ask your Manager to mark or adjust attendance for past shifts.
              </p>
            </div>
          </div>
          <button
            id="btn-close-correction-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Request Form */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Shift Date <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                id="input-correction-date"
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Select yesterday or an earlier date when your attendance was missed.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Reason / Shift Details
            </label>
            <textarea
              id="input-correction-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Worked full morning shift from 08:00 to 16:00, phone battery drained before clocking out..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-y"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>
            <button
              id="btn-submit-correction-request"
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-md shadow-blue-900/30"
            >
              {submitting ? (
                <>
                  <Hourglass className="w-3.5 h-3.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>

        {/* Previous Requests Section */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5 text-blue-400" />
              Your Correction History
            </span>
            <span>Total: {userRequests.length}</span>
          </div>

          {loadingHistory ? (
            <div className="py-4 text-center text-xs text-slate-500">
              <Hourglass className="w-4 h-4 animate-spin mx-auto mb-1 text-blue-500" />
              Loading history...
            </div>
          ) : userRequests.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
              No previous attendance correction requests.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {userRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-200">
                        {req.date}
                      </span>
                    </div>
                    {req.note && (
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        {req.note}
                      </p>
                    )}
                  </div>

                  <div>
                    {req.status === 'pending' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 text-[10px] font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        Pending
                      </span>
                    ) : req.status === 'approved' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Approved
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/60 text-[10px] font-bold flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-rose-400" />
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
    </div>
  );
}
