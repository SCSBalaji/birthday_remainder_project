import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authAPI } from './services/api';
import { useAuth } from './contexts/AuthContext';
import './VerifyEmailPage.css';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [status, setStatus] = useState('verifying'); // verifying, success, error, expired
  const [message, setMessage] = useState('');
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      setStatus('verifying');
      
      const response = await authAPI.verifyEmail(token);
      
      if (response.success) {
        setStatus('success');
        setMessage('Email verified successfully! Welcome to Birthday Buddy!');
        setUserInfo(response.data.user);
        
        // Auto-login the user
        if (response.data.token) {
          login(response.data.token, response.data.user);
          
          // Redirect to main app after 3 seconds
          setTimeout(() => {
            navigate('/');
          }, 3000);
        }
      } else {
        setStatus('error');
        setMessage(response.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      
      if (error.response?.status === 400) {
        const errorMsg = error.response.data.message;
        if (errorMsg.includes('expired')) {
          setStatus('expired');
          setMessage('Your verification link has expired. Please request a new one.');
        } else {
          setStatus('error');
          setMessage(errorMsg);
        }
      } else {
        setStatus('error');
        setMessage('Failed to verify email. Please try again.');
      }
    }
  };

  return (
    <div className="verify-email-bg">
      <div className="verify-email-container">
        <div className="verify-email-header">
          <h1 className="app-title">
            <span role="img" aria-label="Cake">🎂</span> Birthday Buddy
          </h1>
        </div>

        <div className="verify-email-content">
          {status === 'verifying' && (
            <div className="verify-status verifying">
              <div className="spinner"></div>
              <h2>Verifying Your Email...</h2>
              <p>Please wait while we verify your email address.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="verify-status success">
              <div className="success-icon">✅</div>
              <h2>Email Verified Successfully!</h2>
              <p>{message}</p>
              {userInfo && (
                <div className="user-welcome">
                  <p>Welcome, <strong>{userInfo.name}</strong>!</p>
                  <p>You'll be redirected to your dashboard in a few seconds...</p>
                </div>
              )}
              <Link to="/" className="continue-btn">
                Continue to Birthday Buddy
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="verify-status error">
              <div className="error-icon">❌</div>
              <h2>Verification Failed</h2>
              <p>{message}</p>
              <div className="error-actions">
                <Link to="/signin" className="signin-btn">
                  Go to Sign In
                </Link>
                <Link to="/signup" className="signup-btn">
                  Create New Account
                </Link>
              </div>
            </div>
          )}

          {status === 'expired' && (
            <div className="verify-status expired">
              <div className="expired-icon">⏰</div>
              <h2>Link Expired</h2>
              <p>{message}</p>
              <div className="expired-actions">
                <Link to="/resend-verification" className="resend-btn">
                  Request New Verification Email
                </Link>
                <Link to="/signin" className="signin-btn">
                  Go to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="verify-email-footer">
          <p>Having trouble? <a href="mailto:support@birthdaybuddy.com">Contact Support</a></p>
        </div>
      </div>
    </div>
  );
}