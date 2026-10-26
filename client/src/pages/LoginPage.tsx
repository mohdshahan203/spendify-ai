import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LandingCanvas from '../components/canvas/LandingCanvas';
import { Eye, EyeOff, ShieldCheck, UserCheck, Briefcase } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const { toast } = { toast: useToast() };
  const navigate = useNavigate();

  const handleLoginWithCreds = async (eMailToUse: string, pwdToUse: string) => {
    setError(null);
    setUnverifiedEmail(null);
    setLoading(true);
    try {
      const data = await login(eMailToUse, pwdToUse);
      toast.success(`Welcome back, ${data.user.name || 'User'}!`, 'Authentication Successful');
      if (data.user.role === 'ADMIN' || data.user.role === 'OFFICER') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const resData = err.response?.data;
      const msg = resData?.error || 'Wrong email or password. Please try again.';
      setError(msg);

      if (resData?.unverified) {
        setUnverifiedEmail(resData.email || eMailToUse);
        toast.warning('Please complete 6-digit OTP verification to activate your account.', 'Verification Required');
      } else {
        toast.error(msg, 'Login Failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLoginWithCreds(email, password);
  };

  const handleDemoFill = async (demoEmail: string, demoPass: string, roleName: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    toast.info(`Loaded ${roleName} credentials. Logging in...`, 'Demo Account');
    await handleLoginWithCreds(demoEmail, demoPass);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 bg-white text-slate-800">
      {/* 3D Background Canvas (soft particles floating) */}
      <div className="absolute inset-0 z-0 opacity-25 pointer-events-none">
        <LandingCanvas />
      </div>

      <div className="relative w-full max-w-md p-8 sm:p-10 rounded-3xl bg-slate-50/95 border border-slate-200/80 shadow-2xl z-10 flex flex-col backdrop-blur-md">
        <div className="flex flex-col text-center mb-6">
          <Link to="/" className="text-3xl font-black tracking-tight text-primary mb-1.5 hover:opacity-90 transition-opacity">
            SpendiFy
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-primary/70 mb-2">Micro-Lending & AI Scoring</span>
          <span className="text-slate-500 font-medium text-sm">Sign in to your financial console.</span>
        </div>

        {/* Demo Fast-Switch Buttons for Reviewers/Demonstrations */}
        <div className="p-3.5 mb-6 rounded-2xl bg-accent/60 border border-emerald-200/70 flex flex-col gap-2">
          <span className="text-[11px] font-bold text-primary uppercase tracking-wider text-center">
            ⚡ Quick Demo Access (1-Click Login)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoFill('borrower@spendify.com', 'Borrower@123', 'Borrower')}
              className="px-2.5 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200/80 text-[11px] font-bold text-slate-800 flex flex-col items-center justify-center gap-1 shadow-xs hover:border-primary transition-all cursor-pointer"
            >
              <UserCheck size={14} className="text-primary" />
              <span>Borrower</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('officer@spendify.com', 'Officer@123', 'Loan Officer')}
              className="px-2.5 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200/80 text-[11px] font-bold text-slate-800 flex flex-col items-center justify-center gap-1 shadow-xs hover:border-primary transition-all cursor-pointer"
            >
              <Briefcase size={14} className="text-primary" />
              <span>Officer</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('admin@spendify.com', 'Admin@123', 'Admin')}
              className="px-2.5 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200/80 text-[11px] font-bold text-slate-800 flex flex-col items-center justify-center gap-1 shadow-xs hover:border-primary transition-all cursor-pointer"
            >
              <ShieldCheck size={14} className="text-primary" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {unverifiedEmail && (
          <div className="p-4 mb-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col gap-2 shadow-xs">
            <span className="font-bold flex items-center gap-1.5">
              ⚠️ Email Verification Required
            </span>
            <p className="text-slate-600 leading-relaxed">
              Your account with <strong className="text-slate-800">{unverifiedEmail}</strong> requires a 6-digit OTP confirmation to activate.
              <br />
              <span className="inline-block mt-1 font-semibold text-amber-900">
                Demo Verification Code: <span className="font-mono font-black text-slate-900 bg-amber-200/80 px-2 py-0.5 rounded">434710</span>
              </span>
            </p>
            <Link
              to={`/register?step=2&email=${encodeURIComponent(unverifiedEmail)}`}
              className="mt-1 self-start px-3.5 py-2 rounded-xl bg-primary text-white font-bold hover:bg-[#1B5E20] transition-all text-xs shadow-xs"
            >
              Enter Verification Code (434710) →
            </Link>
          </div>
        )}

        {error && !unverifiedEmail && (
          <div className="p-3.5 mb-5 text-xs bg-red-50 border border-red-200 text-danger rounded-xl font-semibold flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:border-primary focus:ring-2 focus:ring-accent focus:outline-none transition-all shadow-xs"
              placeholder="e.g. name@email.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Password</label>
              <span className="text-[11px] font-bold text-primary hover:underline cursor-pointer">
                Forgot password?
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:border-primary focus:ring-2 focus:ring-accent focus:outline-none transition-all shadow-xs"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-xl font-bold bg-primary text-white hover:bg-[#1B5E20] active:scale-[0.98] shadow-md transition-all flex items-center justify-center text-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-5">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Or</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Single Sign-On Notice */}
        <button 
          type="button"
          onClick={() => toast.info('Google Workspace single-sign-on will be integrated in next release.', 'SSO Notice')}
          className="w-full py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all font-bold text-slate-700 flex items-center justify-center gap-2.5 text-xs shadow-xs cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.61 14.99 1 12 1 7.24 1 3.21 3.73 1.24 7.72l3.97 3.08C6.18 7.64 8.85 5.04 12 5.04z" />
            <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.03 3.67-5.02 3.67-8.65z" />
            <path fill="#FBBC05" d="M5.21 14.8C4.95 14 4.8 13.15 4.8 12.27s.15-1.73.41-2.53L1.24 6.66C.45 8.24 0 10.19 0 12.27s.45 4.03 1.24 5.61l3.97-3.08z" />
            <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.76-2.91c-1.1.74-2.5 1.18-4.2 1.18-3.15 0-5.82-2.6-6.79-5.76L1.24 15.6C3.21 19.59 7.24 23 12 23z" />
          </svg>
          Continue with Google
        </button>

        <div className="flex justify-center text-xs font-medium text-slate-500 mt-6 gap-1.5">
          <span>New to SpendiFy?</span>
          <Link to="/register" className="text-primary font-bold hover:underline">Create an account</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
