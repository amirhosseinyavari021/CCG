const express = require('express');
const path = require('path');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

const modelName = 'openai/gpt-oss-20b:free';

// Rate Limiter
const limiter = rateLimit({
  windowMs: 60 * 1000,
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
        'HTTP-Referer': 'https://cmdgen.onrender.com',
        'X-Title': 'AY-CMDGEN',
      },
      responseType: 'stream'
    });

    res.setHeader('Content-Type', 'text/event-stream');
    apiResponse.data.pipe(res);

  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      const serverMessage = data?.error?.message || 'An unknown error from the AI provider.';
      return res.status(status).json({
        error: { code: `AI_PROVIDER_ERROR_${status}`, message: serverMessage }
      });
    } else if (error.request) {
      return res.status(500).json({
        error: { code: 'NETWORK_ERROR', message: 'The server could not connect to the AI provider.' }
      });
    } else {
      return res.status(500).json({
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'An internal server error occurred.' }
      });
    }
  }
});

// --- Static File Serving (Corrected for pkg) ---
// This determines the correct path whether running from source or in a packaged executable
const staticPath = process.pkg
  ? path.join(path.dirname(process.execPath), 'client/build')
  : path.join(__dirname, 'client/build');

app.use(express.static(staticPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// --- Server Start ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});
