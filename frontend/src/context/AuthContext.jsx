import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const API = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});



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


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


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
    
    try {
      await API.post("/auth/logout");
    } catch {
    
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
