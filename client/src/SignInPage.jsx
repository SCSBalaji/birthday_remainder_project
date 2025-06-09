import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./SignInPage.css"; // Import the CSS file

export default function SignInPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  return (
    <div className="signin-bg">
      <form className="signin-form">
        <div className="signin-title">
          <span role="img" aria-label="Cake">🎂</span> Sign In
        </div>
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
        <button type="submit" className="signin-submit">
          Sign In
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