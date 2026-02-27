// client/src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authMe, logout as apiLogout } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    let alive = true;
    authMe()
      .then((r) => {
        if (!alive) return;
        setUser(r?.user || null);
      })
      .catch(() => {
        if (!alive) return;
        setUser(null);
      })
      .finally(() => {
        if (!alive) return;
        setBooted(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      booted,
      setUser,
      logout: async () => {
        try {
          await apiLogout();
        } catch {}
        setUser(null);
      },
      isLoggedIn: !!user,
      plan: user?.plan || "free",
    }),
    [user, booted]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
