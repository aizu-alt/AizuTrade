// client/src/auth/AuthContext.jsx
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getMe, loginRequest } from "../api/authApi";
import { getToken, setToken } from "../api/http";

const AuthContext = createContext(null);
const USER_KEY = "aizu_user";

const getSavedUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveUser = (u) => {
  try {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  } catch {}
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getSavedUser);
  const [loading, setLoading] = useState(() => !getSavedUser() && Boolean(getToken()));
  const [bootError, setBootError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setBootError("");
    if (!getToken()) {
      setLoading(false);
      saveUser(null);
      return;
    }
    // If we don't have a cached user, show loading. If we do, verify in background without blocking UI!
    if (!getSavedUser()) {
      setLoading(true);
    }
    getMe()
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        saveUser(data.user);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 401) {
          setToken(null);
          saveUser(null);
          setUser(null);
        } else {
          setBootError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [attempt]);

  useEffect(() => {
    const onLogout = () => {
      saveUser(null);
      setUser(null);
    };
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await loginRequest(email, password);
    setToken(data.token);
    saveUser(data.user);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    saveUser(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        bootError,
        retry: () => setAttempt((n) => n + 1),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
