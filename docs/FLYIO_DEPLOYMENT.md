# Fly.io Deployment Guide

## Prerequisites

- Fly.io account ([fly.io](https://fly.io))
- Fly CLI installed (`curl -L https://fly.io/install.sh | sh`)
- Logged in (`fly auth login`)

## Initial Setup (First Time Only)

```bash
# From project root
fly launch --no-deploy
# This will detect the Dockerfile and fly.toml
```

## Set Secrets

**Required:**

```bash
fly secrets set GEMINI_API_KEY=your_gemini_api_key
```

**Optional (for full functionality):**

```bash
fly secrets set VITE_ELEVENLABS_AGENT_ID_LEVI=agent_xxx
fly secrets set VITE_ELEVENLABS_AGENT_ID_VICTORIA=agent_xxx
fly secrets set SUPABASE_URL=https://xxx.supabase.co
fly secrets set SUPABASE_SERVICE_ROLE_KEY=xxx
fly secrets set SESSION_SECRET=your_random_secret
```

## Deploy

```bash
fly deploy
```

## Verify Deployment

```bash
# Check status
fly status

# View logs
fly logs

# Open in browser
fly open

# Health check
curl https://bazodiac.fly.dev/health
```

## Troubleshooting

### Check if app is running

```bash
fly status
fly machines list
```

### View recent logs

```bash
fly logs --tail
```

### SSH into the machine

```bash
fly ssh console
```

### Restart the app

```bash
fly apps restart bazodiac
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for symbol generation |
| `VITE_ELEVENLABS_AGENT_ID_LEVI` | No | ElevenLabs agent ID for Levi |
| `VITE_ELEVENLABS_AGENT_ID_VICTORIA` | No | ElevenLabs agent ID for Victoria |
| `SUPABASE_URL` | No | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key |
| `SESSION_SECRET` | No | Secret for signing session tokens |

## Architecture

```
┌─────────────────────────────────────────────┐
│              Fly.io VM (fra)                │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │         Express Server (8787)        │   │
│  │  ┌─────────────┬─────────────────┐  │   │
│  │  │  Static     │   API Routes    │  │   │
│  │  │  Files      │   /api/symbol   │  │   │
│  │  │  (dist/)    │   /api/agent/*  │  │   │
│  │  └─────────────┴─────────────────┘  │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
              │
              ▼
    https://bazodiac.fly.dev
```

The server handles both:

- **Static files**: Built React frontend from `dist/`
- **API routes**: Symbol generation, agent sessions, etc.
