import React from 'react';
import { Link } from 'react-router-dom';
import LandingCanvas from '../components/canvas/LandingCanvas';

export const LandingPage: React.FC = () => {
  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-white text-slate-800">
      {/* Interactive 3D Canvas Background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <LandingCanvas />
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 w-full px-6 py-5 mx-auto max-w-7xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-primary">
            SpendiFy
          </span>
          <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-accent text-primary rounded-full border border-green-200/60">
            AI Assist
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <Link to="/login" className="px-5 py-2 text-sm font-bold text-slate-700 hover:text-primary transition-colors">
            Login
          </Link>
          <Link to="/register" className="px-6 py-2.5 text-sm font-bold rounded-xl bg-primary text-white hover:bg-[#1B5E20] active:scale-[0.98] shadow-sm transition-all">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] text-center px-6 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-xs font-semibold rounded-full bg-accent text-primary border border-green-200">
          <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
          <span>Simple, Safe, and Fast Micro-Loans</span>
        </div>
        
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-tight">
          Get a micro-loan in <br />
          <span className="text-primary">minutes, not days</span>
        </h1>
        
        <p className="text-md sm:text-xl text-slate-600 max-w-2xl mb-12 leading-relaxed">
          No bank visits. No traditional credit scores needed. We help students, freelancers, farmers, and gig workers get small loans instantly using direct AI-powered verification.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link to="/register" className="w-full sm:w-auto px-10 py-4 text-md font-bold rounded-xl bg-primary text-white hover:bg-[#1B5E20] active:scale-[0.98] shadow-md transition-all text-center">
            Apply For Loan
          </Link>
          <a href="#how-it-works" className="w-full sm:w-auto px-10 py-4 text-md font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all text-center text-slate-700 shadow-xs">
            Learn More
          </a>
        </div>
      </section>

      {/* Plain English Feature Grid */}
      <section id="how-it-works" className="relative z-10 px-6 py-24 mx-auto max-w-6xl border-t border-slate-100 bg-[#F8FAFC]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-4">
            How SpendiFy works for you
          </h2>
          <p className="text-slate-600">
            We look at your overall financial activity to offer you fair loans with simple, transparent repayment plans.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-primary text-xl font-bold">
              1
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">Upload KYC</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Quickly upload your Aadhaar, PAN card, and a bank statement. No long paper forms. We keep your data safe and private.
            </p>
          </div>
          
          <div className="p-8 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-primary text-xl font-bold">
              2
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">Get Your Financial Score</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Our AI analysis reviews your bank statements to give you a clear, simple Financial Score. High scores unlock better loan terms.
            </p>
          </div>
          
          <div className="p-8 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-primary text-xl font-bold">
              3
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">Instant Disbursal</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Choose your repayment tenure and receive the money directly into your bank account. Repay easily on your mobile phone.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full px-6 py-10 border-t border-slate-100 bg-white text-center text-slate-500 text-xs">
        <p className="max-w-2xl mx-auto">© 2026 SpendiFy. AI-powered micro-lending platform. We promote financial inclusion and transparency for under-served communities.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
