// src/services/aiService.js
import { API_BASE_URL } from "../config/api";

export async function generateCommand(payload) {
  const token = localStorage.getItem("ccg_token");

  const res = await fetch(`${API_BASE_URL}/api/ccg`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid server response");
  }

  if (data.error) {
    return { error: data.error };
  }

  return {
    markdown: data.output || "",
    limitReached: data.limitReached || false,
  };
}
