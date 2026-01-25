# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stellar Onboarding MVP - An astrology/onboarding application combining Western and Eastern astrological analysis with AI-generated symbols. React 19 frontend with Vite, Express backend proxy for secure Gemini API access.

**Prerequisites:** Node.js v18+

## Common Commands

```bash
# Development (starts both frontend on :3000 and server on :8787)
npm run dev

# Frontend only
npm run dev:web

# Backend only
npm run dev:server

# Build for production (compiles TypeScript server + builds frontend)
npm run build

# Build frontend only
npm run build:frontend

# Build server only
npm run build:server

# Start production server (requires build first)
npm start

# Run tests (requires swisseph setup)
npm run test

# Run a specific test file
npm run test -- services/geminiService.test.ts

# Railway deployment helpers
./scripts/railway-setup.sh       # Interactive Railway setup
./scripts/railway-predeploy.sh   # Pre-deployment validation
```

Note: No linter is configured in this project.

## Environment Setup

### Development Environment

Create `.env` in root:
```
GEMINI_API_KEY=your_google_gemini_api_key_here
VITE_DEMO_MODE=false  # Optional: set to 'false' to enable network calls (default: true)
SESSION_SECRET=local-dev-secret  # Required for session management
```

The test script requires the Swiss Ephemeris path. The `scripts/ensure-swisseph.sh` script sets `SE_EPHE_PATH` automatically.

### Production Environment (Railway)

For Railway deployment, see `.env.production.template` for all required variables. Key requirements:

**Required in Production:**
- `SESSION_SECRET` - Generate with `openssl rand -hex 32`
- `GEMINI_API_KEY` - From Google AI Studio
- `REDIS_URL` - Auto-configured by Railway Redis service
- `ELEVENLABS_API_KEY`, `ELEVENLABS_TOOL_SECRET`, `ELEVENLABS_WEBHOOK_SECRET`
- Supabase credentials: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Auto-configured by Railway:**
- `PORT` - Default 8787
- `NODE_ENV` - Set to "production"
- `RAILWAY_PUBLIC_DOMAIN`, `RAILWAY_STATIC_URL`

See `docs/RAILWAY_DEPLOYMENT.md` for complete deployment guide.

## Architecture

### Frontend-Backend Split
- **Frontend (Vite/React)**: Port 3000, proxies `/api/*` requests to backend
- **Backend (Express)**: Port 8787, handles Gemini API calls to protect API key

### Remote Services
- **BaziEngine v2** (Fly.io): Primary remote engine at `https://baziengine-v2.fly.dev`
  - `/api/symbol` - Symbol generation
  - `/api/analysis` - Astrological analysis
  - `/api/transits` - Transit data

### Core Application Flow
1. User enters birth data → `InputCard.tsx`
2. Analysis runs → `services/astroPhysics.ts` (remote → local fallback)
3. Symbol generation → `services/geminiService.ts` (3-tier fallback)
4. Agent selection → `AgentSelectionView.tsx`
5. Character dashboard → `CharacterDashboard.tsx`

### Analysis Fallback Chain (`services/astroPhysics.ts`)
1. Remote BaziEngine v2 (`/api/analysis`) - 8s timeout
2. Local calculation (Western zodiac + Ba Zi sexagenary cycle)

### Symbol Generation Fallback Chain (`services/geminiService.ts`)
1. Remote BaziEngine v2 (`/api/symbol`) - 5s timeout
2. Local proxy → Gemini (`/api/symbol` on port 8787)
3. Deterministic local SVG (always succeeds, no network)

### State Management
- Application state in `App.tsx` using React hooks
- Persistence via `services/persistence.ts` (localStorage)
- Language context in `contexts/LanguageContext.tsx`

### Key Directories
- `components/` - React UI components
- `services/` - Business logic (astrology calculations, API services, persistence)
- `server/` - Express backend proxy
- `constants/` - Translations and static data
- `src/` - Configuration (`config.ts`)

### Configuration Flags (`src/config.ts`)
- `DEMO_MODE`: Skips network calls, uses local SVG generation (controlled by `VITE_DEMO_MODE` env var, defaults to `true`)
- `FORCE_HAPPY_PATH`: Ensures flows never crash, auto-triggers symbol generation after analysis

### Application Views
- `dashboard` - Main view with birth data input and analysis
- `agent_selection` - Choose AI agent after symbol generation
- `character_dashboard` - Full character profile with transits
- `quizzes` - Knowledge quiz system
- `matrix` - System documentation

### Type Definitions
Core types in `types.ts`: `BirthData`, `FusionResult`, `Transit`, `CalculationState` enum, quiz-related types.

## Backend Structure

