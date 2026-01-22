
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Stellar Onboarding MVP (Enhanced)

This is a polished MVP for the Astro Agents onboarding flow. It includes a frontend (Vite/React) and a lightweight backend proxy (Express) to securely handle Gemini API keys.

## Features implemented

- **Dual Engine Symbol Generation**: Uses `BaziEngine v2` primarily, falls back to a local secure Proxy (Gemini), and finally to placeholders.
- **Secure Key Handling**: `GEMINI_API_KEY` is only exposed to the server content, never the client bundle.
- **State Persistence**: Reloading the page restores your journey (Input -> Analysis -> Image -> Agent Selection).
- **Observability**: UI shows which engine was used and generation time.

## Run Locally

**Prerequisites:** Node.js (v18+)

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure Environment:**
   Create a `.env` file in the root directory:

   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

3. **Start the Development Environment:**
   This starts both the Vite frontend (port 3000) and the Proxy server (port 8787) concurrently.

   ```bash
   npm run dev
   ```

4. **Access the App:**
   Open <http://localhost:3000>

## Deploy to Railway

This repo is ready for Railway via the included `railway.toml` (build + start commands and health check). The backend serves the built Vite app from `/dist` in production.

**Recommended setup**
1. **Create a Railway project** and connect this repo.
2. **Add a Redis service** and attach its `REDIS_URL` to the app service.
3. **Configure environment variables** (Settings → Variables).

**Required variables (production)**
- `SESSION_SECRET`
- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL` (used at build time)
- `VITE_SUPABASE_ANON_KEY` (used at build time)
- `REDIS_URL`

**Optional variables (feature-gated)**
- `ELEVENLABS_API_KEY`, `ELEVENLABS_TOOL_SECRET`, `ELEVENLABS_WEBHOOK_SECRET`
- `VITE_ELEVENLABS_AGENT_ID_LEVI`, `VITE_ELEVENLABS_AGENT_ID_VICTORIA`
- `BAZI_ENGINE_URL` (defaults to hosted engine)
- `VITE_DEMO_MODE`, `VITE_GOOGLE_MAPS_API_KEY`

**Railway build + start**
- Build command: `npm run build`
- Start command: `npm start`

**Health check**
- `GET /health` returns `200` when the server is ready.

## Architecture

- **Frontend**: React 19, Vite, TailwindCSS.
  - `services/geminiService.ts`: Handles fallback logic (Remote -> Proxy -> Placeholder).
  - `services/persistence.ts`: Manages LocalStorage state.
- **Backend**: Node.js, Express.
  - `server/server.ts`: Proxies requests to Google Gemini, protecting the API key.

## Scripts

- `npm run dev`: Start Client + Server
- `npm run dev:web`: Start Client only
- `npm run dev:server`: Start Server only
- `npm run test`: Run Unit Tests (Vitest)
- `npm start`: Run the production server (serves `dist/` and API)

<!-- Devin test comment - verifying repo access -->
