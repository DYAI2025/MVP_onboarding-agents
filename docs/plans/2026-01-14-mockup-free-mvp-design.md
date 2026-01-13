# Mockup-Free Live MVP Design

**Date:** 2026-01-14
**Status:** Validated
**Supabase Project:** https://ykoijifgweoapitabgxx.supabase.co
**Deploy Target:** Fly.io (container-based)

---

## Overview

Transform the current demo-focused MVP into a production-ready application with:
- No silent fallbacks or placeholder data
- Real persistent storage (Supabase)
- Secure ElevenLabs agent integration with backend tools
- Automated post-conversation report/PDF generation

---

## Architecture

```
Browser (Vite/React)
    ↓ /api/*
Gateway Backend (Express on Fly.io, port 8787)
    ↓
┌───────────────────────────────────────────┐
│  BaziEngine v2     Supabase      Gemini   │
│  (Fly.io)          (Auth/DB/    (Images)  │
│                     Storage)              │
└───────────────────────────────────────────┘
    ↑
ElevenLabs Agent (via Tool Webhooks)
```

---

## Increment I0: Mockup-Free Policy & CI Gates

### Changes to `src/config.ts`
```typescript
// Production-first defaults (was: DEMO_MODE defaults to true)
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
export const FORCE_HAPPY_PATH = import.meta.env.VITE_FORCE_HAPPY_PATH === 'true';
```

### New Components
- `components/ErrorCard.tsx` - Error message + request ID + retry button
- `components/LoadingCard.tsx` - Consistent loading states

### CI Gate Script
Create `scripts/check-no-placeholders.sh`:
```bash
#!/bin/bash
FORBIDDEN="DEMO_MODE\s*=\s*true|replace-with-|FORCE_HAPPY_PATH\s*=\s*true"
if grep -rE "$FORBIDDEN" --include="*.ts" --include="*.tsx" src/ services/ components/; then
  echo "ERROR: Forbidden placeholder patterns found"
  exit 1
fi
```

### Remove from `services/geminiService.ts`
- Delete `generateLocalSVG` function (lines 20-68)
- Delete DEMO_MODE early return (lines 74-84)
- Delete final local SVG fallback (lines 160-168)
- Replace with error throw on failure

---

## Increment I1: Gateway Infrastructure

### Directory Structure
```
server/
├── server.ts
├── routes/
│   ├── analysis.ts
│   ├── symbol.ts
│   ├── agentSession.ts
│   ├── agentTools.ts
│   └── webhooks.ts
├── lib/
│   ├── supabaseAdmin.ts
│   ├── baziEngineClient.ts
│   ├── sessionToken.ts
│   ├── errors.ts
│   └── requestId.ts
└── jobs/
    ├── reportJob.ts
    ├── pdfJob.ts
    └── runner.ts
```

### Core Middleware
```typescript
// Request ID
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));
```

### Fly.io Config (`fly.toml`)
```toml
[http_service]
  internal_port = 8787
  force_https = true
  min_machines_running = 1

[checks]
  [checks.health]
    port = 8787
    type = "http"
    path = "/health"
```

---

## Increment I2: BaziEngine Integration

### Route: POST /api/analysis
```typescript
// Input
{ birth: { date, time, tz, lat, lon, place } }

// Gateway transforms and calls:
Promise.all([
  baziEngineClient.post('/calculate/bazi', payload),
  baziEngineClient.post('/calculate/western', payload)
])

// Persists to Supabase and returns unified ViewModel
```

### BaziEngine Client
- Base URL: `https://baziengine-v2.fly.dev`
- Timeout: 8000ms
- Error format: `{ error: { code, message }, request_id }`

### Frontend Changes
- Remove local fallback from `services/astroPhysics.ts`
- Only call `/api/analysis` (gateway)
- Display ErrorCard on failure

---

## Increment I3: Symbol Generation

### Route: POST /api/symbol
```typescript
// Input: { chart_id: "uuid" }

// 1. Load chart from DB
// 2. Generate image via Gemini
// 3. Upload to Supabase Storage (bucket: symbols)
// 4. Persist metadata to symbols table
// 5. Return { symbol_id, symbol_url, status: 'generated' }
```

