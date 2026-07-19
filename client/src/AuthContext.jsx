import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken } from './api.js';

const AuthContext = createContext(null);

const GUEST_KEY = 'stepin_guest';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState(() => localStorage.getItem(GUEST_KEY) === '1');

  const enterGuest = useCallback(() => { localStorage.setItem(GUEST_KEY, '1'); setGuest(true); }, []);
  const exitGuest = useCallback(() => { localStorage.removeItem(GUEST_KEY); setGuest(false); }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const { user } = await api.get('/auth/me');
      setUser(user);
      return user;
    } catch {
      setToken(null);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const { token, user } = await api.post('/auth/login', { email, password });
    setToken(token);
    setUser(user);
    exitGuest();
    return user;
  };

  const signupStudent = async (payload) => {
    const { token, user } = await api.post('/auth/signup/student', payload);
    setToken(token);
    setUser(user);
    exitGuest();
    return user;
  };

  const signupCompany = async (payload) => {
    const { token, user } = await api.post('/auth/signup/company', payload);
    setToken(token);
    setUser(user);
    exitGuest();
    return user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    exitGuest();
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, refresh, login, signupStudent, signupCompany, logout, guest, enterGuest, exitGuest }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
