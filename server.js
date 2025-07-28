const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const app = express();

app.set('trust proxy', 1);

// Middleware
app.use(express.json());

app.post('/api/proxy', async (req, res) => {
  try {
    const { messages, response_format } = req.body;
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API Key not configured' });
    }
    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid request payload' });
    }

    const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
    const userMessage = messages.find(m => m.role === 'user')?.content || '';

    const payload = {
      contents: [{ parts: [{ text: userMessage }] }],
      system_instruction: { parts: [{ text: systemInstruction }] }
    };

    const isJsonResponse = response_format?.type === 'json_object';
    if (isJsonResponse) {
        payload.generationConfig = { response_mime_type: 'application/json' };
    }

    // ============== تغییر فقط در این خط =================
    const apiModel = 'gemini-1.5-pro'; // <-- از flash به pro تغییر کرد
    // =====================================================

    const endpoint = isJsonResponse ? 'generateContent' : 'streamGenerateContent';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:${endpoint}?key=${apiKey}`;

    if (isJsonResponse) {
        const response = await axios.post(url, payload);
        const content = response.data.candidates[0].content.parts[0].text;
        res.json({ content });
    } else {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        const googleResponse = await axios.post(url, payload, { responseType: 'stream' });

        googleResponse.data.on('data', (chunk) => {
            const textMatch = chunk.toString().match(/"text":\s*"(.*?)"/);
            if (textMatch && textMatch[1]) {
                const decodedText = JSON.parse(`"${textMatch[1]}"`);
                res.write(decodedText);
            }
        });

        googleResponse.data.on('end', () => res.end());
        googleResponse.data.on('error', () => res.end());
    }

  } catch (error) {
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
