const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

app.post('/api/proxy', async (req, res) => {
  console.log('Received a request at /api/proxy');

  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error('CRITICAL: API_KEY is not configured on the server.');
      return res.status(500).json({ error: { message: 'API Key not configured' } });
    }

    const { messages } = req.body;
    if (!messages) {
      console.error('Bad Request: No messages in payload.');
      return res.status(400).json({ error: { message: 'Invalid request payload' } });
    }

    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    
    // --- MODEL UPGRADE FOR MAXIMUM QUALITY ---
    // Using OpenAI's GPT-4.1 for the highest quality and most reliable responses.
    const modelName = 'openai/gpt-4.1-turbo'; // Using the specific turbo version for best performance

    const payload = {
      model: modelName,
      messages: messages,
      stream: true,
    };

    console.log(`Sending request to OpenRouter with new model: ${modelName}`);

    const apiResponse = await axios.post(
      openRouterUrl,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://cmdgen.onrender.com', 
          'X-Title': 'CMDGEN',
        },
        responseType: 'stream'
      }
    );

    console.log('Successfully connected to OpenRouter, streaming response.');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    apiResponse.data.pipe(res);

    apiResponse.data.on('error', (err) => {
      console.error('Stream pipe error during streaming:', err);
      if (!res.headersSent) {
        res.status(500).send('Stream error');
      }
      res.end();
    });

  } catch (error) {
    if (error.response) {
      console.error('Proxy Error from OpenRouter:', error.response.status, error.response.data);
      if (!res.headersSent) {
        res.status(error.response.status).json({ error: error.response.data.error || { message: 'Error from OpenRouter' }});
      }
    } else {
      console.error('Generic Proxy Error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: 'An internal server error occurred.' } });
      }
    }
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} using model: openai/gpt-4.1-turbo`);
});
