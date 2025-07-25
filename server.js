const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const axios = require('axios'); // برای درخواست به API گوگل

const app = express();

// فعال کردن trust proxy برای پردازش هدر X-Forwarded-For
app.set('trust proxy', 1); // برای Render، 1 به معنای اعتماد به اولین پراکسی است

// تنظیم rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقیقه
  max: 100, // حداکثر 100 درخواست در هر IP
});
app.use(limiter);

// میانی‌افزار برای پارس کردن JSON
app.use(express.json());

// endpoint برای پروکسی API
app.post('/api/proxy', async (req, res) => {
  try {
    const { messages } = req.body; // ساختار پیام‌ها از App.js
    if (!messages || !messages[1]?.content) {
      return res.status(400).json({ error: 'Invalid request payload' });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API Key not configured' });
    }

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=' + apiKey,
      {
        contents: [{ parts: [{ text: messages[1].content }] }]
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const content = response.data.candidates[0].content.parts[0].text;
    res.json({ choices: [{ message: { content } }] }); // سازگار با ساختار مورد انتظار App.js
  } catch (error) {
    console.error('Proxy error:', error.response?.data || error.message);
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// سرو فایل‌های استاتیک از پوشه client/build
app.use(express.static(path.join(__dirname, 'client/build')));

// هدایت تمام درخواست‌ها به index.html برای پشتیبانی از مسیریابی React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
