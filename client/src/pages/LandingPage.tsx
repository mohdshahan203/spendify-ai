import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LandingCanvas from '../components/canvas/LandingCanvas';
import { 
  ShieldCheck, 
  Cpu, 
  TrendingUp, 
  Layers, 
  ChevronRight, 
  Sparkles, 
  CheckCircle2, 
  UserCheck, 
  Briefcase, 
  KeyRound,
  Calculator,
  ArrowRight
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [showDemoModal, setShowDemoModal] = useState(false);

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-white text-slate-800">
      {/* Interactive 3D Canvas Background */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
        <LandingCanvas />
      </div>

      {/* Navigation Header */}
      <header className="relative z-20 w-full px-6 py-4 mx-auto max-w-7xl flex items-center justify-between border-b border-slate-100/80 bg-white/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-2xl sm:text-3xl font-black tracking-tight text-primary flex items-center gap-1.5">
            <span>SpendiFy</span>
          </Link>
          <span className="hidden sm:inline-flex px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-accent text-primary rounded-full border border-green-200/80">
            FinTech AI Engine
          </span>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setShowDemoModal(true)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <KeyRound size={13} className="text-primary" />
            <span className="hidden sm:inline">Demo</span> Accounts
          </button>
          <Link to="/login" className="px-4 py-2 text-sm font-bold text-slate-700 hover:text-primary transition-colors">
            Login
          </Link>
          <Link to="/register" className="px-5 py-2.5 text-sm font-bold rounded-xl bg-primary text-white hover:bg-[#1B5E20] active:scale-[0.98] shadow-sm transition-all">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[78vh] text-center px-6 max-w-4xl mx-auto pt-8 pb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 text-xs font-bold rounded-full bg-accent text-primary border border-green-200 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
          <span>Intelligent Micro-Lending with Explainable AI</span>
        </div>
        
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-900 mb-6 leading-[1.12]">
          Empowering Micro-Loans with <br />
          <span className="text-primary">Transparent AI Scoring</span>
        </h1>
        
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mb-10 leading-relaxed font-normal">
          Designed for students, gig workers, and micro-entrepreneurs. Instant affordability checks powered by real Machine Learning (XGBoost + Random Forest), mathematical reducing-balance EMI models, and explainable SHAP telemetry.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link to="/register" className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold rounded-xl bg-primary text-white hover:bg-[#1B5E20] active:scale-[0.98] shadow-md shadow-emerald-900/10 transition-all text-center flex items-center justify-center gap-2">
            <span>Apply For Loan</span>
            <ArrowRight size={16} />
          </Link>
          <button
            onClick={() => setShowDemoModal(true)}
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all text-center text-slate-700 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Explore Demo Roles</span>
          </button>
        </div>

        {/* Real Metrics Ticker */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 w-full max-w-3xl pt-8 border-t border-slate-100">
          <div className="p-3 text-center">
            <span className="text-2xl font-black text-slate-900 block">77.7%</span>
            <span className="text-xs text-slate-500 font-medium">XGBoost ROC-AUC</span>
          </div>
          <div className="p-3 text-center">
            <span className="text-2xl font-black text-primary block">30,000</span>
            <span className="text-xs text-slate-500 font-medium">Trained Profiles (UCI)</span>
          </div>
          <div className="p-3 text-center">
            <span className="text-2xl font-black text-slate-900 block">100%</span>
            <span className="text-xs text-slate-500 font-medium">SHAP Explainable</span>
          </div>
          <div className="p-3 text-center">
            <span className="text-2xl font-black text-primary block">₹0</span>
            <span className="text-xs text-slate-500 font-medium">Hidden Charges</span>
          </div>
        </div>
      </section>

      {/* Architecture & AI Pipeline Overview */}
      <section className="relative z-10 px-6 py-20 mx-auto max-w-6xl border-t border-slate-100 bg-[#F8FAFC]">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">
            Core Engineering Architecture
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-3">
            How SpendiFy Scores & Protects You
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Multi-tier FinTech platform combining statistical risk assessment, mathematical financial projections, and deterministic debt safeguards.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-7 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-3.5 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-primary text-xl font-bold shadow-xs">
              <Cpu size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">1. AI Risk & Credit Scoring</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Trained on the classic UCI Credit Dataset using class-weighted XGBoost and Random Forest classifiers. Yields genuine default probability and credit scores (300-900).
            </p>
          </div>
          
          <div className="p-7 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-3.5 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-primary text-xl font-bold shadow-xs">
              <Layers size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">2. SHAP Explainability</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Every loan prediction is accompanied by real TreeExplainer SHAP values that show the borrower exactly which factors (e.g., payment delays vs. bill amount) drove their outcome.
            </p>
          </div>
          
          <div className="p-7 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-3.5 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-primary text-xl font-bold shadow-xs">
              <Calculator size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">3. Reducing-Balance Math</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Accurate monthly reducing amortisation schedules, debt-to-income (DTI) validation, extra prepayment simulation, and real payment state tracking.
            </p>
          </div>
        </div>
      </section>

      {/* Demo Credentials Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound size={20} className="text-primary" />
                <h3 className="text-lg font-bold text-slate-900">System Demo Credentials</h3>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Use these pre-seeded demo accounts to experience the role-based views for borrowers, loan officers, and system administrators:
            </p>

            <div className="flex flex-col gap-3">
              {/* Borrower Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent text-primary flex items-center justify-center font-bold">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">Borrower Persona</span>
                    <span className="text-[11px] font-mono text-slate-500">borrower@spendify.com / Borrower@123</span>
                  </div>
                </div>
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-[#1B5E20] transition-colors"
                >
                  Login
                </Link>
              </div>

              {/* Loan Officer Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">Loan Officer Persona</span>
                    <span className="text-[11px] font-mono text-slate-500">officer@spendify.com / Officer@123</span>
                  </div>
                </div>
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Login
                </Link>
              </div>

              {/* Admin Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">System Administrator</span>
                    <span className="text-[11px] font-mono text-slate-500">admin@spendify.com / Admin@123</span>
                  </div>
                </div>
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                >
                  Login
                </Link>
              </div>
            </div>

            <div className="pt-2 text-center">
              <span className="text-[11px] text-slate-400">
                You can also use the 1-click quick login buttons directly on the Login page!
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 w-full px-6 py-8 border-t border-slate-100 bg-white text-center text-slate-500 text-xs">
        <p className="max-w-2xl mx-auto">© 2026 SpendiFy. AI-Powered Micro-Lending Platform. Engineering Project Demonstration.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
