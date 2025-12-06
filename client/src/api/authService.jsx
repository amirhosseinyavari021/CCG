// src/api/authService.jsx
import axios from "axios";

const TOKEN_KEY = "ccg_token";
const USER_KEY = "ccg_user";

const api = axios.create({
  baseURL: "/api/auth",
  withCredentials: true,
});

// ----------------------
// Local storage helpers
// ----------------------
export const getStoredToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const getStoredUser = () => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const storeToken = (token) => {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

export const storeUser = (user) => {
  if (typeof window === "undefined") return;
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
};

// ----------------------
// API calls
// ----------------------
export const registerRequest = async ({ name, email, password }) => {
  const res = await api.post("/register", { name, email, password });
  return res.data; // { user, token }
};

export const loginRequest = async ({ email, password }) => {
  const res = await api.post("/login", { email, password });
  return res.data; // { user, token }
};

export const getMe = async () => {
  const res = await api.get("/me");
  return res.data; // { user }
};

export const logoutRequest = async () => {
  try {
    await api.post("/logout");
  } catch {
    // ignore
  }
  storeToken(null);
  storeUser(null);
};
