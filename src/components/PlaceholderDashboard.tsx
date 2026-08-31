import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getPropertyById,
  getAttendanceByUserAndDate,
  getUsersByProperty,
  getAttendanceCorrectionRequestsByProperty,
} from '../services/dataService';
import { Property } from '../types';
import {
  LogOut,
  Building2,
  User as UserIcon,
  Shield,
  CheckCircle2,
  LayoutDashboard,
  Compass,
  Users,
  CalendarCheck,
  Palmtree,
  Clock,
  ClipboardList,
  AlertTriangle,
  FileEdit,
  Bell,
  ArrowRight,
} from 'lucide-react';
import OwnerPropertyManagement from './OwnerPropertyManagement';
import ManagerGeolocationSetup from './ManagerGeolocationSetup';
import StaffManagement from './StaffManagement';
import StaffClockInOut from './StaffClockInOut';
import ManagerAttendanceReview from './ManagerAttendanceReview';
import StaffWeekOffRequest from './StaffWeekOffRequest';
import ManagerWeekOffApproval from './ManagerWeekOffApproval';
import UnifiedTaskManagement from './UnifiedTaskManagement';
import UnifiedLeaveManagement from './UnifiedLeaveManagement';
import AttendanceCorrectionModal from './AttendanceCorrectionModal';

