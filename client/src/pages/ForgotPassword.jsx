// client/src/pages/ForgotPassword.jsx
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";
import { forgotRequest, resetRequest } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";
import "./Login.css";

export default function ForgotPassword() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1); // 1 = enter email, 2 = enter 6-digit code & new password
  const [email, setEmail] = useState(location.state?.email || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  if (user) return <Navigate to="/journal" replace />;

  const sendCode = async (e) => {
    e?.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await forgotRequest(email);
      setInfo(
        data.message ||
          `A 6-digit verification code has been sent to ${email}.`
      );
      setStep(2);
      setWait(60);
    } catch (err) {
      setError(err.message || "Could not send verification code.");
    } finally {
      setBusy(false);
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    setError("");
    if (!code || code.length !== 6) {
      return setError("Please enter the 6-digit verification code.");
    }
    if (password.length < 8) {
      return setError("Password must be at least 8 characters.");
    }
    if (password !== confirm) {
      return setError("The two passwords do not match.");
    }

    setBusy(true);
    try {
      const data = await resetRequest(email, code, password);
      setDone(true);
      setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: {
            notice: data.message || "Password reset successful! Please log in with your new password.",
          },
        });
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to reset password. Please check your 6-digit code.");
      setBusy(false);
    }
  };

  return (
    <div className="lg-page">
      <div className="lg-card">
        {/* Brand */}
        <div className="lg-brand" style={{ marginBottom: 28 }}>
          <img
            src="/5.png"
            alt="Aizu Trade logo"
            width={36}
            height={36}
            style={{ borderRadius: 8, objectFit: "contain" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <span className="lg-name">
            Aizu <span>Trade</span>
          </span>
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <CheckCircle2
              size={52}
              color="var(--green)"
              style={{ marginBottom: 16 }}
            />
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              Password Reset Successfully!
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>
              Redirecting you to log in…
            </p>
          </div>
        ) : step === 1 ? (
          <form onSubmit={sendCode}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <KeyRound size={22} color="var(--purple)" />
              <h1 className="lg-title">Forgot Password?</h1>
            </div>
            <p className="lg-sub">
              Enter your email and we'll send you a <b>6-digit verification code</b> to reset your password.
            </p>

            <label className="lg-field">
              <span>Email Address</span>
              <input
                type="email"
                required
                autoFocus
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marketing.aizu@gmail.com"
              />
            </label>

            {error && (
              <p className="lg-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="lg-btn" disabled={busy}>
              {busy ? "Sending Code…" : "Send 6-Digit Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={updatePassword}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <KeyRound size={22} color="var(--purple)" />
              <h1 className="lg-title">Enter Verification Code</h1>
            </div>
            <p className="lg-sub">
              Enter the <b>6-digit code</b> sent to <b>{email}</b>, then choose a new password.
            </p>

            {info && (
              <p className="lg-ok" role="status">
                {info}
              </p>
            )}

            <label className="lg-field">
              <span>6-Digit Verification Code</span>
              <input
                className="lg-code"
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
              />
            </label>

            <label className="lg-field">
              <span>New Password (min 8 characters)</span>
              <div className="lg-pass">
                <input
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
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

            <label className="lg-field">
              <span>Confirm New Password</span>
              <input
                type={show ? "text" : "password"}
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
              />
            </label>

            {error && (
              <p className="lg-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="lg-btn" disabled={busy}>
              {busy ? "Updating…" : "Verify Code & Save Password"}
            </button>

            <div className="lg-row">
              <button
                type="button"
                className="lg-linkbtn"
                onClick={sendCode}
                disabled={busy || wait > 0}
              >
                {wait > 0 ? `Resend code in ${wait}s` : "Resend 6-digit code"}
              </button>
              <button
                type="button"
                className="lg-linkbtn"
                onClick={() => {
                  setStep(1);
                  setError("");
                  setCode("");
                  setInfo("");
                }}
              >
                Use different email
              </button>
            </div>
          </form>
        )}

        <div className="lg-back">
          <Link to="/login">
            <ArrowLeft size={16} /> Back to log in
          </Link>
        </div>
      </div>
    </div>
  );
}
