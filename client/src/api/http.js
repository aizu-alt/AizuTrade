// client/src/api/http.js  —  one place that talks to the server and adds the login token
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const KEY = "aizu_token";

export const getToken = () => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};
export const setToken = (token) => {
  try { token ? localStorage.setItem(KEY, token) : localStorage.removeItem(KEY); } catch { /* storage blocked */ }
};

// Fire-and-forget ping to wake Render cold start immediately when the client loads
export function wakeServer() {
  try {
    const root = BASE.replace(/\/api\/?$/, "");
    fetch(`${root}/health`, { method: "GET", cache: "no-store" }).catch(() => {});
  } catch {
    /* ignore errors on background wake */
  }
}

export async function request(path, options = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new Error("Cannot reach the server. Is the backend running?");
  }
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // the saved login is no longer valid: forget it and send the user to the login screen
    if (res.status === 401 && token) {
      setToken(null);
      window.dispatchEvent(new Event("auth:logout"));
    }
    const err = new Error(data.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}