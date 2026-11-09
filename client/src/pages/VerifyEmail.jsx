// client/src/pages/VerifyEmail.jsx
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { verifyEmailRequest } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";
import "./Login.css";

export default function VerifyEmail() {
  const { user } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get("token") || "";

  const [loading, setLoading] = useState(Boolean(token));
  const [success, setSuccess] = useState("");
  const [error, setError] = useState(token ? "" : "No verification token provided in this link.");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    verifyEmailRequest(token)
      .then((data) => {
        if (!cancelled) {
          setSuccess(data.message || "Your email address has been verified successfully!");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Verification link is invalid or has expired.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="lg-page">
      <div className="lg-card" style={{ textAlign: "center" }}>
        {/* Brand */}
        <div className="lg-brand" style={{ justifyContent: "center", marginBottom: 28 }}>
          <img
            src="/5.png"
            alt="Aizu Trade logo"
            width={38}
            height={38}
            style={{ borderRadius: 8, objectFit: "contain" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <span className="lg-name">
            Aizu <span>Trade</span>
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "30px 0" }}>
            <Loader2 size={44} color="var(--blue)" className="animate-spin" style={{ margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Verifying your email…</h2>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>Please wait a moment while we verify your link.</p>
          </div>
        ) : success ? (
          <div style={{ padding: "20px 0" }}>
            <CheckCircle2 size={54} color="var(--green)" style={{ margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: "var(--text)" }}>
              Email Verified!
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              {success}
            </p>
            <Link
              to={user ? "/journal" : "/login"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "13px",
                borderRadius: 10,
                background: "var(--brand-gradient)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                boxShadow: "var(--brand-glow)",
              }}
            >
              <span>{user ? "Continue to Journal" : "Go to Login"}</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div style={{ padding: "20px 0" }}>
            <AlertCircle size={54} color="var(--red)" style={{ margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: "var(--text)" }}>
              Verification Failed
            </h2>
            <p style={{ color: "var(--red-text)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              {error}
            </p>
            <Link
              to={user ? "/journal" : "/login"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "13px",
                borderRadius: 10,
                background: "var(--surface-hover)",
                color: "var(--text)",
                fontWeight: 600,
                fontSize: 14,
                border: "1px solid var(--line)",
              }}
            >
              <span>{user ? "Back to Journal" : "Back to Login"}</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

