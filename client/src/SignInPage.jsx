import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import "./SignInPage.css";

export default function SignInPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError(""); // Clear error when user types
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(form);
      
      if (result.success) {
        console.log("Login successful!");
        navigate("/"); // Redirect to home page
      } else {
        setError(result.message || "Login failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signin-bg">
      <form onSubmit={handleSubmit} className="signin-form">
        <div className="signin-title">
          <span role="img" aria-label="Cake">🎂</span> Sign In
        </div>

        {error && (
          <div style={{
            background: '#ff6ec444',
            color: '#ff6ec4',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <div className="signin-field">
          <label className="signin-label">Email Address</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
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
            placeholder="Password"
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

        <button 
          type="submit" 
          disabled={loading}
          className="signin-submit"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>

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