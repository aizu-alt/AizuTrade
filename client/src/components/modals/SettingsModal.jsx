// client/src/components/modals/SettingsModal.jsx
import { useState } from "react";
import { X, Settings, Users, Mail, CheckCircle2, AlertCircle, Send, Shield, Check } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { sendVerificationRequest, verifyEmailOtpRequest } from "../../api/authApi";

export default function SettingsModal({ isOpen, onClose, onOpenTraders }) {
  const { user } = useAuth();
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState({ error: "", success: "" });
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(Boolean(user?.emailVerified));

  if (!isOpen) return null;

  const handleSendVerification = async () => {
    setSendingEmail(true);
    setEmailStatus({ error: "", success: "" });
    try {
      const data = await sendVerificationRequest();
      setOtpSent(true);
      setEmailStatus({
        success: data.message || "Verification code sent to your email! Check your inbox.",
        error: "",
      });
    } catch (err) {
      setEmailStatus({
        error: err.message || "Could not send verification email",
        success: "",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e?.preventDefault();
    if (!code || code.length !== 6) {
      return setEmailStatus({ error: "Please enter the 6-digit code from your email.", success: "" });
    }
    setVerifying(true);
    setEmailStatus({ error: "", success: "" });
    try {
      const data = await verifyEmailOtpRequest(code);
      setIsVerified(true);
      if (user) user.emailVerified = true;
      setEmailStatus({
        success: data.message || "Email verified successfully!",
        error: "",
      });
    } catch (err) {
      setEmailStatus({
        error: err.message || "Invalid or expired verification code.",
        success: "",
      });
    } finally {
      setVerifying(false);
    }
  };

  const sectionStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px",
    borderRadius: 12,
    background: "var(--surface-subtle)",
    border: "1px solid var(--line)",
  };

  const iconBox = (bg, color, Icon) => (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        background: bg,
        color,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={20} />
    </div>
  );

  return (
    <div className="modal-overlay-custom" onClick={onClose}>
      <div className="modal-content-custom" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 22,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "var(--brand-gradient)",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                boxShadow: "var(--brand-glow)",
              }}
            >
              <Settings size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                Settings
              </h2>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                Manage traders &amp; account verification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: 6,
              borderRadius: 8,
              background: "transparent",
              color: "var(--muted)",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Traders Management */}
          <div style={sectionStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {iconBox("var(--blue-soft)", "var(--blue)", Users)}
              <div>
                <b style={{ fontSize: 15, display: "block" }}>
                  Traders Management
                </b>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>
                  Add or remove traders from your journal
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenTraders) onOpenTraders();
              }}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                background: "var(--brand-gradient)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                boxShadow: "var(--brand-glow)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Manage
            </button>
          </div>

          {/* Account Info */}
          <div
            style={{
              ...sectionStyle,
              flexDirection: "column",
              alignItems: "stretch",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {iconBox("var(--purple-soft)", "var(--purple)", Shield)}
                <div>
                  <b style={{ fontSize: 15, display: "block" }}>
                    Account &amp; Verification
                  </b>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>
                    {user?.email}
                  </span>
                </div>
              </div>
              <span
                className={`badge-neon ${isVerified ? "verified" : "unverified"}`}
              >
                {isVerified ? "Verified" : "Unverified"}
              </span>
            </div>

            {emailStatus.error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 12px",
                  background: "var(--red-bg)",
                  color: "var(--red-text)",
                  borderRadius: 8,
                  fontSize: 13,
                  border: "1px solid var(--red)",
                }}
              >
                <AlertCircle size={15} />
                <span>{emailStatus.error}</span>
              </div>
            )}

            {emailStatus.success && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 12px",
                  background: "var(--green-bg)",
                  color: "var(--green-text)",
                  borderRadius: 8,
                  fontSize: 13,
                  border: "1px solid var(--green)",
                }}
              >
                <CheckCircle2 size={15} />
                <span>{emailStatus.success}</span>
              </div>
            )}

            {!isVerified && !otpSent && (
              <button
                type="button"
                onClick={handleSendVerification}
                disabled={sendingEmail}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 16px",
                  borderRadius: 8,
                  background: "var(--brand-gradient)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "var(--brand-glow)",
                  alignSelf: "flex-start",
                }}
              >
                <Send size={14} />
                {sendingEmail ? "Sending email…" : "Send Verification Email"}
              </button>
            )}

            {!isVerified && otpSent && (
              <form onSubmit={handleVerifyCode} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
                  Enter the 6-digit code sent to your email (or click the email link):
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    pattern="[0-9]{6}"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1.5px solid var(--line)",
                      fontSize: 18,
                      letterSpacing: 4,
                      fontWeight: 700,
                      width: 140,
                      textAlign: "center",
                      background: "var(--surface)",
                      color: "var(--text)",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={verifying || code.length !== 6}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 16px",
                      borderRadius: 8,
                      background: "var(--brand-gradient)",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "var(--brand-glow)",
                    }}
                  >
                    <Check size={14} />
                    {verifying ? "Verifying…" : "Verify Code"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    type="button"
                    onClick={handleSendVerification}
                    disabled={sendingEmail}
                    style={{
                      background: "transparent",
                      color: "var(--blue)",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: 0,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    Resend email
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div style={{ marginTop: 22, textAlign: "right" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              background: "var(--surface-hover)",
              color: "var(--text)",
              fontWeight: 600,
              fontSize: 14,
              border: "1px solid var(--line)",
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
