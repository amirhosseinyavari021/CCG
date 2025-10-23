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


// --- NEW UNIFIED API HANDLER ---
// This function handles all AI requests
const handleApiRequest = async (req, res) => {
  if (!apiKey) {
    const errorLog = { ...req.logContext, event: 'api_error', error: 'SERVER_CONFIG_ERROR', message: 'API key not configured' };
    console.error(JSON.stringify(errorLog));
    return res.status(500).json({ error: { code: 'SERVER_CONFIG_ERROR', message: 'API key is not configured on the server.' } });
  }

  try {
    // 1. Get the new 'prompt' object from the client request
    const { prompt } = req.body;

    if (!prompt || !prompt.id || !prompt.variables) {
      const errorLog = { ...req.logContext, event: 'api_error', error: 'INVALID_PAYLOAD', message: 'Missing or invalid prompt object' };
      console.error(JSON.stringify(errorLog));
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'Request payload is missing the "prompt" object.' } });
    }

    // 2. Log the new request structure
    const requestLog = {
      ...req.logContext,
      event: 'command_generation_start',
      mode: prompt.variables.mode || 'unknown',
      promptId: prompt.id,
    };
    console.log(JSON.stringify(requestLog));

    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

    // 3. Create the payload for OpenRouter
    // We combine the required model with the new prompt object
    // We set stream: false, as the new client expects a single response
    const payload = {
      model: 'openai/gpt-oss-20b:free',
      prompt,
      stream: false // <-- IMPORTANT: Changed to non-streaming
    };

    // 4. Make the non-streaming call to the AI provider
    const apiResponse = await axios.post(openRouterUrl, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://ccg.cando.ac/', // <-- MODIFIED
        'X-Title': 'AY-CMDGEN',
      },
      timeout: 15000 // 15 second timeout
    });

    // 5. Extract the content from the non-streaming response
    // (Adjust this path if OpenRouter's 'prompt' response is different)
    const aiContent = apiResponse.data.choices[0].message.content;

    // 6. Log success and send response back in the format apiService.js expects
    const successLog = {
      ...req.logContext,
      event: 'command_generation_complete',
      mode: prompt.variables.mode,
      responseTime: Date.now() - req.startTime,
      success: true
    };
    console.log(JSON.stringify(successLog));

    // 7. Send the final string output to the client
    res.json({ output: aiContent });

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
};

// --- NEW: Define the API routes
app.post('/api/ccg', handleApiRequest);
app.post('/api/ccg-backup', handleApiRequest); // Alias route points to the same handler


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

const PORT = process.env.PORT || 50000;
app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
  console.log(JSON.stringify({
    event: 'server_start',
    port: PORT,
    timestamp: new Date().toISOString(),
    version: '2.9.5'
  }));
});