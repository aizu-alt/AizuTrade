// client/src/App.jsx
import { Component, useState, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ThemeProvider } from "./theme/ThemeContext";
import RequireAuth from "./components/auth/RequireAuth";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import { PageSkeleton } from "./components/common/Skeleton";

// Lazy-loaded route pages for minimal initial bundle & faster First Contentful Paint
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Journal = lazy(() => import("./pages/Journal"));
const Analytics = lazy(() => import("./pages/Analytics"));

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
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
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
          <Suspense fallback={<PageSkeleton />}>
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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
