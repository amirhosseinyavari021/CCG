const express = require('express');
const path = require('path');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

const modelName = 'openai/gpt-oss-20b:free';

// Rate Limiter: 10 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'You have sent too many requests in a short period. Please wait a moment before trying again.'
    }
  }
});

// Apply the rate limiting middleware to API calls only
app.use('/api/', limiter);

// Health check endpoint for the CLI to verify if the server is running
app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

app.post('/api/proxy', async (req, res) => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error('CRITICAL: API_KEY is not configured.');
      return res.status(500).json({
        error: { code: 'NO_API_KEY', message: 'The server API key is not configured.' }
      });
    }

    const { messages } = req.body;
    if (!messages) {
      return res.status(400).json({
        error: { code: 'INVALID_PAYLOAD', message: 'Request payload is missing "messages" field.' }
      });
    }

    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const payload = { model: modelName, messages, stream: true };

    const apiResponse = await axios.post(openRouterUrl, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://cmdgen.onrender.com', // Replace with your domain
        'X-Title': 'CMDGEN',
      },
      responseType: 'stream'
    });

    res.setHeader('Content-Type', 'text/event-stream');
    apiResponse.data.pipe(res);

  } catch (error) {
    // ... Error handling logic ...
  }
});

app.use(express.static(path.join(__dirname, 'client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} using model: ${modelName}`);
});
