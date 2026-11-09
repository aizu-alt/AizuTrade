// client/src/App.jsx
import { Component, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ThemeProvider } from "./theme/ThemeContext";
import RequireAuth from "./components/auth/RequireAuth";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Journal from "./pages/Journal";
import Analytics from "./pages/Analytics";

// If a page crashes, show the reason on screen instead of a blank page
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main style={{ maxWidth: 720, margin: "48px auto", padding: "0 16px" }}>
        <h2 style={{ color: "var(--red)" }}>This page hit an error</h2>
        <pre style={{ whiteSpace: "pre-wrap", background: "var(--red-bg)", color: "var(--red-text)", padding: 16, borderRadius: 8 }}>
          {String(this.state.error?.message || this.state.error)}
        </pre>
        <p>Press F12, open the Console tab, and inspect the red error text.</p>
      </main>
    );
  }
}

// navbar and footer live here once, so every logged-in page gets them
function Layout() {
  const { pathname } = useLocation();

  return (
    <>
      <Navbar />
      <ErrorBoundary key={pathname}>
        <Outlet />
      </ErrorBoundary>
      <Footer />
    </>
  );
}

export default function App() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* public: login, forgot-password, and email verification */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* authenticated pages */}
            <Route element={<RequireAuth />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/journal" replace />} />
                <Route path="/journal" element={<Journal formOpen={formOpen} setFormOpen={setFormOpen} />} />
                <Route path="/analytics" element={<Analytics />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/journal" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
