import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Loan,
  Alert as AlertType,
  ChatMessage,
  KYCDocument,
  LoanCalculationResult,
  LoanScenarioSuggestion,
  RepaymentScheduleItem,
  PrepaymentSimulationResult,
  ScenarioComparisonResult,
  SavedLoanScenario,
  LoanDraft
} from '@shared/types';
import { NotificationDrawer } from '../components/dashboard/NotificationDrawer';
import { TransactionsTab } from '../components/dashboard/TransactionsTab';
import { BudgetsTab } from '../components/dashboard/BudgetsTab';
import {
  Home as HomeIcon,
  Calculator,
  Compass,
  CreditCard,
  CalendarCheck,
  MessageSquare,
  History as HistoryIcon,
  User as UserIcon,
  Send,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Download,
  Check,
  Receipt,
  X,
  RefreshCw,
  TrendingUp,
  Percent,
  Clock,
  ChevronRight,
  Bell,
  PiggyBank,
  ArrowLeftRight,
  Layers,
  Bookmark,
  BookmarkPlus,
  Save,
  FileText
} from 'lucide-react';

export const BorrowerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<
    'home' | 'calculator' | 'suggestions' | 'repayments' | 'loan' | 'ai' | 'history' | 'profile' | 'transactions' | 'budgets'
  >('home');

  // Core Data States
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repaymentLoans, setRepaymentLoans] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [kyc, setKyc] = useState<KYCDocument | null>(null);
  const [geminiStatus, setGeminiStatus] = useState<{ configured: boolean; model: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // --- PHASE 4: LOAN CALCULATOR STATE ---
  const [calcAmount, setCalcAmount] = useState<number>(50000);
  const [calcRate, setCalcRate] = useState<number>(13.5);
  const [calcTenure, setCalcTenure] = useState<number>(12);
  const [calcFeePercent, setCalcFeePercent] = useState<number>(1.5);
  const [calcResult, setCalcResult] = useState<LoanCalculationResult | null>(null);
  const [showAmortTable, setShowAmortTable] = useState(false);

  // --- PHASE 5: AFFORDABILITY & SUGGESTIONS STATE ---
  const [affordAmount, setAffordAmount] = useState<number>(50000);
  const [affordTenure, setAffordTenure] = useState<number>(12);
  const [affordRate, setAffordRate] = useState<number>(13.5);
  const [customIncome, setCustomIncome] = useState<string>('');
  const [customExpenses, setCustomExpenses] = useState<string>('');
  const [customDebt, setCustomDebt] = useState<string>('');
  const [affordData, setAffordData] = useState<any>(null);
  const [loadingAfford, setLoadingAfford] = useState(false);
  const [geminiAffordExplain, setGeminiAffordExplain] = useState<string | null>(null);
  const [explainingWithAI, setExplainingWithAI] = useState(false);

  // --- PHASE 7: REPAYMENTS & PAYMENT MODAL STATE ---
  const [selectedRepaymentLoan, setSelectedRepaymentLoan] = useState<any>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTargetInstalment, setPaymentTargetInstalment] = useState<RepaymentScheduleItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'SIMULATED_UPI' | 'NET_BANKING' | 'DEBIT_CARD'>('SIMULATED_UPI');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<any>(null);
  const [paymentSuccessModal, setPaymentSuccessModal] = useState(false);

  // --- LOAN APPLICATION STATE ---
  const [applyAmount, setApplyAmount] = useState('50000');
  const [applyTenure, setApplyTenure] = useState('12');
  const [limitBal, setLimitBal] = useState('50000');
  const [sex, setSex] = useState('1');
  const [education, setEducation] = useState('2');
  const [marriage, setMarriage] = useState('1');
  const [age, setAge] = useState('30');
  const [payHistory, setPayHistory] = useState([0, 0, 0, 0, 0, 0]);
  const [billAmts, setBillAmts] = useState([12000, 11000, 10000, 9500, 8000, 7500]);
  const [payAmts, setPayAmts] = useState([1500, 1500, 1500, 1500, 1500, 1500]);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [loanState, setLoanState] = useState<'form' | 'analyzing' | 'result'>('form');
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // --- PHASE 2: CHATBOT STATE ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userMsg, setUserMsg] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- NOTIFICATION DRAWER STATE ---
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // --- PREPAYMENT & COMPARISON STATE ---
  const [extraMonthlyEmi, setExtraMonthlyEmi] = useState<number>(1000);
  const [lumpSumPrepayment, setLumpSumPrepayment] = useState<number>(10000);
  const [lumpSumMonth, setLumpSumMonth] = useState<number>(3);
  const [prepaymentResult, setPrepaymentResult] = useState<PrepaymentSimulationResult | null>(null);
  const [simulatingPrepay, setSimulatingPrepay] = useState(false);

  const [compareOpen, setCompareOpen] = useState(false);
  const [planBAmount, setPlanBAmount] = useState<number>(60000);
  const [planBRate, setPlanBRate] = useState<number>(14.0);
  const [planBTenure, setPlanBTenure] = useState<number>(18);
  const [comparisonResult, setComparisonResult] = useState<ScenarioComparisonResult | null>(null);
  const [comparing, setComparing] = useState(false);

  const [savedScenarios, setSavedScenarios] = useState<SavedLoanScenario[]>([]);
  const [scenarioTitle, setScenarioTitle] = useState('');
  const [savingScenario, setSavingScenario] = useState(false);

  // --- LOAN APPLICATION DRAFT STATE ---
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Check for saved draft and saved scenarios on mount
  useEffect(() => {
    const checkDraftAndScenarios = async () => {
      try {
        const [draftRes, scRes] = await Promise.all([
          api.get('/loans/draft').catch(() => ({ data: null })),
          api.get('/loans/saved-scenarios').catch(() => ({ data: [] }))
        ]);
        if (draftRes.data) setHasSavedDraft(true);
        if (scRes.data) setSavedScenarios(scRes.data);
      } catch (e) {
        // ignore
      }
    };
    checkDraftAndScenarios();
  }, []);

  // Fetch all initial data
  const fetchDashboardData = async () => {
    try {
      const [kycRes, loansRes, alertsRes, chatRes, repaymentsRes, geminiRes] = await Promise.all([
        api.get('/kyc').catch(() => ({ data: null })),
        api.get('/loans/history').catch(() => ({ data: [] })),
        api.get('/alerts').catch(() => ({ data: [] })),
        api.get('/advisor/history').catch(() => ({ data: [] })),
        api.get('/loans/repayments').catch(() => ({ data: [] })),
        api.get('/advisor/status').catch(() => ({ data: { configured: false, model: 'gemini-2.5-flash' } }))
      ]);

      setKyc(kycRes.data);
      setLoans(loansRes.data);
      setAlerts(alertsRes.data);
      setChatMessages(chatRes.data);
      setRepaymentLoans(repaymentsRes.data);
      setGeminiStatus(geminiRes.data);

      if (repaymentsRes.data.length > 0) {
        setSelectedRepaymentLoan(repaymentsRes.data[0]);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Update Calculator on input changes
  useEffect(() => {
    const runCalculator = async () => {
      try {
        const res = await api.post('/loans/calculate', {
          amount: calcAmount,
          annualRate: calcRate,
          tenureMonths: calcTenure,
          processingFeePercent: calcFeePercent
        });
        setCalcResult(res.data);
      } catch (err) {
        console.error('Calculator error:', err);
      }
    };
    runCalculator();
  }, [calcAmount, calcRate, calcTenure, calcFeePercent]);

  // Run Affordability Evaluation
  const runAffordabilityCheck = async (askGemini: boolean = false) => {
    setLoadingAfford(true);
    if (askGemini) setExplainingWithAI(true);
    try {
      const res = await api.post('/loans/affordability-suggestions', {
        requestedAmount: affordAmount,
        requestedTenure: affordTenure,
        baseRate: affordRate,
        customIncome: customIncome ? Number(customIncome) : undefined,
        customExpenses: customExpenses ? Number(customExpenses) : undefined,
        customExistingEmis: customDebt ? Number(customDebt) : undefined,
        askAI: askGemini
      });
      setAffordData(res.data);
      if (res.data.aiExplanation) {
        setGeminiAffordExplain(res.data.aiExplanation);
      }
    } catch (err) {
      console.error('Affordability evaluation error:', err);
    } finally {
      setLoadingAfford(false);
      setExplainingWithAI(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'suggestions') {
      runAffordabilityCheck(false);
    }
  }, [activeTab, affordAmount, affordTenure, affordRate]);

  useEffect(() => {
    if (activeTab === 'ai') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  // Submit loan application
  const handleApplyLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError(null);

    if (kyc?.status !== 'APPROVED') {
      setApplyError(kyc?.status === 'PENDING' ? 'Your verification is under review.' : 'Please upload your KYC documents first.');
      return;
    }

    setLoanState('analyzing');

    try {
      const response = await api.post('/loans/apply', {
        amount: Number(applyAmount),
        tenureMonths: Number(applyTenure),
        interestRate: 13.5,
        features: {
          limit_bal: Number(limitBal),
          sex: Number(sex),
          education: Number(education),
          marriage: Number(marriage),
          age: Number(age),
          pay_0: payHistory[0],
          pay_2: payHistory[1],
          pay_3: payHistory[2],
          pay_4: payHistory[3],
          pay_5: payHistory[4],
          pay_6: payHistory[5],
          bill_amt1: billAmts[0],
          bill_amt2: billAmts[1],
          bill_amt3: billAmts[2],
          bill_amt4: billAmts[3],
          bill_amt5: billAmts[4],
          bill_amt6: billAmts[5],
          pay_amt1: payAmts[0],
          pay_amt2: payAmts[1],
          pay_amt3: payAmts[2],
          pay_amt4: payAmts[3],
          pay_amt5: payAmts[4],
          pay_amt6: payAmts[5]
        }
      });

      const { loan, quote } = response.data;
      setAnalysisResult({
        loan,
        prediction: loan.prediction,
        quote
      });
      setLoanState('result');
      fetchDashboardData();
    } catch (err: any) {
      setApplyError(err.response?.data?.message || err.response?.data?.error || 'Failed to submit loan application.');
      setLoanState('form');
    }
  };

  // Chat message send
  const sendChatToApi = async (messageText: string) => {
    if (!messageText.trim() || sendingChat) return;

    setUserMsg('');
    setSendingChat(true);
    setChatError(null);

    const tempUserMsg: ChatMessage = {
      id: Math.random().toString(),
      userId: user?.id || '',
      message: messageText,
      isBot: false,
      createdAt: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await api.post('/advisor/message', { message: messageText });
      setChatMessages(prev => [...prev, response.data]);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Connection error with Gemini service.';
      setChatError(errorMsg);
      const tempBotError: ChatMessage = {
        id: Math.random().toString(),
        userId: user?.id || '',
        message: `⚠️ **Advisory Notice**: ${errorMsg}`,
        isBot: true,
        createdAt: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, tempBotError]);
    } finally {
      setSendingChat(false);
    }
  };

  // Handle Payment Submit
  const handleExecutePayment = async () => {
    if (!selectedRepaymentLoan || isProcessingPayment) return;
    setIsProcessingPayment(true);

    try {
      const emiToPay = paymentTargetInstalment?.emiAmount || selectedRepaymentLoan.nextDueAmount || selectedRepaymentLoan.emi;
      const res = await api.post('/loans/pay-emi', {
        loanId: selectedRepaymentLoan.id,
        instalmentId: paymentTargetInstalment?.id,
        amount: emiToPay,
        paymentMethod
      });

      setPaymentReceipt(res.data.receipt);
      setPaymentModalOpen(false);
      setPaymentSuccessModal(true);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Payment failed to process');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Resolve Alert
  const handleResolveAlert = async (alertId: string) => {
    try {
      await api.post('/alerts/resolve', { alertId });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  // Save Loan Draft
  const handleSaveLoanDraft = async () => {
    setIsSavingDraft(true);
    setDraftNotice(null);
    try {
      await api.post('/loans/draft', {
        amount: Number(applyAmount),
        tenureMonths: Number(applyTenure),
        limitBal: Number(limitBal),
        age: Number(age),
        education: Number(education),
        marriage: Number(marriage),
        sex: Number(sex),
        payHistory,
        billAmts,
        payAmts
      });
      setHasSavedDraft(true);
      setDraftNotice('Draft application securely saved to database! You can resume anytime.');
      setTimeout(() => setDraftNotice(null), 5000);
    } catch (err: any) {
      setDraftNotice('Failed to save draft: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Resume Loan Draft
  const handleResumeLoanDraft = async () => {
    try {
      const res = await api.get('/loans/draft');
      if (res.data?.formData) {
        const d = res.data.formData;
        if (d.amount) setApplyAmount(String(d.amount));
        if (d.tenureMonths) setApplyTenure(String(d.tenureMonths));
        if (d.limitBal) setLimitBal(String(d.limitBal));
        if (d.age) setAge(String(d.age));
        if (d.education) setEducation(String(d.education));
        if (d.marriage) setMarriage(String(d.marriage));
        if (d.sex) setSex(String(d.sex));
        if (d.payHistory) setPayHistory(d.payHistory);
        if (d.billAmts) setBillAmts(d.billAmts);
        if (d.payAmts) setPayAmts(d.payAmts);
        setDraftNotice('Saved application draft loaded into form.');
        setTimeout(() => setDraftNotice(null), 5000);
      }
    } catch (err: any) {
      setDraftNotice('Failed to load draft: ' + (err.response?.data?.error || err.message));
    }
  };

  // Discard Loan Draft
  const handleDiscardLoanDraft = async () => {
    try {
      await api.delete('/loans/draft');
      setHasSavedDraft(false);
      setDraftNotice('Saved draft removed.');
      setTimeout(() => setDraftNotice(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // Simulate Prepayment
  const handleSimulatePrepayment = async () => {
    setSimulatingPrepay(true);
    try {
      const res = await api.post('/loans/simulate-prepayment', {
        principal: calcAmount,
        annualRate: calcRate,
        tenureMonths: calcTenure,
        extraMonthlyPayment: Number(extraMonthlyEmi) || 0,
        lumpSumPrepayment: Number(lumpSumPrepayment) || 0,
        lumpSumMonth: Number(lumpSumMonth) || 1
      });
      setPrepaymentResult(res.data);
    } catch (err: any) {
      console.error('Prepayment simulation error:', err);
    } finally {
      setSimulatingPrepay(false);
    }
  };

  // Compare Scenarios
  const handleCompareScenarios = async () => {
    setComparing(true);
    try {
      const res = await api.post('/loans/compare-scenarios', {
        planA: {
          principal: calcAmount,
          annualRate: calcRate,
          tenureMonths: calcTenure
        },
        planB: {
          principal: planBAmount,
          annualRate: planBRate,
          tenureMonths: planBTenure
        }
      });
      setComparisonResult(res.data);
    } catch (err: any) {
      console.error('Comparison error:', err);
    } finally {
      setComparing(false);
    }
  };

  // Save Scenario
  const handleSaveScenario = async () => {
    if (!calcResult || savingScenario) return;
    setSavingScenario(true);
    try {
      const title = scenarioTitle.trim() || `Plan ₹${calcAmount.toLocaleString('en-IN')} (${calcTenure}m @ ${calcRate}%)`;
      await api.post('/loans/saved-scenarios', {
        name: title,
        amount: calcAmount,
        annualRate: calcRate,
        tenureMonths: calcTenure,
        emi: calcResult.emi,
        totalInterest: calcResult.totalInterest,
        totalPayable: calcResult.totalPayable
      });
      setScenarioTitle('');
      const scRes = await api.get('/loans/saved-scenarios');
      setSavedScenarios(scRes.data);
    } catch (err: any) {
      console.error('Save scenario error:', err);
    } finally {
      setSavingScenario(false);
    }
  };

  // Delete Scenario
  const handleDeleteScenario = async (id: string) => {
    try {
      await api.delete(`/loans/saved-scenarios/${id}`);
      setSavedScenarios(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Delete scenario error:', err);
    }
  };

  // Download Monthly Financial Summary
  const handleDownloadMonthlySummary = async () => {
    setDownloadingReport(true);
    try {
      const res = await api.get('/reports/monthly-summary?format=json');
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `Spendify_Financial_Summary_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Download report error:', err);
    } finally {
      setDownloadingReport(false);
    }
  };

  const activeLoan = loans.find(l => l.status === 'ACTIVE' || l.status === 'APPROVED');
  const latestLoan = loans.length > 0 ? loans[loans.length - 1] : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090E] flex flex-col items-center justify-center text-slate-400 font-sans">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <span className="text-sm tracking-wide font-medium">Securing session and live telemetry...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 pb-28 font-sans selection:bg-emerald-500 selection:text-black">

      {/* Top Professional Navigation Bar */}
      <header className="w-full px-6 py-4 border-b border-slate-800/80 bg-[#0B0F19]/90 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center font-black text-black text-lg shadow-md shadow-emerald-500/20">
              S
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">SpendiFy</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
            <span className={`px-2.5 py-1 rounded-full border ${
              kyc?.status === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              KYC: {kyc?.status || 'NOT_STARTED'}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              Score: {latestLoan?.prediction?.creditScore || 785}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification Bell Button */}
          <button
            onClick={() => setIsNotificationOpen(true)}
            className="relative p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm"
            title="Notifications & Dynamic Warnings"
          >
            <Bell size={18} />
            {alerts.filter(a => !a.resolved).length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white font-extrabold text-[10px] flex items-center justify-center animate-pulse border-2 border-[#0B0F19]">
                {alerts.filter(a => !a.resolved).length}
              </span>
            )}
          </button>

          <div className="text-right hidden sm:block">
            <span className="text-sm font-bold text-white block">{user?.name}</span>
            <span className="text-[11px] text-slate-400 font-mono">{user?.email}</span>
          </div>
          <button
            onClick={() => setActiveTab('profile')}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-cyan-600 flex items-center justify-center font-bold text-white shadow-md text-sm cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all"
          >
            {user?.name.charAt(0)}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-6">

        {/* ─── TAB 1: HOME (EXECUTIVE FINANCIAL HEALTH) ─── */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-6 animate-fadeIn">
            
            {/* Header Greeting & Surplus Pill */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 to-[#0F172A] border border-slate-800 shadow-xl">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                  <ShieldCheck size={14} /> AI Financial Dashboard
                </span>
                <h1 className="text-2xl md:text-3xl font-black text-white">Hello, {user?.name.split(' ')[0]} 👋</h1>
                <p className="text-slate-400 text-sm mt-0.5">Your live cashflow, credit telemetry, and affordability status.</p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleDownloadMonthlySummary}
                    disabled={downloadingReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-750 border border-slate-700/80 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download size={13} className="text-emerald-400" />
                    {downloadingReport ? 'Generating Summary...' : 'Download Monthly Financial Report'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Monthly Surplus</span>
                  <span className="text-2xl font-black text-emerald-400">₹33,250</span>
                </div>
                <div className="h-8 w-px bg-slate-800"></div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Debt / Income</span>
                  <span className="text-2xl font-black text-cyan-400">12%</span>
                </div>
              </div>
            </div>

            {/* KYC Alert if not approved */}
            {kyc?.status !== 'APPROVED' && (
              <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
                  <div>
                    <span className="font-bold block text-amber-200 text-sm">KYC Compliance Pending</span>
                    <span className="text-xs text-amber-300/80 mt-0.5 block">
                      Government identity and bank statement verification is required before loan disbursal.
                    </span>
                  </div>
                </div>
                <Link
                  to="/kyc"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md transition-all text-center"
                >
                  Complete KYC
                </Link>
              </div>
            )}

            {/* Financial Warnings & Notification Center */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <AlertCircle size={16} className="text-cyan-400" /> Dynamic Financial Warnings & Alerts
                </h2>
                <span className="text-xs text-slate-500">
                  {alerts.filter(a => !a.resolved).length} active rule triggers
                </span>
              </div>

              {alerts.filter(a => !a.resolved).length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
                  No active financial stress conditions detected. Your accounts are operating smoothly.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {alerts.filter(a => !a.resolved).map(alert => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md transition-all ${
                        alert.severity === 'URGENT' || alert.level === 'RED'
                          ? 'bg-red-950/20 border-red-500/40 text-red-200'
                          : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`shrink-0 mt-0.5 ${
                          alert.severity === 'URGENT' || alert.level === 'RED' ? 'text-red-400' : 'text-amber-400'
                        }`} size={18} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{alert.title || alert.triggerType}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-black/40">
                              {alert.severity || alert.level}
                            </span>
                          </div>
                          <p className="text-xs mt-1 text-slate-300">{alert.description}</p>
                          {alert.recommendedAction && (
                            <span className="text-[11px] text-cyan-300/90 mt-1 block">
                              👉 <strong>Recommended Action:</strong> {alert.recommendedAction}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 self-end sm:self-center transition-all cursor-pointer shrink-0"
                      >
                        Dismiss
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('transactions')}
                className="p-5 rounded-3xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 transition-all flex flex-col items-start gap-3 text-left group cursor-pointer"
              >
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                  <Receipt size={22} />
                </div>
                <div>
                  <span className="font-extrabold text-white text-md block">Transactions</span>
                  <span className="text-xs text-slate-400 mt-0.5 block">Income, expenses & CSV import/export</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('budgets')}
                className="p-5 rounded-3xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 transition-all flex flex-col items-start gap-3 text-left group cursor-pointer"
              >
                <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                  <PiggyBank size={22} />
                </div>
                <div>
                  <span className="font-extrabold text-white text-md block">Budgets & Goals</span>
                  <span className="text-xs text-slate-400 mt-0.5 block">Category limits & savings targets</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('calculator')}
                className="p-5 rounded-3xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 transition-all flex flex-col items-start gap-3 text-left group cursor-pointer"
              >
                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                  <Calculator size={22} />
                </div>
                <div>
                  <span className="font-extrabold text-white text-md block">Loan Calculator</span>
                  <span className="text-xs text-slate-400 mt-0.5 block">Reducing-balance EMI & prepayments</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('suggestions')}
                className="p-5 rounded-3xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 transition-all flex flex-col items-start gap-3 text-left group cursor-pointer"
              >
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                  <Compass size={22} />
                </div>
                <div>
                  <span className="font-extrabold text-white text-md block">Affordability</span>
                  <span className="text-xs text-slate-400 mt-0.5 block">Surplus analysis & scenarios</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('repayments')}
                className="p-5 rounded-3xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 transition-all flex flex-col items-start gap-3 text-left group cursor-pointer"
              >
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                  <CalendarCheck size={22} />
                </div>
                <div>
                  <span className="font-extrabold text-white text-md block">Repayments</span>
                  <span className="text-xs text-slate-400 mt-0.5 block">Pay EMI & download receipts</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('ai')}
                className="p-5 rounded-3xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 transition-all flex flex-col items-start gap-3 text-left group cursor-pointer"
              >
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                  <MessageSquare size={22} />
                </div>
                <div>
                  <span className="font-extrabold text-white text-md block">Gemini AI</span>
                  <span className="text-xs text-slate-400 mt-0.5 block">Natural-language financial advisor</span>
                </div>
              </button>
            </div>

            {/* Active Loan Snapshot */}
            {activeLoan && (
              <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Loan Facility</span>
                    <h3 className="text-lg font-bold text-white">Facility Reference #{activeLoan.id.slice(0, 8)}</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {activeLoan.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block">Sanctioned Principal</span>
                    <span className="text-base font-bold text-white">₹{activeLoan.amount?.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Monthly EMI</span>
                    <span className="text-base font-bold text-emerald-400">₹{activeLoan.emi?.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Rate of Interest</span>
                    <span className="text-base font-bold text-cyan-400">{activeLoan.interestRate}% p.a.</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Outstanding Balance</span>
                    <span className="text-base font-bold text-amber-400">
                      ₹{(activeLoan.outstandingBalance || activeLoan.amount)?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400">
                    Next EMI Scheduled: {new Date(activeLoan.nextDueDate || Date.now() + 86400000 * 4).toLocaleDateString('en-IN')}
                  </span>
                  <button
                    onClick={() => setActiveTab('repayments')}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    View Amortisation Schedule <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ─── TAB 2: PHASE 4 PROFESSIONAL LOAN CALCULATOR ─── */}
        {activeTab === 'calculator' && (
          <div className="flex flex-col gap-6 animate-fadeIn">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">Reducing-Balance Loan Calculator</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Deterministic mathematical amortization using the standard reducing-balance formula: EMI = P · r · (1+r)ⁿ / ((1+r)ⁿ − 1).
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Inputs Column */}
              <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl flex flex-col gap-5">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <Percent size={16} className="text-emerald-400"/> Loan Parameters
                </h3>

                {/* Amount */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-300">Loan Principal (₹)</label>
                    <span className="font-mono text-emerald-400 font-bold">₹{calcAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="300000"
                    step="5000"
                    value={calcAmount}
                    onChange={e => setCalcAmount(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <input
                    type="number"
                    value={calcAmount}
                    onChange={e => setCalcAmount(Math.max(1000, Number(e.target.value)))}
                    className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Interest Rate */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-300">Annual Interest Rate (%)</label>
                    <span className="font-mono text-cyan-400 font-bold">{calcRate}% p.a.</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="24"
                    step="0.5"
                    value={calcRate}
                    onChange={e => setCalcRate(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Tenure */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-300">Tenure (Months)</label>
                    <span className="font-mono text-purple-400 font-bold">{calcTenure} Months</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[6, 12, 18, 24].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCalcTenure(t)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          calcTenure === t ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {t}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Processing Fee */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
                  <label className="text-xs font-bold text-slate-400">Processing Fee (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={calcFeePercent}
                    onChange={e => setCalcFeePercent(Math.max(0, Number(e.target.value)))}
                    className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAffordAmount(calcAmount);
                    setAffordTenure(calcTenure);
                    setAffordRate(calcRate);
                    setActiveTab('suggestions');
                  }}
                  className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  <Compass size={16} /> Test My Affordability
                </button>
              </div>

              {/* Output Display & Breakdown */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {calcResult && (
                  <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Monthly Commitment</span>
                        <div className="text-4xl font-black text-emerald-400 mt-1">
                          ₹{calcResult.emi.toLocaleString('en-IN')} <span className="text-sm font-normal text-slate-400">/ month</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowAmortTable(!showAmortTable)}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Clock size={14} /> {showAmortTable ? 'Hide Schedule' : 'View Monthly Amortisation'}
                        </button>
                      </div>
                    </div>

                    {/* Breakdown Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[11px] text-slate-400 block">Principal</span>
                        <span className="text-lg font-black text-white">₹{calcResult.principal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[11px] text-slate-400 block">Total Interest</span>
                        <span className="text-lg font-black text-cyan-400">₹{calcResult.totalInterest.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[11px] text-slate-400 block">Processing Fee</span>
                        <span className="text-lg font-black text-purple-400">₹{calcResult.processingFee.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[11px] text-slate-400 block">Total Payable</span>
                        <span className="text-lg font-black text-amber-400">₹{calcResult.totalPayable.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Visual Ratio Bar */}
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Principal: {Math.round((calcResult.principal / calcResult.totalRepayment) * 100)}%</span>
                        <span>Interest: {Math.round((calcResult.totalInterest / calcResult.totalRepayment) * 100)}%</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${(calcResult.principal / calcResult.totalRepayment) * 100}%` }}
                        ></div>
                        <div
                          className="bg-cyan-400 h-full"
                          style={{ width: `${(calcResult.totalInterest / calcResult.totalRepayment) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Amortisation Table View */}
                    {showAmortTable && (
                      <div className="overflow-x-auto mt-2 border-t border-slate-800 pt-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                          Monthly Reducing-Balance Amortisation Table ({calcResult.schedule.length} Instalments)
                        </h4>
                        <table className="w-full text-xs text-left font-mono">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400">
                              <th className="pb-2">Month</th>
                              <th className="pb-2">Opening (₹)</th>
                              <th className="pb-2">EMI (₹)</th>
                              <th className="pb-2 text-emerald-400">Principal (₹)</th>
                              <th className="pb-2 text-cyan-400">Interest (₹)</th>
                              <th className="pb-2">Closing (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {calcResult.schedule.map(row => (
                              <tr key={row.instalmentNumber} className="hover:bg-slate-800/30">
                                <td className="py-2 text-slate-300 font-bold">#{row.instalmentNumber}</td>
                                <td className="py-2 text-slate-400">₹{row.openingBalance.toLocaleString('en-IN')}</td>
                                <td className="py-2 text-white font-bold">₹{row.emiAmount.toLocaleString('en-IN')}</td>
                                <td className="py-2 text-emerald-400">₹{row.principalComponent.toLocaleString('en-IN')}</td>
                                <td className="py-2 text-cyan-400">₹{row.interestComponent.toLocaleString('en-IN')}</td>
                                <td className="py-2 text-slate-300">₹{row.closingBalance.toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ─── PREPAYMENT & ACCELERATED PAYOFF SIMULATOR ─── */}
            <div className="p-6 md:p-8 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                    <TrendingUp size={14} /> Accelerated Payoff Simulator
                  </span>
                  <h3 className="text-xl font-black text-white mt-1">Prepayment & Tenure Reduction Calculator</h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Simulate how extra monthly contributions or lump-sum prepayments shrink your debt faster and slash interest charges.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-300">Extra Monthly EMI (₹)</label>
                    <span className="font-mono text-emerald-400 font-bold">₹{extraMonthlyEmi.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20000"
                    step="500"
                    value={extraMonthlyEmi}
                    onChange={e => setExtraMonthlyEmi(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <input
                    type="number"
                    value={extraMonthlyEmi}
                    onChange={e => setExtraMonthlyEmi(Math.max(0, Number(e.target.value)))}
                    className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-300">One-Time Lump Sum (₹)</label>
                    <span className="font-mono text-cyan-400 font-bold">₹{lumpSumPrepayment.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={calcAmount}
                    step="1000"
                    value={lumpSumPrepayment}
                    onChange={e => setLumpSumPrepayment(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <input
                    type="number"
                    value={lumpSumPrepayment}
                    onChange={e => setLumpSumPrepayment(Math.max(0, Number(e.target.value)))}
                    className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-300">Lump Sum at Month #</label>
                    <span className="font-mono text-purple-400 font-bold">Month {lumpSumMonth}</span>
                  </div>
                  <select
                    value={lumpSumMonth}
                    onChange={e => setLumpSumMonth(Number(e.target.value))}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm"
                  >
                    {Array.from({ length: Math.min(calcTenure, 24) }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>Month {m}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={simulatingPrepay}
                    onClick={handleSimulatePrepayment}
                    className="py-2.5 mt-auto rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 hover:brightness-110 disabled:opacity-50"
                  >
                    {simulatingPrepay ? 'Calculating...' : 'Simulate Accelerated Payoff'}
                  </button>
                </div>
              </div>

              {/* Prepayment Results */}
              {prepaymentResult && (
                <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col gap-4 animate-fadeIn">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <CheckCircle2 size={16} /> Prepayment Simulation Outcome
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block">Revised Tenure</span>
                      <span className="text-lg font-black text-white">{prepaymentResult.newTenureMonths} Months</span>
                      <span className="text-[11px] text-emerald-400 block mt-0.5">({prepaymentResult.tenureMonthsSaved} mo faster!)</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block">Interest Saved</span>
                      <span className="text-lg font-black text-emerald-400">₹{prepaymentResult.interestSaved.toLocaleString('en-IN')}</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">vs standard plan</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block">New Total Interest</span>
                      <span className="text-lg font-black text-cyan-400">₹{prepaymentResult.newTotalInterest.toLocaleString('en-IN')}</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">down from ₹{prepaymentResult.originalTotalInterest.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block">New Payoff Date</span>
                      <span className="text-sm font-bold text-white mt-1 block">{prepaymentResult.estimatedPayoffDate}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── SIDE-BY-SIDE LOAN SCENARIO COMPARISON ─── */}
            <div className="p-6 md:p-8 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                    <ArrowLeftRight size={14} /> Side-by-Side Comparison Toolkit
                  </span>
                  <h3 className="text-xl font-black text-white mt-1">Compare Plan A vs Plan B</h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Contrast different principal sizes, interest rates, and loan terms side-by-side to understand financial trade-offs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCompareOpen(!compareOpen)}
                  className="px-4 py-2 rounded-xl bg-purple-900/40 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                >
                  {compareOpen ? 'Collapse Comparison' : 'Configure Plan B'}
                </button>
              </div>

              {compareOpen && (
                <div className="flex flex-col gap-5 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-300">Plan B Principal (₹)</label>
                      <input
                        type="number"
                        value={planBAmount}
                        onChange={e => setPlanBAmount(Number(e.target.value))}
                        className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-300">Plan B Interest Rate (%)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={planBRate}
                        onChange={e => setPlanBRate(Number(e.target.value))}
                        className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-300">Plan B Tenure (Months)</label>
                      <select
                        value={planBTenure}
                        onChange={e => setPlanBTenure(Number(e.target.value))}
                        className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm"
                      >
                        {[6, 12, 18, 24, 36].map(t => (
                          <option key={t} value={t}>{t} Months</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={comparing}
                    onClick={handleCompareScenarios}
                    className="py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20 disabled:opacity-50"
                  >
                    <ArrowLeftRight size={15} />
                    {comparing ? 'Comparing...' : 'Run Side-by-Side Comparison'}
                  </button>

                  {comparisonResult && (
                    <div className="flex flex-col gap-4 mt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Plan A */}
                        <div className="p-5 rounded-2xl bg-slate-950/70 border border-emerald-500/30 flex flex-col gap-3 font-mono text-xs">
                          <span className="font-extrabold text-emerald-400 text-sm">Plan A (Current Calculator)</span>
                          <div className="flex justify-between"><span className="text-slate-400">Principal:</span><span className="text-white font-bold">₹{comparisonResult.scenarioA.principal.toLocaleString('en-IN')}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Rate & Tenure:</span><span className="text-slate-300">{comparisonResult.scenarioA.annualRate}% / {comparisonResult.scenarioA.tenureMonths}m</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Monthly EMI:</span><span className="text-emerald-400 font-black text-sm">₹{comparisonResult.scenarioA.emi.toLocaleString('en-IN')}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Total Interest:</span><span className="text-cyan-400 font-bold">₹{comparisonResult.scenarioA.totalInterest.toLocaleString('en-IN')}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Total Payable:</span><span className="text-white font-bold">₹{comparisonResult.scenarioA.totalPayable.toLocaleString('en-IN')}</span></div>
                        </div>

                        {/* Plan B */}
                        <div className="p-5 rounded-2xl bg-slate-950/70 border border-purple-500/30 flex flex-col gap-3 font-mono text-xs">
                          <span className="font-extrabold text-purple-400 text-sm">Plan B (Alternative)</span>
                          <div className="flex justify-between"><span className="text-slate-400">Principal:</span><span className="text-white font-bold">₹{comparisonResult.scenarioB.principal.toLocaleString('en-IN')}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Rate & Tenure:</span><span className="text-slate-300">{comparisonResult.scenarioB.annualRate}% / {comparisonResult.scenarioB.tenureMonths}m</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Monthly EMI:</span><span className="text-purple-400 font-black text-sm">₹{comparisonResult.scenarioB.emi.toLocaleString('en-IN')}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Total Interest:</span><span className="text-cyan-400 font-bold">₹{comparisonResult.scenarioB.totalInterest.toLocaleString('en-IN')}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Total Payable:</span><span className="text-white font-bold">₹{comparisonResult.scenarioB.totalPayable.toLocaleString('en-IN')}</span></div>
                        </div>
                      </div>

                      {/* Trade-off Summary */}
                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
                        <span className="font-bold text-white block mb-1">Financial Trade-off Analysis:</span>
                        <p className="text-slate-300 leading-relaxed">{comparisonResult.summary}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Save Scenario Bar */}
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex-1 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Scenario label (e.g., Home Renovation Plan 12m)"
                    value={scenarioTitle}
                    onChange={e => setScenarioTitle(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500"
                  />
                </div>
                <button
                  type="button"
                  disabled={savingScenario}
                  onClick={handleSaveScenario}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <BookmarkPlus size={14} className="text-emerald-400" />
                  {savingScenario ? 'Saving...' : 'Save Scenario'}
                </button>
              </div>

              {/* Saved Scenarios List */}
              {savedScenarios.length > 0 && (
                <div className="flex flex-col gap-2 mt-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    My Saved Scenarios ({savedScenarios.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedScenarios.map(sc => (
                      <div key={sc.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <span className="font-bold text-white block">{sc.name}</span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            ₹{sc.amount.toLocaleString('en-IN')} @ {sc.annualRate}% · {sc.tenureMonths}m · EMI: ₹{sc.emi.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteScenario(sc.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                          title="Delete scenario"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: PHASE 5 PERSONALIZED LOAN SUGGESTIONS ─── */}
        {activeTab === 'suggestions' && (
          <div className="flex flex-col gap-6 animate-fadeIn">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">Personalized Loan Affordability</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Deterministic cashflow analysis: Monthly Surplus = Income − Living Expenses − Existing Debt EMIs.
              </p>
            </div>

            {/* Income & Expense Confirmation Card */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Confirmed Financial Baseline</span>
                <span className="text-xs text-emerald-400 font-mono">Factual telemetry loaded</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-300">Monthly Net Income (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 55000"
                    value={customIncome}
                    onChange={e => setCustomIncome(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500">Default: ₹55,000 / month</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-300">Essential Expenses (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 28000"
                    value={customExpenses}
                    onChange={e => setCustomExpenses(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500">Rent, groceries, utilities</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-300">Existing Debt EMIs (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 0"
                    value={customDebt}
                    onChange={e => setCustomDebt(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500">Other active loan commitments</span>
                </div>
              </div>
            </div>

            {/* Affordability Status Banner */}
            {affordData && (
              <div className={`p-6 rounded-3xl border shadow-xl flex flex-col gap-4 ${
                affordData.overallStatus === 'COMFORTABLE'
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                  : affordData.overallStatus === 'MODERATE'
                  ? 'bg-blue-950/20 border-blue-500/40 text-blue-200'
                  : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">
                      {affordData.overallStatus === 'COMFORTABLE' ? '🛡️' : affordData.overallStatus === 'MODERATE' ? '⚖️' : '⚠️'}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-white text-lg">Affordability: {affordData.overallStatus}</h3>
                      <p className="text-xs text-slate-300">{affordData.recommendationSummary}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => runAffordabilityCheck(true)}
                    disabled={explainingWithAI}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <Sparkles size={14} />
                    {explainingWithAI ? 'Gemini Analyzing...' : 'Explain with Gemini AI'}
                  </button>
                </div>

                {geminiAffordExplain && (
                  <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 text-xs text-slate-200 leading-relaxed font-sans">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block mb-1">
                      Gemini Advisory Explanation
                    </span>
                    {geminiAffordExplain}
                  </div>
                )}
              </div>
            )}

            {/* Suggested Scenarios Cards */}
            {affordData?.scenarios && (
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Recommended Restructuring & Alternative Loan Scenarios
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {affordData.scenarios.map((sc: LoanScenarioSuggestion) => (
                    <div
                      key={sc.scenarioType}
                      className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-lg flex flex-col justify-between gap-4 hover:border-slate-700 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <span className="font-bold text-white text-sm">{sc.title}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            sc.affordabilityStatus === 'COMFORTABLE'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {sc.affordabilityStatus}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
                          <div>
                            <span className="text-slate-500 block">Monthly EMI</span>
                            <span className="text-lg font-black text-emerald-400">₹{sc.emi.toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Projected Surplus</span>
                            <span className={`text-lg font-black ${sc.projectedSurplus >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                              ₹{sc.projectedSurplus.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Total Interest</span>
                            <span className="font-bold text-slate-300">₹{sc.totalInterest.toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Debt-to-Income</span>
                            <span className="font-bold text-slate-300">{sc.debtToIncomeRatio}%</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 mt-4 leading-relaxed">{sc.rationale}</p>
                        <span className="text-[11px] text-emerald-400/90 block mt-1">💡 {sc.recommendation}</span>
                      </div>

                      <button
                        onClick={() => {
                          setApplyAmount(String(sc.amount));
                          setApplyTenure(String(sc.tenureMonths));
                          setActiveTab('loan');
                        }}
                        className="w-full py-2.5 mt-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        Apply for this Plan <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: PHASE 7 COMPLETE REPAYMENTS WINDOW ─── */}
        {activeTab === 'repayments' && (
          <div className="flex flex-col gap-6 animate-fadeIn">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">Repayment Management</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Track scheduled instalments, verify transactions, and simulate demo EMI payments with receipt generation.
              </p>
            </div>

            {repaymentLoans.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 text-sm">
                No active loan facilities requiring repayment found. Submit a loan application to activate repayment tracking.
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                
                {/* Loan Selector Tabs */}
                {repaymentLoans.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {repaymentLoans.map((l, idx) => (
                      <button
                        key={l.id}
                        onClick={() => setSelectedRepaymentLoan(l)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedRepaymentLoan?.id === l.id
                            ? 'bg-emerald-500 text-black shadow-md'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Loan #{l.id.slice(0, 8)} (₹{l.amount.toLocaleString('en-IN')})
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Loan Repayment Card */}
                {selectedRepaymentLoan && (
                  <div className="p-6 md:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Facility</span>
                        <h2 className="text-2xl font-black text-white">Facility Reference #{selectedRepaymentLoan.id.slice(0, 8)}</h2>
                        <span className="text-xs text-slate-400">
                          {selectedRepaymentLoan.tenureMonths} Months @ {selectedRepaymentLoan.interestRate}% p.a. Reducing-Balance
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            const nextUnpaid = selectedRepaymentLoan.repayments?.find((s: any) => s.status !== 'PAID');
                            setPaymentTargetInstalment(nextUnpaid || null);
                            setPaymentModalOpen(true);
                          }}
                          disabled={selectedRepaymentLoan.status === 'PAID'}
                          className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CreditCard size={16} /> Pay Next EMI (Demo Gateway)
                        </button>
                      </div>
                    </div>

                    {/* Progress Metrics Strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-500 block">Sanctioned Amount</span>
                        <span className="text-lg font-bold text-white">₹{selectedRepaymentLoan.amount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-500 block">Outstanding Balance</span>
                        <span className="text-lg font-bold text-amber-400">
                          ₹{(selectedRepaymentLoan.outstandingBalance || selectedRepaymentLoan.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-500 block">Total Repaid</span>
                        <span className="text-lg font-bold text-emerald-400">
                          ₹{(selectedRepaymentLoan.totalRepaid || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-500 block">Instalment Progress</span>
                        <span className="text-lg font-bold text-cyan-400">
                          {selectedRepaymentLoan.paidInstalments || 0} / {selectedRepaymentLoan.totalInstalments || selectedRepaymentLoan.tenureMonths} Paid
                        </span>
                      </div>
                    </div>

                    {/* Repayment Schedule Table */}
                    <div className="flex flex-col gap-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Full Repayment Instalment Schedule
                      </h3>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left font-mono">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400">
                              <th className="py-2.5 px-3">Instalment</th>
                              <th className="py-2.5 px-3">Due Date</th>
                              <th className="py-2.5 px-3">EMI Amount</th>
                              <th className="py-2.5 px-3">Principal Component</th>
                              <th className="py-2.5 px-3">Interest Component</th>
                              <th className="py-2.5 px-3">Balance Remaining</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {selectedRepaymentLoan.repayments?.map((inst: RepaymentScheduleItem) => (
                              <tr key={inst.id} className="hover:bg-slate-800/30">
                                <td className="py-3 px-3 font-bold text-white">Instalment #{inst.instalmentNumber}</td>
                                <td className="py-3 px-3 text-slate-400">
                                  {new Date(inst.dueDate).toLocaleDateString('en-IN')}
                                </td>
                                <td className="py-3 px-3 text-white font-bold">₹{inst.emiAmount.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-3 text-emerald-400">₹{inst.principalComponent.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-3 text-cyan-400">₹{inst.interestComponent.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-3 text-slate-300">₹{inst.closingBalance.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-3">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    inst.status === 'PAID'
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : inst.status === 'DUE_SOON'
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      : inst.status === 'OVERDUE'
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                                  }`}>
                                    {inst.status}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  {inst.status !== 'PAID' ? (
                                    <button
                                      onClick={() => {
                                        setPaymentTargetInstalment(inst);
                                        setPaymentModalOpen(true);
                                      }}
                                      className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold cursor-pointer transition-all"
                                    >
                                      Pay Now
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                      <Check size={12} className="text-emerald-400" /> Paid
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 5: LOAN APPLICATION ─── */}
        {activeTab === 'loan' && (
          <div className="flex flex-col gap-6 animate-fadeIn">
            {loanState === 'form' && (
              <div className="p-6 md:p-8 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-black text-white">Apply for Micro-Loan</h2>
                  <p className="text-slate-400 text-sm mt-0.5">Underwriting powered by real XGBoost Machine Learning model.</p>
                </div>

                {draftNotice && (
                  <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 rounded-2xl text-xs font-semibold flex items-center justify-between">
                    <span>{draftNotice}</span>
                    <button onClick={() => setDraftNotice(null)} className="text-emerald-400 hover:text-white cursor-pointer"><X size={14} /></button>
                  </div>
                )}

                {hasSavedDraft && (
                  <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-cyan-200">
                      <Bookmark size={16} className="text-cyan-400 shrink-0" />
                      <span>You have a saved loan application draft in your account.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResumeLoanDraft}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs transition-all cursor-pointer shadow-sm"
                      >
                        Resume Draft
                      </button>
                      <button
                        type="button"
                        onClick={handleDiscardLoanDraft}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-all cursor-pointer"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                )}

                {applyError && (
                  <div className="p-4 bg-red-950/40 border border-red-500/40 text-red-300 rounded-xl text-xs font-medium">
                    {applyError}
                  </div>
                )}

                <form onSubmit={handleApplyLoan} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-300">Requested Loan Amount (₹)</label>
                      <input
                        type="number"
                        value={applyAmount}
                        onChange={e => setApplyAmount(e.target.value)}
                        required
                        className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-300">Repayment Duration</label>
                      <select
                        value={applyTenure}
                        onChange={e => setApplyTenure(e.target.value)}
                        className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="6">6 Months</option>
                        <option value="12">12 Months</option>
                        <option value="18">18 Months</option>
                        <option value="24">24 Months</option>
                      </select>
                    </div>
                  </div>

                  {/* Demographic and Historical Credit Inputs for XGBoost */}
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                        Credit Assessment Telemetry (XGBoost Input Vector)
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">23 Trained Features</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">LIMIT_BAL</label>
                        <input
                          type="number"
                          value={limitBal}
                          onChange={e => setLimitBal(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Age</label>
                        <input
                          type="number"
                          value={age}
                          onChange={e => setAge(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">Education</label>
                        <select
                          value={education}
                          onChange={e => setEducation(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                        >
                          <option value="1">1 (Grad)</option>
                          <option value="2">2 (Univ)</option>
                          <option value="3">3 (School)</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-slate-400 block mb-1">PAY_0 (Delay)</label>
                        <select
                          value={payHistory[0]}
                          onChange={e => {
                            const newH = [...payHistory];
                            newH[0] = Number(e.target.value);
                            setPayHistory(newH);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                        >
                          <option value="0">0 (Duly Paid)</option>
                          <option value="1">1 (1 Mo Delay)</option>
                          <option value="2">2 (2 Mo Delay)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-2">
                    <button
                      type="button"
                      disabled={isSavingDraft}
                      onClick={handleSaveLoanDraft}
                      className="py-4 px-6 rounded-xl font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Save size={16} />
                      {isSavingDraft ? 'Saving Draft...' : 'Save Draft (Resume Later)'}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-4 rounded-xl font-extrabold bg-gradient-to-r from-emerald-500 to-cyan-500 text-black hover:brightness-110 active:scale-98 shadow-lg shadow-emerald-500/20 transition-all text-sm cursor-pointer"
                    >
                      Submit Application for ML Underwriting
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Analyzing State */}
            {loanState === 'analyzing' && (
              <div className="p-12 rounded-3xl bg-slate-900/70 border border-slate-800 text-center flex flex-col items-center justify-center gap-4">
                <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <h3 className="text-xl font-bold text-white">Running XGBoost Credit Scoring...</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Calculating default probability and extracting SHAP feature attributions via TreeExplainer.
                </p>
              </div>
            )}

            {/* Result State */}
            {loanState === 'result' && analysisResult && (
              <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl flex flex-col gap-6 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Application Submitted</span>
                    <h2 className="text-2xl font-black text-white">Application Reference #{analysisResult.loan.id.slice(0, 8)}</h2>
                  </div>
                  <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    STATUS: PENDING REVIEW
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-500 block">Calculated Score</span>
                    <span className="text-xl font-black text-emerald-400">{analysisResult.prediction?.creditScore} / 850</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-500 block">Risk Classification</span>
                    <span className="text-xl font-black text-cyan-400">{analysisResult.prediction?.riskCategory}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-500 block">Monthly EMI</span>
                    <span className="text-xl font-black text-white">₹{analysisResult.loan.emi}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-500 block">Total Scheduled</span>
                    <span className="text-xl font-black text-purple-400">{analysisResult.loan.tenureMonths} Months</span>
                  </div>
                </div>

                {analysisResult.prediction?.recommendationNote && (
                  <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-200">
                    💡 <strong>Underwriter Note:</strong> {analysisResult.prediction.recommendationNote}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setLoanState('form')}
                    className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    New Calculation
                  </button>
                  <button
                    onClick={() => setActiveTab('repayments')}
                    className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-all cursor-pointer"
                  >
                    View Repayments Schedule
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 6: PHASE 2 GEMINI AI FINANCIAL ASSISTANT ─── */}
        {activeTab === 'ai' && (
          <div className="flex flex-col h-[650px] bg-slate-900/80 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden animate-fadeIn">
            
            {/* Chat Header */}
            <div className="p-4 px-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-bold text-black shadow-md">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">SpendiFy AI Financial Assistant</h3>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${geminiStatus?.configured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                    {geminiStatus?.configured ? `Google ${geminiStatus.model} Active` : 'Gemini Key Configuration Notice'}
                  </span>
                </div>
              </div>

              <span className="text-xs text-slate-500 font-mono hidden sm:block">Factual Deterministic Grounding</span>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto gap-3 text-slate-400">
                  <span className="text-4xl">💬</span>
                  <h4 className="font-bold text-white text-base">Your Personal AI Financial Advisor</h4>
                  <p className="text-xs leading-relaxed">
                    Ask me about your financial health, affordability for specific loan amounts, expense management, or repayment planning.
                  </p>
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed ${
                      msg.isBot
                        ? 'self-start bg-slate-800/90 text-slate-200 border border-slate-700/80 shadow-md'
                        : 'self-end bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium shadow-md'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.message}</div>
                    <span className="text-[10px] text-slate-400/80 mt-1.5 self-end">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}

              {sendingChat && (
                <div className="self-start p-4 rounded-2xl bg-slate-800/90 border border-slate-700 text-slate-300 text-xs flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                  Generating AI advisory response...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Suggestion Chips */}
            <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex flex-wrap gap-2">
              {[
                'Explain my financial health.',
                'Can I afford a loan of ₹50,000?',
                'Summarise my income and spending.',
                'What happens if I choose a longer tenure?',
                'Help me plan my repayments.'
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendChatToApi(prompt)}
                  className="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 border border-slate-700/80 transition-all cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={e => { e.preventDefault(); sendChatToApi(userMsg); }} className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={userMsg}
                onChange={e => setUserMsg(e.target.value)}
                placeholder="Ask about financial health, repayment planning, or loan limits..."
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={sendingChat || !userMsg.trim()}
                className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold flex items-center justify-center transition-all cursor-pointer disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}

        {/* ─── TAB 7: HISTORY ─── */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-6 animate-fadeIn">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">Loan Facility History</h1>
              <p className="text-slate-400 text-sm mt-0.5">Historical log of submitted and approved facilities.</p>
            </div>

            {loans.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 text-sm">
                No prior loan applications on record.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {loans.map(l => (
                  <div key={l.id} className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between shadow-md">
                    <div className="flex flex-col gap-1">
                      <span className="text-lg font-black text-white">₹{l.amount.toLocaleString('en-IN')}</span>
                      <span className="text-xs text-slate-400 font-mono">
                        EMI: ₹{l.emi}/mo ({l.tenureMonths} Months @ {l.interestRate}%)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Date: {new Date(l.createdAt).toLocaleDateString('en-IN')} | Ref: #{l.id.slice(0, 8)}
                      </span>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      l.status === 'APPROVED' || l.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : l.status === 'PAID'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 8: PROFILE & SETTINGS ─── */}
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-6 animate-fadeIn">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">My Account & Identity</h1>
              <p className="text-slate-400 text-sm mt-0.5">Profile metadata, compliance credentials, and session controls.</p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl flex flex-col gap-4">
              <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-black font-black text-xl">
                  {user?.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-lg">{user?.name}</h3>
                  <span className="text-xs text-slate-400 font-mono">{user?.email}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block">Phone</span>
                  <span className="font-bold text-white">{user?.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">KYC Status</span>
                  <span className={`font-bold uppercase ${kyc?.status === 'APPROVED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {kyc?.status || 'NOT_STARTED'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">PAN Number</span>
                  <span className="font-bold text-white">{kyc?.panNumber || 'Pending Upload'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Aadhaar Reference</span>
                  <span className="font-bold text-white">{kyc?.aadhaarNumber ? `XXXX-XXXX-${kyc.aadhaarNumber.slice(-4)}` : 'Pending'}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <Link
                  to="/kyc"
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all text-center"
                >
                  Manage KYC Documents
                </Link>
                <button
                  onClick={logout}
                  className="px-4 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: TRANSACTIONS & CASHFLOW ─── */}
        {activeTab === 'transactions' && (
          <div className="animate-fadeIn">
            <TransactionsTab />
          </div>
        )}

        {/* ─── TAB: BUDGETS & SAVINGS GOALS ─── */}
        {activeTab === 'budgets' && (
          <div className="animate-fadeIn">
            <BudgetsTab />
          </div>
        )}

      </main>

      {/* ─── SIMULATED PAYMENT MODAL (PHASE 7) ─── */}
      {paymentModalOpen && selectedRepaymentLoan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#0F1422] border border-slate-700 shadow-2xl flex flex-col gap-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Simulated Payment Gateway (Demo Mode)
                </span>
                <h3 className="text-lg font-bold text-white">Record EMI Payment</h3>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Facility ID:</span>
                <span className="font-bold text-white">#{selectedRepaymentLoan.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Instalment:</span>
                <span className="font-bold text-cyan-400">
                  #{paymentTargetInstalment?.instalmentNumber || 1}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-800">
                <span className="text-white font-bold">Total Amount Due:</span>
                <span className="text-emerald-400 font-black">
                  ₹{(paymentTargetInstalment?.emiAmount || selectedRepaymentLoan.emi).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-300">Select Demo Payment Method</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['SIMULATED_UPI', 'NET_BANKING', 'DEBIT_CARD'] as const).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-1 rounded-xl font-bold transition-all cursor-pointer text-center ${
                      paymentMethod === method
                        ? 'bg-emerald-500 text-black shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {method === 'SIMULATED_UPI' ? 'UPI' : method === 'NET_BANKING' ? 'NetBanking' : 'Card'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-200">
              ⚠️ <strong>Academic Demonstration Notice:</strong> No real bank charges or debit will occur. A verified transaction hash is created to reconcile the loan balance.
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleExecutePayment}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isProcessingPayment ? 'Processing...' : 'Authorize Demo Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PAYMENT RECEIPT MODAL ─── */}
      {paymentSuccessModal && paymentReceipt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#0F1422] border border-emerald-500/40 shadow-2xl flex flex-col gap-5 animate-scaleUp">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-xl font-black text-white">Payment Verified & Recorded</h3>
              <span className="text-xs text-slate-400 font-mono">Receipt: {paymentReceipt.receiptNumber}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-2.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="font-bold text-emerald-400 text-sm">₹{paymentReceipt.amountPaid?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Reference:</span>
                <span className="font-bold text-white">{paymentReceipt.referenceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Remaining Balance:</span>
                <span className="font-bold text-amber-400">₹{paymentReceipt.remainingBalance?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Facility Status:</span>
                <span className="font-bold text-cyan-400">{paymentReceipt.loanStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp:</span>
                <span className="text-slate-300">{new Date(paymentReceipt.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 text-center leading-relaxed">
              {paymentReceipt.disclaimer}
            </p>

            <button
              onClick={() => setPaymentSuccessModal(false)}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs cursor-pointer shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Bottom Sticky Tab Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F19]/95 backdrop-blur-xl border-t border-slate-800/80 py-2.5 shadow-2xl">
        <div className="max-w-3xl mx-auto flex items-center justify-around px-2 overflow-x-auto no-scrollbar gap-1">
          
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 px-2 py-1 transition-all cursor-pointer shrink-0 ${
              activeTab === 'home' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HomeIcon size={18} />
            <span className="text-[10px]">Home</span>
          </button>

          <button 
            onClick={() => setActiveTab('transactions')}
            className={`flex flex-col items-center gap-1 px-2 py-1 transition-all cursor-pointer shrink-0 ${
              activeTab === 'transactions' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt size={18} />
            <span className="text-[10px]">Txns</span>
          </button>

          <button 
            onClick={() => setActiveTab('budgets')}
            className={`flex flex-col items-center gap-1 px-2 py-1 transition-all cursor-pointer shrink-0 ${
              activeTab === 'budgets' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PiggyBank size={18} />
            <span className="text-[10px]">Budgets</span>
          </button>

          <button 
            onClick={() => setActiveTab('calculator')}
            className={`flex flex-col items-center gap-1 px-2 py-1 transition-all cursor-pointer shrink-0 ${
              activeTab === 'calculator' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator size={18} />
            <span className="text-[10px]">Calc</span>
          </button>

          <button 
            onClick={() => setActiveTab('suggestions')}
            className={`flex flex-col items-center gap-1 px-2 py-1 transition-all cursor-pointer shrink-0 ${
              activeTab === 'suggestions' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass size={18} />
            <span className="text-[10px]">Afford</span>
          </button>

          <button 
            onClick={() => setActiveTab('repayments')}
            className={`flex flex-col items-center gap-1 px-2 py-1 transition-all cursor-pointer shrink-0 ${
              activeTab === 'repayments' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarCheck size={18} />
            <span className="text-[10px]">Pay</span>
          </button>

          <button 
            onClick={() => setActiveTab('loan')}
            className={`flex flex-col items-center gap-1 px-2 py-1 transition-all cursor-pointer shrink-0 ${
              activeTab === 'loan' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard size={18} />
            <span className="text-[10px]">Apply</span>
          </button>

          <button 
            onClick={() => setActiveTab('ai')}
            className={`flex flex-col items-center gap-1 px-2 py-1 transition-all cursor-pointer shrink-0 ${
              activeTab === 'ai' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare size={18} />
            <span className="text-[10px]">AI</span>
          </button>

        </div>
      </nav>

      {/* ─── NOTIFICATION CENTRE DRAWER ─── */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        alerts={alerts}
        onRefreshAlerts={fetchDashboardData}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsNotificationOpen(false);
        }}
      />

    </div>
  );
};

export default BorrowerDashboard;
