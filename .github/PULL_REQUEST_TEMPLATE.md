# PR1: Contract-First Cleanup — Schema + Backend Hardening

## 📋 Beschreibung

Dieser PR implementiert einen **Contract-First Approach** zur Eliminierung aller Mock/Demo-Abhängigkeiten und Runtime-DB-Fehler.

**Leitprinzip:** *Fail loud, fail early* — keine stillen Fallbacks, keine Platzhalter-IDs, keine Stub-Clients.

---

## 📄 API Contract

**Vollständige Spezifikation:** [docs/contracts.md](../docs/contracts.md)

- ✅ Request/Response/Error-Format für alle Endpoints
- ✅ Scoping-Regeln (user_id + conversation_id + chart_id)
- ✅ "No Silent Fallback" Regeln
- ✅ Non-Negotiables (Definition of Done)

---

## ✅ Definition of Done (Checklist)

### Backend Contract Compliance

- [ ] **DoD #1**: `/api/analysis` persistiert Chart und liefert `chart_id` (kein flow ohne `user_id`)
  - [ ] SQL-Check: `SELECT COUNT(*) FROM charts WHERE user_id IS NULL` → muss `0` sein
  - [ ] curl smoke test: POST ohne `user_id` → `400 INVALID_INPUT`
  - [ ] curl smoke test: POST mit `user_id` → `200` + `chart_id` im Response

- [ ] **DoD #2**: `/api/agent/session` bricht hart ab bei DB Insert Fehler (kein Token bei DB-Fehler)
  - [ ] curl smoke test: POST ohne `chart_id` → `400 INVALID_INPUT`
  - [ ] curl smoke test: POST mit ungültigem `chart_id` → `404 CHART_NOT_FOUND`
  - [ ] curl smoke test: POST mit gültigem `chart_id` → `200` + `session_token`

- [ ] **DoD #3**: Webhook ohne Secret → `401` (kein "orphan log")
  - [ ] curl smoke test: POST ohne `Authorization` header → `401 UNAUTHORIZED`
  - [ ] curl smoke test: POST mit falschem Secret → `401 UNAUTHORIZED`
  - [ ] curl smoke test: POST mit korrektem Secret → `200`

- [ ] **DoD #4**: Tools strikt auf `user_id` + `conversation_id` + `chart_id` gescoped
  - [ ] curl smoke test: POST mit JWT für anderen `user_id` → `403 FORBIDDEN`
  - [ ] curl smoke test: POST mit JWT für anderen `chart_id` → `403 FORBIDDEN`
  - [ ] curl smoke test: POST mit gültigem JWT → `200` + nur eigene Daten

- [ ] **DoD #5**: Kein Default-Secret — Server startet nicht ohne `SESSION_SECRET`
  - [ ] grep-Nachweis: `grep -r "dev-secret" server/` → keine Treffer
  - [ ] Server-Start ohne `SESSION_SECRET` → Crash mit "FATAL" Meldung
  - [ ] Server-Start mit `SESSION_SECRET` → erfolgreicher Start

### Schema Compliance

- [ ] **Migration 004 angewendet** in Staging Supabase (EU)
  - [ ] SQL-Check: `SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name='ui_state'` → Spalte existiert
  - [ ] SQL-Check: `SELECT column_name FROM information_schema.columns WHERE table_name='conversations' AND column_name='status'` → Spalte existiert
  - [ ] SQL-Check: `SELECT column_name FROM information_schema.columns WHERE table_name='conversations' AND column_name='metadata'` → Spalte existiert
  - [ ] SQL-Check: `SELECT column_name FROM information_schema.columns WHERE table_name='conversations' AND column_name='transcript'` → Spalte existiert

- [ ] **CHECK Constraints korrekt**
  - [ ] SQL-Check: `INSERT INTO conversations (id, user_id, chart_id, agent_id, status) VALUES (gen_random_uuid(), 'test-user', 'test-chart', 'levi', 'invalid')` → Fehler (CHECK violation)
  - [ ] SQL-Check: `INSERT INTO jobs (user_id, type, status, payload) VALUES ('test-user', 'invalid_type', 'queued', '{}')` → Fehler (CHECK violation)

