// client/src/pages/Login.jsx
import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Moon, Sun, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import "./Login.css";

export default function Login() {
  const { user, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/journal";
  const notice = location.state?.notice;

  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err.message || "Authentication failed. Please check your credentials.");
      setBusy(false);
    }
  };

  return (
    <div className="lg-page">
      <div className="lg-card">
        {/* Top Header with Brand & Theme Toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
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

        <form onSubmit={submit}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <ShieldCheck size={22} color="var(--blue)" />
            <h1 className="lg-title">Admin Login</h1>
          </div>
          <p className="lg-sub">
            Sign in with your authorized admin account to access and manage your trading journal.
          </p>

          {notice && <p className="lg-ok" role="status">{notice}</p>}

          <label className="lg-field">
            <span>Admin Email</span>
            <input
              type="email"
              required
              autoFocus
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
                autoComplete="current-password"
                value={form.password}
                onChange={set("password")}
                placeholder="Your password"
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

          <div className="lg-forgot">
            <Link to="/forgot-password" state={{ email: form.email }}>
              Forgot password?
            </Link>
          </div>

          {error && <p className="lg-error" role="alert">{error}</p>}

          <button type="submit" className="lg-btn" disabled={busy}>
            {busy ? "Please wait…" : "Log in to Journal"}
          </button>
        </form>
      </div>
    </div>
  );
}
