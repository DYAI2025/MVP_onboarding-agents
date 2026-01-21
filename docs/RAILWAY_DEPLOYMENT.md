# Railway Deployment Guide

## ✅ Behobene Probleme

Diese Deployment-Konfiguration behebt folgende kritische Fehler:

1. ✅ **TypeScript-Kompilierung**: Server-Code wird jetzt zu JavaScript kompiliert
2. ✅ **Production Dependencies**: Keine devDependencies mehr in Production nötig
3. ✅ **Redis optional**: Läuft lokal ohne Redis, in Production mit Railway Redis
4. ✅ **Flexible ENV-Validierung**: Unterscheidet zwischen Dev und Production
5. ✅ **Optimierter Build**: Multi-Stage Docker Build mit kleinerem Image

---

## 🚀 Deployment auf Railway - Schritt für Schritt

### 1️⃣ Redis Service hinzufügen

**In Railway Dashboard:**
1. Klicke auf `+ New` → `Database` → `Add Redis`
2. Redis startet automatisch und erstellt die Variable `REDIS_URL`
3. Railway verknüpft Redis automatisch mit deinem Service

**Wichtig:** Redis muss VOR dem App-Deployment laufen!

---

### 2️⃣ Environment Variables setzen

**In Railway Dashboard → Your Service → Variables:**

#### Erforderliche Variablen:

```bash
# Session & Security
SESSION_SECRET=<generiere-mit-openssl-rand-hex-32>

# Google Gemini API
GEMINI_API_KEY=<von-google-ai-studio>

# Redis (auto-verknüpft wenn Redis Service existiert)
REDIS_URL=${{Redis.REDIS_URL}}

# ElevenLabs Integration
ELEVENLABS_API_KEY=<von-elevenlabs-dashboard>
ELEVENLABS_TOOL_SECRET=<generiere-eigenes-secret>
ELEVENLABS_WEBHOOK_SECRET=<generiere-eigenes-secret>

# Supabase (für Datenbank & Storage)
VITE_SUPABASE_URL=<von-supabase-dashboard>
VITE_SUPABASE_ANON_KEY=<von-supabase-dashboard>
SUPABASE_SERVICE_ROLE_KEY=<von-supabase-dashboard-settings-api>

# Production Flag
NODE_ENV=production
```

#### Secrets generieren:

```bash
# SESSION_SECRET generieren
openssl rand -hex 32

# ELEVENLABS Secrets generieren (eigene Wahl)
openssl rand -hex 24
```

#### Optional (für ElevenLabs Agent Features):

```bash
VITE_AGENT_ARIA_ID=<elevenlabs-agent-id>
VITE_AGENT_ORION_ID=<elevenlabs-agent-id>
VITE_AGENT_GEMINI_ID=<elevenlabs-agent-id>
```

---

### 3️⃣ Code auf Railway deployen

**Option A: GitHub Integration (Empfohlen)**

1. Pushe deinen Code zu GitHub:
   ```bash
   git add .
   git commit -m "feat: Railway deployment configuration"
   git push origin main
   ```

2. In Railway Dashboard:
   - `+ New` → `GitHub Repo`
   - Wähle dein Repository aus
   - Railway baut und deployt automatisch

**Option B: Railway CLI**

```bash
# Railway CLI installieren
npm install -g @railway/cli

# Login
railway login

# Projekt initialisieren
railway init

# Deployen
railway up
```

---

### 4️⃣ Deployment überwachen

**Railway Dashboard → Deployments → View Logs**

✅ **Erfolgreiche Deployment-Logs:**
```
[Redis] Initializing client...
[Redis] Connected successfully
[Redis] Client is ready
[EnvCheck] Environment validation passed.
[Server] Gateway running on port 8787
```

❌ **Fehler-Logs (falls Probleme auftreten):**
```
CRITICAL: Missing required environment variables: SESSION_SECRET
```
→ **Lösung:** Überprüfe Environment Variables in Railway Dashboard

---

### 5️⃣ Health Check

