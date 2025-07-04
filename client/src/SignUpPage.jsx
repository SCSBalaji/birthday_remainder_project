import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import "./SignUpPage.css";

export default function SignUpPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError(""); // Clear error when user types
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        name: form.name,
        email: form.email,
        password: form.password
      });
      
      if (result.success) {
        console.log("Registration successful!");
        navigate("/"); // Redirect to home page
      } else {
        setError(result.message || "Registration failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-bg">
      <form onSubmit={handleSubmit} className="signup-form">
        <div className="signup-title">
          <span role="img" aria-label="Cake">🎂</span> Sign Up
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

        <div className="signup-input-group">
          <label className="signup-label">Full Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Enter your name"
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
            placeholder="Password (min 6 characters)"
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
            placeholder="Repeat password"
            required
            disabled={loading}
            className="signup-input"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="signup-btn"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
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