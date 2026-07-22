import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT access token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('spendify_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401s to perform automated JWT Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 Unauthorized and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('spendify_refresh_token');
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const { token } = response.data;
          
          localStorage.setItem('spendify_token', token);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          
          return api(originalRequest); // retry request
        } catch (refreshError) {
          // Refresh token expired or invalid -> log out
          localStorage.removeItem('spendify_token');
          localStorage.removeItem('spendify_refresh_token');
          localStorage.removeItem('spendify_user');
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);
