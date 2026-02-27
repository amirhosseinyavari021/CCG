// client/src/services/authService.js
import api from "../api/api";

export async function authMe() {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function requestEmailOtp(email) {
  const { data } = await api.post("/auth/email/request-otp", { email });
  return data;
}

export async function verifyEmailOtp(email, code) {
  const { data } = await api.post("/auth/email/verify-otp", { email, code });
  return data;
}

export async function registerWithEmail(email, password) {
  const { data } = await api.post("/auth/register", { email, password });
  return data;
}

export async function loginWithEmail(email, password) {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

export async function logout() {
  const { data } = await api.post("/auth/logout");
  return data;
}
