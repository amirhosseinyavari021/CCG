const express = require('express');
const path = require('path');
const axios = require('axios/dist/node/axios.cjs');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

// --- API Key Check on Startup ---
const apiKey = process.env.API_KEY; // Using the standard 'API_KEY' name
if (apiKey) {
    console.log("✅ API_KEY loaded successfully from environment variables.");
} else {
    console.error("❌ CRITICAL: API_KEY environment variable not found on the server!");
}

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // Increased limit slightly
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

app.post('/api/proxy', async (req, res) => {
  if (!apiKey) {
    return res.status(500).json({ error: { code: 'SERVER_CONFIG_ERROR', message: 'API key is not configured on the server. The administrator has been notified.' } });
  }

  try {
    const { messages } = req.body;
    if (!messages) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'Request payload is missing "messages" field.' } });
    }

    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    // Using a reliable and free model
    const payload = { model: 'openai/gpt-3.5-turbo', messages, stream: true };

    const apiResponse = await axios.post(openRouterUrl, payload, {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://cmdgen.onrender.com', // Optional: Referer for tracking
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

// Serve static files for the web version
const staticPath = path.join(__dirname, 'client/build');
app.use(express.static(staticPath));

// Fallback for SPA (Single Page Application)
app.get('*', (req, res) => {
    const indexPath = path.join(staticPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        // If index.html doesn't exist, it means this is an API-only service.
        res.status(404).send('Web interface not found. API is running correctly.');
      }
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
});
