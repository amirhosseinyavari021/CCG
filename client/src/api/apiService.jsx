// src/api/apiService.jsx
import axios from "axios";

const API_BASE = "/api/ai/ccg"; // nginx handles domain + https

/**
 * Sends request payload to backend CCG AI router
 */
export async function fetchCCGResponse(payload) {
  try {
    const res = await axios.post(`${API_BASE}`, payload, {
      withCredentials: true,
      timeout: 60000,
    });

    return res.data;
  } catch (err) {
    console.error("❌ API ERROR:", err);
    throw err.response?.data || { error: "network_error" };
  }
}
