import axios from 'axios';

// API base URL
const API_BASE_URL = 'https://crispy-orbit-x55rwvrvq567fvq47-5000.app.github.dev/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Token management utilities
export const tokenManager = {
  getToken: () => {
    const token = localStorage.getItem('token');
    console.log('TokenManager: Getting token from localStorage:', token);
    return token;
  },
  setToken: (token) => {
    console.log('TokenManager: Setting token to localStorage:', token);
    localStorage.setItem('token', token);
    
    // Verify it was saved
    const saved = localStorage.getItem('token');
    console.log('TokenManager: Verification - token after save:', saved);
  },
  removeToken: () => {
    console.log('TokenManager: Removing token from localStorage');
    localStorage.removeItem('token');
  },
  isLoggedIn: () => !!localStorage.getItem('token'),
};

// Add auth token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = tokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('API: Making request to:', config.url);
    console.log('API: Request headers:', config.headers);
    
    return config;
  },
  (error) => {
    console.error('API: Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Handle responses and token expiry
api.interceptors.response.use(
  (response) => {
    console.log('API: Response received:', response);
    return response;
  },
  (error) => {
    console.error('API: Response error:', error);
    if (error.response?.status === 401) {
      tokenManager.removeToken();
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  register: async (userData) => {
    try {
      console.log('API: Attempting to register with:', userData);
      const response = await api.post('/auth/register', userData);
      
      console.log('API: Registration response received:', response.data);
      
      // Extract token and user data
      const token = response.data?.data?.token;
      const user = response.data?.data?.user;
      
      if (token && user) {
        console.log('API: Found token and user, saving:', { token, user });
        tokenManager.setToken(token);
        
        // Return both for AuthContext
        return {
          success: true,
          token: token,
          user: user,
          data: response.data
        };
      } else {
        console.error('API: No token or user found in response!');
        return response.data;
      }
    } catch (error) {
      console.error('API: Registration error:', error);
      throw error.response?.data || { success: false, message: 'Registration failed' };
    }
  },

  login: async (credentials) => {
    try {
      console.log('API: Attempting to login with:', credentials);
      const response = await api.post('/auth/login', credentials);
      
      console.log('API: Login response received:', response.data);
      
      const token = response.data?.data?.token;
      const user = response.data?.data?.user;
      
      if (token && user) {
        console.log('API: Found login token and user, saving:', { token, user });
        tokenManager.setToken(token);
        
        return {
          success: true,
          token: token,
          user: user,
          data: response.data
        };
      } else {
        console.error('API: No token or user found in login response!');
        return response.data;
      }
    } catch (error) {
      console.error('API: Login error:', error);
      throw error.response?.data || { success: false, message: 'Login failed' };
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to get profile' };
    }
  },

  logout: () => {
    tokenManager.removeToken();
    window.location.href = '/signin';
  },

  // Verify email with token
  verifyEmail: async (token) => {
    try {
      console.log('🔄 API: Sending verification request');
      const response = await api.post('/auth/verify-email', { token });
      
      console.log('✅ API: Raw response:', response);
      console.log('✅ API: Response data:', response.data);
      
      // Return the response data directly since it already has the right structure
      return response.data;
    } catch (error) {
      console.error('❌ API: Verification request failed:', error);
      console.error('❌ API: Error response:', error.response?.data);
      
      // Re-throw the error so VerifyEmailPage can handle it
      throw error;
    }
  },

  // Resend verification email
  resendVerification: async (email) => {
    try {
      console.log('API: Attempting to resend verification for:', email);
      const response = await api.post('/auth/resend-verification', { email });
      
      console.log('API: Resend verification response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Resend verification error:', error);
      throw error;
    }
  },
};

// Birthday API functions (unchanged)
export const birthdayAPI = {
  getBirthdays: async () => {
    try {
      const response = await api.get('/birthdays');
      return response.data.data?.birthdays || [];
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to get birthdays' };
    }
  },

  createBirthday: async (birthdayData) => {
    try {
      const response = await api.post('/birthdays', birthdayData);
      return response.data.data?.birthday;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to create birthday' };
    }
  },

  updateBirthday: async (id, birthdayData) => {
    try {
      const response = await api.put(`/birthdays/${id}`, birthdayData);
      return response.data.data?.birthday;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update birthday' };
    }
  },

  deleteBirthday: async (id) => {
    try {
      const response = await api.delete(`/birthdays/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to delete birthday' };
    }
  },
};

export default api;