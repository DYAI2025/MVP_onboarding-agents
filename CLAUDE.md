# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stellar Onboarding MVP - An astrology/onboarding application combining Western and Eastern astrological analysis with AI-generated symbols. React 19 frontend with Vite, Express backend proxy for secure Gemini API access.

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

## Environment Setup

Create `.env` in root:
```
GEMINI_API_KEY=your_google_gemini_api_key_here
```

The test script requires the Swiss Ephemeris path. The `scripts/ensure-swisseph.sh` script sets `SE_EPHE_PATH` automatically.

## Architecture

### Frontend-Backend Split
- **Frontend (Vite/React)**: Port 3000, proxies `/api/*` requests to backend
- **Backend (Express)**: Port 8787, handles Gemini API calls to protect API key

### Core Application Flow
1. User enters birth data → `InputCard.tsx`
2. Analysis runs → `services/astroPhysics.ts` → Western + Eastern fusion
3. Symbol generation with fallback chain → `services/geminiService.ts`
4. Agent selection → `AgentSelectionView.tsx`
5. Character dashboard → `CharacterDashboard.tsx`

### Symbol Generation Fallback Chain (`services/geminiService.ts`)
1. Remote BaziEngine v2 (`REMOTE_ENGINE_URL`)
2. Local proxy → Gemini (`/api/symbol`)
3. Deterministic local SVG (always succeeds)

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
- `DEMO_MODE`: Skips network calls, uses local SVG generation
- `FORCE_HAPPY_PATH`: Ensures flows never crash, always provide next step

### Type Definitions
Core types in `types.ts`: `BirthData`, `FusionResult`, `Transit`, `CalculationState` enum, quiz-related types.

## Key Technical Notes

- Path alias `@/*` maps to project root
- Vite config defines `process.env.GEMINI_API_KEY` for frontend (prefer backend proxy)
- The backend uses `@google/genai` SDK with model `gemini-2.0-flash-exp`
- React 19 with `react-jsx` transform (no manual React imports needed)
