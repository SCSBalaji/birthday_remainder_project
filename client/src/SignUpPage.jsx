import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./SignUpPage.css";

export default function SignUpPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  return (
    <div className="signup-bg">
      <form className="signup-form">
        <div className="signup-title">
          <span role="img" aria-label="Cake">🎂</span> Sign Up
        </div>
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
        <button type="submit" className="signup-btn">
          Sign Up
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