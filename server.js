const express = require('express');
const path = require('path');
const axios = require('axios/dist/node/axios.cjs');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

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
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// --- ENHANCED LOGGING MIDDLEWARE ---
// Adds structured logging context to all API requests
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

  // Log incoming request
  console.log(JSON.stringify({
    ...req.logContext,
    event: 'api_request_start',
    method: req.method,
    body: req.path === '/proxy' ? { messageCount: req.body?.messages?.length || 0 } : req.body
  }));

  next();
});
// ------------------------------------

// --- ENHANCED Analytics Endpoint ---
app.post('/api/ping', (req, res) => {
  const { event, source } = req.body || {};

  // Structured analytics logging
  console.log(JSON.stringify({
    ...req.logContext,
    event: 'analytics_ping',
    analyticsEvent: event,
    source: source,
    timestamp: new Date().toISOString()
  }));

  res.status(200).send({ status: 'ok' });
});
// ------------------------------------

// --- ENHANCED API Proxy with Complete Logging ---
app.post('/api/proxy', async (req, res) => {
  if (!apiKey) {
    const errorLog = {
      ...req.logContext,
      event: 'api_error',
      error: 'SERVER_CONFIG_ERROR',
      message: 'API key not configured'
    };
    console.error(JSON.stringify(errorLog));
    return res.status(500).json({ error: { code: 'SERVER_CONFIG_ERROR', message: 'API key is not configured on the server.' } });
  }

  try {
    const { messages } = req.body;
    if (!messages) {
      const errorLog = {
        ...req.logContext,
        event: 'api_error',
        error: 'INVALID_PAYLOAD',
        message: 'Missing messages field'
      };
      console.error(JSON.stringify(errorLog));
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'Request payload is missing "messages" field.' } });
    }

    // Extract request details for logging
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessage = messages.find(m => m.role === 'user');

    // Updated mode detection for new compare features
    const systemContent = systemMessage?.content || '';
    let mode = 'unknown';
    if (systemContent.includes('MISSION:** Provide 3')) mode = 'generate';
    else if (systemContent.includes('MISSION:** Generate a complete, executable script')) mode = 'script';
    else if (systemContent.includes('MISSION:** Analyze the user\'s command/script')) mode = 'explain';
    else if (systemContent.includes('MISSION:** Analyze the user\'s error message')) mode = 'error';
    else if (systemContent.includes('MISSION:** Detect the language')) mode = 'detect-lang';
    else if (systemContent.includes('MISSION:** Provide a bulleted list of the logical changes')) mode = 'compare-diff';
    else if (systemContent.includes('MISSION:** Provide a concise review')) mode = 'compare-quality';
    else if (systemContent.includes('MISSION:** Respond with **ONLY** the raw, merged')) mode = 'compare-merge';

    const requestLog = {
      ...req.logContext,
      event: 'command_generation_start', // Keeping event name generic
      mode: mode,
      userPrompt: userMessage?.content?.substring(0, 100) + (userMessage?.content?.length > 100 ? '...' : ''),
      messageCount: messages.length
    };
    console.log(JSON.stringify(requestLog));

    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

    // --- MODIFIED LINE ---
    // Changed model to the free testing model as requested
    const payload = { model: 'openai/gpt-oss-20b:free', messages, stream: true };
    // --- END MODIFICATION ---

    const apiResponse = await axios.post(openRouterUrl, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://cmdgen.onrender.com',
        'X-Title': 'AY-CMDGEN',
      },
      responseType: 'stream'
    });

    res.setHeader('Content-Type', 'text/event-stream');

    // Track response streaming
    let responseChunks = 0;
    let totalResponseLength = 0;

    apiResponse.data.on('data', (chunk) => {
      responseChunks++;
      totalResponseLength += chunk.length;
      res.write(chunk);
    });

    apiResponse.data.on('end', () => {
      // Log successful completion
      const successLog = {
        ...req.logContext,
        event: 'command_generation_complete',
        mode: mode,
        responseTime: Date.now() - req.startTime,
        responseChunks: responseChunks,
        responseLength: totalResponseLength,
        success: true
      };
      console.log(JSON.stringify(successLog));
      res.end();
    });

    apiResponse.data.on('error', (streamError) => {
      const errorLog = {
        ...req.logContext,
        event: 'api_stream_error',
        error: streamError.message,
        responseTime: Date.now() - req.startTime
      };
      console.error(JSON.stringify(errorLog));
      res.end();
    });

  } catch (error) {
    const errorLog = {
      ...req.logContext,
      event: 'api_proxy_error',
      error: error.message,
      statusCode: error.response?.status || 500,
      responseTime: Date.now() - req.startTime,
      success: false
    };
    console.error(JSON.stringify(errorLog));

    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({ error: { code: `PROXY_ERROR_${statusCode}`, message: error.message } });
  }
});

const staticPath = path.join(__dirname, 'client/build');
app.use(express.static(staticPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Web interface not found. API is running correctly.');
    }
  });
});

const PORT = process.env.PORT || 50000;
app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
  console.log(JSON.stringify({
    event: 'server_start',
    port: PORT,
    timestamp: new Date().toISOString(),
    version: '2.9.4'
  }));
});