### Server Architecture
- **Main server**: `server/server.ts` - Express app with CORS, JSON parsing, request ID tracking
- **Routes**: Modular routes in `server/routes/` handle specific endpoints
  - `/api/symbol` - Symbol generation via Gemini (includes image upload to Supabase)
  - `/api/analysis` - Astrological analysis with BaziEngine and database persistence
  - `/api/transits` - Transit calculations
  - `/api/agent-session` - Agent conversation state management
  - `/api/agent-tools` - Custom tools for agent interactions
  - `/api/elevenlabs-webhook` - Webhook for voice agent callbacks
- **Libraries**: `server/lib/` contains utilities
  - `baziEngineClient.ts` - HTTP client for remote BaziEngine v2
  - `supabaseAdmin.ts` - Admin client for database operations
  - `errors.ts` - Structured error handling with `GatewayError` class
  - `requestId.ts` - Request ID tracking middleware for observability
  - `storageUpload.ts` - Supabase Storage operations

### Observability Pattern
- Every request gets a unique `request_id` via middleware
- Structured logging: `console.log(JSON.stringify({ type, id, method, path, status, duration_ms }))`
- Error responses always include `request_id` for debugging

### Error Handling Pattern
- Use `GatewayError` class with `(code, message, statusCode)`
- Fail loud on validation errors (4xx) vs engine unavailability (5xx)
- Format responses with `formatErrorResponse(error, requestId)` for consistency

### Database Integration (Supabase)
- User authentication: Anonymous or OAuth
- Tables: `profiles` (user UI state), `charts` (astrological analyses), `sessions` (agent conversations)
- Analysis results persist to `charts` table with `analysis_json` blob
- Agent sessions stored in `sessions` table for conversation continuity

## Frontend Patterns

### Testing
- **Test framework**: Vitest (configured in `vite.config.ts`)
- **Test files**: Colocated with source (e.g., `service.test.ts` next to `service.ts`)
- **Mock approach**: Global `fetch` mocking via `vi.fn()` for API layer testing
- Run specific test: `npm run test -- services/geminiService.test.ts`

### State Management
- Application state in `App.tsx` using React hooks + `CalculationState` enum (IDLE → CALCULATING → COMPLETE → GENERATING_IMAGE → FINISHED/ERROR)
- Journey persistence: `loadState()` / `saveState()` from `services/persistence.ts`
- Supabase integration for cloud state (fallback to localStorage if unavailable)
- Language context: `contexts/LanguageContext.tsx` with i18n via `constants/translations.ts`

### Error Handling
- `ErrorCard.tsx` component displays errors with contextual UI
- Services throw custom errors that bubble to component-level error boundaries
- Symbol generation uses `SymbolGenerationError` with error code and request ID

## Key Technical Notes

- Path alias `@/*` maps to project root
- Vite config defines `process.env.GEMINI_API_KEY` for frontend (prefer backend proxy)
- The backend uses `@google/genai` SDK with model `gemini-2.0-flash-exp`
- React 19 with `react-jsx` transform (no manual React imports needed)
- State persists to localStorage; use Reset button or `clearState()` to clear
- TypeScript strict mode enabled; `moduleResolution: "bundler"`
- CORS configured to allow localhost, mobile debugging, and Railway domains

## Common Development Tasks

### Adding a New Backend Endpoint
1. Create route file in `server/routes/`
2. Add the handler with `GatewayError`-based error handling
3. Include request IDs in logs/responses
4. Register the route in `server/server.ts`
5. Cover behaviour with Vitest mocks

### Adding a New Service/Feature
1. Create typed helpers in `services/`
2. Write colocated tests (`services/fooService.spec.ts`)
3. Integrate via hooks or dedicated components
4. Surface errors gracefully with fallbacks/logging
5. Persist any user state with `services/persistence.ts`

### Testing a Component Change
1. Run `npm run test` (requires swisseph assets)
2. Verify behaviour locally with `npm run dev`
3. Reload to ensure persistence behaves correctly
4. Inspect backend logs for request IDs and status codes

## Production Build & Deployment

- **TypeScript compilation**: Server builds via `tsconfig.server.json`
- **Build output**: Frontend → `dist/`, server → `dist/server/`
- **Docker multi-stage**: Builder compiles TS; runtime ships compiled JS only
- **Redis**: Optional in dev, required for prod queue + worker flows
- **Environment validation**: `server/lib/envCheck.ts` enforces mandatory vars
- **Health checks**: `/health`, `/health/detailed`, and `/ready` support Railway probes
- **Graceful shutdown**: SIGTERM/SIGINT handlers ease rolling deploys
- **CORS**: Strict production whitelists; keep localhost/mobile hosts for dev

### Railway Deployment

See `docs/RAILWAY_DEPLOYMENT.md` for the full guide. Quick start:

1. Add Redis via the Railway dashboard
2. Configure env vars using `.env.production.template`
3. Run `./scripts/railway-setup.sh` for interactive setup
4. Deploy via GitHub integration or `railway up`

**Pre-deployment validation:**

```bash
./scripts/railway-predeploy.sh
```
