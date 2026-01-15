# Mockup-Free Live MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform demo MVP into production-ready app with real persistence, secure agent integration, and automated reports.

**Architecture:** Gateway backend (Express on Fly.io) as single entry point. Supabase for auth/DB/storage. BaziEngine v2 for calculations. ElevenLabs agents access data via signed tool tokens.

**Tech Stack:** Vite/React 19, Express 5, Supabase (Auth + Postgres + Storage), Playwright (PDF), JWT (session tokens)

---

## Phase 1: Foundation (I0 + I1)

### Task 1: Install New Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Add backend dependencies**

Run:
```bash
npm install @supabase/supabase-js jsonwebtoken uuid
npm install -D @types/jsonwebtoken @types/uuid
```

**Step 2: Verify installation**

Run: `npm ls @supabase/supabase-js jsonwebtoken`
Expected: Shows installed versions

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add supabase, jwt, uuid dependencies"
```

---

### Task 2: Create Error Utilities

**Files:**
- Create: `server/lib/errors.ts`
- Test: `server/lib/errors.test.ts`

**Step 1: Write the failing test**

Create `server/lib/errors.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { GatewayError, formatErrorResponse } from './errors';

describe('GatewayError', () => {
  it('creates error with code and message', () => {
    const error = new GatewayError('ENGINE_UNAVAILABLE', 'BaziEngine is down');
    expect(error.code).toBe('ENGINE_UNAVAILABLE');
    expect(error.message).toBe('BaziEngine is down');
    expect(error.statusCode).toBe(500);
  });

  it('uses custom status code', () => {
    const error = new GatewayError('NOT_FOUND', 'Chart not found', 404);
    expect(error.statusCode).toBe(404);
  });
});

