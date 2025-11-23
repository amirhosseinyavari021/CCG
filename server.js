import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { routeRequest } from './server/aiRouter.js';
import authRoutes from './server/routes/authRoutes.js';
import { requireAuth } from './server/middleware/auth.js';
import { usageLimit } from './server/middleware/usageLimit.js';
import { domainGuard } from './server/middleware/domainGuard.js';

dotenv.config();

// --- ES Module dirname shim ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  MONGO_URI,
  PORT: ENV_PORT
} = process.env;

// --- MongoDB connection ---
if (!MONGO_URI) {
  console.warn('⚠️ MONGO_URI is not set. MongoDB will not be connected and auth will fail.');
} else {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => {
      console.error('❌ MongoDB connection error:', err.message);
    });
}

const app = express();

// --- Basic middleware ---
app.use(express.json({ limit: '1mb' }));

// Simple request context logging
app.use((req, res, next) => {
  req.startTime = Date.now();
  req.requestId = crypto.randomUUID();
  req.logContext = {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    ip: req.ip
  };
  next();
});

// --- Rate limiting for all API routes ---
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// --- Healthcheck ---
app.post('/api/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Simple analytics sink (optional) ---
app.post('/api/analytics', (req, res) => {
  try {
    const { event, source, payload } = req.body || {};
    console.log(JSON.stringify({
      event: event || 'analytics_event',
      source: source || 'web',
      payload: payload || {},
      timestamp: new Date().toISOString()
    }));
  } catch (e) {
    console.error('analytics parse error', e.message);
  }
  res.status(200).json({ status: 'ok' });
});

// --- Auth routes ---
app.use('/api/auth', authRoutes);

// --- Main CCG AI endpoint (protected + freemium + domain guard) ---
app.post('/api/ccg', requireAuth, usageLimit({ maxFreeDaily: 30 }), domainGuard, async (req, res) => {
  try {
    const { prompt } = req.body || {};

    if (!prompt || !prompt.id || !prompt.variables) {
      console.error(JSON.stringify({
        ...req.logContext,
        event: 'api_error',
        code: 'INVALID_PAYLOAD',
        message: 'Missing or invalid prompt object'
      }));
      return res.status(400).json({
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Request payload must include a valid "prompt" object.'
        }
      });
    }

    console.log(JSON.stringify({
      ...req.logContext,
      event: 'ccg_request_start',
      mode: prompt.variables?.mode || 'unknown'
    }));

    const aiContent = await routeRequest(prompt);

    if (req.incrementUsage) {
      await req.incrementUsage();
    }

    console.log(JSON.stringify({
      ...req.logContext,
      event: 'ccg_request_success',
      mode: prompt.variables?.mode || 'unknown',
      responseTimeMs: Date.now() - req.startTime
    }));

    res.json({ output: aiContent });
  } catch (error) {
    console.error(JSON.stringify({
      ...req.logContext,
      event: 'ccg_request_error',
      error: error.message,
      stack: error.stack,
      responseTimeMs: Date.now() - req.startTime
    }));

    res.status(500).json({
      error: {
        code: 'AI_PROXY_ERROR',
        message: 'خطا در پردازش درخواست توسط CCG.'
      }
    });
  }
});

// --- Static hosting for React client (production) ---
const clientBuildPath = path.join(__dirname, 'client', 'build');
app.use(express.static(clientBuildPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      console.error('Error sending index.html:', err.message);
      res.status(404).send('Web interface not found. API is running.');
    }
  });
});

// --- Server Start ---
const PORT = ENV_PORT || 50000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(JSON.stringify({
    event: 'server_start',
    port: PORT,
    timestamp: new Date().toISOString(),
    version: process.env.VERSION || '3.0.9'
  }));
});
