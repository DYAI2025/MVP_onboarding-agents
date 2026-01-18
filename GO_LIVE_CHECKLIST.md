# Go-Live Checklist for Stellar Onboarding MVP

This checklist covers all steps required to deploy the application successfully with full ElevenLabs webhook integration and symbol generation.

## Critical Issues Fixed

### 🔧 Database Schema Fixes
- ✅ Added `report` and `report_generated_at` columns to `conversations` table (migration 005)
- ✅ Fixed `jobs.status` CHECK constraint to use 'completed' instead of 'done' (migration 006)

### 🔧 Configuration Fixes
- ✅ Updated `.env.example` with all required variables
- ✅ Updated `server/lib/envCheck.ts` to validate Supabase credentials

---

## Prerequisites

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Redis (Local Development)
```bash
# Option A: Docker
docker run -d -p 6379:6379 --name stellar-redis redis:alpine

# Option B: Local Redis installation
# macOS: brew install redis && brew services start redis
# Ubuntu: sudo apt install redis-server && sudo systemctl start redis
```

### 3. Set Up Supabase

#### Run Database Migrations
In Supabase SQL Editor, run migrations in order:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_storage_buckets.sql`
4. `supabase/migrations/004_mock_free_schema.sql`
5. `supabase/migrations/005_add_report_to_conversations.sql` ⚠️ **NEW**
6. `supabase/migrations/006_fix_jobs_status_values.sql` ⚠️ **NEW**

#### Get Credentials
From Supabase Dashboard → Settings → API:
- Project URL (e.g., `https://xxx.supabase.co`)
- `anon` public key
- `service_role` secret key (⚠️ Never expose this to frontend!)

---

## Environment Configuration

### Step 1: Copy Template
```bash
cp .env.example .env
```

### Step 2: Fill Required Values

#### Critical (Server Won't Start Without These)
```bash
# Generate secure random string (32+ characters)
SESSION_SECRET=$(openssl rand -base64 32)

# From Google AI Studio (https://aistudio.google.com/apikey)
GEMINI_API_KEY=your_gemini_api_key

# From ElevenLabs Dashboard → Conversational AI → Your Agent → Settings
ELEVENLABS_TOOL_SECRET=your_tool_secret
ELEVENLABS_WEBHOOK_SECRET=your_webhook_secret

# From Supabase Dashboard → Settings → API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Redis connection (default for local)
REDIS_URL=redis://localhost:6379
```

#### Frontend Configuration (For Agent Feature)
```bash
# From ElevenLabs Dashboard → Conversational AI → Agent IDs
VITE_ELEVENLABS_AGENT_ID_LEVI=agent_xxx
VITE_ELEVENLABS_AGENT_ID_VICTORIA=agent_xxx
```

#### Optional Enhancements
```bash
# Google Maps for location autocomplete
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Demo mode (set false to enable all network calls)
VITE_DEMO_MODE=false

# Custom BaziEngine URL (defaults to fly.dev deployment)
BAZI_ENGINE_URL=https://baziengine-v2.fly.dev
```

---

## ElevenLabs Configuration

### Step 1: Configure Agent IDs
In ElevenLabs Dashboard:
1. Navigate to Conversational AI
2. Create/configure agents (Levi, Victoria)
3. Copy agent IDs to `.env`:
   - Format: `agent_xxxxxxxxxxxxxxxxxxxxx`

### Step 2: Configure Webhook
In each agent's settings:

**Webhook URL:**
```
https://your-domain.com/api/webhooks/elevenlabs/post-call
```

**Events to Subscribe:**
- ✅ `conversation.ended`

**Secret:**
- Use the same value as `ELEVENLABS_TOOL_SECRET` in your `.env`

**Authentication:**
- Type: Signature Verification (HMAC-SHA256)
- Header: `elevenlabs-signature-sha256`

### Step 3: Verify Webhook Integration
After deployment, test webhook:
1. Start a conversation with agent
2. Complete the conversation
3. Check server logs for:
   ```json
   {"type":"webhook","event":"conversation.ended","conversation_id":"..."}
   ```
4. Verify job created in database:
   ```sql
   SELECT * FROM jobs WHERE type='report' ORDER BY created_at DESC LIMIT 1;
   ```
5. Check report generated in conversations table:
   ```sql
   SELECT report_generated_at, substring(report, 1, 100)
   FROM conversations
   WHERE report IS NOT NULL
   ORDER BY report_generated_at DESC LIMIT 1;
   ```

---

## Running the Application

### Development Mode
```bash
# Start both frontend (3000) and backend (8787)
npm run dev

# Or start separately
npm run dev:server  # Backend only (port 8787)
npm run dev:web     # Frontend only (port 3000)
```

### Production Build
```bash
# Build frontend
npm run build

# Set environment
export NODE_ENV=production

# Start server (serves both API and static files)
npm start
```

