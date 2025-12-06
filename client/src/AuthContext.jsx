// src/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  getStoredToken,
  getStoredUser,
  storeToken,
  storeUser,
  loginRequest,
  registerRequest,
  getMe,
  logoutRequest,
} from "./api/authService";

export const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getStoredToken());
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);

  // ----------------------
  // On mount → sync with backend
  // ----------------------
  useEffect(() => {
    const init = async () => {
      try {
        if (!token) {
          setLoading(false);
          return;
        }
        const data = await getMe();
        if (data?.user) {
          setUser(data.user);
          storeUser(data.user);
        } else {
          setUser(null);
          setToken(null);
          storeToken(null);
          storeUser(null);
        }
      } catch {
        setUser(null);
        setToken(null);
        storeToken(null);
        storeUser(null);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [token]);

  // ----------------------
  // Actions
  // ----------------------
  const handleLogin = async ({ email, password }) => {
    setAuthBusy(true);
    try {
      const data = await loginRequest({ email, password });
      if (data?.token) {
        setToken(data.token);
        storeToken(data.token);
      }
      if (data?.user) {
        setUser(data.user);
        storeUser(data.user);
      }
      return { ok: true, user: data.user };
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "خطا در ورود. لطفاً دوباره تلاش کنید.";
      return { ok: false, error: msg };
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRegister = async ({ name, email, password }) => {
    setAuthBusy(true);
    try {
      const data = await registerRequest({ name, email, password });
      if (data?.token) {
        setToken(data.token);
        storeToken(data.token);
      }
      if (data?.user) {
        setUser(data.user);
        storeUser(data.user);
      }
      return { ok: true, user: data.user };
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "خطا در ثبت‌نام. لطفاً دوباره تلاش کنید.";
      return { ok: false, error: msg };
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    await logoutRequest();
    setUser(null);
    setToken(null);
    storeToken(null);
    storeUser(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    loading,
    authBusy,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

