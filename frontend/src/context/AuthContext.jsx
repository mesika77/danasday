import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const base = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for auth=success redirect param then clean URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success' || params.get('auth') === 'error') {
      window.history.replaceState({}, '', window.location.pathname);
    }

    axios.get(`${base}/auth/me`, { withCredentials: true })
      .then(({ data }) => setUser(data.user || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = () => {
    window.location.href = `${base}/auth/google`;
  };

  const logout = () => {
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
