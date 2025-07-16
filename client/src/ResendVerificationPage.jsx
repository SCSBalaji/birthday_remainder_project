import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from './services/api';
import './ResendVerificationPage.css';

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setStatus('error');
      setMessage('Please enter your email address');
      return;
    }

    try {
      setStatus('loading');
      
      const response = await authAPI.resendVerification(email);
      
      if (response.success) {
        setStatus('success');
        setMessage('Verification email sent! Please check your inbox and spam folder.');
      } else {
        setStatus('error');
        setMessage(response.message || 'Failed to send verification email');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      setStatus('error');
      setMessage(error.response?.data?.message || 'Failed to send verification email');
    }
  };

  return (
    <div className="resend-verification-bg">
      <div className="resend-verification-container">
        <div className="resend-verification-header">
          <h1 className="app-title">
            <span role="img" aria-label="Cake">🎂</span> Birthday Buddy
          </h1>
        </div>

        <div className="resend-verification-content">
          <h2>Resend Verification Email</h2>
          <p>Enter your email address and we'll send you a new verification link.</p>

          {status === 'success' ? (
            <div className="resend-success">
              <div className="success-icon">📧</div>
              <h3>Email Sent!</h3>
              <p>{message}</p>
              <div className="success-actions">
                <Link to="/signin" className="signin-btn">
                  Go to Sign In
                </Link>
                <button 
                  onClick={() => {setStatus('idle'); setMessage(''); setEmail('');}}
                  className="resend-again-btn"
                >
                  Send Another Email
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="resend-form">
              {status === 'error' && (
                <div className="error-message">
                  {message}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  disabled={status === 'loading'}
                />
              </div>

              <button 
                type="submit" 
                className="resend-btn"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Sending...' : 'Send Verification Email'}
              </button>

              <div className="form-footer">
                <Link to="/signin">← Back to Sign In</Link>
                <span className="separator">|</span>
                <Link to="/signup">Create New Account</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}