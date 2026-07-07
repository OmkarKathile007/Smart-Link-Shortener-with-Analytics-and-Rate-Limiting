import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const API = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// --- Silent access-token refresh -------------------------------------------
// The access token lives ~15 min ONLY the refresh token >> httpOnly cookie.
// When a request 401s we call /auth/refresh once, update the token, and retry.

let refreshPromise = null; 

function doRefresh() {
  if (!refreshPromise) {
    refreshPromise = API.post("/auth/refresh")
      .then((res) => {
        const token = res.data.token;
        API.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        const stored = localStorage.getItem("sls_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.token = token;
          localStorage.setItem("sls_user", JSON.stringify(parsed));
        }
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const isAuthRoute = original?.url?.includes("/auth/");

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        const token = await doRefresh();
        original.headers = original.headers || {};
        original.headers["Authorization"] = `Bearer ${token}`;
        return API(original);
      } catch (refreshErr) {
        // Refresh failed (expired/revoked) — drop the session and go to login.
        localStorage.removeItem("sls_user");
        delete API.defaults.headers.common["Authorization"];
        if (window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);
// ---------------------------------------------------------------------------

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on page refresh
  useEffect(() => {
    const stored = localStorage.getItem("sls_user");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      API.defaults.headers.common["Authorization"] = `Bearer ${parsed.token}`;
    }
    setLoading(false);
  }, []);

  const register = async (name, email, password) => {
    const { data } = await API.post("/auth/register", { name, email, password });
    _saveUser(data);
    return data;
  };

  const login = async (email, password) => {
    const { data } = await API.post("/auth/login", { email, password });
    _saveUser(data);
    return data;
  };

  const logout = async () => {
    // Revoke the refresh token server-side; clear local state regardless.
    try {
      await API.post("/auth/logout");
    } catch {
      // ignore network/401 — we still clear the client session below
    }
    localStorage.removeItem("sls_user");
    delete API.defaults.headers.common["Authorization"];
    setUser(null);
  };

  const _saveUser = (data) => {
    localStorage.setItem("sls_user", JSON.stringify(data));
    API.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    setUser(data);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
