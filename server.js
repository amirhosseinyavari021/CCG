const express = require('express');
const path = require('path');
const axios = require('axios/dist/node/axios.cjs'); // Explicit require for pkg compatibility
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

const modelName = 'openai/gpt-oss-20b:free';

// --- Error Logging ---
const logError = (error) => {
    try {
        const logDir = process.pkg ? path.dirname(process.execPath) : __dirname;
        const logFile = path.join(logDir, 'server_error.log');
        const logMessage = `[${new Date().toISOString()}] ${error.stack || error}\n`;
        fs.appendFileSync(logFile, logMessage);
    } catch (e) {
        console.error("Fatal: Could not write to log file.", e);
    }
};

// Rate Limiter
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'TOO_MANY_REQUESTS', message: 'You have sent too many requests...' }
  }
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

app.post('/api/proxy', async (req, res) => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error('CRITICAL: API_KEY is not configured.');
    }

    const { messages } = req.body;
    if (!messages) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'Request payload is missing "messages" field.' } });
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
    logError(error); // Log the error to a file
    if (error.response) {
      const { status, data } = error.response;
      const serverMessage = data?.error?.message || 'An unknown error from the AI provider.';
      return res.status(status).json({ error: { code: `AI_PROVIDER_ERROR_${status}`, message: serverMessage } });
    } else if (error.request) {
      return res.status(500).json({ error: { code: 'NETWORK_ERROR', message: 'The server could not connect to the AI provider.' } });
    } else {
      return res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'An internal server error occurred.' } });
    }
  }
});

// Corrected Static File Serving for pkg
const staticPath = path.join(__dirname, 'client/build');

app.use(express.static(staticPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Server Start - Smart host binding
const PORT = process.env.PORT || 3003; 
const HOST = process.env.RENDER ? '0.0.0.0' : '127.0.0.1';

try {
    app.listen(PORT, HOST, () => {
        console.log(`Server running on http://${HOST}:${PORT}`);
    });
} catch (err) {
    logError(err);
    process.exit(1);
}

process.on('uncaughtException', (err, origin) => {
    logError(`Caught exception: ${err}\nException origin: ${origin}`);
    process.exit(1);
});
