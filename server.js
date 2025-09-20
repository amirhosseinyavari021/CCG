const express = require('express');
const path = require('path');
const axios = require('axios/dist/node/axios.cjs');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

const modelName = 'openai/gpt-oss-20b:free';

// --- Error Logging ---
const logError = (error) => {
    // This function will only run on the server, not in the packaged CLI.
    try {
        const logDir = __dirname;
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
    // Standard check for API_KEY
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error('CRITICAL: API_KEY environment variable is not configured on the server.');
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

// Serve static files for the web version
const staticPath = path.join(__dirname, 'client/build');
app.use(express.static(staticPath));
app.get('*', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // If index.html doesn't exist (e.g., in an API-only deploy), just send a confirmation.
    res.status(200).send('API service is running. No web interface found.');
  }
});

process.on('uncaughtException', (err, origin) => {
    logError(`Caught exception: ${err}\nException origin: ${origin}`);
    process.exit(1);
});

// --- Start the server ---
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
});
