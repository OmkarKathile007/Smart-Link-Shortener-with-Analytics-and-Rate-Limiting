import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export const API = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});

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

  const logout = () => {
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
