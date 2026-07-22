import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { KYCDocument } from '@shared/types';
import LandingCanvas from '../components/canvas/LandingCanvas';

export const KYCPage: React.FC = () => {
  const { logout } = useAuth();
  
  const [kyc, setKyc] = useState<KYCDocument | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Form inputs
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  
  // Files
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [bankStatementFile, setBankStatementFile] = useState<File | null>(null);
  const [esignatureFile, setEsignatureFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKycStatus = async () => {
    try {
      const response = await api.get('/kyc');
      setKyc(response.data);
      if (response.data) {
        setAadhaarNumber(response.data.aadhaarNumber || '');
        setPanNumber(response.data.panNumber || '');
      }
    } catch (err: any) {
      console.warn('KYC not started or profile creation pending.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycStatus();
  }, []);

  const triggerFileInput = (id: string) => {
    document.getElementById(id)?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!aadhaarFile || !panFile || !bankStatementFile || !esignatureFile) {
      setError('Please upload all 4 required files (Aadhaar, PAN, Bank Statement, and E-signature).');
      setSubmitting(false);
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
      const response = await api.post('/kyc/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setKyc(response.data.kyc);
      alert('Verification files uploaded successfully for review!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit KYC. Make sure files are under 10MB PDFs/Images.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-500 font-medium">
        Loading Verification Profile...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white text-slate-800 pb-16">
      {/* 3D Background Canvas (soft particles floating) */}
      <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
        <LandingCanvas />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 w-full px-6 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-2xl font-extrabold text-primary">
            SpendiFy
          </Link>
          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-accent text-primary uppercase">Verification</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-sm font-bold text-slate-600 hover:text-primary transition-colors">Dashboard</Link>
          <button onClick={logout} className="text-xs px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all font-bold text-slate-700">Sign Out</button>
        </div>
      </nav>

      <div className="relative z-10 max-w-3xl mx-auto px-6 mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Verification Center</h1>
            <p className="text-sm text-slate-500 mt-1">Submit your identity and files to unlock instant loan applications.</p>
          </div>
          
          {/* Status Badge */}
          {kyc && (
            <div className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase inline-block self-start ${
              kyc.status === 'APPROVED' ? 'bg-green-50 text-[#43A047] border border-green-200' :
              kyc.status === 'PENDING' ? 'bg-amber-50 text-[#FFB300] border border-amber-200 animate-pulse' :
              'bg-red-50 text-[#E53935] border border-red-200'
            }`}>
              {kyc.status === 'PENDING' ? 'Pending Review' : `Status: ${kyc.status}`}
            </div>
          )}
        </div>

        {/* Pending Verification Block */}
        {kyc && kyc.status === 'PENDING' && (
          <div className="p-6 mb-8 rounded-2xl bg-amber-50/50 border border-amber-200 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-amber-700 flex items-center gap-2">
              ⏳ Verification Under Review
            </h3>
            <p className="text-md text-slate-600 leading-relaxed">
              Your uploaded Aadhaar, PAN, bank statement, and E-signature have been received. We are verifying your documents. Your loan application is locked during this verification process.
            </p>
            <p className="text-xs text-slate-400">
              Loan submissions will automatically unlock as soon as your files are approved.
            </p>
            <div className="mt-2 flex gap-4">
              <Link to="/dashboard" className="px-6 py-3 rounded-xl bg-primary text-white hover:bg-[#1B5E20] text-sm font-bold shadow-sm transition-all">
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Approved Block */}
        {kyc && kyc.status === 'APPROVED' && (
          <div className="p-6 mb-8 rounded-2xl bg-green-50/50 border border-green-200 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-green-700 flex items-center gap-2">
              🎉 Verification Successful
            </h3>
            <p className="text-md text-slate-600">
              Your identity has been fully approved! You now have full access to micro-lending portals.
            </p>
            <div className="mt-2">
              <Link to="/dashboard" className="px-6 py-3 rounded-xl bg-primary text-white hover:bg-[#1B5E20] text-sm font-bold shadow-sm transition-all inline-block">
                Apply for Loan
              </Link>
            </div>
          </div>
        )}

        {/* Upload Form Block (NOT_STARTED or REJECTED) */}
        {(!kyc || kyc.status === 'NOT_STARTED' || kyc.status === 'REJECTED') && (
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 shadow-md flex flex-col gap-6">
            {kyc?.status === 'REJECTED' && (
              <div className="p-4 bg-red-50 border border-red-200 text-danger rounded-xl text-sm mb-2 flex flex-col gap-1.5">
                <span className="font-bold">⚠️ Rejection Reason:</span>
                <span>{kyc.verifierNotes || 'Uploaded documents were blurry or invalid. Please re-submit clear PDFs.'}</span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-danger rounded-xl text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Aadhaar Number (12 digit)</label>
                  <input
                    type="text"
                    maxLength={12}
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-md focus:border-primary focus:outline-none"
                    placeholder="e.g. 123456789012"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">PAN Card Number (10 digit)</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    required
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-md focus:border-primary focus:outline-none"
                    placeholder="e.g. ABCDE1234F"
                  />
                </div>
              </div>

              {/* Drag-Drop / Touch Upload Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Aadhaar */}
                <div 
                  onClick={() => triggerFileInput('aadhaar-file')}
                  className={`p-5 rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center text-center transition-all ${
                    aadhaarFile ? 'border-primary bg-accent' : 'border-slate-300 hover:border-primary hover:bg-slate-50'
                  }`}
                >
                  <input 
                    id="aadhaar-file"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) setAadhaarFile(e.target.files[0]);
                    }}
                  />
                  <span className="text-2xl mb-1">🪪</span>
                  <span className="text-sm font-bold text-slate-700">Aadhaar Card PDF</span>
                  <span className="text-xs text-slate-400 mt-1 max-w-[180px] truncate">
                    {aadhaarFile ? aadhaarFile.name : 'Tap to upload'}
                  </span>
                </div>

                {/* PAN */}
                <div 
                  onClick={() => triggerFileInput('pan-file')}
                  className={`p-5 rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center text-center transition-all ${
                    panFile ? 'border-primary bg-accent' : 'border-slate-300 hover:border-primary hover:bg-slate-50'
                  }`}
                >
                  <input 
                    id="pan-file"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) setPanFile(e.target.files[0]);
                    }}
                  />
                  <span className="text-2xl mb-1">💳</span>
                  <span className="text-sm font-bold text-slate-700">PAN Card PDF</span>
                  <span className="text-xs text-slate-400 mt-1 max-w-[180px] truncate">
                    {panFile ? panFile.name : 'Tap to upload'}
                  </span>
                </div>

                {/* Bank Statement */}
                <div 
                  onClick={() => triggerFileInput('bank-file')}
                  className={`p-5 rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center text-center transition-all ${
                    bankStatementFile ? 'border-primary bg-accent' : 'border-slate-300 hover:border-primary hover:bg-slate-50'
                  }`}
                >
                  <input 
                    id="bank-file"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) setBankStatementFile(e.target.files[0]);
                    }}
                  />
                  <span className="text-2xl mb-1">📄</span>
                  <span className="text-sm font-bold text-slate-700">Bank Statement PDF</span>
                  <span className="text-xs text-slate-400 mt-1 max-w-[180px] truncate">
                    {bankStatementFile ? bankStatementFile.name : 'Tap to upload'}
                  </span>
                </div>

                {/* E-signature */}
                <div 
                  onClick={() => triggerFileInput('esign-file')}
                  className={`p-5 rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center text-center transition-all ${
                    esignatureFile ? 'border-primary bg-accent' : 'border-slate-300 hover:border-primary hover:bg-slate-50'
                  }`}
                >
                  <input 
                    id="esign-file"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) setEsignatureFile(e.target.files[0]);
                    }}
                  />
                  <span className="text-2xl mb-1">✍️</span>
                  <span className="text-sm font-bold text-slate-700">E-signature Image</span>
                  <span className="text-xs text-slate-400 mt-1 max-w-[180px] truncate">
                    {esignatureFile ? esignatureFile.name : 'Tap to upload'}
                  </span>
                </div>

              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4.5 mt-4 rounded-xl font-bold bg-primary text-white hover:bg-[#1B5E20] shadow-md transition-all text-md flex items-center justify-center"
              >
                {submitting ? 'Submitting verification profile...' : 'Submit Verification Profile'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default KYCPage;
