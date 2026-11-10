// client/src/pages/Login.jsx
import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Moon, Sun, Sparkles, CheckCircle2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import "./Login.css";

export default function Login() {
  const { user, login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/journal";
  const notice = location.state?.notice;

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        const res = await register(form.name, form.email, form.password);
        setSuccess(res.message || "Account registered with Neon Auth! Check your email.");
      }
    } catch (err) {
      setError(err.message || "Authentication failed. Please check your credentials.");
      setBusy(false);
    }
  };

  return (
    <div className="lg-page">
      <div className="lg-card">
        {/* Top Header with Brand & Theme Toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div className="lg-brand" style={{ margin: 0 }}>
            <span className="ft-icon">
              <img
                src="/5.png"
                alt="Aizu Trade logo"
                width={36}
                height={36}
                style={{ borderRadius: 8, objectFit: "contain" }}
              />
            </span>
            <span className="lg-name">
              Aizu <span>Trade</span>
            </span>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--surface-subtle)",
              border: "1px solid var(--line)",
              color: theme === "dark" ? "var(--amber)" : "var(--blue)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Login / Sign Up Tabs */}
        <div className="lg-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
              setSuccess("");
            }}
          >
            Log In
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError("");
              setSuccess("");
            }}
          >
            <Sparkles size={14} style={{ marginRight: 4 }} />
            Sign Up (Neon)
          </button>
        </div>

        <form onSubmit={submit}>
          <h1 className="lg-title">
            {mode === "login" ? "Welcome back" : "Create Account"}
          </h1>
          <p className="lg-sub">
            {mode === "login"
              ? "Sign in with your email to access your trading journal."
              : "Sign up with Neon Auth & email verification."}
          </p>

          {notice && <p className="lg-ok" role="status">{notice}</p>}
          {success && (
            <div className="lg-ok" role="status">
              <CheckCircle2 size={16} style={{ display: "inline", marginRight: 6 }} />
              {success}
            </div>
          )}

          {mode === "register" && (
            <label className="lg-field">
              <span>Full Name</span>
              <input
                type="text"
                required
                autoFocus
                value={form.name}
                onChange={set("name")}
                placeholder="e.g. Full Name"
              />
            </label>
          )}

          <label className="lg-field">
            <span>Email</span>
            <input
              type="email"
              required
              autoFocus={mode === "login"}
              autoComplete="username"
              value={form.email}
              onChange={set("email")}
              placeholder="Your Email"
            />
          </label>

          <label className="lg-field">
            <span>Password</span>
            <div className="lg-pass">
              <input
                type={show ? "text" : "password"}
                required
                minLength={8}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={form.password}
                onChange={set("password")}
                placeholder={mode === "login" ? "Your password" : "At least 8 characters"}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {mode === "login" && (
            <div className="lg-forgot">
              <Link to="/forgot-password" state={{ email: form.email }}>
                Forgot password?
              </Link>
            </div>
          )}

          {error && <p className="lg-error" role="alert">{error}</p>}

          <button type="submit" className="lg-btn" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "login"
              ? "Log in to Journal"
              : "Create Account with Neon"}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
          {mode === "login" ? (
            <span>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                style={{
                  background: "transparent",
                  color: "var(--blue)",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "inherit",
                }}
              >
                Create one with Neon
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                style={{
                  background: "transparent",
                  color: "var(--blue)",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "inherit",
                }}
              >
                Log in here
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
