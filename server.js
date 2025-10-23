import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { routeRequest } from './server/aiRouter.js'; // <-- NEW: Import the AI router

// Load .env variables
dotenv.config();

// --- ES Module equivalents for __dirname ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

// --- Rate Limiter ---
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// --- Enhanced Logging Middleware ---
app.use('/api/', (req, res, next) => {
  req.startTime = Date.now();
  req.sessionId = crypto.randomBytes(8).toString('hex');
  req.logContext = {
    timestamp: new Date().toISOString(),
    sessionId: req.sessionId,
    userId: crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex').slice(0, 16),
    userAgent: req.headers['user-agent'],
    endpoint: req.path
  };

  console.log(JSON.stringify({
    ...req.logContext,
    event: 'api_request_start',
    method: req.method,
  }));

  next();
});

// --- Analytics Endpoint (Unchanged) ---
app.post('/api/ping', (req, res) => {
  const { event, source } = req.body || {};
  console.log(JSON.stringify({
    ...req.logContext,
    event: 'analytics_ping',
    analyticsEvent: event,
    source: source,
  }));
  res.status(200).send({ status: 'ok' });
});

// --- REFACTORED: Unified API Handler ---
const handleApiRequest = async (req, res) => {
  try {
    // 1. Get the 'prompt' object from the client
    const { prompt } = req.body;

    if (!prompt || !prompt.id || !prompt.variables) {
      const errorLog = { ...req.logContext, event: 'api_error', error: 'INVALID_PAYLOAD', message: 'Missing or invalid prompt object' };
      console.error(JSON.stringify(errorLog));
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'Request payload is missing the "prompt" object.' } });
    }

    // 2. Log the request
    const requestLog = {
      ...req.logContext,
      event: 'command_generation_start',
      mode: prompt.variables.mode || 'unknown',
      promptId: prompt.id,
    };
    console.log(JSON.stringify(requestLog));

    // 3. Delegate the entire AI call to the new router
    // The router handles logic for local vs. OpenAI, transforms the prompt,
    // and returns the final string.
    const aiContent = await routeRequest(prompt);

    // 4. Log success
    const successLog = {
      ...req.logContext,
      event: 'command_generation_complete',
      mode: prompt.variables.mode,
      responseTime: Date.now() - req.startTime,
      success: true
    };
    console.log(JSON.stringify(successLog));

    // 5. Send the final string output to the client
    res.json({ output: aiContent });

  } catch (error) {
    // This catches errors from the aiRouter (e.g., API key issue, network error)
    const errorLog = {
      ...req.logContext,
      event: 'api_proxy_error',
      error: error.message,
      statusCode: 500, // Generic server error for AI failures
      responseTime: Date.now() - req.startTime,
      success: false
    };
    console.error(JSON.stringify(errorLog));

    res.status(500).json({ error: { code: `AI_REQUEST_FAILED`, message: error.message } });
  }
};

// --- API Routes (Point to the same handler) ---
app.post('/api/ccg', handleApiRequest);
// --- REMOVED /api/ccg-backup route ---


// --- Static File Serving (Unchanged) ---
const staticPath = path.join(__dirname, 'client/build');
app.use(express.static(staticPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Web interface not found. API is running correctly.');
    }
  });
});

// --- Server Start ---
const PORT = process.env.PORT || 50000;
app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
  console.log(JSON.stringify({
    event: 'server_start',
    port: PORT,
    timestamp: new Date().toISOString(),
    version: process.env.VERSION || '3.0.0'
  }));
});