---

## Verification Checklist

### ✅ Pre-Deployment
- [ ] All dependencies installed (`npm install`)
- [ ] Redis running and accessible
- [ ] All 6 database migrations applied in Supabase
- [ ] `.env` file created with all required variables
- [ ] No placeholder values in required env vars

### ✅ Backend Health
- [ ] Server starts without errors
- [ ] Health check responds: `curl http://localhost:8787/health`
- [ ] Redis connection established (check logs for `[Redis] Connected successfully`)
- [ ] Environment validation passes (check logs for `[EnvCheck] Environment validation passed`)

### ✅ Symbol Generation
- [ ] Test endpoint:
  ```bash
  curl -X POST http://localhost:8787/api/symbol \
    -H "Content-Type: application/json" \
    -d '{"prompt":"Generate mystical symbol","style":"balanced","mode":"transparent"}'
  ```
- [ ] Should return `imageUrl` with base64 or storage URL
- [ ] Check rate limiting (max 5 requests per 15 minutes)

### ✅ ElevenLabs Webhook
- [ ] Webhook URL configured in ElevenLabs dashboard
- [ ] Test signature verification (complete a conversation)
- [ ] Check job created in `jobs` table
- [ ] Verify worker processing (status changes: queued → processing → completed)
- [ ] Confirm report appears in `conversations.report` field

### ✅ Agent Page Integration
- [ ] Agent selection page loads (`/agent_selection`)
- [ ] ElevenLabs widget embeds successfully
- [ ] Widget receives `conversation_id` in dynamic variables
- [ ] Session token JWT validates correctly

### ✅ Background Worker
- [ ] Worker starts on server init (check logs for `[ReportWorker]`)
- [ ] Jobs process automatically after webhook
- [ ] Failed jobs logged with error details
- [ ] Completed jobs update conversations with report

---

## Production Deployment

### Environment Variables for Production
```bash
NODE_ENV=production
PORT=8787

# All required vars from .env.example
# Plus any platform-specific vars (Railway, Fly.io, etc.)
```

### Health Monitoring
Monitor these endpoints:
- `GET /health` - Basic health check
- `GET /api/analysis` - Analysis service
- `POST /api/symbol` - Symbol generation (with valid payload)

### Logs to Monitor
```bash
# Success indicators
[EnvCheck] Environment validation passed
[Redis] Connected successfully
[ReportWorker] Report generated for {conversation_id}

# Error indicators (investigate immediately)
CRITICAL: Missing required environment variables
[Redis] Connection error
[ReportWorker] Failed: {error}
[ElevenLabs Webhook] Signature verification failed
```

---

## Troubleshooting

### Server Won't Start
1. Check `.env` file exists and has no placeholder values
2. Verify Redis is running: `redis-cli ping` (should return `PONG`)
3. Check Supabase credentials are correct
4. Review server logs for specific error

### Webhook Not Working
1. Verify `ELEVENLABS_TOOL_SECRET` matches ElevenLabs dashboard
2. Check webhook URL is accessible from internet (use ngrok for local testing)
3. Inspect request headers in server logs
4. Test signature verification manually:
   ```bash
   echo -n "timestamp.payload" | openssl dgst -sha256 -hmac "your_secret"
   ```

### Symbol Generation Fails
1. Verify `GEMINI_API_KEY` is valid
2. Check API quota/limits in Google AI Studio
3. Test with minimal payload:
   ```json
   {"prompt":"test","style":"balanced"}
   ```

### Reports Not Generating
1. Check BullMQ worker is running (logs show `[ReportWorker] Processing job`)
2. Verify Redis connection
3. Inspect jobs table: `SELECT * FROM jobs WHERE status='failed'`
4. Check conversations have required fields (chart_id, transcript)

### Database Errors
1. Ensure all migrations applied in order
2. Check RLS policies if getting permission errors
3. Verify service role key (not anon key) used for backend

---

## Success Criteria

Your deployment is successful when:
1. ✅ Server starts without errors
2. ✅ Health check returns `{"status":"ok"}`
3. ✅ Symbol generation returns valid images
4. ✅ Agent page loads with ElevenLabs widget
5. ✅ Completing conversation triggers webhook
6. ✅ Report generates automatically within 2 minutes
7. ✅ No errors in production logs

---

## Support & Documentation

- **Project Docs:** `/docs/` folder
- **API Reference:** Check individual route files in `server/routes/`
- **Schema Reference:** `supabase/migrations/*.sql`
- **Architecture:** See `CLAUDE.md` for system overview

For production issues, check:
1. Server logs (structured JSON format)
2. Supabase logs (Database → Logs)
3. ElevenLabs webhook logs (Dashboard → Webhooks → Recent Deliveries)
