import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { UserTransaction } from '@shared/types';
import {
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  Trash2,
  Edit3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  FileSpreadsheet
} from 'lucide-react';

export const TransactionsTab: React.FC = () => {
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<UserTransaction | null>(null);
  const [formType, setFormType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('Groceries & Household');
  const [formSubCategory, setFormSubCategory] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formMethod, setFormMethod] = useState<'UPI' | 'BANK_TRANSFER' | 'CASH' | 'CARD' | 'NET_BANKING'>('UPI');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formRecurring, setFormRecurring] = useState(false);
  const [savingTx, setSavingTx] = useState(false);
  const [budgetAlertNotice, setBudgetAlertNotice] = useState<string | null>(null);

  // CSV Import Modal
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvImportResult, setCsvImportResult] = useState<any>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/transactions', {
        params: {
          type: typeFilter,
          category: categoryFilter,
          search: searchQuery || undefined,
          sortBy,
          sortOrder
        }
      });
      setTransactions(res.data.transactions || []);

      const sumRes = await api.get('/transactions/summary');
      setSummary(sumRes.data);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [typeFilter, categoryFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  // Add or Edit Transaction
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || !formDesc || !formCategory) return;
    setSavingTx(true);
    setBudgetAlertNotice(null);

    try {
      if (editingTx) {
        await api.put(`/transactions/${editingTx.id}`, {
          type: formType,
          amount: Number(formAmount),
          category: formCategory,
          subCategory: formSubCategory || undefined,
          description: formDesc,
          paymentMethod: formMethod,
          date: new Date(formDate).toISOString(),
          isRecurring: formRecurring
        });
      } else {
        const res = await api.post('/transactions', {
          type: formType,
          amount: Number(formAmount),
          category: formCategory,
          subCategory: formSubCategory || undefined,
          description: formDesc,
          paymentMethod: formMethod,
          date: new Date(formDate).toISOString(),
          isRecurring: formRecurring
        });
        if (res.data.budgetNotice) {
          setBudgetAlertNotice(res.data.budgetNotice);
        }
      }

      setModalOpen(false);
      resetForm();
      fetchTransactions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save transaction');
    } finally {
      setSavingTx(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction record?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      fetchTransactions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete transaction');
    }
  };

  const openAddModal = () => {
    resetForm();
    setEditingTx(null);
    setModalOpen(true);
  };

  const openEditModal = (tx: UserTransaction) => {
    setEditingTx(tx);
    setFormType(tx.type);
    setFormAmount(tx.amount.toString());
    setFormCategory(tx.category);
    setFormSubCategory(tx.subCategory || '');
    setFormDesc(tx.description);
    setFormMethod(tx.paymentMethod);
    setFormDate(tx.date ? tx.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setFormRecurring(Boolean(tx.isRecurring));
    setModalOpen(true);
  };

  const resetForm = () => {
    setEditingTx(null);
    setFormType('EXPENSE');
    setFormAmount('');
    setFormCategory('Groceries & Household');
    setFormSubCategory('');
    setFormDesc('');
    setFormMethod('UPI');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormRecurring(false);
  };

  // CSV Export
  const handleExportCsv = () => {
    window.open('http://localhost:5000/api/transactions/export-csv', '_blank');
  };

  // CSV Import File Parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        alert('CSV file must contain a header row and at least one data row.');
        return;
      }

      const rows: any[] = [];
      // Simple parser
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 4) {
          rows.push({
            date: cols[0] || new Date().toISOString().slice(0, 10),
            type: cols[1]?.toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSE',
            category: cols[2] || 'Imported Expense',
            description: cols[3] || 'Imported Transaction',
            amount: parseFloat(cols[4] || '0'),
            paymentMethod: cols[5] || 'BANK_TRANSFER'
          });
        }
      }
      setCsvPreviewRows(rows);
      setCsvImportResult(null);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (csvPreviewRows.length === 0) return;
    setImportingCsv(true);
    try {
      const res = await api.post('/transactions/import-csv', { csvRows: csvPreviewRows });
      setCsvImportResult(res.data);
      fetchTransactions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to import CSV');
    } finally {
      setImportingCsv(false);
    }
  };

  const standardCategories = [
    'Salary & Earnings',
    'Freelance & Consulting',
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

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-16">
      
      {/* Top Banner: Income / Expense / Cashflow Metrics */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Income</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">
                ₹{summary.totalIncome?.toLocaleString('en-IN') || 0}
              </span>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Recorded for {summary.month}</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp size={20} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Living Spend</span>
              <span className="text-2xl font-black text-rose-400 mt-1 block">
                ₹{summary.totalExpenses?.toLocaleString('en-IN') || 0}
              </span>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Living & lifestyle expenses</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <TrendingDown size={20} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Net Cashflow</span>
              <span className={`text-2xl font-black mt-1 block ${
                summary.netCashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {summary.netCashflow >= 0 ? '+' : ''}₹{summary.netCashflow?.toLocaleString('en-IN') || 0}
              </span>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Surplus retained this month</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <DollarSign size={20} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Transactions Log</span>
              <span className="text-2xl font-black text-white mt-1 block">
                {summary.transactionCount || 0}
              </span>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Active items filtered</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Calendar size={20} />
            </div>
          </div>

        </div>
      )}

      {/* Notice if budget threshold alert was received */}
      {budgetAlertNotice && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-400 shrink-0" />
            <span>{budgetAlertNotice}</span>
          </div>
          <button onClick={() => setBudgetAlertNotice(null)} className="text-amber-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Control Actions & Search Bar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search transactions by title, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </form>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-bold focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="INCOME">Income Only</option>
            <option value="EXPENSE">Expense Only</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-bold focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {standardCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Action Buttons */}
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} /> Add Record
          </button>

          <button
            onClick={() => setCsvModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Import bank statements or CSV transactions"
          >
            <Upload size={14} /> Import CSV
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Export transactions as CSV"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>

      </div>

      {/* Transactions Data Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs font-medium">
            Loading transaction records...
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <DollarSign size={28} className="text-slate-600" />
            <span className="font-bold text-sm text-slate-400">No transactions recorded yet</span>
            <p className="text-xs text-slate-500 max-w-sm">
              Track your daily living expenses, salary credits, and freelance earnings to build a verified cashflow surplus.
            </p>
            <button
              onClick={openAddModal}
              className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs cursor-pointer"
            >
              Add First Transaction
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-950/50">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {transactions.map(tx => {
                  const isIncome = tx.type === 'INCOME';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {tx.date ? tx.date.slice(0, 10) : 'Recent'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isIncome ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-200 font-bold">
                        {tx.category}
                        {tx.subCategory && (
                          <span className="block text-[10px] text-slate-500 font-normal">{tx.subCategory}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                        {tx.description}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/80">
                          {tx.paymentMethod || 'UPI'}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 text-right font-black text-sm ${
                        isIncome ? 'text-emerald-400' : 'text-slate-100'
                      }`}>
                        {isIncome ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(tx)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── ADD / EDIT TRANSACTION MODAL ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-white text-base">
                {editingTx ? 'Edit Transaction' : 'Record Transaction'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="flex flex-col gap-4 text-xs font-medium">
              
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormType('EXPENSE')}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    formType === 'EXPENSE' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('INCOME')}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    formType === 'INCOME' ? 'bg-emerald-500 text-black shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Income
                </button>
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold">Amount (₹)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 2500"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Grocery Restock"
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-bold focus:outline-none"
                  >
                    {standardCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold">Payment Method</label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-bold focus:outline-none"
                  >
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CARD">Credit/Debit Card</option>
                    <option value="NET_BANKING">Net Banking</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>

              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold">Transaction Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Recurring Switch */}
              <label className="flex items-center gap-2 cursor-pointer pt-1 text-slate-300">
                <input
                  type="checkbox"
                  checked={formRecurring}
                  onChange={(e) => setFormRecurring(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span>This is a regular recurring transaction</span>
              </label>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTx}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingTx ? 'Saving...' : editingTx ? 'Update Record' : 'Save Record'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ─── CSV IMPORT MODAL ─── */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-400" size={20} />
                <h3 className="font-extrabold text-white text-base">Import Bank Statement / CSV</h3>
              </div>
              <button onClick={() => setCsvModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Upload a standard CSV file with headers: <code className="text-emerald-400">Date, Type, Category, Description, Amount, PaymentMethod</code>.
            </p>

            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-emerald-500 file:text-black hover:file:bg-emerald-400"
            />

            {csvPreviewRows.length > 0 && !csvImportResult && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-300">
                  Preview ({csvPreviewRows.length} rows parsed):
                </span>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-2 text-[11px] font-mono divide-y divide-slate-800/60">
                  {csvPreviewRows.slice(0, 5).map((row, idx) => (
                    <div key={idx} className="py-1.5 flex justify-between gap-2 text-slate-300">
                      <span>{row.date} | {row.description}</span>
                      <span className={row.type === 'INCOME' ? 'text-emerald-400' : 'text-slate-200 font-bold'}>
                        ₹{row.amount}
                      </span>
                    </div>
                  ))}
                  {csvPreviewRows.length > 5 && (
                    <div className="text-slate-500 py-1 text-center font-sans">
                      ...and {csvPreviewRows.length - 5} more rows
                    </div>
                  )}
                </div>
              </div>
            )}

            {csvImportResult && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs flex flex-col gap-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 size={16} />
                  <span>{csvImportResult.message}</span>
                </div>
                {csvImportResult.skippedCount > 0 && (
                  <span className="text-slate-400 text-[11px]">
                    Skipped {csvImportResult.skippedCount} transactions already present to prevent duplicate records.
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800"
              >
                Close
              </button>
              {csvPreviewRows.length > 0 && !csvImportResult && (
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importingCsv}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {importingCsv ? 'Importing...' : `Confirm Import (${csvPreviewRows.length} rows)`}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
