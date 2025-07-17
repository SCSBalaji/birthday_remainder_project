import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "./services/api";
import { useAuth } from "./contexts/AuthContext";
import "./SignInPage.css";

export default function SignInPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError(""); // Clear error when user starts typing
    if (needsVerification) setNeedsVerification(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNeedsVerification(false);

    try {
      const response = await authAPI.login(form);
      
      if (response.success && response.token && response.user) {
        login(response.token, response.user);
        navigate("/");
      } else {
        setError(response.message || "Login failed");
      }
    } catch (err) {
      console.error('SignIn error:', err);
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        if (errorData.requires_verification) {
          setNeedsVerification(true);
          setError("");
        } else {
          setError(errorData.message || "Login failed");
        }
      } else {
        setError("Login failed. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Handle resend verification
  const handleResendVerification = async () => {
    try {
      setLoading(true);
      const response = await authAPI.resendVerification(form.email);
      
      if (response.success) {
        alert("Verification email sent! Please check your inbox.");
      } else {
        alert("Failed to send verification email. Please try again.");
      }
    } catch (error) {
      alert("Failed to send verification email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-bg">
      <form className="signin-form" onSubmit={handleSubmit}>
        <div className="signin-title">
          <span role="img" aria-label="Cake">🎂</span> Sign In
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {needsVerification && (
          <div className="verification-needed">
            <div className="verification-icon">📧</div>
            <h3>Email Verification Required</h3>
            <p>
              Please verify your email address before signing in. 
              Check your inbox for a verification email.
            </p>
            <div className="verification-actions">
              <button 
                type="button" 
                onClick={handleResendVerification}
                disabled={loading}
                className="resend-verification-btn"
              >
                {loading ? "Sending..." : "Resend Verification Email"}
              </button>
              <Link to="/resend-verification" className="manual-resend-link">
                Use Different Email
              </Link>
            </div>
          </div>
        )}

        {!needsVerification && (
          <>
            <div className="signin-field">
              <label className="signin-label">Email Address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                placeholder="your@email.com"
                required
                disabled={loading}
                className="signin-input"
              />
            </div>

            <div className="signin-field">
              <label className="signin-label">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                disabled={loading}
                className="signin-input"
              />
            </div>

            <div className="signin-forgot">
              <button type="button" disabled className="signin-forgot-btn">
                Forgot password?
              </button>
            </div>

            <button type="submit" className="signin-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </>
        )}

        <div className="signin-signup">
          Don't have an account?{" "}
          <Link to="/signup" className="signin-signup-link">
            Sign Up
          </Link>
        </div>
      </form>
    </div>
  );
}