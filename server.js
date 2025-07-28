const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const app = express();

app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

app.use(express.json());

app.post('/api/proxy', async (req, res) => {
  try {
    const { messages, response_format } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid request payload' });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API Key not configured' });
    }

    const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
    const userMessage = messages.find(m => m.role === 'user')?.content || '';

    if (!userMessage) {
        return res.status(400).json({ error: 'User message is missing' });
    }
    
    const payload = {
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: {
        response_mime_type: response_format?.type === 'json_object' ? 'application/json' : 'text/plain',
      },
      system_instruction: {
        parts: [{ text: systemInstruction }]
      }
    };
    
    const apiModel = 'gemini-1.5-flash';
    // استفاده از متد streamGenerateContent برای دریافت پاسخ جریانی
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:streamGenerateContent?key=${apiKey}`;

    // تنظیم هدرها برای پاسخ جریانی
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const googleResponse = await axios.post(url, payload, {
      responseType: 'stream' // مهم: دریافت پاسخ به صورت استریم
    });

    // ارسال مستقیم تکه‌های داده به کلاینت
    googleResponse.data.pipe(res);

    // مدیریت خطاهای احتمالی در حین استریم
    googleResponse.data.on('error', (err) => {
        console.error('Error during streaming from Google API:', err);
        res.status(500).end('Stream error');
    });

  } catch (error) {
    console.error('Proxy setup error:', error.response?.data?.error || error.message);
    // در صورت بروز خطا قبل از شروع استریم، یک پاسخ JSON ارسال می‌شود
    if (!res.headersSent) {
        res.status(500).json({ error: 'An error occurred on the server.' });
    }
  }
});

app.use(express.static(path.join(__dirname, 'client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
