import React, { useEffect, useState } from 'react';
import { User } from '../types';
import {
  getCarriedForwardWeekOffBalance,
  getEmployeeMonthlySalary,
} from '../services/dataService';
import {
  UserMinus,
  X,
  AlertTriangle,
  Calendar,
  IndianRupee,
  Calculator,
  Info,
  CheckCircle2,
  Hourglass,
  Briefcase,
  UserCheck,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employee: User | null;
  onConfirmOffboard: (employee: User) => Promise<void>;
  isProcessing: boolean;
}

export default function OffboardModal({
  isOpen,
  onClose,
  employee,
  onConfirmOffboard,
  isProcessing,
}: Props) {
  const [loadingCalcs, setLoadingCalcs] = useState<boolean>(true);
  const [monthlySalary, setMonthlySalary] = useState<number>(0);
  const [carriedForwardBalance, setCarriedForwardBalance] = useState<number>(0);

  useEffect(() => {
    async function loadData() {
      if (!employee || !isOpen) return;

      try {
        setLoadingCalcs(true);
        const [salary, weekOffBal] = await Promise.all([
          getEmployeeMonthlySalary(employee),
          getCarriedForwardWeekOffBalance(employee.id),
        ]);
        setMonthlySalary(salary);
        setCarriedForwardBalance(weekOffBal);
      } catch (err) {
        console.error('Failed to calculate offboarding balance', err);
      } finally {
        setLoadingCalcs(false);
      }
    }

    loadData();
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  // Calendar calculations
  const now = new Date();
  const currentMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyRate = daysInCurrentMonth > 0 ? monthlySalary / daysInCurrentMonth : 0;
  const encashmentAmount = carriedForwardBalance * dailyRate;

  const roleLabel =
    employee.role === 'inventory_manager'
      ? 'Inventory Manager'
      : employee.staffType
      ? `${employee.staffType} (Staff)`
      : 'Staff Member';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Offboard Employee
              </h3>
              <p className="text-xs text-slate-400">
                Calculate final week-off settlement before removing employee.
              </p>
            </div>
          </div>
          <button
            id="btn-close-offboard-modal"
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Employee Summary Card */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Employee
              </span>
              <h4 className="text-base font-bold text-white">{employee.name}</h4>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium">
              {roleLabel}
            </span>
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Phone: <strong className="text-slate-300 font-mono">{employee.phone}</strong></span>
            <span>ID: <strong className="text-slate-400 font-mono">{employee.id}</strong></span>
          </div>
        </div>

        {/* Calculation Breakdown */}
        {loadingCalcs ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
            <Hourglass className="w-5 h-5 animate-spin text-indigo-400" />
            <span>Calculating carried-forward week-off balance &amp; payout...</span>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Calculator className="w-4 h-4 text-indigo-400" />
              <span>Week-off Encashment Calculation ({currentMonthName})</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Monthly Salary */}
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                <span className="text-slate-400 text-[11px] block">Monthly Salary</span>
                <span className="text-sm font-bold text-white font-mono">
                  ₹{monthlySalary.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Days in Month */}
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                <span className="text-slate-400 text-[11px] block">Days in Current Month</span>
                <span className="text-sm font-bold text-white font-mono">
                  {daysInCurrentMonth} days
                </span>
              </div>

              {/* Daily Rate */}
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                <span className="text-slate-400 text-[11px] block">Calculated Daily Rate</span>
                <span className="text-sm font-bold text-indigo-300 font-mono">
                  ₹{dailyRate.toFixed(2)} / day
                </span>
                <span className="text-[10px] text-slate-500 block">
                  (₹{monthlySalary.toLocaleString('en-IN')} ÷ {daysInCurrentMonth})
                </span>
              </div>

              {/* Carried Forward Balance */}
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                <span className="text-slate-400 text-[11px] block">Carried-Forward Week-Offs</span>
                <span className="text-sm font-bold text-amber-300 font-mono">
                  {carriedForwardBalance} {carriedForwardBalance === 1 ? 'day' : 'days'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Unused balance from prior months
                </span>
              </div>
            </div>

            {/* Encashment Payout Box */}
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider block">
                  Week-off encashment payout
                </span>
                <span className="text-[11px] text-emerald-200/70 block font-mono">
                  {carriedForwardBalance} days × ₹{dailyRate.toFixed(2)}/day
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono shrink-0">
                ₹{encashmentAmount.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            {/* Read-Only Disclaimer Note */}
            <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 text-blue-300 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11.5px]">
                This calculates the payout amount for reference. Actual payment processing happens outside this system for now.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            id="btn-confirm-offboard"
            type="button"
            onClick={() => onConfirmOffboard(employee)}
            disabled={isProcessing || loadingCalcs}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-md shadow-rose-950"
          >
            {isProcessing ? (
              <>
                <Hourglass className="w-3.5 h-3.5 animate-spin" />
                Offboarding...
              </>
            ) : (
              <>
                <UserMinus className="w-3.5 h-3.5" />
                Confirm Offboarding
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
