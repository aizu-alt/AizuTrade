import { useState } from "react";
import { X, Key, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { updatePasswordRequest } from "../../api/authApi";

export default function UpdatePasswordModal({ isOpen, onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      return setError("New password must be at least 8 characters.");
    }
    if (newPassword !== confirmPassword) {
      return setError("New passwords do not match.");
    }

    setSaving(true);
    try {
      const data = await updatePasswordRequest(currentPassword, newPassword);
      setSuccess(data.message || "Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay-custom" onClick={onClose}>
      <div className="modal-content-custom" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--brand-gradient)",
                display: "grid",
                placeItems: "center",
                color: "#fff",
              }}
            >
              <Key size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Update Password</h2>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                Change your account password securely
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

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: "var(--red-bg)",
              color: "var(--red-text)",
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: "var(--green-bg)",
              color: "var(--green-text)",
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              Current Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showCurrent ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your existing password"
                style={{
                  width: "100%",
                  padding: "10px 42px 10px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "var(--surface-subtle)",
                  color: "var(--text)",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((s) => !s)}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  color: "var(--muted)",
                  padding: 4,
                  cursor: "pointer",
                }}
              >
                {showCurrent ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              New Password (min 8 characters)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showNew ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 8 characters"
                style={{
                  width: "100%",
                  padding: "10px 42px 10px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "var(--surface-subtle)",
                  color: "var(--text)",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  color: "var(--muted)",
                  padding: 4,
                  cursor: "pointer",
                }}
              >
                {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              Confirm New Password
            </label>
            <input
              type={showNew ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid var(--line)",
                background: "var(--surface-subtle)",
                color: "var(--text)",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                background: "var(--surface-hover)",
                color: "var(--text)",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                background: "var(--brand-gradient)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                boxShadow: "var(--brand-glow)",
              }}
            >
              {saving ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