describe('formatErrorResponse', () => {
  it('formats error with request id', () => {
    const error = new GatewayError('TEST_ERROR', 'Test message');
    const response = formatErrorResponse(error, 'req-123');
    expect(response).toEqual({
      error: { code: 'TEST_ERROR', message: 'Test message' },
      request_id: 'req-123'
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- server/lib/errors.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `server/lib/errors.ts`:
```typescript
export class GatewayError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'GatewayError';
  }
}

export interface ErrorResponse {
  error: { code: string; message: string };
  request_id: string;
}

export function formatErrorResponse(error: GatewayError, requestId: string): ErrorResponse {
  return {
    error: { code: error.code, message: error.message },
    request_id: requestId
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- server/lib/errors.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add server/lib/errors.ts server/lib/errors.test.ts
git commit -m "feat: add GatewayError class and formatErrorResponse"
```

---

### Task 3: Create Request ID Middleware

**Files:**
- Create: `server/lib/requestId.ts`
- Test: `server/lib/requestId.test.ts`

**Step 1: Write the failing test**

Create `server/lib/requestId.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { requestIdMiddleware } from './requestId';

describe('requestIdMiddleware', () => {
  it('adds request id to req and response header', () => {
    const req: any = {};
    const res: any = { setHeader: vi.fn() };
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(req.id).toBeDefined();
    expect(req.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.id);
    expect(next).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- server/lib/requestId.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `server/lib/requestId.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.id = randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- server/lib/requestId.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add server/lib/requestId.ts server/lib/requestId.test.ts
git commit -m "feat: add request ID middleware"
```

---

### Task 4: Update Config Defaults to Production-First

**Files:**
- Modify: `src/config.ts`
- Test: `services/config.test.ts` (update existing)

**Step 1: Write the failing test**

Update `services/config.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { DEMO_MODE, FORCE_HAPPY_PATH } from '../src/config';

describe('config defaults', () => {
  it('DEMO_MODE defaults to false (production-first)', () => {
    // Without VITE_DEMO_MODE=true, should be false
    expect(DEMO_MODE).toBe(false);
  });

  it('FORCE_HAPPY_PATH defaults to false (production-first)', () => {
    expect(FORCE_HAPPY_PATH).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- services/config.test.ts`
Expected: FAIL - DEMO_MODE is true

**Step 3: Update config.ts**

Modify `src/config.ts` lines 3-5:
```typescript
// Feature Flags - Production-first defaults
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'; // Default: false
export const FORCE_HAPPY_PATH = import.meta.env.VITE_FORCE_HAPPY_PATH === 'true'; // Default: false
```

**Step 4: Run test to verify it passes**

Run: `npm test -- services/config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/config.ts services/config.test.ts
git commit -m "feat: change config defaults to production-first (no demo mode)"
```

---

### Task 5: Create ErrorCard Component

**Files:**
- Create: `components/ErrorCard.tsx`

**Step 1: Create the component**

Create `components/ErrorCard.tsx`:
```typescript
interface ErrorCardProps {
  title?: string;
  message: string;
  code?: string;
  requestId?: string;
  onRetry?: () => void;
}

export function ErrorCard({
  title = 'Ein Fehler ist aufgetreten',
  message,
  code,
  requestId,
  onRetry
}: ErrorCardProps) {
  return (
    <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6 text-center">
      <h3 className="font-serif text-xl text-red-400 mb-2">{title}</h3>
      <p className="text-sm text-red-300/80 mb-4">{message}</p>

      {(code || requestId) && (
        <div className="text-xs font-mono text-red-400/60 mb-4 space-y-1">
          {code && <div>Code: {code}</div>}
          {requestId && <div>Request-ID: {requestId}</div>}
        </div>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-300 text-sm transition-colors"
        >
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/ErrorCard.tsx
git commit -m "feat: add ErrorCard component for error display"
```

---

### Task 6: Create CI Placeholder Check Script

**Files:**
- Create: `scripts/check-no-placeholders.sh`

**Step 1: Create the script**

Create `scripts/check-no-placeholders.sh`:
```bash
#!/bin/bash
set -e

echo "Checking for forbidden placeholder patterns..."

# Patterns that indicate demo/placeholder code
FORBIDDEN_PATTERNS=(
  "DEMO_MODE\s*=\s*true"
  "FORCE_HAPPY_PATH\s*=\s*true"
  "replace-with-"
  "TODO:.*placeholder"
)

FOUND=0

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  if grep -rE "$pattern" --include="*.ts" --include="*.tsx" src/ services/ components/ server/ 2>/dev/null; then
    echo "ERROR: Found forbidden pattern: $pattern"
    FOUND=1
  fi
done

if [ $FOUND -eq 1 ]; then
  echo ""
  echo "Build blocked: Remove all placeholder patterns before committing."
  exit 1
fi

echo "No placeholder patterns found."
exit 0
```

**Step 2: Make executable**

Run: `chmod +x scripts/check-no-placeholders.sh`

**Step 3: Test the script**

Run: `./scripts/check-no-placeholders.sh`
Expected: Should find current DEMO_MODE/FORCE_HAPPY_PATH defaults (expected to fail until Task 4 is complete)

**Step 4: Commit**

```bash
git add scripts/check-no-placeholders.sh
git commit -m "feat: add CI script to block placeholder patterns"
```

---

### Task 7: Refactor server.ts with Middleware

**Files:**
- Modify: `server/server.ts`

**Step 1: Update server.ts with new structure**

Replace `server/server.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { requestIdMiddleware } from './lib/requestId';
import { GatewayError, formatErrorResponse } from './lib/errors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8787;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);

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
app.post('/api/symbol', async (req, res) => {
  const { prompt, style, mode } = req.body;

  if (!ai) {
    const error = new GatewayError('MISSING_API_KEY', 'Server configuration error: Missing API Key', 500);
    return res.status(error.statusCode).json(formatErrorResponse(error, req.id));
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
      res.json({
        imageDataUrl: `data:${mimeType};base64,${imageBase64}`,
        durationMs: Date.now() - startTime,
        engine: 'proxy-gemini',
        request_id: req.id
      });
    } else {
      const error = new GatewayError('NO_IMAGE_DATA', 'No image data generated', 500);
      res.status(error.statusCode).json(formatErrorResponse(error, req.id));
    }

  } catch (err: any) {
    const error = new GatewayError('GENERATION_FAILED', err.message || 'Internal Server Error', 500);
    res.status(error.statusCode).json(formatErrorResponse(error, req.id));
  }
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(JSON.stringify({ type: 'error', id: req.id, error: err.message, stack: err.stack }));
  const gatewayError = err instanceof GatewayError ? err : new GatewayError('INTERNAL_ERROR', 'Internal server error', 500);
  res.status(gatewayError.statusCode).json(formatErrorResponse(gatewayError, req.id));
});

app.listen(PORT, () => {
  console.log(JSON.stringify({ type: 'startup', message: `Gateway running on port ${PORT}` }));
});
```

**Step 2: Test the server**

Run: `npm run dev:server`
Then in another terminal: `curl http://localhost:8787/health`
Expected: `{"status":"ok","version":"1.0.0","request_id":"<uuid>"}`

**Step 3: Commit**

```bash
git add server/server.ts
git commit -m "refactor: update server.ts with request ID, structured logging, error handling"
```

---

### Task 8: Create Fly.io Configuration

**Files:**
- Create: `fly.toml`
- Create: `Dockerfile`

**Step 1: Create fly.toml**

Create `fly.toml`:
```toml
app = "stellar-onboarding-gateway"
primary_region = "fra"

[build]

[env]
  PORT = "8787"
  NODE_ENV = "production"

[http_service]
  internal_port = 8787
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  path = "/health"
  timeout = "5s"
```

**Step 2: Create Dockerfile**

Create `Dockerfile`:
```dockerfile
FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy server code
COPY server ./server
COPY src/config.ts ./src/config.ts

# Build TypeScript (for production, we'd need a build step)
RUN npm install -g tsx

EXPOSE 8787

CMD ["tsx", "server/server.ts"]
```

**Step 3: Commit**

```bash
git add fly.toml Dockerfile
git commit -m "feat: add Fly.io deployment configuration"
```

---

## Phase 2: Supabase Integration (I4)

### Task 9: Create Supabase Admin Client

**Files:**
- Create: `server/lib/supabaseAdmin.ts`
- Create: `.env.example` (update)

**Step 1: Create supabaseAdmin.ts**

Create `server/lib/supabaseAdmin.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(JSON.stringify({
    type: 'warning',
    message: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set'
  }));
}

export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured');
  }
  return supabaseAdmin;
}
```

**Step 2: Update .env.example**

Modify `.env.example`:
```env
# Gemini
GEMINI_API_KEY=your_google_gemini_api_key_here

# Supabase
SUPABASE_URL=https://ykoijifgweoapitabgxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Session Token
SESSION_SECRET=your_random_32_char_secret_here

# ElevenLabs
ELEVENLABS_TOOL_SECRET=your_tool_webhook_secret_here
VITE_ELEVENLABS_AGENT_ID_LEVI=agent_id_here
VITE_ELEVENLABS_AGENT_ID_VICTORIA=agent_id_here

# Feature Flags (optional, defaults to false)
VITE_DEMO_MODE=false
VITE_FORCE_HAPPY_PATH=false
```

**Step 3: Commit**

```bash
git add server/lib/supabaseAdmin.ts .env.example
git commit -m "feat: add Supabase admin client for server-side operations"
```

---

### Task 10: Create Database Schema Migration

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: Create migrations directory**

Run: `mkdir -p supabase/migrations`

**Step 2: Create schema migration**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
-- Stellar Onboarding MVP Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  locale TEXT DEFAULT 'de-DE',
  email_opt_in BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Charts (BaZi + Western analysis results)
CREATE TABLE IF NOT EXISTS charts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  birth_json JSONB NOT NULL,
  analysis_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Symbols (generated images)
CREATE TABLE IF NOT EXISTS symbols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chart_id UUID NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  prompt TEXT,
  engine_used TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Conversations (ElevenLabs sessions)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chart_id UUID NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
  eleven_conversation_id TEXT,
  agent_id TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- Reports (generated after conversation)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chart_id UUID NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  report_md_url TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Jobs (async pipeline state)
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('report', 'pdf', 'email')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'done', 'failed')),
  payload JSONB,
  error TEXT,
  attempts INT DEFAULT 0,
  next_run_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_charts_user_id ON charts(user_id);
CREATE INDEX IF NOT EXISTS idx_symbols_chart_id ON symbols(chart_id);
CREATE INDEX IF NOT EXISTS idx_conversations_chart_id ON conversations(chart_id);
CREATE INDEX IF NOT EXISTS idx_conversations_eleven_id ON conversations(eleven_conversation_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status_next ON jobs(status, next_run_at) WHERE status IN ('queued', 'processing');
CREATE INDEX IF NOT EXISTS idx_reports_conversation ON reports(conversation_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER charts_updated_at BEFORE UPDATE ON charts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**Step 3: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: add Supabase schema migration"
```

---

### Task 11: Create RLS Policies Migration

**Files:**
- Create: `supabase/migrations/002_rls_policies.sql`

**Step 1: Create RLS policies**

Create `supabase/migrations/002_rls_policies.sql`:
```sql
-- Row Level Security Policies
-- Run this AFTER 001_initial_schema.sql

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE symbols ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read and update own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Charts: users can read own charts (inserts via service role)
CREATE POLICY "Users can read own charts"
  ON charts FOR SELECT
  USING (auth.uid() = user_id);

-- Symbols: users can read own symbols
CREATE POLICY "Users can read own symbols"
  ON symbols FOR SELECT
  USING (auth.uid() = user_id);

-- Conversations: users can read own conversations
CREATE POLICY "Users can read own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

-- Reports: users can read own reports
CREATE POLICY "Users can read own reports"
  ON reports FOR SELECT
  USING (auth.uid() = user_id);

-- Jobs: users can read own job status
CREATE POLICY "Users can read own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);
```

**Step 2: Commit**

```bash
git add supabase/migrations/002_rls_policies.sql
git commit -m "feat: add RLS policies for user data isolation"
```

---

### Task 12: Create Storage Bucket Setup Script

**Files:**
- Create: `supabase/migrations/003_storage_buckets.sql`

**Step 1: Create storage setup**

Create `supabase/migrations/003_storage_buckets.sql`:
```sql
-- Storage buckets for symbols and reports
-- Run in Supabase SQL Editor

-- Create symbols bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('symbols', 'symbols', true)
ON CONFLICT (id) DO NOTHING;

-- Create reports bucket (authenticated read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

-- Symbols: anyone can read, service role can write
CREATE POLICY "Public read symbols"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'symbols');

-- Reports: users can read own reports
CREATE POLICY "Users read own reports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

**Step 2: Commit**

```bash
git add supabase/migrations/003_storage_buckets.sql
git commit -m "feat: add storage bucket configuration for symbols and reports"
```

---

## Phase 3: BaziEngine Integration (I2)

### Task 13: Create BaziEngine Client

**Files:**
- Create: `server/lib/baziEngineClient.ts`
- Test: `server/lib/baziEngineClient.test.ts`

**Step 1: Write the failing test**

Create `server/lib/baziEngineClient.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaziEngineClient } from './baziEngineClient';

describe('BaziEngineClient', () => {
  let client: BaziEngineClient;

  beforeEach(() => {
    client = new BaziEngineClient('https://test-engine.fly.dev');
  });

  it('transforms birth data to engine format', () => {
    const input = {
      date: '1990-05-15',
      time: '14:30',
      tz: 'Europe/Berlin',
      lat: 52.52,
      lon: 13.405,
      place: 'Berlin, DE'
    };

    const result = client.transformBirthData(input);

    expect(result).toEqual({
      date: '1990-05-15',
      time: '14:30',
      lat: 52.52,
      lng: 13.405,
      location: 'Berlin, DE'
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- server/lib/baziEngineClient.test.ts`
Expected: FAIL - module not found

**Step 3: Write implementation**

Create `server/lib/baziEngineClient.ts`:
```typescript
import { GatewayError } from './errors';

export interface BirthInput {
  date: string;
  time: string;
  tz: string;
  lat: number;
  lon: number;
  place: string;
}

export interface EnginePayload {
  date: string;
  time: string;
  lat: number;
  lng: number;
  location: string;
}

export class BaziEngineClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl: string, timeoutMs: number = 8000) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  transformBirthData(input: BirthInput): EnginePayload {
    return {
      date: input.date,
      time: input.time,
      lat: input.lat,
      lng: input.lon,
      location: input.place
    };
  }

  async calculateBazi(payload: EnginePayload): Promise<any> {
    return this.post('/calculate/bazi', payload);
  }

  async calculateWestern(payload: EnginePayload): Promise<any> {
    return this.post('/calculate/western', payload);
  }

  private async post(endpoint: string, payload: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs)
      });

      if (!response.ok) {
        throw new GatewayError(
          'ENGINE_ERROR',
          `BaziEngine returned ${response.status}`,
          502
        );
      }

      return response.json();
    } catch (error: any) {
      if (error instanceof GatewayError) throw error;
      if (error.name === 'TimeoutError') {
        throw new GatewayError('ENGINE_TIMEOUT', 'BaziEngine request timed out', 504);
      }
      throw new GatewayError('ENGINE_UNAVAILABLE', 'BaziEngine unreachable', 503);
    }
  }
}

// Default instance
export const baziEngine = new BaziEngineClient(
  process.env.BAZI_ENGINE_URL || 'https://baziengine-v2.fly.dev'
);
```

**Step 4: Run test to verify it passes**

Run: `npm test -- server/lib/baziEngineClient.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add server/lib/baziEngineClient.ts server/lib/baziEngineClient.test.ts
git commit -m "feat: add BaziEngine client with timeout and error handling"
```

---

### Task 14: Create Analysis Route

**Files:**
- Create: `server/routes/analysis.ts`

**Step 1: Create the route**

Create `server/routes/analysis.ts`:
```typescript
import { Router, Request, Response } from 'express';
import { baziEngine, BirthInput } from '../lib/baziEngineClient';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';
import { GatewayError, formatErrorResponse } from '../lib/errors';

const router = Router();

interface AnalysisRequest {
  birth: BirthInput;
  user_id?: string; // Optional: for authenticated requests
}

router.post('/', async (req: Request, res: Response) => {
  const { birth, user_id } = req.body as AnalysisRequest;

  // Validate input
  if (!birth || !birth.date || !birth.time || !birth.lat || !birth.lon) {
    const error = new GatewayError('INVALID_INPUT', 'Missing required birth data fields', 400);
    return res.status(error.statusCode).json(formatErrorResponse(error, req.id));
  }

  try {
    // Transform to engine format
    const enginePayload = baziEngine.transformBirthData(birth);

    // Call both engines in parallel
    const [baziResult, westernResult] = await Promise.all([
      baziEngine.calculateBazi(enginePayload),
      baziEngine.calculateWestern(enginePayload)
    ]);

    // Combine results
    const analysis = {
      western: westernResult,
      eastern: baziResult,
      synthesisTitle: generateSynthesisTitle(westernResult, baziResult),
      synthesisDescription: generateSynthesisDescription(westernResult, baziResult),
      elementMatrix: `${westernResult.element} (Sun) / ${baziResult.dayElement} (Day Master)`,
      prompt: generateSymbolPrompt(westernResult, baziResult)
    };

    // Persist to Supabase if user_id provided
    let chart_id: string | null = null;
    if (user_id) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('charts')
        .insert({
          user_id,
          birth_json: birth,
          analysis_json: analysis
        })
        .select('id')
        .single();

      if (error) {
        console.error(JSON.stringify({ type: 'db_error', error: error.message, req_id: req.id }));
      } else {
        chart_id = data.id;
      }
    }

    res.json({
      chart_id,
      analysis,
      request_id: req.id
    });

  } catch (error: any) {
    if (error instanceof GatewayError) {
      return res.status(error.statusCode).json(formatErrorResponse(error, req.id));
    }
    const gatewayError = new GatewayError('ANALYSIS_FAILED', error.message, 500);
    res.status(gatewayError.statusCode).json(formatErrorResponse(gatewayError, req.id));
  }
});

// Helper functions (simplified - real logic from astroPhysics.ts)
function generateSynthesisTitle(western: any, eastern: any): string {
  const element = western.element || 'Unknown';
  const animal = eastern.yearAnimal || 'Unknown';
  return `The ${element} ${animal}`;
}

function generateSynthesisDescription(western: any, eastern: any): string {
  return `A fusion of ${western.sunSign} energy with ${eastern.yearElement} ${eastern.yearAnimal} wisdom.`;
}

function generateSymbolPrompt(western: any, eastern: any): string {
  return `Design a fusion symbol combining ${western.sunSign} (${western.element}) with ${eastern.yearAnimal} (${eastern.yearElement}).`;
}

export default router;
```

**Step 2: Commit**

```bash
git add server/routes/analysis.ts
git commit -m "feat: add /api/analysis route with BaziEngine integration"
```

---

### Task 15: Wire Up Analysis Route to Server

**Files:**
- Modify: `server/server.ts`

**Step 1: Add import and route**

Add to `server/server.ts` after other imports:
```typescript
import analysisRouter from './routes/analysis';
```

Add before the global error handler:
```typescript
// Routes
app.use('/api/analysis', analysisRouter);
```

**Step 2: Test the endpoint**

Run: `npm run dev:server`

Test:
```bash
curl -X POST http://localhost:8787/api/analysis \
  -H "Content-Type: application/json" \
  -d '{"birth":{"date":"1990-05-15","time":"14:30","tz":"Europe/Berlin","lat":52.52,"lon":13.405,"place":"Berlin"}}'
```

Expected: JSON response with analysis data

**Step 3: Commit**

```bash
git add server/server.ts
git commit -m "feat: wire up /api/analysis route to server"
```

---

## Remaining Tasks (Summary)

The remaining tasks follow the same pattern. Here's the outline:

### Phase 4: Symbol Generation (I3)
- Task 16: Update /api/symbol to use Supabase Storage
- Task 17: Simplify frontend geminiService.ts to gateway-only

### Phase 5: ElevenLabs Integration (I5)
- Task 18: Create session token utilities
- Task 19: Create /api/agent/session endpoint
- Task 20: Create /api/agent/tools/get_user_context endpoint
- Task 21: Update AgentSelectionView with whenDefined + session flow

### Phase 6: Post-Conversation (I6)
- Task 22: Create /api/webhooks/elevenlabs/post-call endpoint
- Task 23: Create report job processor
- Task 24: Create PDF job processor with Playwright
- Task 25: Create job runner

### Phase 7: Frontend Updates
- Task 26: Update astroPhysics.ts to use gateway only
- Task 27: Remove all remaining fallbacks from geminiService.ts
- Task 28: Add ErrorCard usage throughout App.tsx

---

## Verification Checklist

After completing all tasks, verify:

1. **CI Gate**: `./scripts/check-no-placeholders.sh` passes
2. **Health Check**: `curl http://localhost:8787/health` returns OK
3. **Analysis**: POST to `/api/analysis` returns real BaziEngine data
4. **Symbol**: POST to `/api/symbol` returns Supabase Storage URL
5. **RLS Test**: User A cannot read User B's charts
6. **Widget**: ElevenLabs widget loads within 1s
7. **Tool Auth**: Tool webhook rejects invalid tokens

---

## Environment Variables Required

```env
# Required for production
GEMINI_API_KEY=xxx
SUPABASE_URL=https://ykoijifgweoapitabgxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
SESSION_SECRET=xxx (32+ random chars)
ELEVENLABS_TOOL_SECRET=xxx

# Agent IDs
VITE_ELEVENLABS_AGENT_ID_LEVI=agent_9001kdhah7vrfh3rd05pakg8vppk
VITE_ELEVENLABS_AGENT_ID_VICTORIA=agent_1701kdekhhref78v6547amzrg1nb
```
