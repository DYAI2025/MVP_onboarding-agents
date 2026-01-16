# PR1: Contract-First Cleanup — Schema + Backend Hardening

## Ziel
Eliminierung aller Mock/Demo-Abhängigkeiten und Runtime-DB-Fehler durch Contract-First Approach.

## Änderungen

### 1. API Contract Dokumentation (`docs/contracts.md`)
- ✅ Vollständige Spezifikation aller Endpoints mit Request/Response/Errors
- ✅ "Fail loud, fail early" Prinzip dokumentiert
- ✅ Error-Format standardisiert: `{ error: { code, message }, request_id }`
- ✅ Scoping-Regeln definiert (user_id + conversation_id + chart_id)
- ✅ Non-Negotiables (Definition of Done) festgelegt

### 2. Schema-Migration (`supabase/migrations/004_mock_free_schema.sql`)
- ✅ `profiles.ui_state JSONB NULL` — für Frontend-State-Persistenz
- ✅ `conversations.status TEXT` — CHECK constraint ('started','active','completed','failed')
- ✅ `conversations.metadata JSONB NULL` — für ElevenLabs Payload
- ✅ `conversations.transcript TEXT NULL` — optional (Compliance-Diskussion in PR3)
- ✅ `jobs.type/status` — Kommentare für Code-Konsistenz
- ✅ Index auf `conversations.status` für Performance

### 3. Backend-Routen gehärtet

#### `server/routes/analysis.ts`
- ✅ `user_id` jetzt **MANDATORY** (kein flow ohne Auth)
- ✅ Fail loud bei BaziEngine down → `500 ENGINE_UNAVAILABLE`
- ✅ Fail loud bei DB Insert Fehler → `500 DB_INSERT_FAILED` (kein "proceed anyway")
- ✅ Error-Format konsistent mit `contracts.md`

#### `server/routes/agentSession.ts`
- ✅ `SESSION_SECRET` statt `JWT_SECRET` (ohne Default!)
- ✅ Server startet nicht ohne `SESSION_SECRET` (fail fast)
- ✅ Fail loud bei DB Insert Fehler → `500 DB_INSERT_FAILED`
- ✅ `conversations.status = 'started'` korrekt gesetzt
- ✅ Chart-Ownership validiert (chart muss zu user_id gehören)

#### `server/routes/agentTools.ts`
- ✅ `SESSION_SECRET` ohne Default (fail fast)
- ✅ JWT aus `Authorization: Bearer <token>` Header extrahiert
- ✅ **Vollständiges Scoping**:
  - Chart muss zu `user_id` gehören
  - Conversation muss zu `user_id` gehören
  - Conversation muss zu `chart_id` gehören
- ✅ Kein Cross-User-Access möglich
- ✅ Error-Format konsistent mit `contracts.md`

#### `server/routes/elevenLabsWebhook.ts`
- ✅ `ELEVENLABS_TOOL_SECRET` Validierung (401 ohne Secret)
- ✅ Fail loud bei DB Update Fehler → `500 DB_UPDATE_FAILED`
- ✅ Fail loud bei Job Creation Fehler → `500 DB_INSERT_FAILED`
- ✅ `jobs.type = 'report'` (konsistent mit CHECK constraint)
- ✅ `conversations.status = 'completed'` korrekt gesetzt
- ✅ Error-Format konsistent mit `contracts.md`

### 4. Umgebungsvariablen (`.env.example`)
- ✅ `SESSION_SECRET` dokumentiert (REQUIRED, kein Default)
- ✅ `ELEVENLABS_TOOL_SECRET` dokumentiert (REQUIRED, kein Default)
- ✅ Security-Hinweise hinzugefügt (openssl rand -base64 32)
- ✅ Alte `JWT_SECRET` entfernt
- ✅ Keine `dev-secret-*` Defaults mehr

## Akzeptanzkriterien (erfüllt)

✅ **DoD #1**: `/api/analysis` persistiert Chart und liefert `chart_id` — kein flow ohne `user_id`
✅ **DoD #2**: `/api/agent/session` bricht hart ab, wenn DB Insert fehlschlägt — kein Token bei DB-Fehler
✅ **DoD #3**: Webhook ohne Secret → `401` — kein "orphan log"
✅ **DoD #4**: Tools sind strikt auf `user_id` + `conversation_id` + `chart_id` gescoped — keine Cross-User-Daten
✅ **DoD #5**: Kein Default-Secret in Code — Server startet nicht ohne `SESSION_SECRET`

## Nächste Schritte (PR2, PR3, PR4)

### PR2 — Security Hardening (geplant)
- [ ] CI/CD: Verbiete `dev-secret` defaults in Code
- [ ] CI/CD: Verbiete `SUPABASE_SERVICE_ROLE_KEY` im Client-Bundle
- [ ] Rate-Limiting für Webhooks
- [ ] CORS-Konfiguration für Production

### PR3 — Mock/Demo-Freiheit erzwingen (geplant)
- [ ] Entfernen: Local Fallback für Analysis (bereits done in PR1)
- [ ] Entfernen: Dummy-IDs (`unknown-chart-id`, `anon-user`)
- [ ] Frontend: Error-State bei `/api/analysis` Fehler (keine Weiterleitung)
- [ ] Compliance: Transcript-Speicherung optional machen (DSGVO)

### PR4 — CI Gates + Mini-E2E (geplant)
- [ ] `scripts/check-no-placeholders.sh` erweitern
- [ ] GitHub Actions: Gate-Regeln für Secrets
- [ ] Minimaler Contract-Test (Postman/Newman)

## Offene Punkte

⚠️ **ElevenLabs Webhook Payload**: Feldnamen für `custom_variables` müssen real getestet werden (aktuell angenommen: `custom_variables.conversation_id`)

⚠️ **Supabase lokal nicht verfügbar**: Migration 004 muss in echter Supabase-Instanz getestet werden

⚠️ **Transcript-Speicherung**: Compliance-Diskussion in PR3 (DSGVO, Einwilligung, Löschpflicht)

