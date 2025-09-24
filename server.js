const express = require('express');
const path = require('path');
const axios = require('axios/dist/node/axios.cjs');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

const apiKey = process.env.API_KEY;
if (apiKey) {
    console.log("✅ API_KEY loaded successfully from environment variables.");
} else {
    console.error("❌ CRITICAL: API_KEY environment variable not found on the server!");
}

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // کمی افزایش برای درخواست‌های آنالیتیکس
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// --- [جدید] Endpoint برای آمارگیری ---
app.post('/api/ping', (req, res) => {
    const { event, source } from req.body;
    // در اینجا می‌توانید رویدادها را به سرویس آنالیتیکس خود ارسال کنید
    // برای سادگی، فعلاً فقط در کنسول سرور لاگ می‌اندازیم
    console.log(`[Analytics Ping] Event: ${event}, Source: ${source}`);
    res.status(200).send({ status: 'ok' });
});
// ------------------------------------

app.post('/api/proxy', async (req, res) => {
  if (!apiKey) {
    return res.status(500).json({ error: { code: 'SERVER_CONFIG_ERROR', message: 'API key is not configured on the server.' } });
  }

  try {
    const { messages } = req.body;
    if (!messages) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'Request payload is missing "messages" field.' } });
    }

    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const payload = { model: 'openai/gpt-3.5-turbo', messages, stream: true };

    const apiResponse = await axios.post(openRouterUrl, payload, {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://cmdgen.onrender.com',
        'X-Title': 'AY-CMDGEN',
      },
      responseType: 'stream'
    });

    res.setHeader('Content-Type', 'text/event-stream');
    apiResponse.data.pipe(res);

  } catch (error) {
    console.error("API Proxy Error:", error.message);
    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({ error: { code: `PROXY_ERROR_${statusCode}`, message: error.message } });
  }
});

const staticPath = path.join(__dirname, 'client/build');
app.use(express.static(staticPath));

app.get('*', (req, res) => {
    const indexPath = path.join(staticPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(404).send('Web interface not found. API is running correctly.');
      }
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
});