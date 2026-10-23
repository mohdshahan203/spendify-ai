import React from 'react';
import { FinancialInsightsResult } from '@shared/types';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Percent,
  CalendarCheck,
  AlertTriangle,
  Receipt,
  PiggyBank,
  ChevronRight,
  TrendingUp,
  CreditCard
} from 'lucide-react';

interface LiveFinancialInsightsProps {
  insights: FinancialInsightsResult | null;
  loading: boolean;
  onNavigateTab: (tab: any) => void;
}

export const LiveFinancialInsights: React.FC<LiveFinancialInsightsProps> = ({
  insights,
  loading,
  onNavigateTab
}) => {
  if (loading && !insights) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 rounded-3xl bg-slate-900 border border-slate-800"></div>
        ))}
      </div>
    );
  }

  const metrics = insights?.metrics;
  const monthlyIncome = metrics?.monthlyIncome || 0;
  const monthlyExpenses = metrics?.monthlyExpenses || 0;
  const disposableIncome = metrics?.disposableIncome || 0;
  const existingDebtEmis = metrics?.existingDebtEmis || 0;
  const dti = metrics?.debtToIncomeRatio || 0;
  const upcoming = insights?.upcomingRepayments || [];
  const overdue = insights?.overdueRepayments || [];

  const isDtiHigh = dti > 40;
  const isSurplusNegative = disposableIncome < 0;

  return (
    <div className="flex flex-col gap-5">
      {/* 4 Core Financial Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Verified Monthly Income */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-[#0F172A] border border-slate-800 shadow-lg flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Monthly Income</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ArrowDownRight size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-white">
              ₹{monthlyIncome.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {metrics?.incomeStability === 'STABLE' ? '🟢 Stable Cashflow' : metrics?.incomeStability === 'MODERATE' ? '🔵 Moderate Variance' : '🟠 Variable Cashflow'}
            </span>
          </div>
        </div>

        {/* Card 2: Essential Expenses */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-[#0F172A] border border-slate-800 shadow-lg flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Living Expenses</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-rose-400">
              ₹{monthlyExpenses.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {monthlyIncome > 0 ? `${Math.round((monthlyExpenses / monthlyIncome) * 100)}% of income` : 'Standard household baseline'}
            </span>
          </div>
        </div>

        {/* Card 3: Free Disposable Surplus */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-[#0F172A] border border-slate-800 shadow-lg flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Disposable Surplus</span>
            <div className={`p-2 rounded-xl ${isSurplusNegative ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <div className={`text-xl md:text-2xl font-black ${isSurplusNegative ? 'text-red-400' : 'text-emerald-400'}`}>
              ₹{disposableIncome.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {isSurplusNegative ? '⚠️ Cashflow Deficit' : 'Available for savings / EMI'}
            </span>
          </div>
        </div>

        {/* Card 4: Debt-to-Income (DTI) */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-[#0F172A] border border-slate-800 shadow-lg flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Debt / Income (DTI)</span>
            <div className={`p-2 rounded-xl ${isDtiHigh ? 'bg-amber-500/10 text-amber-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
              <Percent size={16} />
            </div>
          </div>
          <div>
            <div className={`text-xl md:text-2xl font-black ${isDtiHigh ? 'text-amber-400' : 'text-cyan-400'}`}>
              {dti}%
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {dti <= 30 ? '🛡️ Optimal Buffer (<30%)' : dti <= 45 ? '⚖️ Moderate Commitment' : '⚠️ High Debt Burden'}
            </span>
          </div>
        </div>
      </div>

      {/* Overdue Alert Banner if active */}
      {overdue.length > 0 && (
        <div className="p-5 rounded-2xl bg-red-950/30 border border-red-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
            <div>
              <span className="font-bold text-red-200 text-sm block">
                {overdue.length} Overdue Instalment(s) Pending Resolution
              </span>
              <span className="text-xs text-red-300/80 mt-0.5 block">
                Total Overdue: ₹{overdue.reduce((s, o) => s + (Number(o.emiAmount) || 0), 0).toLocaleString('en-IN')}. Settle immediately to protect your credit score.
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('repayments')}
            className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-extrabold text-xs transition-all shadow-md shrink-0 cursor-pointer text-center"
          >
            Pay Overdue Now
          </button>
        </div>
      )}

      {/* Upcoming Repayment & Telemetry Status Banner */}
      <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400">
            <CalendarCheck size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Upcoming Debt Obligation</span>
            {upcoming.length > 0 ? (
              <span className="text-sm font-extrabold text-white">
                Next EMI of ₹{upcoming[0].emiAmount.toLocaleString('en-IN')} due on {new Date(upcoming[0].dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </span>
            ) : (
              <span className="text-sm text-slate-300">
                No scheduled instalments pending for the current cycle.
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('repayments')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
          >
            Manage Repayments
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
