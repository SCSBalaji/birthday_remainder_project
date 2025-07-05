import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('token'); // Use same key as api.js
    const userData = localStorage.getItem('user');
    
    console.log('AuthContext: Checking stored token:', token);
    console.log('AuthContext: Checking stored user:', userData);
    
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
      console.log('AuthContext: User authenticated from storage');
    } else {
      console.log('AuthContext: No valid authentication found');
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    console.log('AuthContext: Login called with token:', token);
    console.log('AuthContext: Login called with userData:', userData);
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
    
    console.log('AuthContext: Login completed, authenticated:', true);
  };

  const logout = () => {
    console.log('AuthContext: Logout called');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};