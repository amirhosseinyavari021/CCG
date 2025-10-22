const express = require('express');
const path = require('path');
const axios = require('axios/dist/node/axios.cjs');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { spawn } = require('child_process'); // For new /api/execute
const fs = require('fs-extra'); // For new /api/execute
const os = require('os'); // For new /api/execute

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
  max: 30, // Shared limit for all /api/ endpoints
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
    body: req.path === '/proxy' ? { messageCount: req.body?.messages?.length || 0 } :
      req.path === '/execute' ? { language: req.body?.language, codeLength: req.body?.code?.length || 0 } : req.body
  }));

  next();
});
// ------------------------------------

// --- ENHANCED Analytics Endpoint ---
app.post('/api/ping', (req, res) => {
  console.log(JSON.stringify({
    ...req.logContext,
    event: 'analytics_ping',
    analyticsEvent: req.body?.event,
    source: req.body?.source,
  }));
  res.status(200).send({ status: 'ok' });
});
// ------------------------------------

// --- ENHANCED API Proxy (for AI calls) ---
app.post('/api/proxy', async (req, res) => {
  if (!apiKey) {
    const errorLog = { ...req.logContext, event: 'api_error', error: 'SERVER_CONFIG_ERROR', message: 'API key not configured' };
    console.error(JSON.stringify(errorLog));
    return res.status(500).json({ error: { code: 'SERVER_CONFIG_ERROR', message: 'API key is not configured on the server.' } });
  }

  try {
    const { messages } = req.body;
    if (!messages) {
      const errorLog = { ...req.logContext, event: 'api_error', error: 'INVALID_PAYLOAD', message: 'Missing messages field' };
      console.error(JSON.stringify(errorLog));
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'Request payload is missing "messages" field.' } });
    }

    const systemMessage = messages.find(m => m.role === 'system');
    const userMessage = messages.find(m => m.role === 'user');

    // Determine mode from system prompt content
    const systemContent = systemMessage?.content || '';
    let mode = 'unknown';
    if (systemContent.includes('MISSION:** Provide 3')) mode = 'generate';
    else if (systemContent.includes('MISSION:** Generate a complete, executable script')) mode = 'script';
    else if (systemContent.includes('MISSION:** Analyze the user\'s command/script')) mode = 'explain';
    else if (systemContent.includes('MISSION:** Analyze the user\'s error message')) mode = 'error';
    else if (systemContent.includes('MISSION:** Detect the language')) mode = 'detect-lang';
    else if (systemContent.includes('MISSION:** Explain this code:')) mode = 'explain-code';
    else if (systemContent.includes('MISSION:** Analyze this error.')) mode = 'analyze-error';
    else if (systemContent.includes('MISSION:** Fix this code.')) mode = 'auto-fix';
    else if (systemContent.includes('MISSION:** Provide a learning-mode trace')) mode = 'learning-mode';
    else if (systemContent.includes('MISSION:** Review this code:')) mode = 'review-code';
    else if (systemContent.includes('MISSION:** Visualize this code\'s flow')) mode = 'visualize-flow';
    else if (systemContent.includes('MISSION:** Analyze this code for safety:')) mode = 'safety-check';
    else if (systemContent.includes('MISSION:** Provide suggestions for this code:')) mode = 'suggestions';


    const requestLog = {
      ...req.logContext,
      event: 'ai_request_start',
      mode: mode,
      userPrompt: userMessage?.content?.substring(0, 100) + (userMessage?.content?.length > 100 ? '...' : ''),
    };
    console.log(JSON.stringify(requestLog));

    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const payload = { model: 'openai/gpt-3.5-turbo', messages, stream: true };

    const apiResponse = await axios.post(openRouterUrl, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://cmdgen.onrender.com',
        'X-Title': 'AY-CMDGEN',
      },
      responseType: 'stream'
    });

    res.setHeader('Content-Type', 'text/event-stream');
    let responseChunks = 0;

    apiResponse.data.on('data', (chunk) => {
      responseChunks++;
      res.write(chunk);
    });

    apiResponse.data.on('end', () => {
      const successLog = { ...req.logContext, event: 'ai_request_complete', mode: mode, responseTime: Date.now() - req.startTime, responseChunks, success: true };
      console.log(JSON.stringify(successLog));
      res.end();
    });

    apiResponse.data.on('error', (streamError) => {
      const errorLog = { ...req.logContext, event: 'api_stream_error', error: streamError.message, responseTime: Date.now() - req.startTime };
      console.error(JSON.stringify(errorLog));
      res.end();
    });

  } catch (error) {
    const errorLog = { ...req.logContext, event: 'api_proxy_error', error: error.message, statusCode: error.response?.status || 500, responseTime: Date.now() - req.startTime, success: false };
    console.error(JSON.stringify(errorLog));
    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({ error: { code: `PROXY_ERROR_${statusCode}`, message: error.message } });
  }
});

