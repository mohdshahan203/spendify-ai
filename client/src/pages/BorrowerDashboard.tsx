import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Loan, Alert as AlertType, ChatMessage, KYCDocument } from '@shared/types';
import { 
  Home as HomeIcon, 
  CreditCard, 
  MessageSquare, 
  History as HistoryIcon, 
  User as UserIcon, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles
} from 'lucide-react';

export const BorrowerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Tab switching: 'home' | 'loan' | 'ai' | 'history' | 'profile'
  const [activeTab, setActiveTab] = useState<'home' | 'loan' | 'ai' | 'history' | 'profile'>('home');
  
  // Dashboard states
  const [loans, setLoans] = useState<Loan[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [kyc, setKyc] = useState<KYCDocument | null>(null);
  const [loading, setLoading] = useState(true);

  // Apply loan form
  const [applyAmount, setApplyAmount] = useState('');
  const [applyPurpose, setApplyPurpose] = useState('Personal Expenses');
  const [applyTenure, setApplyTenure] = useState('12');
  const [applyIncome, setApplyIncome] = useState('');
  const [applyExpenses, setApplyExpenses] = useState('');
  const [applyError, setApplyError] = useState<string | null>(null);
  const [recentRestructuring, setRecentRestructuring] = useState<any>(null);

  // Loan Application State: 'form' | 'analyzing' | 'result'
  const [loanState, setLoanState] = useState<'form' | 'analyzing' | 'result'>('form');
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Chatbot states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userMsg, setUserMsg] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchDashboardData = async () => {
    try {
      const kycRes = await api.get('/kyc');
      setKyc(kycRes.data);
      
      const loansRes = await api.get('/loans/history');
      setLoans(loansRes.data);

      const alertsRes = await api.get('/alerts');
      setAlerts(alertsRes.data);

      const chatRes = await api.get('/advisor/history');
      setChatMessages(chatRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'ai') {
      scrollToBottom();
    }
  }, [chatMessages, activeTab]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Submit loan application
  const handleApplyLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError(null);
    setRecentRestructuring(null);

    if (kyc?.status !== 'APPROVED') {
      setApplyError(kyc?.status === 'PENDING' ? 'Your verification is under review.' : 'Please upload your KYC documents first.');
      return;
    }

    setLoanState('analyzing');

    // Simulate 3 seconds AI processing delay for beautiful loading animation
    setTimeout(async () => {
      try {
        const response = await api.post('/loans/apply', {
          amount: Number(applyAmount),
          tenureMonths: Number(applyTenure),
          interestRate: 14.0 // Fixed base interest rate
        });

        const { loan, prediction } = response.data;
        setAnalysisResult({
          loan,
          prediction
        });

        if (loan.recommendation) {
          setRecentRestructuring(loan);
        } else {
          setApplyAmount('');
          setApplyIncome('');
          setApplyExpenses('');
        }
        
        setLoanState('result');
        fetchDashboardData();
      } catch (err: any) {
        setApplyError(err.response?.data?.error || 'Failed to submit loan application.');
        setLoanState('form');
      }
    }, 3000);
  };

  // Accept loan restructure suggestion
  const handleAcceptRestructure = async () => {
    if (!recentRestructuring || !recentRestructuring.recommendation) return;
    try {
      const rec = recentRestructuring.recommendation;
      await api.post('/loans/apply', {
        amount: rec.suggestedAmount,
        tenureMonths: rec.suggestedTenure,
        interestRate: rec.suggestedRate
      });
      alert('Suggested loan offer accepted and applied successfully!');
      setRecentRestructuring(null);
      setLoanState('form');
      fetchDashboardData();
    } catch (err) {
      alert('Failed to accept restructure offer.');
    }
  };

  // Chat message send
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userMsg.trim()) return;

    await sendChatToApi(userMsg);
  };

  const sendChatToApi = async (messageText: string) => {
    setSendingChat(true);

    // Optimistically update user message bubble
    const tempUserMsg: ChatMessage = {
      id: Math.random().toString(),
      userId: user?.id || '',
      message: messageText,
      isBot: false,
      createdAt: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, tempUserMsg]);
    setUserMsg('');

    try {
      const response = await api.post('/advisor/message', { message: messageText });
      setChatMessages(prev => [...prev, response.data]);
    } catch (err) {
      const tempBotError: ChatMessage = {
        id: Math.random().toString(),
        userId: user?.id || '',
        message: "I am having a small connection issue. Please ask again in a moment.",
        isBot: true,
        createdAt: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, tempBotError]);
    } finally {
      setSendingChat(false);
    }
  };

  const activeLoan = loans.find(l => l.status === 'ACTIVE');
  const latestLoan = loans.length > 0 ? loans[loans.length - 1] : null;

  // Translate labels to plain English
  const getRepaymentChanceText = (prob: number) => {
    const chance = (1.0 - prob) * 100;
    if (chance > 85) return 'Very High';
    if (chance > 70) return 'High';
    if (chance > 50) return 'Medium';
    return 'Low';
  };

  const getRepaymentChanceColor = (prob: number) => {
    const chance = (1.0 - prob) * 100;
    if (chance > 70) return 'text-[#43A047]';
    if (chance > 50) return 'text-[#FFB300]';
    return 'text-[#E53935]';
  };

  const getEligibilityText = (risk: string) => {
    if (risk === 'LOW') return 'Fully Eligible (Excellent)';
    if (risk === 'MEDIUM') return 'Eligible with Standard Terms';
    if (risk === 'HIGH') return 'Restricted Eligibility (High risk)';
    if (risk === 'CRITICAL') return 'Not Eligible';
    return 'Pending Evaluation';
  };

  const getEligibilityBg = (risk: string) => {
    if (risk === 'LOW') return 'bg-green-50 text-[#43A047] border border-green-200';
    if (risk === 'MEDIUM') return 'bg-blue-50 text-blue-600 border border-blue-200';
    return 'bg-red-50 text-[#E53935] border border-red-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-slate-500 font-medium">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        Securing connection...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 pb-24 relative">
      
      {/* Top Simple Banner */}
      <nav className="w-full px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-30 flex items-center justify-between">
        <span className="text-2xl font-extrabold text-primary">SpendiFy</span>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-slate-600">Hello, {user?.name.split(' ')[0]} 👋</span>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-6 pt-6">

        {/* ─── TAB 1: HOME ─── */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-6">
            
            {/* Header Greeting */}
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Good Morning, {user?.name.split(' ')[0]}</h1>
              <p className="text-slate-500 text-sm mt-0.5">Welcome to your simple financial space.</p>
            </div>

            {/* KYC Alert Block if not approved */}
            {kyc?.status !== 'APPROVED' && (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col gap-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-[#FFB300] shrink-0 mt-0.5" size={20} />
                  <div>
                    <span className="font-bold block text-slate-800 text-md">Verification Under Review</span>
                    <span className="text-sm text-slate-600 mt-1 block">We are verifying your documents. Your loan application is locked until verification is complete.</span>
                  </div>
                </div>
                <Link to="/kyc" className="mt-2 py-3.5 text-center rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-sm transition-all">
                  Check Upload Details
                </Link>
              </div>
            )}

            {/* Early Warning Risk Alerts */}
            {kyc?.status === 'APPROVED' && alerts.map(alert => (
              <div key={alert.id} className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-start gap-3">
                <AlertTriangle className="text-danger shrink-0 mt-0.5" size={18} />
                <div>
                  <span className="font-bold text-sm text-slate-800 block">Alert: Financial Warning</span>
                  <span className="text-xs text-slate-600 leading-relaxed block mt-0.5">{alert.description}</span>
                </div>
              </div>
            ))}

            {/* Score and Eligibility Cards (Only visible if KYC is Approved) */}
            {kyc?.status === 'APPROVED' ? (
              <>
                {/* Financial Score Card */}
                <div className="p-6 rounded-3xl bg-[#F8FAFC] border border-slate-100 shadow-sm flex items-center justify-between relative overflow-hidden">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Financial Score</span>
                    <span className="text-5xl font-black text-primary">
                      {latestLoan?.prediction?.creditScore || 720}
                    </span>
                    <span className="text-xs text-slate-500 mt-1">Excellent (Based on statement analysis)</span>
                  </div>
                  {/* Visual score dial mockup */}
                  <div className="w-20 h-20 rounded-full border-8 border-accent border-r-primary flex items-center justify-center text-primary font-bold text-xs">
                    Score
                  </div>
                </div>

                {/* Loan Eligibility Card */}
                <div className="p-6 rounded-3xl bg-[#F8FAFC] border border-slate-100 shadow-sm flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loan Eligibility</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getEligibilityBg(latestLoan?.prediction?.riskCategory || 'LOW')}`}>
                      {latestLoan?.prediction?.riskCategory || 'LOW'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-2 font-medium">
                    {getEligibilityText(latestLoan?.prediction?.riskCategory || 'LOW')}
                  </p>
                </div>
              </>
            ) : null}

            {/* Current Active Loan Card */}
            {activeLoan ? (
              <div className="p-6 rounded-3xl bg-accent text-[#1B5E20] border border-green-200 shadow-sm flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider opacity-75">Active Loan Details</span>
                <span className="text-3xl font-extrabold">₹{activeLoan.amount}</span>
                <div className="flex justify-between text-xs font-bold opacity-80 mt-2">
                  <span>Monthly EMI: ₹{activeLoan.emi}</span>
                  <span>Rate: {activeLoan.interestRate}%</span>
                </div>
                <button 
                  onClick={() => alert("Repayment interface is coming soon!")}
                  className="mt-4 w-full py-3.5 bg-primary hover:bg-[#1B5E20] text-white font-bold rounded-xl text-sm shadow-sm transition-all"
                >
                  Pay Current EMI
                </button>
              </div>
            ) : (
              <div className="p-6 rounded-3xl bg-[#F8FAFC] border border-slate-100 shadow-sm text-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Loan</span>
                <p className="text-sm text-slate-500 my-4">You have no active loans right now.</p>
                
                {/* One Large Primary Button */}
                <button
                  onClick={() => kyc?.status === 'APPROVED' ? setActiveTab('loan') : alert('Verification required first!')}
                  disabled={kyc?.status !== 'APPROVED'}
                  className={`w-full py-4.5 font-bold rounded-xl text-md shadow-md transition-all ${
                    kyc?.status === 'APPROVED' 
                      ? 'bg-primary text-white hover:bg-[#1B5E20]' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Apply for Loan
                </button>
              </div>
            )}

            {/* Quick Actions Grid */}
            <div className="mt-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h4>
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => navigate('/kyc')}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all flex flex-col items-center justify-center text-center gap-1.5 border border-slate-100"
                >
                  <span className="text-xl">🪪</span>
                  <span className="text-xs font-bold text-slate-700">KYC Status</span>
                </button>

                <button 
                  onClick={() => kyc?.status === 'APPROVED' ? setActiveTab('loan') : alert('Please complete document review first.')}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all flex flex-col items-center justify-center text-center gap-1.5 border border-slate-100"
                >
                  <span className="text-xl">💳</span>
                  <span className="text-xs font-bold text-slate-700">Apply Loan</span>
                </button>

                <button 
                  onClick={() => setActiveTab('ai')}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all flex flex-col items-center justify-center text-center gap-1.5 border border-slate-100"
                >
                  <span className="text-xl">💬</span>
                  <span className="text-xs font-bold text-slate-700">AI Assistant</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ─── TAB 2: LOAN APPLICATION ─── */}
        {activeTab === 'loan' && (
          <div className="flex flex-col gap-6">
            
            {/* Form State */}
            {loanState === 'form' && (
              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-md flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">Apply for a Loan</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Please fill in these simple financial details.</p>
                </div>

                {applyError && (
                  <div className="p-4 bg-red-50 border border-red-200 text-danger rounded-xl text-sm font-medium">
                    {applyError}
                  </div>
                )}

                <form onSubmit={handleApplyLoan} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-700">How much money do you need? (INR)</label>
                    <input
                      type="number"
                      value={applyAmount}
                      onChange={(e) => setApplyAmount(e.target.value)}
                      required
                      placeholder="e.g. 25000"
                      className="px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-md focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-700">How long do you need it for? (Duration)</label>
                    <select
                      value={applyTenure}
                      onChange={(e) => setApplyTenure(e.target.value)}
                      className="px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-md focus:border-primary focus:outline-none font-medium"
                    >
                      <option value="3">3 Months</option>
                      <option value="6">6 Months</option>
                      <option value="12">12 Months</option>
                      <option value="18">18 Months</option>
                      <option value="24">24 Months</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-700">What is the loan for?</label>
                    <input
                      type="text"
                      value={applyPurpose}
                      onChange={(e) => setApplyPurpose(e.target.value)}
                      required
                      placeholder="e.g. Purchase seeds, college fees, shop inventory"
                      className="px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-md focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-bold text-slate-700">Monthly Income (INR)</label>
                      <input
                        type="number"
                        value={applyIncome}
                        onChange={(e) => setApplyIncome(e.target.value)}
                        required
                        placeholder="e.g. 50000"
                        className="px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-md focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-bold text-slate-700">Monthly Expenses (INR)</label>
                      <input
                        type="number"
                        value={applyExpenses}
                        onChange={(e) => setApplyExpenses(e.target.value)}
                        required
                        placeholder="e.g. 30000"
                        className="px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-md focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4.5 mt-2 rounded-xl font-bold bg-primary text-white hover:bg-[#1B5E20] shadow-md transition-all text-md"
                  >
                    Continue
                  </button>
                </form>
              </div>
            )}

            {/* Analyzing State */}
            {loanState === 'analyzing' && (
              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-md text-center py-20 flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Analyzing cashflows...</h2>
                  <p className="text-slate-500 text-md max-w-xs mx-auto">
                    AI is analyzing your financial behaviour. Please do not close this screen.
                  </p>
                </div>
              </div>
            )}

            {/* Result State */}
            {loanState === 'result' && analysisResult && (
              <div className="flex flex-col gap-6">
                
                {/* Result Title */}
                <div className="text-center">
                  <span className="text-5xl">📊</span>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-3">AI Evaluation Result</h2>
                  <p className="text-slate-500 text-sm">Review the underwriting response below.</p>
                </div>

                {/* Score & Eligibility metrics */}
                <div className="p-6 rounded-3xl bg-[#F8FAFC] border border-slate-100 shadow-sm flex flex-col gap-4">
                  
                  {/* Financial Score */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-slate-600 font-bold">Financial Score</span>
                    <span className="text-2xl font-black text-primary">
                      {analysisResult.prediction?.creditScore}
                    </span>
                  </div>

                  {/* Loan Eligibility */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-slate-600 font-bold">Loan Eligibility</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      analysisResult.prediction?.riskCategory === 'LOW' ? 'bg-green-100 text-[#43A047]' : 'bg-red-100 text-[#E53935]'
                    }`}>
                      {analysisResult.prediction?.riskCategory}
                    </span>
                  </div>

                  {/* Repayment Confidence */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-slate-600 font-bold">Loan Repayment Chance</span>
                    <span className={`font-black text-md ${getRepaymentChanceColor(analysisResult.prediction?.defaultProbability)}`}>
                      {getRepaymentChanceText(analysisResult.prediction?.defaultProbability)}
                    </span>
                  </div>

                  {/* Recommended Amount */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-bold">Recommended Loan Amount</span>
                    <span className="font-extrabold text-slate-900 text-lg">
                      ₹{analysisResult.loan?.amount}
                    </span>
                  </div>
                </div>

                {/* Restructuring Recommendation Modal card if risky */}
                {recentRestructuring && recentRestructuring.recommendation && (
                  <div className="p-6 rounded-3xl bg-amber-50/50 border border-amber-200 flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-lg">
                      <Sparkles size={20} />
                      <span>Suggested Alternative Offer</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {recentRestructuring.recommendation.rationale}
                    </p>

                    <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 font-bold block">Suggested Amount</span>
                        <span className="text-md font-bold text-primary">₹{recentRestructuring.recommendation.suggestedAmount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 font-bold block">Monthly EMI</span>
                        <span className="text-md font-bold text-slate-800">₹{recentRestructuring.recommendation.suggestedEmi}/mo</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 font-bold block">Duration</span>
                        <span className="text-md font-bold text-slate-800">{recentRestructuring.recommendation.suggestedTenure} Months</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 font-bold block">Rate</span>
                        <span className="text-md font-bold text-slate-800">{recentRestructuring.recommendation.suggestedRate}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-1">
                      <button onClick={handleAcceptRestructure} className="flex-1 py-3 bg-primary hover:bg-[#1B5E20] text-white font-bold rounded-xl text-sm shadow-sm transition-all">
                        Accept Suggested Offer
                      </button>
                      <button onClick={() => setLoanState('form')} className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-xl text-sm transition-all">
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {!recentRestructuring && (
                  <div className="p-6 rounded-3xl bg-green-50/50 border border-green-200 text-center">
                    <span className="text-lg font-bold text-green-700 flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={20} />
                      Loan Request Submitted
                    </span>
                    <p className="text-sm text-slate-600 mt-2">
                      Your loan of ₹{analysisResult.loan?.amount} has been successfully created. We will update the disburals ledger shortly.
                    </p>
                    <button onClick={() => setLoanState('form')} className="mt-4 px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:bg-[#1B5E20]">
                      Done
                    </button>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* ─── TAB 3: AI ASSISTANT (CHAT) ─── */}
        {activeTab === 'ai' && (
          <div className="flex flex-col h-[70vh] bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            
            {/* Header info */}
            <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-primary text-lg font-bold">
                🤖
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">SpendiFy AI Assistant</h3>
                <span className="text-[10px] text-[#43A047] font-bold block">Online</span>
              </div>
            </div>

            {/* Message Feed */}
            <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-4">
              
              {/* Default Welcome bubble */}
              <div className="max-w-[85%] p-3 rounded-2xl bg-white border border-slate-100 text-slate-700 text-sm shadow-xs self-start rounded-tl-none">
                Hello {user?.name.split(' ')[0]} 👋 How can I help you today?
              </div>

              {chatMessages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                    msg.isBot 
                      ? 'bg-white border border-slate-100 text-slate-700 self-start rounded-tl-none shadow-xs' 
                      : 'bg-primary text-white self-end rounded-tr-none shadow-sm'
                  }`}
                >
                  {msg.message}
                </div>
              ))}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Prompt Shortcut buttons */}
            <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap gap-2">
              <button 
                onClick={() => sendChatToApi("Why is my score low?")}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                Why is my score low?
              </button>
              <button 
                onClick={() => sendChatToApi("Can I get a bigger loan?")}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                Can I get a bigger loan?
              </button>
              <button 
                onClick={() => sendChatToApi("Improve my financial score.")}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                Improve my score
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChat} className="p-4 bg-white border-t border-slate-200 flex gap-2">
              <input
                type="text"
                value={userMsg}
                onChange={(e) => setUserMsg(e.target.value)}
                placeholder="Type your message..."
                className="flex-grow px-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:border-primary text-sm"
              />
              <button
                type="submit"
                disabled={sendingChat}
                className="p-3 rounded-xl bg-primary text-white hover:bg-[#1B5E20] transition-colors flex items-center justify-center shadow-sm"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}

        {/* ─── TAB 4: HISTORY ─── */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Loan History</h1>
              <p className="text-slate-500 text-sm mt-0.5">Check the status of your past requests.</p>
            </div>

            {loans.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#F8FAFC] border border-slate-100 text-center text-slate-400 text-sm font-medium">
                No past transactions or loans found.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {loans.map(loan => (
                  <div key={loan.id} className="p-5 rounded-3xl bg-[#F8FAFC] border border-slate-100 flex items-center justify-between shadow-xs">
                    <div className="flex flex-col gap-1">
                      <span className="font-extrabold text-lg text-slate-800">₹{loan.amount}</span>
                      <span className="text-xs text-slate-500 font-medium">EMI: ₹{loan.emi}/mo ({loan.tenureMonths} Months)</span>
                      <span className="text-[10px] text-slate-400">Request Date: {new Date(loan.createdAt).toLocaleDateString()}</span>
                    </div>

                    <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                      loan.status === 'APPROVED' || loan.status === 'ACTIVE' ? 'bg-green-50 text-[#43A047] border border-green-200' :
                      loan.status === 'PENDING' ? 'bg-amber-50 text-[#FFB300] border border-amber-200' :
                      'bg-red-50 text-[#E53935] border border-red-200'
                    }`}>
                      {loan.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 5: PROFILE ─── */}
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">My Profile</h1>
              <p className="text-slate-500 text-sm mt-0.5">Manage your personal settings.</p>
            </div>

            <div className="p-6 rounded-3xl bg-[#F8FAFC] border border-slate-100 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-primary text-xl font-bold">
                  {user?.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg">{user?.name}</h3>
                  <span className="text-xs text-slate-400 block">{user?.email}</span>
                </div>
              </div>

              {/* KYC Status Details */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-sm font-bold text-slate-600">Verification Status</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                  kyc?.status === 'APPROVED' ? 'bg-green-50 text-[#43A047]' : 'bg-amber-50 text-[#FFB300]'
                }`}>
                  {kyc ? kyc.status : 'NOT_STARTED'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600">Phone Number</span>
                <span className="text-sm text-slate-500 font-bold">{user?.phone}</span>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full py-4.5 rounded-xl font-bold border border-red-200 text-danger bg-red-50 hover:bg-red-100 shadow-xs transition-all text-md"
            >
              Sign Out
            </button>
          </div>
        )}

      </main>

      {/* Bottom Sticky Tab Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-100 py-3 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center justify-around">
          
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1.5 transition-colors ${
              activeTab === 'home' ? 'text-primary font-bold scale-105' : 'text-slate-400 font-medium'
            }`}
          >
            <HomeIcon size={20} />
            <span className="text-[10px]">Home</span>
          </button>

          <button 
            onClick={() => kyc?.status === 'APPROVED' ? setActiveTab('loan') : alert('Verification required first!')}
            className={`flex flex-col items-center gap-1.5 transition-colors ${
              activeTab === 'loan' ? 'text-primary font-bold scale-105' : 'text-slate-400 font-medium'
            }`}
          >
            <CreditCard size={20} />
            <span className="text-[10px]">Loan</span>
          </button>

          <button 
            onClick={() => setActiveTab('ai')}
            className={`flex flex-col items-center gap-1.5 transition-colors relative ${
              activeTab === 'ai' ? 'text-primary font-bold scale-105' : 'text-slate-400 font-medium'
            }`}
          >
            <MessageSquare size={20} />
            <span className="text-[10px]">AI Assistant</span>
          </button>

          <button 
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-1.5 transition-colors ${
              activeTab === 'history' ? 'text-primary font-bold scale-105' : 'text-slate-400 font-medium'
            }`}
          >
            <HistoryIcon size={20} />
            <span className="text-[10px]">History</span>
          </button>

          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1.5 transition-colors ${
              activeTab === 'profile' ? 'text-primary font-bold scale-105' : 'text-slate-400 font-medium'
            }`}
          >
            <UserIcon size={20} />
            <span className="text-[10px]">Profile</span>
          </button>

        </div>
      </nav>

    </div>
  );
};

export default BorrowerDashboard;
