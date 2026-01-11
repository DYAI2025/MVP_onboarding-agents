
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