Nach erfolgreichem Deployment:

```bash
# Railway generiert eine URL wie: https://your-app.railway.app
curl https://your-app.railway.app/health
```

**Erwartete Antwort:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "request_id": "..."
}
```

---

## 🔧 Lokales Testen (vor Deployment)

### Build testen:

```bash
npm run build
```

**Erwartete Ausgabe:**
```
✓ built in 1.00s
```

### Kompilierten Server lokal starten:

```bash
# ENV-Variablen setzen (für lokales Testing)
export SESSION_SECRET=test-secret-local
export GEMINI_API_KEY=your-key
export NODE_ENV=development

# Server starten
npm start
```

**Erwartete Ausgabe:**
```
[Redis] Running in local dev mode - Redis features disabled
[EnvCheck] Environment validation passed.
[Server] Gateway running on port 8787
```

### Health Check lokal:

```bash
curl http://localhost:8787/health
```

---

## 📁 Neue Dateien (erstellt durch diese Konfiguration)

- `tsconfig.server.json` - TypeScript-Konfiguration für Server
- `railway.toml` - Railway Platform-Konfiguration
- `docs/RAILWAY_DEPLOYMENT.md` - Diese Anleitung

## ✏️ Geänderte Dateien

- `package.json` - Neue build/start Scripts
- `Dockerfile` - Multi-Stage Build mit kompiliertem Code
- `server/lib/redis.ts` - Redis optional für lokale Entwicklung
- `server/lib/envCheck.ts` - Flexible ENV-Validierung (Dev vs Production)

---

## 🐛 Troubleshooting

### Problem: Build schlägt fehl

**Lösung:**
```bash
# Cache leeren und neu installieren
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

### Problem: Redis-Fehler in Production

**Lösung:**
- Überprüfe, ob Redis Service läuft: Railway Dashboard → Redis
- Überprüfe `REDIS_URL` Variable: Railway Dashboard → Variables
- Logs prüfen: Railway Dashboard → View Logs

### Problem: "Missing required environment variables"

**Lösung:**
- Gehe zu Railway Dashboard → Variables
- Setze alle erforderlichen Variablen (siehe Abschnitt 2️⃣)
- Redeploy triggern: Railway Dashboard → Redeploy

### Problem: Server startet nicht (Exit Code 1)

**Lösung:**
1. Logs prüfen: Railway Dashboard → View Logs
2. Häufigste Ursachen:
   - Fehlende ENV-Variablen
   - Redis nicht verfügbar
   - Port-Konflikt (Railway setzt PORT automatisch)

---

## 📊 Railway-Konfiguration (railway.toml)

Die `railway.toml` Datei konfiguriert:

- **Builder:** Dockerfile (Multi-Stage Build)
- **Start Command:** `npm start` (startet kompilierten Code)
- **Health Check:** `/health` Endpoint
- **Restart Policy:** Automatischer Neustart bei Fehlern

---

## 🎯 Best Practices

1. **Immer lokal testen** vor Production-Deployment
2. **ENV-Variablen nie committen** (nur .env.example)
3. **Redis Service vor App starten**
4. **Logs regelmäßig prüfen** nach Deployment
5. **Health Check überwachen** für Uptime

---

## 📚 Weiterführende Links

- [Railway Documentation](https://docs.railway.app/)
- [Railway Redis Setup](https://docs.railway.app/databases/redis)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)

---

## ✅ Deployment Checklist

Vor dem Production-Deployment:

- [ ] Redis Service in Railway gestartet
- [ ] Alle Environment Variables gesetzt
- [ ] Lokaler Build erfolgreich (`npm run build`)
- [ ] Lokaler Server-Start erfolgreich (`npm start`)
- [ ] Health Check funktioniert lokal
- [ ] Code auf GitHub gepusht
- [ ] Railway Auto-Deployment aktiviert
- [ ] Deployment-Logs geprüft
- [ ] Production Health Check erfolgreich

---

**🎉 Viel Erfolg mit dem Deployment!**
