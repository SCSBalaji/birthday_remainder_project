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
    console.log('Getting token from localStorage:', token);
    return token;
  },
  setToken: (token) => {
    console.log('Setting token to localStorage:', token);
    localStorage.setItem('token', token);
  },
  removeToken: () => {
    console.log('Removing token from localStorage');
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
    
    console.log('Making request to:', config.url);
    console.log('Request headers:', config.headers);
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Handle responses and token expiry
api.interceptors.response.use(
  (response) => {
    console.log('Response received:', response);
    return response;
  },
  (error) => {
    console.error('Response error:', error);
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
      console.log('Attempting to register with:', userData);
      const response = await api.post('/auth/register', userData);
      
      console.log('Full registration response:', response);
      console.log('Response data:', response.data);
      console.log('Response data structure:', JSON.stringify(response.data, null, 2));
      
      // Check different possible token locations
      const tokenFromData = response.data?.token;
      const tokenFromDataData = response.data?.data?.token;
      const tokenFromUser = response.data?.user?.token;
      
      console.log('Token from response.data.token:', tokenFromData);
      console.log('Token from response.data.data.token:', tokenFromDataData);
      console.log('Token from response.data.user.token:', tokenFromUser);
      
      // Try to find token in the response
      const token = tokenFromData || tokenFromDataData || tokenFromUser;
      
      if (token) {
        console.log('Found token, saving:', token);
        tokenManager.setToken(token);
      } else {
        console.error('No token found in response!');
      }
      
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error.response?.data || { success: false, message: 'Registration failed' };
    }
  },

  login: async (credentials) => {
    try {
      console.log('Attempting to login with:', credentials);
      const response = await api.post('/auth/login', credentials);
      
      console.log('Full login response:', response);
      console.log('Login response data:', response.data);
      
      // Check different possible token locations
      const tokenFromData = response.data?.token;
      const tokenFromDataData = response.data?.data?.token;
      const tokenFromUser = response.data?.user?.token;
      
      console.log('Login token from response.data.token:', tokenFromData);
      console.log('Login token from response.data.data.token:', tokenFromDataData);
      console.log('Login token from response.data.user.token:', tokenFromUser);
      
      const token = tokenFromData || tokenFromDataData || tokenFromUser;
      
      if (token) {
        console.log('Found login token, saving:', token);
        tokenManager.setToken(token);
      } else {
        console.error('No token found in login response!');
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
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
};

// Birthday API functions (rest remains the same)
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