export default function PlaceholderDashboard() {
  const { currentUser, logout } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loadingProperty, setLoadingProperty] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'geolocation' | 'staff' | 'attendance' | 'weekoff_approval' | 'clock_in_out' | 'week_off' | 'tasks' | 'leave'>('overview');

  // Yesterday date helper
  const getYesterdayIso = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const yesterdayDate = getYesterdayIso();

  // Alerting states
  const [unmarkedYesterdayStaff, setUnmarkedYesterdayStaff] = useState<boolean>(false);
  const [managerUnmarkedYesterdayCount, setManagerUnmarkedYesterdayCount] = useState<number>(0);
  const [managerPendingCorrectionsCount, setManagerPendingCorrectionsCount] = useState<number>(0);
  const [showStaffCorrectionModal, setShowStaffCorrectionModal] = useState<boolean>(false);

  const checkAlerts = useCallback(async () => {
    if (!currentUser) return;

    try {
      if (currentUser.role === 'staff' || currentUser.role === 'inventory_manager') {
        const att = await getAttendanceByUserAndDate(currentUser.id, yesterdayDate);
        setUnmarkedYesterdayStaff(!att || !att.status);
      } else if (currentUser.role === 'manager' && currentUser.propertyId) {
        const [users, corrections] = await Promise.all([
          getUsersByProperty(currentUser.propertyId),
          getAttendanceCorrectionRequestsByProperty(currentUser.propertyId),
        ]);

        const staffMembers = users.filter((u) => u.role === 'staff' || u.role === 'inventory_manager');
        const attList = await Promise.all(
          staffMembers.map((s) => getAttendanceByUserAndDate(s.id, yesterdayDate))
        );

        const unmarkedCount = attList.filter((a) => !a || !a.status).length;
        const pendingCorr = corrections.filter((c) => c.status === 'pending').length;

        setManagerUnmarkedYesterdayCount(unmarkedCount);
        setManagerPendingCorrectionsCount(pendingCorr);
      }
    } catch (err) {
      console.error('Failed to check attendance alerts', err);
    }
  }, [currentUser, yesterdayDate]);

  useEffect(() => {
    async function loadProperty() {
      if (!currentUser?.propertyId) {
        setProperty(null);
        return;
      }
      setLoadingProperty(true);
      try {
        const prop = await getPropertyById(currentUser.propertyId);
        setProperty(prop);
      } catch (err) {
        console.error('Failed to load property details', err);
      } finally {
        setLoadingProperty(false);
      }
    }

    loadProperty();
    checkAlerts();
  }, [currentUser, checkAlerts]);

  if (!currentUser) return null;

  const isOwner = currentUser.role === 'owner';
  const isManager = currentUser.role === 'manager';
  const isStaffOrInvMgr = currentUser.role === 'staff' || currentUser.role === 'inventory_manager';

  const propertyName = currentUser.propertyId
    ? property?.name || (loadingProperty ? 'Loading...' : 'Unknown Property')
    : 'All Properties';

  const roleDisplayName =
    currentUser.role === 'owner'
      ? 'Owner'
      : currentUser.role === 'manager'
      ? 'Hostel Manager'
      : currentUser.role === 'inventory_manager'
      ? 'Inventory Manager'
      : 'On-Ground Staff';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 md:p-8">
      {/* Top Navigation & Status Bar */}
      <div className="w-full max-w-5xl flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-xl">
          {/* Left: Branding & Role */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold text-lg">
              HO
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 tracking-tight">HostelOps</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 font-medium">
                  {roleDisplayName}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentUser.name} {currentUser.staffType ? `• ${currentUser.staffType}` : ''}
              </p>
            </div>
          </div>

          {/* Center: Property Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>{propertyName}</span>
          </div>

          {/* Right: User Switcher / Logout */}
          <div className="flex items-center gap-2">
            <button
              id="btn-logout"
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/80 transition-all cursor-pointer shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Switch User</span>
            </button>
          </div>
        </div>

        {/* Owner Navigation Tabs */}
        {isOwner && (
          <div className="flex items-center gap-2 mb-6 p-1 bg-slate-900/80 border border-slate-800 rounded-xl w-full">
            <button
              id="tab-overview"
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Overview
            </button>
            <button
              id="tab-tasks"
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Tasks &amp; Approvals
            </button>
            <button
              id="tab-leave"
              onClick={() => setActiveTab('leave')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'leave'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palmtree className="w-3.5 h-3.5" />
              Leave Management
            </button>
            <button
              id="tab-properties"
              onClick={() => setActiveTab('properties')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'properties'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Properties
            </button>
            <button
              id="tab-staff"
              onClick={() => setActiveTab('staff')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'staff'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Employees
            </button>
          </div>
        )}

        {/* Manager Navigation Tabs */}
        {isManager && (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 mb-6 p-1 bg-slate-900/80 border border-slate-800 rounded-xl w-full">
            <button
              id="tab-mgr-overview"
              onClick={() => setActiveTab('overview')}
              className={`flex-1 min-w-[90px] py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Overview
            </button>
            <button
              id="tab-mgr-tasks"
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 min-w-[100px] py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Tasks &amp; Approvals
            </button>
            <button
              id="tab-mgr-leave"
              onClick={() => setActiveTab('leave')}
              className={`flex-1 min-w-[100px] py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'leave'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palmtree className="w-3.5 h-3.5" />
              Leave Approvals
            </button>
            <button
              id="tab-mgr-attendance"
              onClick={() => setActiveTab('attendance')}
              className={`flex-1 min-w-[120px] py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'attendance'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Attendance
            </button>
            <button
              id="tab-mgr-weekoff"
              onClick={() => setActiveTab('weekoff_approval')}
              className={`flex-1 min-w-[120px] py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'weekoff_approval'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palmtree className="w-3.5 h-3.5" />
              Week-Offs
            </button>
            <button
              id="tab-mgr-geolocation"
              onClick={() => setActiveTab('geolocation')}
              className={`flex-1 min-w-[100px] py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'geolocation'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Geolocation
            </button>
            <button
              id="tab-mgr-staff"
              onClick={() => setActiveTab('staff')}
              className={`flex-1 min-w-[80px] py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'staff'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Staff
            </button>
          </div>
        )}

        {/* Staff & Inventory Manager Navigation Tabs */}
        {isStaffOrInvMgr && (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 mb-6 p-1 bg-slate-900/80 border border-slate-800 rounded-xl w-full">
            <button
              id="tab-staff-clock"
              onClick={() => setActiveTab('overview')}
              className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'overview' || activeTab === 'clock_in_out'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Clock In / Out
            </button>
            <button
              id="tab-staff-tasks"
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Tasks &amp; Issues
            </button>
            <button
              id="tab-staff-leave"
              onClick={() => setActiveTab('leave')}
              className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'leave'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palmtree className="w-3.5 h-3.5" />
              Leave Requests
            </button>
            <button
              id="tab-staff-weekoff"
              onClick={() => setActiveTab('week_off')}
              className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'week_off'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palmtree className="w-3.5 h-3.5" />
              Week-Off Requests
            </button>
          </div>
        )}

        {/* Dashboard Alert Banners */}
        {/* 1. Staff / InvMgr Alert: Yesterday's attendance unmarked */}
        {isStaffOrInvMgr && unmarkedYesterdayStaff && (
          <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-800/80 text-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-amber-200">
                  Yesterday&apos;s attendance wasn&apos;t marked ({yesterdayDate}).
                </p>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  Request your Manager to update it so it won&apos;t be counted as Loss of Pay (LOP).
                </p>
              </div>
            </div>
            <button
              id="btn-alert-request-correction"
              onClick={() => setShowStaffCorrectionModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-md shadow-amber-950"
            >
              <FileEdit className="w-3.5 h-3.5" />
              Request Attendance Correction
            </button>
          </div>
        )}

        {/* 2. Manager Alert: Employees with unmarked attendance for yesterday */}
        {isManager && managerUnmarkedYesterdayCount > 0 && (
          <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-800/80 text-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-amber-200">
                  {managerUnmarkedYesterdayCount} employee{managerUnmarkedYesterdayCount > 1 ? 's have' : ' has'} unmarked attendance for yesterday ({yesterdayDate}).
                </p>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  Review end-of-day attendance to finalize staff hours and prevent incorrect payroll deductions.
                </p>
              </div>
            </div>
            <button
              id="btn-alert-review-yesterday-attendance"
              onClick={() => setActiveTab('attendance')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-md shadow-amber-950"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Review Yesterday&apos;s Attendance
            </button>
          </div>
        )}

        {/* 3. Manager Alert: Pending Attendance Correction Requests */}
        {isManager && managerPendingCorrectionsCount > 0 && (
          <div className="p-4 rounded-2xl bg-blue-950/80 border border-blue-800/80 text-blue-200 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-blue-200">
                  {managerPendingCorrectionsCount} attendance correction request{managerPendingCorrectionsCount > 1 ? 's' : ''} awaiting your review.
                </p>
                <p className="text-xs text-blue-300/80 mt-0.5">
                  Staff submitted requests for missed punches or past shifts.
                </p>
              </div>
            </div>
            <button
              id="btn-alert-review-corrections"
              onClick={() => setActiveTab('attendance')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-md shadow-blue-950"
            >
              <FileEdit className="w-3.5 h-3.5" />
              Review Requests
            </button>
          </div>
        )}

        {/* Main Content Area */}
        {activeTab === 'tasks' ? (
          <UnifiedTaskManagement />
        ) : activeTab === 'leave' ? (
          <UnifiedLeaveManagement />
        ) : isStaffOrInvMgr ? (
          activeTab === 'week_off' ? (
            <StaffWeekOffRequest />
          ) : (
            <StaffClockInOut />
          )
        ) : isOwner && activeTab === 'properties' ? (
          <OwnerPropertyManagement />
        ) : isManager && activeTab === 'attendance' ? (
          <ManagerAttendanceReview />
        ) : isManager && activeTab === 'weekoff_approval' ? (
          <ManagerWeekOffApproval />
        ) : isManager && activeTab === 'geolocation' ? (
          <ManagerGeolocationSetup />
        ) : (isOwner || isManager) && activeTab === 'staff' ? (
          <StaffManagement />
        ) : (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Main required display message */}
            <div className="space-y-2 text-center py-2">
              <div
                className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl border mb-2 ${
                  isOwner
                    ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                    : isManager
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    : currentUser.role === 'inventory_manager'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                }`}
              >
                <UserIcon className="w-7 h-7" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Logged in as {currentUser.name} ({roleDisplayName}) — {propertyName}
              </h1>
              <p className="text-sm text-slate-400">
                Auth state is verified in <code className="text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded text-xs">AuthContext</code>.
              </p>
            </div>

            {/* User details card */}
            <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-500" />
                  Role:
                </span>
                <span className="font-mono text-slate-200 uppercase text-xs px-2 py-0.5 bg-slate-800 rounded">
                  {currentUser.role}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-slate-500" />
                  Staff Type:
                </span>
                <span className="text-slate-200">{currentUser.staffType || 'N/A (Leadership)'}</span>
              </div>

              {currentUser.shiftStart && currentUser.shiftEnd && (
                <div className="flex items-center justify-between text-slate-400">
                  <span>Shift Timing:</span>
                  <span className="font-mono text-slate-200">
                    {currentUser.shiftStart} - {currentUser.shiftEnd}
                  </span>
                </div>
              )}
            </div>

            {/* Quick role-specific action alerts */}
            {isOwner && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-between text-xs text-purple-200">
                  <span>Review and approve petty cash &amp; head office task vouchers across all properties.</span>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium cursor-pointer shrink-0 ml-3 transition flex items-center gap-1.5"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    Task Approvals →
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-between text-xs text-purple-200">
                  <span>Monitor leave requests and staff availability across all properties.</span>
                  <button
                    onClick={() => setActiveTab('leave')}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium cursor-pointer shrink-0 ml-3 transition flex items-center gap-1.5"
                  >
                    <Palmtree className="w-3.5 h-3.5" />
                    Leave Management →
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-between text-xs text-purple-200">
                  <span>Manage properties and leadership assignments.</span>
                  <button
                    onClick={() => setActiveTab('properties')}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium cursor-pointer shrink-0 ml-3 transition"
                  >
                    Properties →
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-between text-xs text-indigo-200">
                  <span>View and manage all employees (Managers, Inventory Managers, Staff) across properties.</span>
                  <button
                    onClick={() => setActiveTab('staff')}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer shrink-0 ml-3 transition flex items-center gap-1"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Manage Employees →
                  </button>
                </div>
              </div>
            )}

            {isManager && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-between text-xs text-blue-200">
                  <span>Review tasks, configure payment vouchers, and approve no-payment requests.</span>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium cursor-pointer shrink-0 ml-3 transition flex items-center gap-1.5"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    Task Management →
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-between text-xs text-blue-200">
                  <span>End-of-day attendance review &amp; verification for staff.</span>
                  <button
                    onClick={() => setActiveTab('attendance')}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium cursor-pointer shrink-0 ml-3 transition flex items-center gap-1.5"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    Attendance Review →
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-between text-xs text-emerald-200">
                  <span>Review and approve employee multi-day leave applications.</span>
                  <button
                    onClick={() => setActiveTab('leave')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium cursor-pointer shrink-0 ml-3 transition flex items-center gap-1.5"
                  >
                    <Palmtree className="w-3.5 h-3.5" />
                    Leave Approvals →
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-800/40 flex items-center justify-between text-xs text-sky-200">
                  <span>Review and approve pending staff week-off requests.</span>
                  <button
                    onClick={() => setActiveTab('weekoff_approval')}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium cursor-pointer shrink-0 ml-3 transition flex items-center gap-1.5"
                  >
                    <Palmtree className="w-3.5 h-3.5" />
                    Week-Off Approvals →
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-between text-xs text-blue-200">
                  <span>Configure GPS coordinates &amp; geofence radius for your property.</span>
                  <button
                    onClick={() => setActiveTab('geolocation')}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium cursor-pointer shrink-0 ml-3 transition flex items-center gap-1.5"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    Setup Geolocation →
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-between text-xs text-indigo-200">
                  <span>Manage on-ground staff for {propertyName}.</span>
                  <button
                    onClick={() => setActiveTab('staff')}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer shrink-0 ml-3 transition flex items-center gap-1"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Manage Staff →
                  </button>
                </div>
              </div>
            )}

            {isStaffOrInvMgr && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-between text-xs text-indigo-200">
                  <span>Report operational maintenance issues and supplies needs with photo attachments.</span>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer shrink-0 ml-3 transition flex items-center gap-1.5"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    Tasks &amp; Issues →
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-between text-xs text-emerald-200">
                  <span>Apply for multi-day leave and track approval status.</span>
                  <button
                    onClick={() => setActiveTab('leave')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium cursor-pointer shrink-0 ml-3 transition flex items-center gap-1.5"
                  >
                    <Palmtree className="w-3.5 h-3.5" />
                    Request Leave →
                  </button>
                </div>
              </div>
            )}

            {/* Footer note */}
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-950/30 p-3 rounded-lg border border-slate-800/40">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Session is active. Click &quot;Sign Out&quot; to securely end your session.</span>
            </div>
          </div>
        )}

        {/* Staff Attendance Correction Modal (triggered from dashboard alert banner) */}
        {isStaffOrInvMgr && (
          <AttendanceCorrectionModal
            isOpen={showStaffCorrectionModal}
            onClose={() => setShowStaffCorrectionModal(false)}
            onSubmitted={() => {
              checkAlerts();
            }}
          />
        )}
      </div>
    </div>
  );
}
