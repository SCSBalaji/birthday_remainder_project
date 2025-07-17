import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from './services/api';
import './ForgotPasswordPage.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.forgotPassword(email);
      
      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.message || 'Failed to send reset email');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      if (err.response?.data) {
        setError(err.response.data.message || 'Failed to send reset email');
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="forgot-password-bg">
        <div className="forgot-password-form">
          <div className="success-content">
            <div className="success-icon">📧</div>
            <h3>Check Your Email!</h3>
            <p>
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p>
              Please check your inbox and click the link to reset your password.
            </p>
            
            <div className="success-note">
              <strong>💡 Didn't receive the email?</strong> Check your spam folder or try again.
            </div>

            <div className="success-actions">
              <Link to="/signin" className="signin-link-btn">
                Back to Sign In
              </Link>
              <button 
                onClick={() => setSuccess(false)} 
                className="resend-link-btn"
              >
                Try Another Email
              </button>
            </div>

            <div className="success-footer">
              <p>The reset link expires in 15 minutes for security.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password-bg">
      <form onSubmit={handleSubmit} className="forgot-password-form">
        <div className="forgot-password-title">
          <span role="img" aria-label="Lock">🔐</span> Forgot Password
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="forgot-password-description">
          <p>Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        <div className="forgot-password-field">
          <label className="forgot-password-label">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="your@email.com"
            required
            className="forgot-password-input"
          />
        </div>

        <button 
          type="submit" 
          className="forgot-password-submit" 
          disabled={loading}
        >
          {loading ? "Sending Reset Link..." : "Send Reset Link"}
        </button>

        <div className="forgot-password-footer">
          Remember your password?{" "}
          <Link to="/signin" className="signin-link">
            Sign In
          </Link>
        </div>
      </form>
    </div>
  );
}