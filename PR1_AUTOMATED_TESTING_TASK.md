# PR1 Automated Testing Task

## Ziel
Automatisierte End-to-End Tests für PR1 (Schema-Fixes & Persistence) über **Antigravity IDE** und **Playwright**.

## Kontext
**PR1** behebt kritische Schema-Mismatches zwischen Supabase-Datenbank und Server-Code:
- Fehlende Spalten in `conversations` Tabelle (`status`, `transcript`, `metadata`)
- Fehlende `generate_report` in `jobs.type` Constraint
- Webhook-Authentifizierung für ElevenLabs

## Testumgebung
- **Lokaler Server**: `http://localhost:3000`
- **Supabase**: Lokal oder Remote (Project URL aus `.env`)
- **Tools**: Playwright (Browser-Automation), curl (API-Tests)

---

## Test-Suite: PR1 Validation

### Test 1: SQL Schema Validation
**Ziel**: Verifiziere dass alle Migrationen korrekt angewendet wurden.

#### Schritte:
1. Verbinde zu Supabase (via `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` aus `.env`)
2. Führe SQL-Query aus:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'conversations' 
   AND column_name IN ('status', 'transcript', 'metadata');
   ```
3. **Erwartetes Ergebnis**:
   - 3 Zeilen zurück: `status` (text), `transcript` (text), `metadata` (jsonb)

4. Führe SQL-Query aus:
   ```sql
   SELECT con.conname, pg_get_constraintdef(con.oid) 
   FROM pg_constraint con 
   JOIN pg_class rel ON rel.oid = con.conrelid 
   WHERE rel.relname = 'jobs' AND con.contype = 'c';
   ```
5. **Erwartetes Ergebnis**:
   - Constraint auf `type` enthält `'generate_report'`

#### Fehlerfall:
- Wenn Spalten fehlen → Migration nicht angewendet
- Wenn `generate_report` fehlt → Constraint nicht aktualisiert

---

### Test 2: API Endpoint - POST /api/agent-session
**Ziel**: Session-Token-Generierung funktioniert.

#### Schritte:
1. Sende POST Request:
   ```bash
   curl -X POST http://localhost:3000/api/agent-session \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "test-user-123",
       "chart_id": "test-chart-456"
     }'
   ```
2. **Erwartetes Ergebnis**:
   ```json
   {
     "session_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "conversation_id": "uuid-v4-format"
   }
   ```
3. Verifiziere JWT-Token:
   - Dekodiere Token (z.B. mit `jwt.io`)
   - Payload enthält: `user_id`, `chart_id`, `conversation_id`, `exp` (Ablaufzeit)

#### Fehlerfall:
- Status 500 → Server-Fehler (Logs prüfen)
- Fehlende Felder → Schema-Problem

---

### Test 3: API Endpoint - POST /api/elevenlabs-webhook
**Ziel**: Webhook speichert Conversation korrekt in DB.

#### Schritte:
1. **Vorbereitung**: Erstelle Session-Token (siehe Test 2)
2. Sende Webhook-Payload:
   ```bash
   curl -X POST http://localhost:3000/api/elevenlabs-webhook \
     -H "Content-Type: application/json" \
     -H "x-elevenlabs-signature: test-signature" \
     -d '{
       "conversation_id": "<CONVERSATION_ID_FROM_TEST2>",
       "transcript": "User: Hallo\nAgent: Willkommen!",
       "analysis": {
         "sentiment": "positive",
         "topics": ["greeting"]
       },
       "recording_url": "https://example.com/recording.mp3"
     }'
   ```
3. **Erwartetes Ergebnis**:
   - Status 200
   - Response: `{"status":"ok"}`

4. **Datenbank-Verifikation**:
   ```sql
   SELECT status, transcript, metadata 
   FROM conversations 
   WHERE id = '<CONVERSATION_ID_FROM_TEST2>';
   ```
   - `status` = `'completed'`
   - `transcript` = `'User: Hallo\nAgent: Willkommen!'`
   - `metadata` enthält `analysis` und `recording_url`

#### Fehlerfall:
- Status 401 → Webhook-Authentifizierung fehlt (erwartet in PR1)
- Status 500 → Schema-Mismatch (fehlende Spalten)
- Leere DB-Einträge → Persistence-Logik defekt

---

### Test 4: Frontend Integration (Playwright)
**Ziel**: ElevenLabs Widget erhält korrekte `custom_variables`.

#### Schritte:
1. Starte Playwright Browser:
   ```typescript
   const browser = await chromium.launch();
   const page = await browser.newPage();
   await page.goto('http://localhost:5173'); // Vite Dev Server
   ```

2. Warte auf ElevenLabs Widget-Initialisierung:
   ```typescript
   await page.waitForSelector('[data-elevenlabs-widget]');
   ```

3. Intercepte Network-Request zu ElevenLabs:
   ```typescript
   page.on('request', request => {
     if (request.url().includes('elevenlabs.io')) {
       const postData = request.postData();
       console.log('ElevenLabs Request:', postData);
     }
   });
   ```

4. Klicke "Start Conversation" Button:
   ```typescript
   await page.click('button:has-text("Start")');
   ```

5. **Erwartetes Ergebnis**:
   - Request enthält `custom_variables`:
     ```json
     {
       "session_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "conversation_id": "uuid-format"
     }
     ```

#### Fehlerfall:
- `custom_variables` fehlen → Frontend sendet Token nicht
- Token ungültig → Backend generiert Token falsch

---

### Test 5: End-to-End Happy Path
**Ziel**: Vollständiger User-Flow von Session-Start bis Webhook-Persistence.

#### Schritte:
1. **Frontend**: User öffnet App → Wählt Agent → Startet Conversation
2. **Backend**: `/api/agent-session` generiert Token + `conversation_id`
3. **ElevenLabs**: Widget startet mit `custom_variables`
4. **Voice Interaction**: User spricht → Agent antwortet (simuliert)
5. **Webhook**: ElevenLabs sendet POST `/api/elevenlabs-webhook`
6. **Persistence**: Server speichert `transcript`, `metadata` in DB

#### Playwright-Skript:
```typescript
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Step 1: Navigate to App
  await page.goto('http://localhost:5173');
  
  // Step 2: Select Agent
  await page.click('button:has-text("Astro Guide")');
  
  // Step 3: Start Conversation
  await page.click('button:has-text("Start")');
  
  // Step 4: Wait for Widget
  await page.waitForSelector('[data-elevenlabs-widget]');
  
  // Step 5: Simulate Webhook (via curl in parallel)
  // (Webhook-Call muss manuell oder via separatem Script erfolgen)
  
  // Step 6: Verify DB Entry
  // (SQL-Query muss manuell oder via separatem Script erfolgen)
  
  await browser.close();
})();
```

#### Erwartetes Ergebnis:
- Keine Fehler in Browser-Console
- DB-Eintrag in `conversations` mit `status='completed'`

---

## Ausführung der Tests

### Voraussetzungen:
1. **Server läuft**: `npm run dev` (Backend auf Port 3000)
2. **Frontend läuft**: `npm run dev` (Vite auf Port 5173)
3. **Supabase**: Migrations angewendet (`supabase db push` oder remote)
4. **Umgebungsvariablen**: `.env` korrekt konfiguriert

### Test-Kommandos:

#### 1. SQL-Tests (manuell via Supabase Dashboard oder CLI):
```bash
supabase db execute --file tests/schema-validation.sql
```

#### 2. API-Tests (curl):
```bash
# Test 2: Session-Token
curl -X POST http://localhost:3000/api/agent-session \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test-123","chart_id":"chart-456"}'

