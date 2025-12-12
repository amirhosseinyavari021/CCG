// client/src/services/aiService.js
import { API_BASE_URL } from '../config/api';

// تابع کمکی برای چک کردن JSON
async function safeJsonParse(response) {
  const text = await response.text(); // اول به عنوان متن بخون
  console.log("Raw server response:", text); // برای دیباگ
  if (!text) return {};

  try {
    return JSON.parse(text); // بعد سعی کن پارس کنی
  } catch (e) {
    console.error("Response is not JSON:", text);
    throw new Error("Server response is not valid JSON");
  }
}

export async function generateCommand(data) {
  const token = localStorage.getItem('ccg_token');
  const response = await fetch(`${API_BASE_URL}/api/ccg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    body: JSON.stringify(data)
  });

  console.log("Response status:", response.status); // برای دیباگ

  if (!response.ok) {
    const errorData = await safeJsonParse(response);
    throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
  }

  return await safeJsonParse(response);
}

export async function compareCode(data) {
  const token = localStorage.getItem('ccg_token');
  const response = await fetch(`${API_BASE_URL}/api/ccg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    body: JSON.stringify({
      mode: 'compare',
      input_a: data.code1,
      input_b: data.code2
    })
  });

  console.log("Compare response status:", response.status); // برای دیباگ

  if (!response.ok) {
    const errorData = await safeJsonParse(response);
    throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
  }

  return await safeJsonParse(response);
}
