import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "./services/api";
import { useAuth } from "./contexts/AuthContext";
import "./SignUpPage.css";

export default function SignUpPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError(""); // Clear error when user starts typing
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate passwords match
    if (form.password !== form.confirm) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    // Validate password length
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      console.log('SignUpPage: Attempting registration');
      const response = await authAPI.register({
        name: form.name,
        email: form.email,
        password: form.password
      });
      
      console.log('SignUpPage: Registration response:', response);
      
      if (response.success) {
        // Show success message instead of auto-login
        setRegistrationSuccess(true);
        setUserEmail(form.email);
      } else {
        setError(response.message || "Registration failed");
      }
    } catch (err) {
      console.error('SignUpPage: Registration error:', err);
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // Handle specific error cases
        if (err.response.status === 409) {
          // User already exists but not verified
          if (errorData.message && errorData.message.includes('not verified')) {
            setRegistrationSuccess(true);
            setUserEmail(form.email);
            return; // Show the "check your email" success page
          } 
          // User already exists and is verified
          else if (errorData.message && errorData.message.includes('already exists')) {
            setError('An account with this email already exists. Please sign in instead.');
          }
          // Generic conflict error
          else {
            setError(errorData.message || 'This email is already registered.');
          }
        } else {
          setError(errorData.message || "Registration failed. Please try again.");
        }
      } else {
        setError("Registration failed. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // If registration successful, show success message
  if (registrationSuccess) {
    return (
      <div className="signup-bg">
        <div className="signup-form success-form">
          <div className="signup-title">
            <span role="img" aria-label="Party">🎉</span> Registration Successful!
          </div>

          <div className="success-content">
            <div className="success-icon">📧</div>
            <h3>Check Your Email!</h3>
            <p>
              We've sent a verification email to <strong>{userEmail}</strong>
            </p>
            <p>
              Please check your inbox and click the verification link to activate your account.
            </p>
            
            <div className="success-note">
              <strong>💡 Already registered?</strong> If you've registered before but haven't verified your email, we've sent you a new verification link.
            </div>

            <div className="success-actions">
              <Link to="/signin" className="signin-link-btn">
                Go to Sign In
              </Link>
              <Link to="/resend-verification" className="resend-link-btn">
                Resend Email
              </Link>
            </div>

            <div className="success-footer">
              <p>The verification link expires in 15 minutes for security.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-bg">
      <form className="signup-form" onSubmit={handleSubmit}>
        <div className="signup-title">
          <span role="img" aria-label="Cake">🎂</span> Sign Up
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="signup-input-group">
          <label className="signup-label">Full Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            autoComplete="name"
            placeholder="Enter your full name"
            required
            disabled={loading}
            className="signup-input"
          />
        </div>

        <div className="signup-input-group">
          <label className="signup-label">Email Address</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            placeholder="your@email.com"
            required
            disabled={loading}
            className="signup-input"
          />
        </div>

        <div className="signup-input-group">
          <label className="signup-label">Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            placeholder="At least 6 characters"
            required
            disabled={loading}
            className="signup-input"
          />
        </div>

        <div className="signup-input-group">
          <label className="signup-label">Confirm Password</label>
          <input
            type="password"
            name="confirm"
            value={form.confirm}
            onChange={handleChange}
            autoComplete="new-password"
            placeholder="Repeat your password"
            required
            disabled={loading}
            className="signup-input"
          />
        </div>

        <button type="submit" className="signup-btn" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner-small"></span>
              Creating Account...
            </>
          ) : (
            "Create Account"
          )}
        </button>

        <div className="signup-footer">
          Already have an account?{" "}
          <Link to="/signin" className="signup-link">
            Sign In
          </Link>
        </div>
      </form>
    </div>
  );
}