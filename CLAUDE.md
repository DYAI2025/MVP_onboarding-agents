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

# Build for production
npm run build

# Run tests (requires swisseph setup)
npm run test

# Run a specific test file
npm run test -- services/geminiService.test.ts
```

Note: No linter is configured in this project.

## Environment Setup

Create `.env` in root:
```
GEMINI_API_KEY=your_google_gemini_api_key_here
VITE_DEMO_MODE=false  # Optional: set to 'false' to enable network calls (default: true)
```

The test script requires the Swiss Ephemeris path. The `scripts/ensure-swisseph.sh` script sets `SE_EPHE_PATH` automatically.

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

## Key Technical Notes

- Path alias `@/*` maps to project root
- Vite config defines `process.env.GEMINI_API_KEY` for frontend (prefer backend proxy)
- The backend uses `@google/genai` SDK with model `gemini-2.0-flash-exp`
- React 19 with `react-jsx` transform (no manual React imports needed)
- State persists to localStorage; use Reset button or `clearState()` to clear
