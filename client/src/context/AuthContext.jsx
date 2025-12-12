// client/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE_URL } from '../config/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      const savedToken = localStorage.getItem('ccg_token');
      const guestMode = localStorage.getItem('ccg_guest_mode') === 'true';

      if (savedToken) {
        // در آینده: اعتبارسنجی توکن با /auth/me
        setToken(savedToken);
        setUser({ email: 'user@cando.ac' });
      } else if (guestMode) {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const loginAsGuest = () => {
    localStorage.setItem('ccg_guest_mode', 'true');
    localStorage.setItem('ccg_guest_requests', '0');
    setUser(null);
    setToken(null);
  };

  const incrementGuestRequests = () => {
    const count = parseInt(localStorage.getItem('ccg_guest_requests') || '0');
    localStorage.setItem('ccg_guest_requests', (count + 1).toString());
  };

  const isGuestLimitReached = () => {
    const count = parseInt(localStorage.getItem('ccg_guest_requests') || '0');
    return count >= 5;
  };

  const login = async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    localStorage.setItem('ccg_token', data.token);
    localStorage.removeItem('ccg_guest_mode');
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (name, family, email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/register-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, family, email, password })
    });

    if (!response.ok) {
      throw new Error('Registration failed');
    }

    const data = await response.json();
    localStorage.setItem('ccg_token', data.token);
    localStorage.removeItem('ccg_guest_mode');
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('ccg_token');
    localStorage.removeItem('ccg_guest_mode');
    localStorage.removeItem('ccg_guest_requests');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        loginAsGuest,
        incrementGuestRequests,
        isGuestLimitReached,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
