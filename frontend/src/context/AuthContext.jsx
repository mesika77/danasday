import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const base = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
const AuthContext = createContext(null);

function saveToken(token) {
  try { localStorage.setItem('dd_token', token); } catch {
    try { sessionStorage.setItem('dd_token', token); } catch { /* private mode, no storage */ }
  }
}

function getStoredToken() {
  try { return localStorage.getItem('dd_token') || sessionStorage.getItem('dd_token') || null; }
  catch { return null; }
}

function clearToken() {
  try { localStorage.removeItem('dd_token'); } catch { /* ignore */ }
  try { sessionStorage.removeItem('dd_token'); } catch { /* ignore */ }
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read token from URL hash set by OAuth callback (works on all mobile browsers)
    const hash = window.location.hash;
    if (hash.startsWith('#token=')) {
      const token = hash.slice(7);
      saveToken(token);
      window.history.replaceState({}, '', window.location.pathname);
    }

    const token = getStoredToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    axios.get(`${base}/auth/me`, { withCredentials: true, headers })
      .then(({ data }) => setUser(data.user || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = () => {
    window.location.href = `${base}/auth/google`;
  };

  const logout = () => {
    clearToken();
    axios.post(`${base}/auth/logout`, {}, { withCredentials: true })
      .finally(() => setUser(null));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