### Code-Schema Alignment

- [ ] **jobs.type/status** exakt zum Code passend
  - [ ] Code verwendet nur: `'report'`, `'pdf'`, `'email'` (kein `'generate_report'`)
  - [ ] Schema CHECK constraint erlaubt nur: `'report'`, `'pdf'`, `'email'`

- [ ] **conversations.status** exakt zum Code passend
  - [ ] Code verwendet nur: `'started'`, `'active'`, `'completed'`, `'failed'`
  - [ ] Schema CHECK constraint erlaubt nur: `'started'`, `'active'`, `'completed'`, `'failed'`

### Webhook Payload Mapping

- [ ] **ElevenLabs Webhook Payload real gecaptured** (redacted)
  - [ ] Feldnamen für `custom_variables` verifiziert
  - [ ] Mapping in `elevenLabsWebhook.ts` finalisiert
  - [ ] Test-Payload dokumentiert in `docs/PR1_TESTING.md`

### Security

- [ ] **Keine Secrets/Defaults im Repo**
  - [ ] `scripts/verify-no-secrets.sh` ausgeführt → keine Treffer
  - [ ] `.env.example` enthält keine echten Secrets
  - [ ] `SESSION_SECRET` und `ELEVENLABS_TOOL_SECRET` sind dokumentiert aber leer

---

## 🧪 Testing Evidence

**Vollständiger Testing-Plan:** [docs/PR1_TESTING.md](../docs/PR1_TESTING.md)

### Staging Environment

- **Supabase:** EU-Region (Frankfurt/Ireland)
- **Server:** Fly.io (fra region) oder lokal mit Staging-Credentials
- **BaziEngine:** Mock oder echter Service

### Test Results (auszufüllen)

```bash
# SQL Checks (Staging Supabase)
# TODO: Ergebnisse hier einfügen

# curl Smoke Tests (mit request_id)
# TODO: Ergebnisse hier einfügen

# grep-Nachweis
# TODO: Ergebnisse hier einfügen
```

---

## 📦 Geänderte Dateien

- `docs/contracts.md` (neu)
- `docs/PR1_SUMMARY.md` (neu)
- `docs/PR1_TESTING.md` (neu)
- `supabase/migrations/004_mock_free_schema.sql` (neu)
- `server/routes/analysis.ts` (gehärtet)
- `server/routes/agentSession.ts` (gehärtet)
- `server/routes/agentTools.ts` (gehärtet)
- `server/routes/elevenLabsWebhook.ts` (gehärtet)
- `.env.example` (aktualisiert)
- `scripts/verify-no-secrets.sh` (neu)

---

## 🚀 Deployment Notes

1. **Migration 004 anwenden** vor Server-Deployment:
   ```bash
   supabase db push
   ```

2. **Secrets setzen** in Fly.io/Vercel:
   ```bash
   fly secrets set SESSION_SECRET=$(openssl rand -base64 32)
   fly secrets set ELEVENLABS_TOOL_SECRET=$(openssl rand -base64 32)
   ```

3. **Server neu starten** und Logs prüfen:
   ```bash
   fly logs
   ```

---

## ⚠️ Breaking Changes

- **`user_id` ist jetzt MANDATORY** für `/api/analysis` (Frontend muss Auth sicherstellen)
- **`JWT_SECRET` → `SESSION_SECRET`** (Environment-Variable umbenennen)
- **Server startet nicht** ohne `SESSION_SECRET` (fail fast)

---

## 📝 Reviewer Notes

- **Frontend-Änderungen sind NICHT Teil dieses PRs** (Mock/Demo-Removal ist PR3)
- **Dieser PR fokussiert Backend/Schema Contract + Fail-Loud Mechanismen**
- **Alle Tests müssen in Staging Supabase (EU) durchgeführt werden**

---

## 🔗 Related

- **Next:** PR2 (Security Hardening — CI Gates, Rate Limiting, CORS)
- **Next:** PR3 (Mock/Demo-Removal — Frontend Error States, Dummy-IDs)
- **Next:** PR4 (CI Gates + Mini E2E Tests)
