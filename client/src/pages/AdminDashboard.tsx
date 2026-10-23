import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { KYCDocument, Loan } from '@shared/types';
import { 
  Users, 
  FileCheck, 
  Landmark, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  PieChart
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const { toast } = { toast: useToast() };
  const navigate = useNavigate();
  
  // States
  const [pendingKycs, setPendingKycs] = useState<KYCDocument[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Selected KYC audit state
  const [auditUserKyc, setAuditUserKyc] = useState<KYCDocument | null>(null);
  const [auditNotes, setAuditNotes] = useState('');
  const [auditing, setAuditing] = useState(false);

  // Expanded profile accordion ID
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      const statsRes = await api.get('/admin/stats');
      setStats(statsRes.data);

      const kycRes = await api.get('/admin/pending-kyc');
      setPendingKycs(kycRes.data);

      const loansRes = await api.get('/admin/loans');
      setLoans(loansRes.data);

      const profilesRes = await api.get('/admin/profiles');
      setProfiles(profilesRes.data);
    } catch (err) {
      console.error('Error fetching admin details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Verify KYC (Approve / Reject)
  const handleVerifyKyc = async (userId: string, status: 'APPROVED' | 'REJECTED') => {
    setAuditing(true);
    try {
      await api.post('/admin/verify-kyc', {
        userId,
        status,
        notes: auditNotes
      });
      toast.success(`User verification status updated to ${status}.`, 'KYC Audit Recorded');
      setAuditUserKyc(null);
      setAuditNotes('');
      fetchAdminData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit verification status.', 'Audit Error');
    } finally {
      setAuditing(false);
    }
  };

  // Review Loan (Approve / Reject)
  const handleReviewLoan = async (loanId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.post('/admin/review-loan', { loanId, status });
      toast.success(`Loan application has been ${status.toLowerCase()}ed.`, 'Loan Decision Processed');
      fetchAdminData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to review loan application.', 'Review Error');
    }
  };

  const pendingLoans = loans.filter(l => l.status === 'PENDING');

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-slate-500 font-medium">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        Loading Admin Panel...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 pb-16">
      {/* Navbar */}
      <nav className="w-full px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-extrabold tracking-tight text-primary">
            SpendiFy
          </span>
          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-accent text-primary border border-green-200 uppercase">
            Admin Console
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/model-lab')} 
            className="text-xs px-4 py-2 rounded-xl border border-emerald-300 bg-accent text-primary hover:bg-emerald-100 active:scale-[0.98] transition-all font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <PieChart size={14} className="text-primary" />
            <span>AI Model Lab</span>
          </button>
          <button 
            onClick={logout} 
            className="text-xs px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-[0.98] transition-all font-bold text-slate-700 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 mt-8 flex flex-col gap-8">
        
        {/* Core Stats Section */}
        {stats && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              
              {/* Total Borrowers */}
              <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-100 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-primary shrink-0">
                  <Users size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Borrowers</span>
                  <span className="text-xl font-extrabold text-slate-900">{stats.totalBorrowers}</span>
                </div>
              </div>

              {/* Disbursed Volume */}
              <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-100 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] flex items-center justify-center text-[#43A047] shrink-0">
                  <Landmark size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Disbursed</span>
                  <span className="text-xl font-extrabold text-slate-900">₹{(stats.loanStats?.totalDisbursed || stats.loanStats?.totalVolume || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Outstanding Active Principal */}
              <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-100 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <Landmark size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Book</span>
                  <span className="text-xl font-extrabold text-slate-900">₹{(stats.loanStats?.activeVolume || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Repayments Collected */}
              <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-100 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
                  <CheckCircle size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Repayments</span>
                  <span className="text-xl font-extrabold text-slate-900">₹{(stats.loanStats?.totalRepaymentsCollected || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Overdue Count */}
              <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-100 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                  <FileCheck size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Overdue EMIs</span>
                  <span className={`text-xl font-extrabold ${stats.loanStats?.overdueCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {stats.loanStats?.overdueCount || 0}
                  </span>
                </div>
              </div>

              {/* High-risk Alerts */}
              <div className="p-5 rounded-2xl bg-red-50/50 border border-red-100 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-[#E53935] shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">High Risk</span>
                  <span className="text-xl font-extrabold text-red-600">{stats.highRiskBorrowers?.length || 0}</span>
                </div>
              </div>

            </div>

            {/* Risk Distribution Bar */}
            {stats.riskDistribution && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-700">
                  <PieChart size={16} className="text-primary" />
                  <span>Portfolio AI Risk Distribution:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-green-100 text-[#2E7D32] font-extrabold border border-green-200">
                    LOW: {stats.riskDistribution.LOW || 0}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-extrabold border border-blue-200">
                    MEDIUM: {stats.riskDistribution.MEDIUM || 0}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-extrabold border border-amber-200">
                    HIGH: {stats.riskDistribution.HIGH || 0}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-extrabold border border-red-200">
                    CRITICAL: {stats.riskDistribution.CRITICAL || 0}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audit Document Auditing panel */}
        {auditUserKyc && (
          <div className="p-8 rounded-3xl bg-accent/40 border border-green-200 flex flex-col gap-6 shadow-sm">
            <h3 className="text-xl font-extrabold text-primary flex items-center gap-2">
              🔍 Auditing Documents: {auditUserKyc.user?.name || 'Borrower'}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase text-slate-500 font-bold">Aadhaar Number</span>
                <span className="font-semibold text-slate-800 text-md">{auditUserKyc.aadhaarNumber || 'N/A'}</span>
                <a 
                  href={`http://localhost:5000${auditUserKyc.aadhaarUrl}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-sm text-primary font-bold hover:underline flex items-center gap-1.5 mt-1"
                >
                  View Aadhaar Document PDF <ExternalLink size={14} />
                </a>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase text-slate-500 font-bold">PAN Card Number</span>
                <span className="font-semibold text-slate-800 text-md">{auditUserKyc.panNumber || 'N/A'}</span>
                <a 
                  href={`http://localhost:5000${auditUserKyc.panUrl}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-sm text-primary font-bold hover:underline flex items-center gap-1.5 mt-1"
                >
                  View PAN Document PDF <ExternalLink size={14} />
                </a>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-200 pt-4">
                <span className="text-xs uppercase text-slate-500 font-bold">Bank Statement</span>
                <a 
                  href={`http://localhost:5000${auditUserKyc.bankStatementUrl}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-sm text-primary font-bold hover:underline flex items-center gap-1.5 mt-1"
                >
                  View Bank Statement PDF <ExternalLink size={14} />
                </a>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-200 pt-4">
                <span className="text-xs uppercase text-slate-500 font-bold">E-Signature</span>
                <a 
                  href={`http://localhost:5000${auditUserKyc.esignatureUrl}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-sm text-primary font-bold hover:underline flex items-center gap-1.5 mt-1"
                >
                  View E-signature file <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200 pt-4">
              <label className="text-sm font-bold text-slate-700">Verification Notes (Required on rejection)</label>
              <textarea
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                placeholder="Write verification comments or reasons for rejection here..."
                className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-primary text-slate-800"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleVerifyKyc(auditUserKyc.userId, 'APPROVED')}
                disabled={auditing}
                className="px-6 py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-[#1B5E20] active:scale-[0.98] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle size={14} /> Approve Profile
              </button>
              <button 
                onClick={() => handleVerifyKyc(auditUserKyc.userId, 'REJECTED')}
                disabled={auditing || !auditNotes.trim()}
                className="px-6 py-3 rounded-xl bg-danger text-white text-xs font-bold hover:bg-[#D32F2F] active:scale-[0.98] disabled:opacity-40 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle size={14} /> Reject Profile
              </button>
              <button 
                onClick={() => setAuditUserKyc(null)}
                className="px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Audit lists grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Pending KYC Reviews */}
          <div className="p-6 rounded-3xl bg-[#F8FAFC] border border-slate-100 shadow-xs flex flex-col gap-5">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              ⏳ Pending Document Reviews ({pendingKycs.length})
            </h3>
            
            {pendingKycs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm font-medium">
                No KYC profiles waiting audit. All clear!
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {pendingKycs.map(kycDoc => (
                  <div key={kycDoc.id} className="p-4 rounded-2xl bg-white border border-slate-200/60 flex items-center justify-between shadow-xs">
                    <div>
                      <span className="font-extrabold text-sm text-slate-800 block">{kycDoc.user?.name || 'Borrower'}</span>
                      <span className="text-xs text-slate-400 font-medium">Submitted: {new Date(kycDoc.createdAt).toLocaleDateString()}</span>
                    </div>
                    <button 
                      onClick={() => { setAuditUserKyc(kycDoc); setAuditNotes(''); }}
                      className="px-4 py-2 rounded-xl bg-accent text-primary text-xs font-bold hover:bg-green-100 active:scale-[0.98] transition-all border border-green-200 cursor-pointer"
                    >
                      Audit Files
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Loan Underwriting Queue */}
          <div className="p-6 rounded-3xl bg-[#F8FAFC] border border-slate-100 shadow-xs flex flex-col gap-5">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              📋 Loan Underwriting Queue ({pendingLoans.length})
            </h3>
            
            {pendingLoans.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm font-medium">
                No micro-loans requested.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {pendingLoans.map(loan => (
                  <div key={loan.id} className="p-5 rounded-2xl bg-white border border-slate-200/60 flex flex-col gap-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">BORROWER</span>
                        <span className="font-extrabold text-sm text-slate-800 block">{loan.user?.name || 'Borrower'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">AMOUNT REQUESTED</span>
                        <span className="font-black text-md text-primary">₹{loan.amount}</span>
                      </div>
                    </div>

                    {/* AI Credit details */}
                    {loan.prediction && (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Financial Score</span>
                          <span className="font-bold text-slate-700">{loan.prediction.creditScore}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Repayment Chance</span>
                          <span className={`font-bold ${
                            loan.prediction.defaultProbability > 0.4 ? 'text-danger' : 'text-[#43A047]'
                          }`}>{Math.round((1.0 - loan.prediction.defaultProbability) * 100)}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Loan Eligibility</span>
                          <span className={`font-bold uppercase ${
                            loan.prediction.riskCategory === 'LOW' ? 'text-[#43A047]' :
                            loan.prediction.riskCategory === 'MEDIUM' ? 'text-blue-600' :
                            'text-danger'
                          }`}>{loan.prediction.riskCategory}</span>
                        </div>
                      </div>
                    )}

                    {/* Recommendations notes */}
                    {loan.prediction?.recommendationNote && (
                      <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-relaxed font-medium">
                        💡 **AI Note**: {loan.prediction.recommendationNote}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                      <button 
                        onClick={() => handleReviewLoan(loan.id, 'APPROVED')}
                        className="flex-1 py-2.5 rounded-xl bg-accent text-primary text-xs font-bold border border-green-200 hover:bg-green-100 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Approve Loan
                      </button>
                      <button 
                        onClick={() => handleReviewLoan(loan.id, 'REJECTED')}
                        className="flex-1 py-2.5 rounded-xl bg-red-50 text-danger text-xs font-bold border border-red-200 hover:bg-red-100 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Reject Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ─── NEW SECTION: 10 SAMPLE BORROWER PROFILES & SPENDING HABITS ─── */}
        <div className="p-6 rounded-3xl bg-[#F8FAFC] border border-slate-100 shadow-xs flex flex-col gap-6 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                👥 Borrower Profiles & Spending Habits ({profiles.length})
              </h3>
              <p className="text-slate-500 text-sm mt-0.5">
                AI financial health scores, credit ratings, and monthly expense habit breakdowns.
              </p>
            </div>
            <span className="px-3 py-1 bg-accent text-primary border border-green-200 rounded-full text-xs font-bold uppercase self-start">
              10 Sample Profiles Pre-loaded
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profiles.map((prof) => {
              const isExpanded = expandedProfileId === prof.id;

              return (
                <div 
                  key={prof.id} 
                  className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-4 transition-all hover:border-green-300"
                >
                  {/* Top Profile Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-primary text-md font-extrabold">
                        {prof.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-base leading-snug">{prof.name}</h4>
                        <span className="text-xs font-semibold text-slate-500 block">{prof.occupation}</span>
                        <span className="text-[11px] text-slate-400 block">{prof.email}</span>
                      </div>
                    </div>

                    {/* Risk Badge */}
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        prof.riskCategory === 'LOW' ? 'bg-green-50 text-[#43A047] border border-green-200' :
                        prof.riskCategory === 'MEDIUM' ? 'bg-amber-50 text-[#FFB300] border border-amber-200' :
                        'bg-red-50 text-[#E53935] border border-red-200'
                      }`}>
                        {prof.riskCategory} RISK
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">KYC: {prof.kycStatus}</span>
                    </div>
                  </div>

                  {/* Financial Metrics Strip */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Credit Score</span>
                      <span className="font-extrabold text-primary text-base">{prof.creditScore || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Financial Health</span>
                      <span className="font-bold text-slate-800 text-sm">{prof.financialHealth ? `${prof.financialHealth}%` : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Savings Rate</span>
                      <span className="font-bold text-slate-800 text-sm">{prof.spendingHabits?.savingsRate || '15%'}</span>
                    </div>
                  </div>

                  {/* Spending Habit Badges Bar */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <PieChart size={12} /> Spending Pattern Breakdown
                    </span>

                    {/* Progress bar visual */}
                    <div className="w-full h-3.5 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                      {prof.spendingHabits?.categories?.map((cat: any, idx: number) => (
                        <div 
                          key={idx}
                          style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                          className="h-full transition-all"
                          title={`${cat.name}: ${cat.percentage}%`}
                        />
                      ))}
                    </div>

                    {/* Spending Legend Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {prof.spendingHabits?.categories?.map((cat: any, idx: number) => (
                        <span 
                          key={idx} 
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-700 bg-slate-100 flex items-center gap-1"
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.name} ({cat.percentage}%)
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Accordion Expand Button */}
                  <button 
                    onClick={() => setExpandedProfileId(isExpanded ? null : prof.id)}
                    className="mt-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {isExpanded ? (
                      <>Hide Full Details <ChevronUp size={14} /></>
                    ) : (
                      <>View Detailed Spending & Loans <ChevronDown size={14} /></>
                    )}
                  </button>

                  {/* Expanded Profile Details */}
                  {isExpanded && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs flex flex-col gap-3 mt-2 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-3 border-b border-slate-200 pb-3">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Monthly Income</span>
                          <span className="font-bold text-slate-800 text-sm">₹{prof.spendingHabits?.monthlyIncome?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Monthly Expenses</span>
                          <span className="font-bold text-slate-800 text-sm">₹{prof.spendingHabits?.monthlyExpenses?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Aadhaar Card</span>
                          <span className="font-bold text-slate-700">{prof.aadhaarNumber}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">PAN Card</span>
                          <span className="font-bold text-slate-700">{prof.panNumber}</span>
                        </div>
                      </div>

                      {prof.latestLoan && (
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Active Loan Application</span>
                            <span className="font-black text-primary text-sm">₹{prof.latestLoan.amount} ({prof.latestLoan.tenure} Mos)</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                            prof.latestLoan.status === 'APPROVED' ? 'bg-green-100 text-primary' :
                            prof.latestLoan.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-danger'
                          }`}>
                            {prof.latestLoan.status}
                          </span>
                        </div>
                      )}

                      <div className="text-[11px] text-slate-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 font-medium">
                        💡 <strong>Spending Habits Persona:</strong> {prof.spendingHabits?.spendingPattern}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

        {/* ─── AUDIT TRAIL & SYSTEM COMPLIANCE LOGS ─── */}
        <div className="p-6 rounded-3xl bg-[#F8FAFC] border border-slate-100 shadow-xs flex flex-col gap-5 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                🛡️ Administrative Audit Trail & Compliance Log
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Cryptographically tracked administrative events, KYC certifications, and underwriting actions.
              </p>
            </div>
            <span className="px-3 py-1 bg-slate-200/80 text-slate-700 rounded-full text-xs font-bold uppercase">
              {stats?.auditLogs?.length || 0} Events Recorded
            </span>
          </div>

          {(!stats?.auditLogs || stats.auditLogs.length === 0) ? (
            <div className="text-center py-8 text-slate-400 text-sm font-medium">
              No recent administrative actions recorded. Actions will appear here as approvals or rejections occur.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Actor ID</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.auditLogs.map((log: any, idx: number) => {
                    let parsedDetails: any = null;
                    try {
                      parsedDetails = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                    } catch {
                      parsedDetails = { raw: log.details };
                    }

                    return (
                      <tr key={log.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            log.action.includes('APPROVED') ? 'bg-green-100 text-[#2E7D32]' :
                            log.action.includes('REJECTED') ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {log.userId ? log.userId.slice(0, 12) + '...' : 'SYSTEM_AUTOMATION'}
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-md truncate">
                          {parsedDetails?.notes ? `Notes: "${parsedDetails.notes}" ` : ''}
                          {parsedDetails?.targetUserId ? `User: ${parsedDetails.targetUserId.slice(0, 8)} ` : ''}
                          {parsedDetails?.amount ? `Amount: ₹${parsedDetails.amount} ` : ''}
                          {!parsedDetails?.notes && !parsedDetails?.targetUserId && !parsedDetails?.amount ? JSON.stringify(parsedDetails) : ''}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400 font-medium text-[11px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
