import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import KYCPage from './pages/KYCPage';
import BorrowerDashboard from './pages/BorrowerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ModelLab from './pages/ModelLab';

// Route guards
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-[#030303] flex items-center justify-center text-slate-400">Loading session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // If not allowed, redirect to correct default page
    return user.role === 'ADMIN' || user.role === 'OFFICER' 
      ? <Navigate to="/admin" replace /> 
      : <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected Borrower Dashboard & Dedicated Section Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['BORROWER']}>
                <BorrowerDashboard initialTab="home" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/credit-score" 
            element={
              <ProtectedRoute allowedRoles={['BORROWER']}>
                <BorrowerDashboard initialTab="home" initialModal="credit-score" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/loans" 
            element={
              <ProtectedRoute allowedRoles={['BORROWER']}>
                <BorrowerDashboard initialTab="loan" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/calculator" 
            element={
              <ProtectedRoute allowedRoles={['BORROWER']}>
                <BorrowerDashboard initialTab="calculator" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/repayments" 
            element={
              <ProtectedRoute allowedRoles={['BORROWER']}>
                <BorrowerDashboard initialTab="repayments" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ai-assistant" 
            element={
              <ProtectedRoute allowedRoles={['BORROWER']}>
                <BorrowerDashboard initialTab="ai" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/transactions" 
            element={
              <ProtectedRoute allowedRoles={['BORROWER']}>
                <BorrowerDashboard initialTab="transactions" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/budgets" 
            element={
              <ProtectedRoute allowedRoles={['BORROWER']}>
                <BorrowerDashboard initialTab="budgets" />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected KYC Portal */}
          <Route 
            path="/kyc" 
            element={
              <ProtectedRoute allowedRoles={['BORROWER']}>
                <KYCPage />
              </ProtectedRoute>
            } 
          />

          {/* Protected Admin/Officer Dashboard */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'OFFICER']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/model-lab" 
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'OFFICER']}>
                <ModelLab />
              </ProtectedRoute>
            } 
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
};
export default App;
