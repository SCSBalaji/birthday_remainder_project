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

  const { login } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await authAPI.login(form);
      login(response.token, response.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signin-bg">
      <form className="signin-form" onSubmit={handleSubmit}>
        <div className="signin-title">
          <span role="img" aria-label="Cake">🎂</span> Sign In
        </div>
        
        {error && (
          <div style={{ 
            color: '#ff6b6b', 
            marginBottom: '15px', 
            textAlign: 'center',
            fontSize: '14px'
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
            autoComplete="off"
            placeholder="your@email.com"
            required
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
            className="signin-input"
          />
        </div>
        <div className="signin-forgot">
          <button type="button" disabled className="signin-forgot-btn">
            Forgot password?
          </button>
        </div>
        <button type="submit" className="signin-submit" disabled={loading}>
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