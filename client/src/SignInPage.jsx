import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function SignInPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      background: "radial-gradient(ellipse at top left, #191970 0%, #4e0066 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Segoe UI', Arial, sans-serif",
      margin: 0,
      padding: 0,
      boxSizing: "border-box"
    }}>
      <form style={{
        background: "#18103d",
        padding: "38px 32px 30px 32px",
        borderRadius: 16,
        minWidth: 340,
        maxWidth: 400,
        width: "100%",
        boxShadow: "0 8px 32px #0008",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
        <div style={{
          fontWeight: 700,
          fontSize: 26,
          color: "#ffb4fc",
          marginBottom: 22,
          letterSpacing: 1,
          display: "flex", alignItems: "center", gap: 10
        }}>
          <span role="img" aria-label="Cake">🎂</span> Sign In
        </div>
        <div style={{ width: "100%", marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 5, fontWeight: 500, color: "#fff" }}>Email Address</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="off"
            placeholder="your@email.com"
            required
            style={{
              width: "100%", padding: 10, borderRadius: 7, background: "#29214a",
              border: "none", fontSize: 15, color: "#fff", outline: "none"
            }}
          />
        </div>
        <div style={{ width: "100%", marginBottom: 8 }}>
          <label style={{ display: "block", marginBottom: 5, fontWeight: 500, color: "#fff" }}>Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Password"
            required
            style={{
              width: "100%", padding: 10, borderRadius: 7, background: "#29214a",
              border: "none", fontSize: 15, color: "#fff", outline: "none"
            }}
          />
        </div>
        <div style={{ width: "100%", textAlign: "right", marginBottom: 18 }}>
          <button type="button" disabled style={{
            background: "none",
            color: "#1fd1f9",
            border: "none",
            fontSize: 14,
            cursor: "pointer",
            opacity: 0.8,
            textDecoration: "underline"
          }}>
            Forgot password?
          </button>
        </div>
        <button type="submit" style={{
          width: "100%",
          padding: "12px 0",
          borderRadius: 8,
          border: "none",
          background: "linear-gradient(90deg, #ff6ec4 0%, #7873f5 100%)",
          color: "#fff",
          fontWeight: 700,
          fontSize: 17,
          cursor: "pointer",
          marginBottom: 14,
          marginTop: 6
        }}>
          Sign In
        </button>
        <div style={{ fontSize: 15, color: "#ffb4fc", marginTop: 5 }}>
          Don't have an account?{" "}
          <Link to="/signup" style={{ color: "#1fd1f9", textDecoration: "underline" }}>
            Sign Up
          </Link>
        </div>
      </form>
    </div>
  );
}