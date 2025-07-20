const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3001;

// Rate Limiting برای جلوگیری از سوءاستفاده
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقیقه
  max: 50, // حداکثر 50 درخواست به ازای هر IP
  message: { error: 'Too many requests, please try again later.' }
});

// بررسی Origin برای اطمینان از درخواست‌های مجاز
const restrictOrigin = (req, res, next) => {
  const allowedOrigins = ['https://cmdgen.onrender.com', 'http://localhost:3000'];
  const origin = req.get('Origin') || req.get('Referer');
  if (!origin || !allowedOrigins.some(allowed => origin.includes(allowed))) {
    return res.status(403).json({ error: 'Unauthorized request origin' });
  }
  next();
};

app.use(express.json());

// اعمال Rate Limiting و بررسی Origin
app.use('/api/proxy', limiter, restrictOrigin);

// اعتبارسنجی ورودی‌های API
app.post('/api/proxy', [
  body('model').notEmpty().withMessage('Model is required'),
  body('messages').isArray().withMessage('Messages must be an array'),
  body('messages.*.role').isIn(['system', 'user']).withMessage('Invalid role'),
  body('messages.*.content').notEmpty().withMessage('Message content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const API_KEY = process.env.GROQ_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: 'API key is not configured on the server.' });
    }

    const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return res.status(response.status).json({ error: `API request failed: ${response.status}. ${errorBody}` });
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      return res.status(500).json({ error: 'Invalid or empty response from API.' });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('API Proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error: Failed to fetch response from API.' });
  }
});

app.use(express.static(path.join(__dirname, 'client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
