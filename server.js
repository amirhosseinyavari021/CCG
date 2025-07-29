const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

app.post('/api/proxy', async (req, res) => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API Key not configured' });
    }

    const { messages } = req.body;
    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const modelName = 'meta-llama/llama-3.1-8b-instruct';

    const payload = {
      model: modelName,
      messages: messages,
      stream: true, // Force streaming for all requests
    };

    const apiResponse = await axios.post(
      openRouterUrl,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        responseType: 'stream' // Tell axios to expect a stream
      }
    );

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Pipe the response from OpenRouter directly to the client
    apiResponse.data.pipe(res);

    apiResponse.data.on('error', (err) => {
      console.error('Stream pipe error:', err);
      if (!res.headersSent) {
        res.status(500).send('Stream error');
      }
      res.end();
    });

  } catch (error) {
    console.error('Proxy Error:', error.response ? error.response.data.error : error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: error.response ? error.response.data.error : { message: 'An error occurred on the server.' }});
    }
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
