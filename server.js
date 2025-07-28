const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const axios = require('axios'); // اطمینان حاصل کنید که axios نصب شده: npm install axios

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
    // دریافت کل پیام‌ها، مدل و فرمت پاسخ از کلاینت
    const { messages, response_format } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid request payload' });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error('API Key is not configured on the server.');
      return res.status(500).json({ error: 'API Key not configured' });
    }

    // جدا کردن پیام سیستم از پیام کاربر
    const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
    const userMessage = messages.find(m => m.role === 'user')?.content || '';

    if (!userMessage) {
        return res.status(400).json({ error: 'User message is missing' });
    }
    
    // ساختار صحیح درخواست برای API Gemini
    const payload = {
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: {
        // تنظیم mime type برای خروجی JSON یا متن عادی
        response_mime_type: response_format?.type === 'json_object' ? 'application/json' : 'text/plain',
      },
      // ارسال دستورالعمل‌های سیستمی
      system_instruction: {
        parts: [{ text: systemInstruction }]
      }
    };
    
    // استفاده از یک مدل قدرتمند سازگار با Gemini API
    const apiModel = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    // استخراج محتوای پاسخ
    const content = response.data.candidates[0].content.parts[0].text;
    
    // بازگرداندن پاسخ در فرمتی که کلاینت انتظار دارد
    res.json({ choices: [{ message: { content } }] });

  } catch (error) {
    // لاگ کردن خطای دقیق‌تر برای دیباگینگ
    console.error('Proxy error:', error.response?.data?.error || error.message);
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }
    res.status(500).json({ error: 'An error occurred on the server.' });
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
