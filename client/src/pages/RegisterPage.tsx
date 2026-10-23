import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import LandingCanvas from '../components/canvas/LandingCanvas';
import { Eye, EyeOff } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const { register, login } = useAuth();
  const { toast } = { toast: useToast() };

  // Step 1: User info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('BORROWER');

  // Step 2: OTP Verification mockup
  const [otp, setOtp] = useState('');

  // Step 3: KYC Details & Files
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [bankStatementFile, setBankStatementFile] = useState<File | null>(null);
  const [esignatureFile, setEsignatureFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 Submit: Register and login programmatically
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Create user account
      await register({ name, email, phone, password, role });
      
      // Auto login to obtain JWT token for subsequent KYC uploads
      await login(email, password);
      
      // Advance to OTP step if Borrower, else redirect to admin dashboard directly
      if (role === 'BORROWER') {
        setStep(2);
      } else {
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 Submit: OTP Verification mock
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }
    setError(null);
    setStep(3);
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
      setError(err.response?.data?.error || 'Uploading KYC failed. Make sure files are under 10MB PDFs or Images.');
    } finally {
      setLoading(false);
    }
  };

  // File Drag-Drop handler mockup
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
        <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
          <span className="text-xl font-extrabold text-primary">SpendiFy</span>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((num) => (
              <div 
                key={num}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === num 
                    ? 'bg-primary text-white scale-110 shadow-sm' 
                    : step > num 
                      ? 'bg-accent text-primary' 
                      : 'bg-slate-200 text-slate-400'
                }`}
              >
                {num}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 text-sm bg-red-50 border border-red-100 text-danger rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* STEP 1: Personal Details */}
        {step === 1 && (
          <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-5">
            <div className="text-center sm:text-left mb-2">
              <h2 className="text-2xl font-extrabold text-slate-900">Create your account</h2>
              <p className="text-slate-500 text-sm">Tell us who you are. This takes less than a minute.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="e.g. Rahul Kumar"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">I want to apply as</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent font-medium"
                >
                  <option value="BORROWER">Borrower (Get Loan)</option>
                  <option value="OFFICER">Loan Officer (Reviewer)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="e.g. rahul@email.com"
              />
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
              {loading ? 'Creating account...' : 'Create Account'}
            </button>

            <div className="flex justify-center text-sm font-medium text-slate-500 mt-4 gap-1">
              <span>Already have an account?</span>
              <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link>
            </div>
          </form>
        )}

        {/* STEP 2: Verify OTP */}
        {step === 2 && (
          <form onSubmit={handleOtpSubmit} className="flex flex-col gap-6">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-extrabold text-slate-900">Verify your email</h2>
              <p className="text-slate-500 text-sm mt-1">We've sent a 6-digit verification code to <span className="font-semibold text-slate-700">{email}</span></p>
            </div>

            <div className="flex flex-col gap-2 items-center">
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                required
                className="w-48 text-center tracking-[1em] font-extrabold text-2xl px-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="••••••"
              />
              <span className="text-xs text-slate-400 mt-2">Mock code: Enter any 6 numbers (e.g. 123456)</span>
            </div>

            <button
              type="submit"
              className="w-full py-4 mt-2 rounded-xl font-bold bg-primary text-white hover:bg-[#1B5E20] active:scale-[0.98] shadow-md transition-all text-md cursor-pointer"
            >
              Verify Code
            </button>

            <button 
              type="button" 
              onClick={() => toast.success("A new 6-digit verification code has been generated.", "Code Sent")}
              className="text-sm font-bold text-primary hover:underline self-center cursor-pointer"
            >
              Resend verification code
            </button>
          </form>
        )}

        {/* STEP 3: KYC Uploads */}
        {step === 3 && (
          <form onSubmit={handleKycSubmit} className="flex flex-col gap-5">
            <div className="text-center sm:text-left mb-2">
              <h2 className="text-2xl font-extrabold text-slate-900">Upload your documents</h2>
              <p className="text-slate-500 text-sm">We verify your identity and financial history securely to compute your Financial Score.</p>
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
          </form>
        )}

        {/* STEP 4: Success & KYC Pending */}
        {step === 4 && (
          <div className="flex flex-col items-center text-center gap-6 py-6">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-primary text-4xl animate-bounce">
              ⏳
            </div>
            
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Registration Successful!</h2>
              <h3 className="text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full inline-block border border-amber-200">KYC Pending Review</h3>
              <p className="text-slate-500 text-md mt-4 max-w-sm">
                We are verifying your documents. Our loan officers will approve your profile shortly. Thank you for your patience!
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
