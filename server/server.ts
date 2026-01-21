// Cache bust: 2026-01-17T02:37:46Z
import path from 'path';
import { existsSync } from 'fs';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { GoogleGenAI } from '@google/genai';
import { redis } from './lib/redis';
import { requestIdMiddleware } from './lib/requestId';
import { GatewayError, formatErrorResponse } from './lib/errors';
import { uploadImageToStorage } from './lib/storageUpload';
import analysisRouter from './routes/analysis';
import agentSessionRouter from './routes/agentSession';
import agentToolsRouter from './routes/agentTools';
import elevenLabsWebhookRouter from './routes/elevenLabsWebhook';
import transitsRouter from './routes/transits';
import { validateEnv } from './lib/envCheck'; // S1-T05
import { performHealthCheck, simpleHealthCheck } from './lib/healthCheck';
import './workers/reportWorker'; // Start background worker

dotenv.config();
validateEnv(); // Fail fast if config invalid

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error('[FATAL] SESSION_SECRET not set. Server cannot start without session secret.');
}

const app = express();
const PORT = process.env.PORT || 8787;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Rate Limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-ignore - Valid ioredis call signature
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  message: (req: express.Request, res: express.Response) => {
    return formatErrorResponse(new GatewayError('RATE_LIMIT_EXCEEDED', 'Too many requests, please try again later.', 429), req.id as string);
  }
});

const symbolLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Limit each IP to 5 symbol generations per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-ignore - Valid ioredis call signature
    sendCommand: (...args: string[]) => redis.call(...args),
    prefix: 'rl:symbol:' // Separate prefix for this limiter
  }),
  message: (req: express.Request, res: express.Response) => {
    return formatErrorResponse(new GatewayError('RATE_LIMIT_EXCEEDED', 'Symbol generation limit reached. Please try again later.', 429), req.id as string);
  }
});

// CORS Configuration - Railway optimized
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:8787',
  'http://127.0.0.1:3000',
  ...(process.env.RAILWAY_PUBLIC_DOMAIN ? [`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`] : []),
  ...(process.env.RAILWAY_STATIC_URL ? [process.env.RAILWAY_STATIC_URL] : []),
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);

    // In development, allow all localhost
    if (!IS_PRODUCTION && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }

    // Check against allowed origins
    if (ALLOWED_ORIGINS.some(allowed => origin.includes(allowed.replace(/^https?:\/\//, '')))) {
      return callback(null, true);
    }

    // In production, allow Railway domains
    if (IS_PRODUCTION && origin.includes('.railway.app')) {
      return callback(null, true);
    }

    // Log rejected origins in production for debugging
    if (IS_PRODUCTION) {
      console.warn(JSON.stringify({ type: 'cors_rejected', origin }));
    }

    // Fallback: allow in development, reject in production
    callback(IS_PRODUCTION ? new Error('CORS not allowed') : null, !IS_PRODUCTION);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
const jsonParser = express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
});

const elevenLabsRawParser = express.raw({
  type: '*/*',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
});

app.use('/api/webhooks/elevenlabs', elevenLabsRawParser);
app.use((req, res, next) => {
  if (req.path.startsWith('/api/webhooks/elevenlabs')) {
    return next();
  }
  return jsonParser(req, res, next);
});
app.use(requestIdMiddleware);
app.use(globalLimiter); // Apply global rate limiter

// Structured logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(JSON.stringify({
      type: 'request',
      id: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: Date.now() - start
    }));
  });
  next();
});

// Health check endpoints
// Simple health check for Railway (fast response)
app.get('/health', async (req, res) => {
  const health = await simpleHealthCheck();
  res.json({ ...health, request_id: req.id });
});

// Detailed health check for monitoring
app.get('/health/detailed', async (req, res) => {
  try {
    const health = await performHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json({ ...health, request_id: req.id });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Health check failed',
      request_id: req.id
    });
  }
});

// Readiness check (for Railway deployment validation)
app.get('/ready', async (req, res) => {
  try {
    const health = await performHealthCheck();
    if (health.status === 'unhealthy') {
      res.status(503).json({ ready: false, reason: 'Service unhealthy', request_id: req.id });
    } else {
      res.json({ ready: true, status: health.status, request_id: req.id });
    }
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error instanceof Error ? error.message : 'Readiness check failed',
      request_id: req.id
    });
  }
});

