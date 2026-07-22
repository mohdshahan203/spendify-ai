import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { KYCDocument, Loan } from '@shared/types';
import { 
  Users, 
  FileCheck, 
  Landmark, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  ExternalLink
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  
  // States
  const [pendingKycs, setPendingKycs] = useState<KYCDocument[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Selected KYC audit state
  const [auditUserKyc, setAuditUserKyc] = useState<KYCDocument | null>(null);
  const [auditNotes, setAuditNotes] = useState('');
  const [auditing, setAuditing] = useState(false);

  const fetchAdminData = async () => {
    try {
      const statsRes = await api.get('/admin/stats');
      setStats(statsRes.data);

      const kycRes = await api.get('/admin/pending-kyc');
      setPendingKycs(kycRes.data);

      const loansRes = await api.get('/admin/loans');
      setLoans(loansRes.data);
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
      alert(`User profile has been successfully ${status.toLowerCase()}ed.`);
      setAuditUserKyc(null);
      setAuditNotes('');
      fetchAdminData();
    } catch (err) {
      alert('Failed to submit verification status.');
    } finally {
      setAuditing(false);
    }
  };

  // Review Loan (Approve / Reject)
  const handleReviewLoan = async (loanId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.post('/admin/review-loan', { loanId, status });
      alert(`Loan application ${status.toLowerCase()}ed successfully.`);
      fetchAdminData();
    } catch (err) {
      alert('Failed to review loan application.');
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
      <nav className="w-full px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-extrabold tracking-tight text-primary">
            SpendiFy
          </span>
          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-accent text-primary uppercase">
            Admin Console
          </span>
        </div>
        <button onClick={logout} className="text-xs px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-slate-700">Sign Out</button>
      </nav>

      <div className="max-w-7xl mx-auto px-6 mt-8 flex flex-col gap-8">
        
        {/* Core Stats Section */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Total Borrowers */}
            <div className="p-6 rounded-3xl bg-[#F8FAFC] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-primary">
                <Users size={22} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Borrowers</span>
                <span className="text-2xl font-extrabold text-slate-900">{stats.totalBorrowers}</span>
              </div>
            </div>

            {/* Total Volume */}
            <div className="p-6 rounded-3xl bg-[#F8FAFC] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F5E9] flex items-center justify-center text-[#43A047]">
                <Landmark size={22} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Disbursed Volume</span>
                <span className="text-2xl font-extrabold text-slate-900">₹{stats.loanStats.totalVolume.toLocaleString()}</span>
              </div>
            </div>

            {/* Approvals */}
            <div className="p-6 rounded-3xl bg-[#F8FAFC] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F5E9] flex items-center justify-center text-[#43A047]">
                <FileCheck size={22} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Approved Loans</span>
                <span className="text-2xl font-extrabold text-slate-900">{stats.loanStats.approved}</span>
              </div>
            </div>

            {/* High-risk Alerts */}
            <div className="p-6 rounded-3xl bg-red-50/50 border border-red-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-[#E53935]">
                <ShieldAlert size={22} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">High Risk Alerts</span>
                <span className="text-2xl font-extrabold text-slate-900">{stats.highRiskBorrowers.length}</span>
              </div>
            </div>

          </div>
        )}

        {/* Audit Document Auditing panel */}
        {auditUserKyc && (
          <div className="p-8 rounded-3xl bg-accent/40 border border-green-200 flex flex-col gap-6">
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
                className="px-6 py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-[#1B5E20] shadow-sm transition-all flex items-center gap-1.5"
              >
                <CheckCircle size={14} /> Approve Profile
              </button>
              <button 
                onClick={() => handleVerifyKyc(auditUserKyc.userId, 'REJECTED')}
                disabled={auditing || !auditNotes.trim()}
                className="px-6 py-3 rounded-xl bg-danger text-white text-xs font-bold hover:bg-[#D32F2F] disabled:opacity-40 shadow-sm transition-all flex items-center gap-1.5"
              >
                <XCircle size={14} /> Reject Profile
              </button>
              <button 
                onClick={() => setAuditUserKyc(null)}
                className="px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Audit lists grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Pending KYC Reviews */}
          <div className="p-6 rounded-3xl bg-[#F8FAFC] border border-slate-100 shadow-sm flex flex-col gap-5">
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
                      className="px-4 py-2 rounded-xl bg-accent text-primary text-xs font-bold hover:bg-green-100 transition-all border border-green-200"
                    >
                      Audit Files
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Loan Underwriting Queue */}
          <div className="p-6 rounded-3xl bg-[#F8FAFC] border border-slate-100 shadow-sm flex flex-col gap-5">
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
                        className="flex-1 py-2.5 rounded-xl bg-accent text-primary text-xs font-bold border border-green-200 hover:bg-green-100 transition-all"
                      >
                        Approve Loan
                      </button>
                      <button 
                        onClick={() => handleReviewLoan(loan.id, 'REJECTED')}
                        className="flex-1 py-2.5 rounded-xl bg-red-50 text-danger text-xs font-bold border border-red-200 hover:bg-red-100 transition-all"
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

      </div>
    </div>
  );
};

export default AdminDashboard;