# Test 3: Webhook (mit conversation_id aus Test 2)
curl -X POST http://localhost:3000/api/elevenlabs-webhook \
  -H "Content-Type: application/json" \
  -d '{"conversation_id":"<ID>","transcript":"Test"}'
```

#### 3. Playwright-Tests:
```bash
npx playwright test tests/e2e-happy-path.spec.ts
```

---

## Erfolgs-Kriterien

✅ **Test 1**: Alle 3 Spalten in `conversations` vorhanden  
✅ **Test 2**: Session-Token generiert mit gültigem JWT  
✅ **Test 3**: Webhook speichert Daten in DB  
✅ **Test 4**: Frontend sendet `custom_variables`  
✅ **Test 5**: End-to-End Flow ohne Fehler  

---

## Fehlerbehandlung

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| `column "status" does not exist` | Migration nicht angewendet | `supabase db push` oder `004_mock_free_schema.sql` manuell ausführen |
| `401 Unauthorized` (Webhook) | Signature-Check fehlt | In PR1 noch nicht implementiert (erwartet) |
| `conversation_id` nicht in DB | Persistence-Logik defekt | `server/routes/elevenLabsWebhook.ts` debuggen |
| Frontend-Fehler "session_token undefined" | Backend antwortet nicht | Server-Logs prüfen (`npm run dev`) |

---

## Nächste Schritte nach erfolgreichen Tests

1. **PR1 mergen** (wenn alle Tests grün)
2. **PR3 starten** (Mock/Demo-Removal)
3. **PR2 starten** (Security Hardening)

---

## Anhang: Playwright Test-Datei

**Datei**: `tests/e2e-happy-path.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('PR1 E2E Happy Path', async ({ page }) => {
  // Navigate to App
  await page.goto('http://localhost:5173');
  
  // Select Agent
  await page.click('button:has-text("Astro Guide")');
  
  // Start Conversation
  await page.click('button:has-text("Start")');
  
  // Wait for Widget
  const widget = await page.waitForSelector('[data-elevenlabs-widget]');
  expect(widget).toBeTruthy();
  
  // Check Console for Errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Browser Error:', msg.text());
    }
  });
  
  // Verify Session Token in Network
  const sessionRequest = await page.waitForRequest(
    request => request.url().includes('/api/agent-session')
  );
  const sessionResponse = await sessionRequest.response();
  const sessionData = await sessionResponse?.json();
  
  expect(sessionData.session_token).toBeDefined();
  expect(sessionData.conversation_id).toMatch(/^[a-f0-9-]{36}$/);
});
```

**Ausführung**:
```bash
npx playwright test tests/e2e-happy-path.spec.ts --headed
```

---

## Zusammenfassung für AI-Agent

**Aufgabe**: Führe die Tests 1-5 automatisiert aus.  
**Tools**: Playwright (Browser), curl (API), SQL-Client (Supabase).  
**Erfolg**: Alle 5 Tests grün → PR1 ist ready to merge.  
**Fehler**: Logs sammeln und in `docs/PR1_TEST_RESULTS.md` dokumentieren.

