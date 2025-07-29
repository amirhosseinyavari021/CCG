const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();

app.set('trust proxy', 1);

// Middleware
app.use(express.json());

app.post('/api/proxy', async (req, res) => {
  try {
    // 1. Get your API Key from environment variables
    const apiKey = process.env.API_KEY; 

    if (!apiKey) {
      console.error('API Key is missing!');
      return res.status(500).json({ error: 'API Key not configured' });
    }
    
    // 2. Get the original messages from the client
    const { messages, response_format } = req.body;
    
    // 3. Define the OpenRouter URL and the model name
    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const modelName = 'meta-llama/llama-3.1-8b-instruct'; // Your chosen model

    // 4. Create the payload for OpenRouter
    const payload = {
      model: modelName,
      messages: messages, // Send the original messages array
    };
    
    // OpenRouter uses streaming by default if you add "stream: true"
    // For simplicity, we'll handle JSON and Text responses without client-side streaming for now.
    const response = await axios.post(
      openRouterUrl,
      payload,
      {
        headers: {
          // 5. Add the Authorization header
          'Authorization': `Bearer ${apiKey}` 
        }
      }
    );

    // 6. Extract the content and send it back to the client
    const content = response.data.choices[0].message.content;
    res.json({ content: content });

  } catch (error) {
    // Log the detailed error from the API
    console.error('Proxy Error:', error.response ? error.response.data : error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'An error occurred on the server.' });
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
