import axios from 'axios';

const TOKEN_KEY = 'ccg_token';

export const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
};

const storeToken = (token) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
};

export const logout = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
};

export const register = async (email, password) => {
  const response = await axios.post('/api/auth/register', { email, password });
  const { token } = response.data;
  if (token) storeToken(token);
  return response.data;
};

export const login = async (email, password) => {
  const response = await axios.post('/api/auth/login', { email, password });
  const { token } = response.data;
  if (token) storeToken(token);
  return response.data;
};
