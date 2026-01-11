
# Symbol Generation Proxy

This is a simple Node.js/Express server that acts as a secure proxy for Google Gemini image generation requests.

## Purpose

- Hides the `GEMINI_API_KEY` from the client-side bundle.
- Provides a consistent API endpoint `/api/symbol` that mirrors the structure of the remote BaziEngine.

## Configuration

The server expects `GEMINI_API_KEY` to be set in the process environment (e.g., via `.env` file in the project root).

## API

**POST /api/symbol**
Input:

```json
{
  "prompt": "string",
  "style": "string (optional)",
  "mode": "string (optional)"
}
```

Output:

```json
{
  "imageDataUrl": "data:image/png;base64,...",
  "durationMs": 123,
  "engine": "proxy-gemini"
}
```
