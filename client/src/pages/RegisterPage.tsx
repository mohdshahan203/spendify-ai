import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import LandingCanvas from '../components/canvas/LandingCanvas';
import { Eye, EyeOff, Mail, KeyRound, ShieldAlert, CheckCircle2, Clock, RefreshCw } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { register, verifyOTP } = useAuth();
  const { toast } = { toast: useToast() };

  // Detect if redirected for OTP verification directly from Login
  const initialStep = searchParams.get('step') === '2' ? 2 : 1;
  const initialEmail = searchParams.get('email') || '';

  const [step, setStep] = useState(initialStep);

  // Step 1: User info
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('BORROWER');

  // Step 2: OTP Verification (Defaults to 434710)
  const [otp, setOtp] = useState('434710');
  const [resendCooldown, setResendCooldown] = useState(initialStep === 2 ? 0 : 60);
  const [deliveryNotice, setDeliveryNotice] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Step 3: KYC Details & Files
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [bankStatementFile, setBankStatementFile] = useState<File | null>(null);
  const [esignatureFile, setEsignatureFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Step 1 Submit: Register borrower account and send OTP
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await register({ name, email, phone, password, role });
      
      const demoCode = res?.emailDelivery?.devOtp || '434710';
      setOtp(demoCode);

      if (res?.emailDelivery?.notice) {
        setDeliveryNotice(res.emailDelivery.notice);
      } else {
        setDeliveryNotice('Demo mode active: Use code 434710 to verify immediately.');
      }

      toast.success('Registration successful! Demo OTP 434710 is ready.', 'Demo OTP: 434710');
      setResendCooldown(60);
      setRemainingAttempts(null);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please verify your entries.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 Submit: Verify 6-digit cryptographic OTP (Defaults to 434710)
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeToVerify = (otp && otp.trim().length > 0) ? otp.trim() : '434710';
    if (codeToVerify.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await verifyOTP(email, codeToVerify);
      toast.success(res?.message || 'Email verified successfully!', 'Account Verified');
      
      if (role === 'BORROWER') {
        setStep(3);
      } else {
        navigate('/admin');
      }
    } catch (err: any) {
      const data = err.response?.data;
      setError(data?.error || 'Verification failed. Please check the code.');
      if (data?.remainingAttempts !== undefined) {
        setRemainingAttempts(data.remainingAttempts);
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend 6-digit OTP code
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !email) return;
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/resend-otp', { email });
      const demoCode = res.data?.emailDelivery?.devOtp || '434710';
      setOtp(demoCode);
      toast.success('Demo verification code 434710 refreshed.', 'OTP: 434710');
      if (res.data?.emailDelivery?.notice) {
        setDeliveryNotice(res.data.emailDelivery.notice);
      }
      setResendCooldown(60);
      setRemainingAttempts(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend code. Please try again shortly.');
    } finally {
      setLoading(false);
    }
  };

  // Paste handler for seamless 6-digit entry
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      setOtp(pasted);
    }
  };

  // Step 3 Submit: KYC Uploads
  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!aadhaarFile || !panFile || !bankStatementFile || !esignatureFile) {
      setError('Please upload all 4 required files to continue.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('aadhaarNumber', aadhaarNumber);
    formData.append('panNumber', panNumber);
    formData.append('aadhaarFile', aadhaarFile);
    formData.append('panFile', panFile);
    formData.append('bankStatementFile', bankStatementFile);
    formData.append('esignatureFile', esignatureFile);

    try {
      await api.post('/kyc/upload', formData, {
        headers: { 'Content-Type': undefined }
      });
      setStep(4);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Uploading KYC failed. Ensure files are under 10MB PDFs or Images.');
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = (id: string) => {
    document.getElementById(id)?.click();
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-white text-slate-800 py-12">
      {/* 3D Background Canvas (soft particles floating) */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <LandingCanvas />
      </div>

      <div className="relative w-full max-w-xl p-8 sm:p-10 rounded-3xl bg-slate-50 border border-slate-100 shadow-xl z-10 flex flex-col">
        
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
          <div className="flex flex-col">
            <span className="text-2xl font-black text-primary tracking-tight">SpendiFy</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Underwriting & Lending</span>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div 
                key={s} 
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s 
                    ? 'bg-primary text-white scale-110 shadow-sm' 
                    : step > s 
                    ? 'bg-emerald-100 text-primary border border-emerald-300' 
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-semibold">{error}</span>
              {remainingAttempts !== null && remainingAttempts > 0 && (
                <span className="text-xs text-red-500 mt-1">Remaining attempts: {remainingAttempts} of 5</span>
              )}
            </div>
          </div>
        )}

        {/* STEP 1: Basic Information */}
        {step === 1 && (
          <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-5">
            <div className="text-center sm:text-left mb-2">
              <h2 className="text-2xl font-extrabold text-slate-900">Create your account</h2>
              <p className="text-slate-500 text-sm mt-1">Join SpendiFy for AI-powered micro-lending with transparent credit scoring.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Account Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('BORROWER')}
                  className={`py-2.5 px-3 rounded-xl border text-sm font-bold transition-all ${
                    role === 'BORROWER'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  Borrower
                </button>
                <button
                  type="button"
                  onClick={() => setRole('OFFICER')}
                  className={`py-2.5 px-3 rounded-xl border text-sm font-bold transition-all ${
                    role === 'OFFICER'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  Loan Officer / Admin
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Full Legal Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="e.g. Aarav Sharma"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="name@example.com"
              />
              <span className="text-[11px] text-slate-400">A 6-digit verification code will be sent to this email.</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="e.g. +919876543210"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Password</label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 pr-12 rounded-xl border border-slate-200 bg-white text-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Must be at least 8 characters"
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
              className="w-full py-4 mt-2 rounded-xl font-bold bg-primary text-white hover:bg-[#1B5E20] active:scale-[0.98] shadow-md transition-all text-md cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account & Send Code'}
            </button>

            <div className="flex justify-center text-sm font-medium text-slate-500 mt-2 gap-1">
              <span>Already have an account?</span>
              <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link>
            </div>
          </form>
        )}

        {/* STEP 2: Real 6-Digit Email Verification */}
        {step === 2 && (
          <form onSubmit={handleOtpSubmit} className="flex flex-col gap-6">
            <div className="text-center mb-1">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-primary mx-auto flex items-center justify-center mb-3">
                <Mail className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">Verify your email</h2>
              <p className="text-slate-500 text-sm mt-1.5">
                We've sent a 6-digit verification code to:
              </p>
              <div className="inline-flex items-center gap-2 mt-1 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
                <span>{email}</span>
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(null); }}
                  className="text-primary hover:underline text-[11px] font-semibold"
                >
                  (Change)
                </button>
              </div>
            </div>

            {/* Default OTP Helper Banner */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-black bg-amber-200 text-amber-900 rounded uppercase tracking-wider">
                    Default OTP Active
                  </span>
                  <span className="font-mono font-black text-lg text-slate-900 tracking-wider">
                    434710
                  </span>
                </div>
                <span className="text-[11px] text-amber-800 font-medium mt-0.5">
                  Email verification is bypassed: Default OTP <strong>434710</strong> is auto-filled below.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOtp('434710')}
                className="px-3 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-xs transition-colors cursor-pointer active:scale-95 flex-shrink-0"
              >
                Reset 434710
              </button>
            </div>

            {deliveryNotice && (
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs flex items-start gap-2">
                <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
                <span>{deliveryNotice}</span>
              </div>
            )}

            <div className="flex flex-col gap-2 items-center">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Enter 6-Digit Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  onPaste={handleOtpPaste}
                  required
                  autoFocus
                  className="w-64 text-center tracking-[0.8em] font-extrabold text-3xl px-4 py-4 rounded-2xl border-2 border-slate-300 bg-white text-slate-900 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 shadow-inner"
                  placeholder="434710"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Default verification code: <strong>434710</strong></span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 text-center">
              🔒 <strong>Quick Verification:</strong> Click below to verify instantly with default code <strong>434710</strong>.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold bg-primary text-white hover:bg-[#1B5E20] active:scale-[0.98] shadow-md transition-all text-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <KeyRound className="w-5 h-5" />
              <span>{loading ? 'Verifying Code...' : 'Verify with Default OTP (434710) & Continue'}</span>
            </button>

            <div className="flex flex-col items-center gap-3">
              <button 
                type="button" 
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || loading}
                className="text-sm font-bold text-primary hover:underline flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:hover:no-underline"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>
                  {resendCooldown > 0 
                    ? `Resend code in (${resendCooldown}s)` 
                    : 'Resend verification code'}
                </span>
              </button>

              <Link to="/login" className="text-xs text-slate-500 hover:text-slate-700">
                Back to Login
              </Link>
            </div>
          </form>
        )}

        {/* STEP 3: KYC Uploads */}
        {step === 3 && (
          <form onSubmit={handleKycSubmit} className="flex flex-col gap-5">
            <div className="text-center sm:text-left mb-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Email Verified Successfully</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">Upload your documents</h2>
              <p className="text-slate-500 text-sm">We verify your identity and financial history securely to compute your SpendiFy internal credit score.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">Aadhaar Number</label>
                <input
                  type="text"
                  maxLength={12}
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                  required
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:border-primary focus:outline-none"
                  placeholder="12-digit Aadhaar Number"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">PAN Card Number</label>
                <input
                  type="text"
                  maxLength={10}
                  value={panNumber.toUpperCase()}
                  onChange={(e) => setPanNumber(e.target.value)}
                  required
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:border-primary focus:outline-none"
                  placeholder="10-digit PAN Card Number"
                />
              </div>
            </div>

            {/* Drag & Drop Upload Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              
              {/* Aadhaar */}
              <div 
                onClick={() => triggerFileInput('aadhaar-file-input')}
                className={`p-4 rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center text-center transition-all ${
                  aadhaarFile ? 'border-primary bg-accent' : 'border-slate-300 hover:border-primary hover:bg-slate-50'
                }`}
              >
                <input 
                  id="aadhaar-file-input"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) setAadhaarFile(e.target.files[0]);
                  }}
                />
                <span className="text-xl mb-1">🪪</span>
                <span className="text-xs font-bold text-slate-700">Aadhaar PDF</span>
                <span className="text-[10px] text-slate-400 mt-1 max-w-[150px] truncate">
                  {aadhaarFile ? aadhaarFile.name : 'Tap to upload'}
                </span>
              </div>

              {/* PAN */}
              <div 
                onClick={() => triggerFileInput('pan-file-input')}
                className={`p-4 rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center text-center transition-all ${
                  panFile ? 'border-primary bg-accent' : 'border-slate-300 hover:border-primary hover:bg-slate-50'
                }`}
              >
                <input 
                  id="pan-file-input"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) setPanFile(e.target.files[0]);
                  }}
                />
                <span className="text-xl mb-1">💳</span>
                <span className="text-xs font-bold text-slate-700">PAN Card PDF</span>
                <span className="text-[10px] text-slate-400 mt-1 max-w-[150px] truncate">
                  {panFile ? panFile.name : 'Tap to upload'}
                </span>
              </div>

              {/* Bank Statement */}
              <div 
                onClick={() => triggerFileInput('bank-file-input')}
                className={`p-4 rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center text-center transition-all ${
                  bankStatementFile ? 'border-primary bg-accent' : 'border-slate-300 hover:border-primary hover:bg-slate-50'
                }`}
              >
                <input 
                  id="bank-file-input"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) setBankStatementFile(e.target.files[0]);
                  }}
                />
                <span className="text-xl mb-1">📄</span>
                <span className="text-xs font-bold text-slate-700">Bank Statement PDF</span>
                <span className="text-[10px] text-slate-400 mt-1 max-w-[150px] truncate">
                  {bankStatementFile ? bankStatementFile.name : 'Tap to upload'}
                </span>
              </div>

              {/* E-signature */}
              <div 
                onClick={() => triggerFileInput('esign-file-input')}
                className={`p-4 rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center text-center transition-all ${
                  esignatureFile ? 'border-primary bg-accent' : 'border-slate-300 hover:border-primary hover:bg-slate-50'
                }`}
              >
                <input 
                  id="esign-file-input"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) setEsignatureFile(e.target.files[0]);
                  }}
                />
                <span className="text-xl mb-1">✍️</span>
                <span className="text-xs font-bold text-slate-700">E-signature Image</span>
                <span className="text-[10px] text-slate-400 mt-1 max-w-[150px] truncate">
                  {esignatureFile ? esignatureFile.name : 'Tap to upload'}
                </span>
              </div>

            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-4 rounded-xl font-bold bg-primary text-white hover:bg-[#1B5E20] active:scale-[0.98] shadow-md transition-all text-md cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Uploading documents...' : 'Submit Documents'}
            </button>

            <div className="flex justify-center mt-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-xs font-bold text-slate-500 hover:text-primary transition-colors cursor-pointer underline"
              >
                Skip document upload for now → Go to Borrower Dashboard
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: Success & KYC Pending */}
        {step === 4 && (
          <div className="flex flex-col items-center text-center gap-6 py-6">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-primary text-4xl animate-bounce">
              ⏳
            </div>
            
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Registration Complete!</h2>
              <h3 className="text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full inline-block border border-amber-200">KYC Under Review</h3>
              <p className="text-slate-500 text-md mt-4 max-w-sm">
                Your email is verified and documents are submitted securely. You can now access your borrower dashboard.
              </p>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-4 mt-4 rounded-xl font-bold bg-primary text-white hover:bg-[#1B5E20] active:scale-[0.98] shadow-md transition-all text-md cursor-pointer"
            >
              Go to Dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default RegisterPage;
