import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Target,
  PiggyBank,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Calendar,
  X,
  ArrowRight
} from 'lucide-react';

export const BudgetsTab: React.FC = () => {
  const [budgetData, setBudgetData] = useState<any>(null);
  const [goalsData, setGoalsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Budget Modal
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState('Groceries & Household');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  // Goal Modal
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [goalPriority, setGoalPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [savingGoal, setSavingGoal] = useState(false);

  // Contribute Modal
  const [contributeModalOpen, setContributeModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [processingContribution, setProcessingContribution] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bRes, gRes] = await Promise.all([
        api.get('/budgets'),
        api.get('/savings-goals')
      ]);
      setBudgetData(bRes.data);
      setGoalsData(gRes.data);
    } catch (err) {
      console.error('Failed to load budget & goals data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save Category Budget
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetCategory || !budgetLimit) return;
    setSavingBudget(true);

    try {
      await api.post('/budgets', {
        category: budgetCategory,
        limitAmount: Number(budgetLimit)
      });
      setBudgetModalOpen(false);
      setBudgetLimit('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save budget');
    } finally {
      setSavingBudget(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!window.confirm('Delete this category budget limit?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete budget');
    }
  };

  // Save Savings Goal
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle || !goalTarget || !goalDate) return;
    setSavingGoal(true);

    try {
      await api.post('/savings-goals', {
        title: goalTitle,
        targetAmount: Number(goalTarget),
        targetDate: goalDate,
        priority: goalPriority
      });
      setGoalModalOpen(false);
      setGoalTitle('');
      setGoalTarget('');
      setGoalDate('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save goal');
    } finally {
      setSavingGoal(false);
    }
  };

  // Contribute Funds
  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !contributeAmount) return;
    setProcessingContribution(true);

    try {
      await api.post(`/savings-goals/${selectedGoal.id}/contribute`, {
        amount: Number(contributeAmount),
        recordTransaction: true
      });
      setContributeModalOpen(false);
      setContributeAmount('');
      setSelectedGoal(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record contribution');
    } finally {
      setProcessingContribution(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!window.confirm('Archive this savings goal?')) return;
    try {
      await api.delete(`/savings-goals/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to archive goal');
    }
  };

  const standardCategories = [
    'Housing & Rent',
    'Groceries & Household',
    'Utilities & Bills',
    'Dining & Leisure',
    'Transit & Commute',
    'Healthcare & Medical',
    'Education & Learning',
    'Savings & Investments',
    'Personal & Misc'
  ];

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500 text-xs font-medium">
        Loading monthly budgets and savings goals...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fadeIn pb-16">
      
      {/* ─── SECTION 1: MONTHLY CATEGORY BUDGETS ─── */}
      <div className="flex flex-col gap-5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Target size={18} className="text-emerald-400" />
              <h2 className="text-xl font-extrabold text-white">Monthly Expense Budgets</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Set category spending limits. Automated alerts fire when 80% of budget is reached or exceeded.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
              Month: {budgetData?.month || 'Current'}
            </span>
            <button
              onClick={() => setBudgetModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} /> Set Budget
            </button>
          </div>
        </div>

        {/* Overall Budget Progress Strip */}
        {budgetData && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300">
                Total Budget Utilisation: <strong className="text-white">₹{budgetData.totalSpent?.toLocaleString('en-IN')}</strong> of ₹{budgetData.totalBudget?.toLocaleString('en-IN')}
              </span>
              <span className={budgetData.overallUtilisation > 90 ? 'text-rose-400' : 'text-emerald-400'}>
                {budgetData.overallUtilisation}%
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${Math.min(100, budgetData.overallUtilisation)}%` }}
                className={`h-full transition-all ${
                  budgetData.overallUtilisation >= 100
                    ? 'bg-rose-500'
                    : budgetData.overallUtilisation >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Remaining monthly allowance: ₹{budgetData.totalRemaining?.toLocaleString('en-IN')}</span>
              <span>Threshold warning active at 80%</span>
            </div>
          </div>
        )}

        {/* Category Budget Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgetData?.budgets?.length === 0 ? (
            <div className="col-span-2 p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
              No category limits configured for this month. Click "Set Budget" to define spending boundaries.
            </div>
          ) : (
            budgetData?.budgets?.map((b: any) => {
              const isExceeded = b.status === 'EXCEEDED';
              const isWarning = b.status === 'WARNING_80';

              return (
                <div
                  key={b.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col gap-3 ${
                    isExceeded
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : isWarning
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-white">{b.category}</h4>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Spent ₹{b.spentAmount?.toLocaleString('en-IN')} / Limit ₹{b.limitAmount?.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        isExceeded
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {b.percentUtilised}%
                      </span>
                      <button
                        onClick={() => handleDeleteBudget(b.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Remove budget"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden shadow-inner">
                    <div
                      style={{ width: `${Math.min(100, b.percentUtilised)}%` }}
                      className={`h-full transition-all ${
                        isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">
                      {isExceeded
                        ? `Over budget by ₹${(b.spentAmount - b.limitAmount).toLocaleString('en-IN')}!`
                        : `Remaining: ₹${b.remainingAmount?.toLocaleString('en-IN')}`}
                    </span>
                    {isWarning && (
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <AlertTriangle size={12} /> Near limit
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* ─── SECTION 2: SAVINGS GOALS ─── */}
      <div className="flex flex-col gap-5 pt-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <PiggyBank size={20} className="text-emerald-400" />
              <h2 className="text-xl font-extrabold text-white">Savings Goals & Emergency Reserves</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Track targeted capital goals with automated monthly saving estimations and cashflow feasibility checks.
            </p>
          </div>

          <button
            onClick={() => setGoalModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus size={15} /> Create Goal
          </button>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {goalsData?.goals?.length === 0 ? (
            <div className="col-span-2 p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
              No savings goals active. Set a goal like an Emergency Reserve or Laptop Upgrade to plan surplus savings.
            </div>
          ) : (
            goalsData?.goals?.map((g: any) => {
              const isFeasible = g.feasibility === 'ACHIEVABLE';
              const isTight = g.feasibility === 'TIGHT';

              return (
                <div
                  key={g.id}
                  className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-4 shadow-sm relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-base text-white">{g.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          g.priority === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          g.priority === 'MEDIUM' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {g.priority} PRIORITY
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium mt-0.5 block">
                        Target Date: {new Date(g.targetDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} ({g.monthsRemaining} mos remaining)
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteGoal(g.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      title="Archive goal"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Numbers */}
                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Accumulated</span>
                      <span className="text-xl font-black text-emerald-400">
                        ₹{g.currentAmount?.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Target</span>
                      <span className="text-base font-bold text-slate-300">
                        ₹{g.targetAmount?.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden shadow-inner">
                    <div
                      style={{ width: `${g.progressPercent}%` }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all"
                    />
                  </div>

                  {/* Estimator Strip */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Estimated Monthly Saving Required</span>
                      <span className="font-extrabold text-white text-sm">₹{g.requiredMonthlySaving?.toLocaleString('en-IN')}/mo</span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                      isFeasible ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      isTight ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}>
                      {g.feasibility} VS SURPLUS
                    </span>
                  </div>

                  {/* Contribute Button */}
                  <button
                    onClick={() => {
                      setSelectedGoal(g);
                      setContributeModalOpen(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> Contribute Funds to Goal
                  </button>

                </div>
              );
            })
          )}
        </div>

      </div>

      {/* ─── MODAL: SET BUDGET ─── */}
      {budgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-white text-base">Set Monthly Category Budget</h3>
              <button onClick={() => setBudgetModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="flex flex-col gap-4 text-xs font-medium">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold">Category</label>
                <select
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-bold focus:outline-none"
                >
                  {standardCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold">Monthly Spending Cap (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 10000"
                  required
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setBudgetModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBudget}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md disabled:opacity-50"
                >
                  {savingBudget ? 'Saving...' : 'Set Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE SAVINGS GOAL ─── */}
      {goalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-white text-base">New Savings Goal</h3>
              <button onClick={() => setGoalModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="flex flex-col gap-4 text-xs font-medium">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold">Goal Title</label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Reserve Fund"
                  required
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold">Target Capital (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  required
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-bold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold">Target Date</label>
                  <input
                    type="date"
                    required
                    value={goalDate}
                    onChange={(e) => setGoalDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold">Priority</label>
                  <select
                    value={goalPriority}
                    onChange={(e) => setGoalPriority(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-bold focus:outline-none"
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setGoalModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGoal}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md disabled:opacity-50"
                >
                  {savingGoal ? 'Saving...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CONTRIBUTE TO GOAL ─── */}
      {contributeModalOpen && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-white text-base">Contribute to {selectedGoal.title}</h3>
              <button onClick={() => setContributeModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleContribute} className="flex flex-col gap-4 text-xs font-medium">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold">Contribution Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  required
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-base text-emerald-400 font-black focus:outline-none"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                This contribution will be automatically recorded in your transaction log under <em>Savings & Investments</em>.
              </p>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setContributeModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingContribution}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md disabled:opacity-50"
                >
                  {processingContribution ? 'Processing...' : 'Confirm Contribution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
