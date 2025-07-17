import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from './services/api';
import { useAuth } from './contexts/AuthContext';
import './ResetPasswordPage.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('ready'); // ready, resetting, success, error, invalid

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      setStatus('invalid');
      setError('Reset token is missing from the URL');
    } else {
      setToken(tokenFromUrl);
      console.log('🔐 ResetPassword: Token found in URL');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      setStatus('resetting');
      console.log('🔐 ResetPassword: Attempting password reset');
      
      const response = await authAPI.resetPassword(token, password);
      
      if (response.success) {
        setStatus('success');
        
        // Auto-login user with the returned token
        if (response.data && response.data.token && response.data.user) {
          login(response.data.token, response.data.user);
          
          // Redirect to main app after showing success message
          setTimeout(() => {
            navigate('/');
          }, 2000);
        }
      } else {
        setStatus('error');
        setError(response.message || 'Password reset failed');
      }
    } catch (err) {
      console.error('🔐 ResetPassword: Error:', err);
      setStatus('error');
      
      if (err.response?.data) {
        const errorData = err.response.data;
        if (errorData.message && errorData.message.includes('expired')) {
          setError('Your reset link has expired. Please request a new one.');
        } else if (errorData.message && errorData.message.includes('Invalid')) {
          setError('Invalid reset link. Please request a new password reset.');
        } else {
          setError(errorData.message || 'Password reset failed');
        }
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Invalid token state
  if (status === 'invalid') {
    return (
      <div className="reset-password-bg">
        <div className="reset-password-form">
          <div className="error-content">
            <div className="error-icon">❌</div>
            <h3>Invalid Reset Link</h3>
            <p>This password reset link is invalid or malformed.</p>
            <div className="error-actions">
              <button 
                onClick={() => navigate('/forgot-password')} 
                className="primary-btn"
              >
                Request New Reset Link
              </button>
              <button 
                onClick={() => navigate('/signin')} 
                className="secondary-btn"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="reset-password-bg">
        <div className="reset-password-form">
          <div className="success-content">
            <div className="success-icon">✅</div>
            <h3>Password Reset Successful!</h3>
            <p>Your password has been successfully updated.</p>
            <p>You are now being logged in automatically...</p>
            
            <div className="success-note">
              <strong>🎉 Welcome back!</strong> You'll be redirected to your dashboard shortly.
            </div>
            
            <div className="success-actions">
              <button 
                onClick={() => navigate('/')} 
                className="primary-btn"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="reset-password-bg">
      <form onSubmit={handleSubmit} className="reset-password-form">
        <div className="reset-password-title">
          <span role="img" aria-label="Key">🔑</span> Reset Password
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="reset-password-description">
          <p>Enter your new password below. Make sure it's secure and memorable.</p>
        </div>

        <div className="reset-password-field">
          <label className="reset-password-label">New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            required
            minLength="6"
            className="reset-password-input"
          />
        </div>

        <div className="reset-password-field">
          <label className="reset-password-label">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            minLength="6"
            className="reset-password-input"
          />
        </div>

        <div className="password-requirements">
          <h4>Password Requirements:</h4>
          <ul>
            <li className={password.length >= 6 ? 'valid' : ''}>
              At least 6 characters long
            </li>
            <li className={password === confirmPassword && password.length > 0 ? 'valid' : ''}>
              Passwords match
            </li>
          </ul>
        </div>

        <button 
          type="submit" 
          className="reset-password-submit" 
          disabled={loading || status === 'resetting'}
        >
          {status === 'resetting' ? "Resetting Password..." : "Reset Password"}
        </button>

        <div className="reset-password-footer">
          Remember your password?{" "}
          <button 
            type="button"
            onClick={() => navigate('/signin')} 
            className="signin-link"
          >
            Sign In
          </button>
        </div>
      </form>
    </div>
  );
}