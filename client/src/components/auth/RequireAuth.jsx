// client/src/components/auth/RequireAuth.jsx  —  only lets logged-in people through
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function RequireAuth() {
  const { user, loading, bootError, retry } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ padding: 64, textAlign: "center", color: "#64748b" }}>Checking your login…</div>;
  }
  if (bootError) {
    return (
      <div style={{ padding: 64, textAlign: "center" }}>
        <p style={{ color: "#dc2626", fontWeight: 600 }}>{bootError}</p>
        <button onClick={retry} style={{ marginTop: 12, padding: "8px 16px", border: 0, borderRadius: 8, background: "#2563eb", color: "#fff", fontWeight: 600 }}>
          Try again
        </button>
      </div>
    );
  }
  // not logged in: go to the login screen, and come back here afterwards
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}