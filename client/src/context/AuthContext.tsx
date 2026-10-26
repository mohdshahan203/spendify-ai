import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '@shared/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (data: { name: string; email: string; phone: string; password: string; role?: string }) => Promise<any>;
  verifyOTP: (email: string, otp: string) => Promise<any>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Load persisted session
    const savedUser = localStorage.getItem('spendify_user');
    const savedToken = localStorage.getItem('spendify_token');

    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: loggedUser, token: accessToken, refreshToken } = response.data;

      setUser(loggedUser);
      setToken(accessToken);
      
      localStorage.setItem('spendify_user', JSON.stringify(loggedUser));
      localStorage.setItem('spendify_token', accessToken);
      localStorage.setItem('spendify_refresh_token', refreshToken);
      
      return response.data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: { name: string; email: string; phone: string; password: string; role?: string }) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', data);
      return response.data;
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', { email, otp });
      const { user: loggedUser, token: accessToken, refreshToken } = response.data;

      if (loggedUser && accessToken) {
        setUser(loggedUser);
        setToken(accessToken);
        
        localStorage.setItem('spendify_user', JSON.stringify(loggedUser));
        localStorage.setItem('spendify_token', accessToken);
        if (refreshToken) {
          localStorage.setItem('spendify_refresh_token', refreshToken);
        }
      }
      return response.data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('spendify_user');
    localStorage.removeItem('spendify_token');
    localStorage.removeItem('spendify_refresh_token');
  };

  const isAuthenticated = !!token;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OFFICER';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, verifyOTP, logout, isAuthenticated, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
