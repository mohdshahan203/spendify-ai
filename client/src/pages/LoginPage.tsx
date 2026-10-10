import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LandingCanvas from '../components/canvas/LandingCanvas';
import { Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await login(email, password);
      if (data.user.role === 'ADMIN' || data.user.role === 'OFFICER') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Wrong email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-white text-slate-800">
      {/* 3D Background Canvas (soft particles floating) */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <LandingCanvas />
      </div>

      <div className="relative w-full max-w-md p-8 sm:p-10 rounded-3xl bg-slate-50 border border-slate-100 shadow-xl z-10 flex flex-col">
        <div className="flex flex-col text-center mb-8">
          <Link to="/" className="text-3xl font-extrabold tracking-tight text-primary mb-2">
            SpendiFy
          </Link>
          <span className="text-slate-500 font-medium">Welcome back! Please enter your details.</span>
        </div>

        {error && (
          <div className="p-4 mb-6 text-sm bg-red-50 border border-red-100 text-danger rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-md focus:border-primary focus:ring-2 focus:ring-accent focus:outline-none transition-all"
              placeholder="e.g. name@email.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700">Password</label>
              <a href="#forgot" className="text-xs font-bold text-primary hover:underline">Forgot password?</a>
            </div>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-4 pr-12 rounded-xl border border-slate-200 bg-white text-slate-800 text-md focus:border-primary focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 p-1 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-2 rounded-xl font-bold bg-primary text-white hover:bg-[#1B5E20] active:scale-[0.98] shadow-md transition-all flex items-center justify-center text-md cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="mx-4 text-xs font-bold text-slate-400 uppercase">Or</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Google Sign-In Mockup */}
        <button 
          onClick={() => alert("Google Login is coming soon!")}
          className="w-full py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all font-bold text-slate-700 flex items-center justify-center gap-3 text-sm shadow-xs cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.61 14.99 1 12 1 7.24 1 3.21 3.73 1.24 7.72l3.97 3.08C6.18 7.64 8.85 5.04 12 5.04z" />
            <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.03 3.67-5.02 3.67-8.65z" />
            <path fill="#FBBC05" d="M5.21 14.8C4.95 14 4.8 13.15 4.8 12.27s.15-1.73.41-2.53L1.24 6.66C.45 8.24 0 10.19 0 12.27s.45 4.03 1.24 5.61l3.97-3.08z" />
            <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.76-2.91c-1.1.74-2.5 1.18-4.2 1.18-3.15 0-5.82-2.6-6.79-5.76L1.24 15.6C3.21 19.59 7.24 23 12 23z" />
          </svg>
          Continue with Google
        </button>

        <div className="flex justify-center text-sm font-medium text-slate-500 mt-8 gap-1.5">
          <span>New to SpendiFy?</span>
          <Link to="/register" className="text-primary font-bold hover:underline">Create an account</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
