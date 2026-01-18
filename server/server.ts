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
import './workers/reportWorker'; // Start background worker

dotenv.config();
validateEnv(); // Fail fast if config invalid

const app = express();
const PORT = process.env.PORT || 8787;

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

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Allow any localhost origin for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    // Fallback for other origins
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', request_id: req.id });
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

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(JSON.stringify({ type: 'startup', message: `Gateway running on port ${PORT}` }));
});