### Frontend Changes
Replace `services/geminiService.ts` with simple gateway call:
```typescript
export async function generateSymbol(chartId: string): Promise<GenerationResult> {
  const response = await fetch('/api/symbol', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chart_id: chartId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new SymbolGenerationError(error.error.code, error.request_id);
  }

  return response.json();
}
```

---

## Increment I4: Supabase Schema & RLS

### Tables
```sql
profiles (id, display_name, locale, created_at)
charts (id, user_id, birth_json, analysis_json, created_at, updated_at)
symbols (id, user_id, chart_id, image_url, prompt, engine_used, created_at)
conversations (id, user_id, chart_id, eleven_conversation_id, started_at, ended_at)
reports (id, user_id, chart_id, conversation_id, report_md_url, pdf_url, created_at)
jobs (id, user_id, type, status, payload, error, attempts, created_at, updated_at)
```

### RLS Policies
- All tables: `SELECT` where `auth.uid() = user_id`
- Gateway writes via service role (server-side only)

### Environment Variables
```env
SUPABASE_URL=https://ykoijifgweoapitabgxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Increment I5: ElevenLabs Backend Integration

### Session Endpoint: POST /api/agent/session
```typescript
// Input: { chart_id }
// Output: { conversation_id, session_token, dynamic_variables }

// JWT Claims:
{
  sub: user_id,
  chart_id,
  conv_id,
  typ: "el_session",
  aud: "elevenlabs_tool",
  iss: "stellar-gateway",
  exp: 600 // 10 minutes
}
```

### Tool Webhook: POST /api/agent/tools/get_user_context
```typescript
// Security:
// 1. Verify Authorization: Bearer <ELEVENLABS_TOOL_SECRET>
// 2. Verify JWT and check decoded.sub matches chart.user_id
// 3. Rate limit by token

// Response (safe subset):
{
  user: { first_name, locale },
  chart: { western, eastern, synthesis },
  symbol: { url }
}
```

### Frontend Widget Update
```typescript
// Before mounting widget:
await customElements.whenDefined('elevenlabs-convai');

// Pass dynamic variables with tool_token (not full session_token)
widget.setAttribute('dynamic-variables', JSON.stringify({
  conversation_id,
  tool_token,
  user_name
}));
```

---

## Increment I6: Post-Conversation Automation

### Post-Call Webhook: POST /api/webhooks/elevenlabs/post-call
```typescript
// 1. Verify x-elevenlabs-signature
// 2. Find conversation by eleven_conversation_id
// 3. Update conversation.ended_at
// 4. Queue report job
```

### Job Pipeline
1. **report** job → Generate MD via Gemini → Upload to Storage → Queue PDF job
2. **pdf** job → Render with Playwright → Upload to Storage → Update report record
3. **email** job (optional) → Send via Resend/Postmark

### Job Runner
Simple polling (5s interval) in same container for MVP.

---

## KPIs & Verification

| KPI | Target | How to Verify |
|-----|--------|---------------|
| Placeholders | 0% | CI gate script |
| Widget visible | <1s | Client telemetry |
| Analysis latency | <3s p95 | Gateway logs |
| Symbol generation | <10s p95 | Gateway logs |
| RLS isolation | 0 cross-user | Automated tests |
| Report+PDF | <60s p95 | Job status tracking |

---

## Files to Modify

### Remove/Rewrite
- `services/geminiService.ts` - Remove fallbacks, simplify to gateway call
- `services/astroPhysics.ts` - Remove local fallback
- `src/config.ts` - Change defaults to production-first

### Create
- `server/routes/analysis.ts`
- `server/routes/agentSession.ts`
- `server/routes/agentTools.ts`
- `server/routes/webhooks.ts`
- `server/lib/supabaseAdmin.ts`
- `server/lib/baziEngineClient.ts`
- `server/lib/sessionToken.ts`
- `server/jobs/reportJob.ts`
- `server/jobs/pdfJob.ts`
- `server/jobs/runner.ts`
- `components/ErrorCard.tsx`
- `scripts/check-no-placeholders.sh`
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rls_policies.sql`
- `fly.toml`

### Update
- `server/server.ts` - Add middleware, routes, job runner
- `components/AgentSelectionView.tsx` - Session flow, `whenDefined`
- `.env.example` - Add all new env vars