// --- NEW Smart Compiler Execute Endpoint ---
app.post('/api/execute', async (req, res) => {
  const { code, language } = req.body;
  const logContext = { ...req.logContext, event: 'code_execution_start', language };
  console.log(JSON.stringify(logContext));

  if (!code || !language) {
    const errorLog = { ...logContext, event: 'code_execution_error', error: 'INVALID_PAYLOAD', message: 'Missing code or language' };
    console.error(JSON.stringify(errorLog));
    return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'Request must include "code" and "language" fields.' } });
  }

  // --- DANGER: This section executes untrusted code. ---
  // --- A real production app MUST use a secure, isolated sandbox (e.g., Docker). ---
  console.warn(JSON.stringify({ ...logContext, event: 'security_warning', message: 'Executing untrusted code directly on server. THIS IS NOT PRODUCTION SAFE.' }));

  let cmd, args, ext;
  const lang = language.toLowerCase();

  if (lang.includes('python')) {
    cmd = 'python3';
    ext = '.py';
    args = [];
  } else if (lang.includes('javascript')) {
    cmd = 'node';
    ext = '.js';
    args = [];
  } else if (lang.includes('bash') || lang.includes('shell')) {
    cmd = 'bash';
    ext = '.sh';
    args = [];
  } else if (lang.includes('powershell')) {
    cmd = 'pwsh'; // Assumes PowerShell 7+ is installed
    ext = '.ps1';
    args = ['-File'];
  } else {
    const errorLog = { ...logContext, event: 'code_execution_error', error: 'UNSUPPORTED_LANGUAGE', message: `Language ${language} not supported for execution` };
    console.error(JSON.stringify(errorLog));
    return res.status(400).json({ error: { code: 'UNSUPPORTED_LANGUAGE', message: `Execution for ${language} is not supported.` } });
  }

  const tempDir = path.join(os.tmpdir(), 'ccg-exec', req.sessionId);
  const tempFile = path.join(tempDir, `script${ext}`);

  try {
    await fs.ensureDir(tempDir);
    await fs.writeFile(tempFile, code);

    if (ext === '.sh') {
      await fs.chmod(tempFile, 0o755); // Make shell script executable
    }

    args.push(tempFile);

    let stdout = '';
    let stderr = '';
    const child = spawn(cmd, args, { timeout: 10000 }); // 10 second timeout

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', async (code) => {
      await fs.remove(tempDir); // Clean up

      if (code === 0) {
        const successLog = { ...logContext, event: 'code_execution_complete', success: true, responseTime: Date.now() - req.startTime, outputLength: stdout.length };
        console.log(JSON.stringify(successLog));
        res.status(200).json({ success: true, output: stdout || 'Script executed successfully.' });
      } else {
        const errorLog = { ...logContext, event: 'code_execution_complete', success: false, responseTime: Date.now() - req.startTime, errorCode: code, error: stderr };
        console.error(JSON.stringify(errorLog));
        res.status(200).json({ success: false, error: stderr || `Process exited with code ${code}` });
      }
    });

    child.on('error', async (err) => {
      await fs.remove(tempDir); // Clean up
      const errorLog = { ...logContext, event: 'code_execution_error', error: 'PROCESS_SPAWN_ERROR', message: err.message, responseTime: Date.now() - req.startTime };
      console.error(JSON.stringify(errorLog));
      res.status(500).json({ success: false, error: `Failed to start process: ${err.message}` });
    });

  } catch (err) {
    await fs.remove(tempDir); // Clean up
    const errorLog = { ...logContext, event: 'code_execution_error', error: 'FILE_SYSTEM_ERROR', message: err.message, responseTime: Date.now() - req.startTime };
    console.error(JSON.stringify(errorLog));
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: `Server file error: ${err.message}` } });
  }
  // ---------------- End of DANGER section ----------------
});


// --- Static File Serving ---
const staticPath = path.join(__dirname, 'client/build');
app.use(express.static(staticPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return; // Don't let static handler catch API routes
  const indexPath = path.join(staticPath, 'index.html');
  res.sendFile(indexPath, (err) => {
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
    version: '2.9.0' // This should be from package.json
  }));
});