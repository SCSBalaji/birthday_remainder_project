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

  const { login } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
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

    try {
      const response = await authAPI.register({
        name: form.name,
        email: form.email,
        password: form.password
      });
      
      // Auto-login after successful registration
      login(response.token, response.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-bg">
      <form className="signup-form" onSubmit={handleSubmit}>
        <div className="signup-title">
          <span role="img" aria-label="Cake">🎂</span> Sign Up
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

        <div className="signup-input-group">
          <label className="signup-label">Full Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            autoComplete="off"
            placeholder="Enter your name"
            required
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
            autoComplete="off"
            placeholder="your@email.com"
            required
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
            placeholder="Password"
            required
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
            placeholder="Repeat password"
            required
            className="signup-input"
          />
        </div>
        <button type="submit" className="signup-btn" disabled={loading}>
          {loading ? "Creating Account..." : "Sign Up"}
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