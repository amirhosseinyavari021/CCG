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
    // API Key check is now moved inside the handler to run after dotenv.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      // This error will now be correctly thrown if the .env file is missing or empty.
      throw new Error('CRITICAL: API_KEY is not configured. Make sure a .env file with your API_KEY is next to the executable.');
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
    logError(error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'An internal server error occurred.';
    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({ error: { code: `SERVER_ERROR_${statusCode}`, message: errorMessage } });
  }
});

// Corrected Static File Serving for pkg
const staticPath = path.join(__dirname, 'client/build');

app.use(express.static(staticPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});


process.on('uncaughtException', (err, origin) => {
    logError(`Caught exception: ${err}\nException origin: ${origin}`);
    process.exit(1);
});

// Export the app
module.exports = { app };