// Gemini client
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.warn(JSON.stringify({ type: 'warning', message: 'GEMINI_API_KEY not set' }));
}
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// Symbol generation endpoint (existing, updated with error handling)
app.post('/api/symbol', symbolLimiter, async (req, res) => {
  const { prompt, style, mode } = req.body;

  if (!ai) {
    const error = new GatewayError('MISSING_API_KEY', 'Server configuration error: Missing API Key', 500);
    res.status(error.statusCode).json(formatErrorResponse(error, req.id));
    return;
  }

  const startTime = Date.now();

  try {
    let finalPrompt = prompt || "";

    if (style) {
      const influenceText = style === 'western'
        ? "WEIGHTING: Prioritize Western Zodiac geometry and Solar signatures."
        : style === 'eastern'
          ? "WEIGHTING: Prioritize Ba Zi symbols and the Year Animal's essence."
          : "WEIGHTING: Achieve a perfect 50/50 equilibrium between Western and Eastern.";

      finalPrompt += `
        CORE DIRECTIVE:
        - System Influence: ${influenceText}
        - Background: ${mode === 'transparent' ? 'PURE WHITE or TRANSPARENT background.' : 'Clean, high-end editorial background.'}
      `;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [{ text: finalPrompt }],
      config: { responseMimeType: 'application/json' }
    });

    const candidates = response.candidates;
    let imageBase64 = null;
    let mimeType = 'image/png';

    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          imageBase64 = part.inlineData.data;
          mimeType = part.inlineData.mimeType || 'image/png';
          break;
        }
      }
    }

    if (imageBase64) {
      // Try to upload to Supabase Storage
      const uploadResult = await uploadImageToStorage(imageBase64, mimeType, 'symbols');

      res.json({
        // Return storage URL if available, otherwise fall back to data URL
        imageUrl: uploadResult?.url || `data:${mimeType};base64,${imageBase64}`,
        imageDataUrl: `data:${mimeType};base64,${imageBase64}`, // Keep for backwards compatibility
        storagePath: uploadResult?.path || null,
        durationMs: Date.now() - startTime,
        engine: 'proxy-gemini',
        request_id: req.id
      });
    } else {
      const error = new GatewayError('NO_IMAGE_DATA', 'No image data generated', 500);
      res.status(error.statusCode).json(formatErrorResponse(error, req.id));
    }

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const error = new GatewayError('GENERATION_FAILED', message, 500);
    res.status(error.statusCode).json(formatErrorResponse(error, req.id));
  }
});

// Routes
app.use('/api/analysis', analysisRouter);
app.use('/api/agent/session', agentSessionRouter);
app.use('/api/agent/tools', agentToolsRouter);
app.use('/api/webhooks/elevenlabs', elevenLabsWebhookRouter);
app.use('/api/transits', transitsRouter);

// --- STATIC FILE SERVING (Production) ---
// In production, serve the built frontend from the dist folder
const distPath = path.join(process.cwd(), 'dist');

if (process.env.NODE_ENV === 'production') {
  console.log(JSON.stringify({
    type: 'startup_info',
    message: 'Checking for static files',
    path: distPath,
    exists: existsSync(distPath)
  }));

  if (existsSync(distPath)) {
    console.log(JSON.stringify({ type: 'info', message: `Serving static files from ${distPath}` }));

    // Serve static assets
    app.use(express.static(distPath, {
      maxAge: '1d',
      etag: true
    }));

    // SPA Fallback
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();

      const indexPath = path.join(distPath, 'index.html');
      if (existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error(JSON.stringify({ type: 'error', message: 'index.html not found in dist', path: indexPath }));
        res.status(404).send('Frontend not found. Please check build.');
      }
    });
  } else {
    console.warn(JSON.stringify({ type: 'warning', message: `dist folder not found at ${distPath}. Did you run npm run build?` }));

    // Fallback if dist is missing but health check needs to pass
    app.get('/', (req, res) => {
      res.status(200).send('Server is running, but dist/ folder is missing. Check Docker build stage.');
    });
  }
}

// Global error handler
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'Unknown error';
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(JSON.stringify({ type: 'error', id: req.id, error: message, stack }));
  const gatewayError = err instanceof GatewayError ? err : new GatewayError('INTERNAL_ERROR', 'Internal server error', 500);
  res.status(gatewayError.statusCode).json(formatErrorResponse(gatewayError, req.id));
});

const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(JSON.stringify({ type: 'startup', message: `Gateway running on port ${PORT}` }));
});

// Graceful shutdown handling for Railway deployment updates
const shutdown = async (signal: string) => {
  console.log(JSON.stringify({ type: 'shutdown', signal, message: 'Shutting down gracefully...' }));

  // Stop accepting new connections
  server.close(() => {
    console.log(JSON.stringify({ type: 'shutdown', message: 'HTTP server closed' }));
  });

  // Close Redis connection if it exists
  if (redis && typeof redis.quit === 'function') {
    try {
      await redis.quit();
      console.log(JSON.stringify({ type: 'shutdown', message: 'Redis connection closed' }));
    } catch (err) {
      console.error(JSON.stringify({ type: 'shutdown_error', message: 'Redis shutdown error', error: err instanceof Error ? err.message : 'Unknown error' }));
    }
  }

  // Give pending requests time to complete
  setTimeout(() => {
    console.log(JSON.stringify({ type: 'shutdown', message: 'Forcing exit after timeout' }));
    process.exit(0);
  }, 10000); // 10 second timeout
};

// Listen for termination signals (Railway sends SIGTERM on deployments)
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
