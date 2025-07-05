import axios from 'axios';

// API base URL
const API_BASE_URL = 'https://crispy-orbit-x55rwvrvq567fvq47-5000.app.github.dev/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management utilities
export const tokenManager = {
  getToken: () => localStorage.getItem('birthdayBuddyToken'),
  setToken: (token) => localStorage.setItem('birthdayBuddyToken', token),
  removeToken: () => localStorage.removeItem('birthdayBuddyToken'),
  isLoggedIn: () => !!localStorage.getItem('birthdayBuddyToken'),
};

// Add auth token to requests automatically
api.interceptors.request.use((config) => {
  const token = tokenManager.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiry automatically
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
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
      const response = await api.post('/auth/register', userData);
      if (response.data.success && response.data.data.token) {
        tokenManager.setToken(response.data.data.token);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Registration failed' };
    }
  },

  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      if (response.data.success && response.data.data.token) {
        tokenManager.setToken(response.data.data.token);
      }
      return response.data;
    } catch (error) {
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

// Birthday API functions
export const birthdayAPI = {
  // Get all birthdays for the authenticated user
  getBirthdays: async () => {
    const response = await api.get('/birthdays');
    return response.data.data.birthdays; // Extract just the birthdays array
  },

  // Create a new birthday
  createBirthday: async (birthdayData) => {
    const response = await api.post('/birthdays', birthdayData);
    return response.data.data.birthday; // Return the created birthday
  },

  // Update an existing birthday
  updateBirthday: async (id, birthdayData) => {
    const response = await api.put(`/birthdays/${id}`, birthdayData);
    return response.data.data.birthday; // Return the updated birthday
  },

  // Delete a birthday
  deleteBirthday: async (id) => {
    const response = await api.delete(`/birthdays/${id}`);
    return response.data;
  },
};

export default api;