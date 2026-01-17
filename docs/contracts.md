# API Contracts — Mock-Free MVP

**Leitprinzip:** Fail loud, fail early. Keine stillen Fallbacks, keine Platzhalter-IDs, keine Stub-Clients.

---

## Error Format (Standard)

Alle Fehler-Responses folgen diesem Schema:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  },
  "request_id": "uuid"
}
```

HTTP Status Codes:
- `400` — Client-Fehler (fehlende/ungültige Parameter)
- `401` — Nicht authentifiziert (fehlendes/ungültiges JWT/Secret)
- `403` — Nicht autorisiert (JWT gültig, aber Zugriff verweigert)
- `404` — Ressource nicht gefunden
- `500` — Server-Fehler (Engine down, DB-Fehler)

---

## Endpoint: POST /api/analysis

**Zweck:** Geburtsdaten analysieren (BaZi + Western), Chart in DB persistieren.

**Request:**
```json
{
  "birth": {
    "date": "1990-05-15",
    "time": "14:30",
    "timezone": "Europe/Berlin",
    "latitude": 52.52,
    "longitude": 13.405,
    "place": "Berlin, Germany"
  },
  "user_id": "uuid" // MANDATORY (from Supabase Auth)
}
```

**Response (Success, 200):**
```json
{
  "chart_id": "uuid",
  "analysis": {
    "bazi": { /* BaziEngine response */ },
    "western": { /* BaziEngine western response */ }
  },
  "request_id": "uuid"
}
```

**Errors:**
- `400 INVALID_INPUT` — Fehlende/ungültige birth-Felder oder user_id
- `500 ENGINE_UNAVAILABLE` — BaziEngine nicht erreichbar
- `500 DB_INSERT_FAILED` — Chart konnte nicht gespeichert werden (HARD FAIL, kein Proceed)

**No Silent Fallback Rule:**
- Wenn BaziEngine nicht antwortet → `500 ENGINE_UNAVAILABLE`, kein lokaler Fallback
- Wenn DB Insert fehlschlägt → `500 DB_INSERT_FAILED`, kein "proceed anyway"

---

## Endpoint: POST /api/agent/session

**Zweck:** Voice-Session starten, JWT-Token für Agent Tool Calls erzeugen.

**Request:**
```json
{
  "chart_id": "uuid",
  "agent_id": "levi" | "victoria",
  "user_id": "uuid" // MANDATORY
}
```

**Response (Success, 200):**
```json
{
  "status": "created",
  "session_token": "jwt-string",
  "conversation_id": "uuid",
  "valid_until": 1234567890 // Unix timestamp (now + 1h)
}
```

**Errors:**
- `400 INVALID_INPUT` — Fehlende chart_id oder user_id
- `404 CHART_NOT_FOUND` — chart_id existiert nicht oder gehört nicht zu user_id
- `500 DB_INSERT_FAILED` — Conversation konnte nicht angelegt werden (HARD FAIL)

**No Silent Fallback Rule:**
- Wenn DB Insert fehlschlägt → `500`, kein Token zurückgeben
- Kein Default user_id (z.B. "anon-user"), kein Dummy chart_id

---

## Endpoint: POST /api/agent/tools/get_user_context

**Zweck:** Agent ruft Nutzerdaten ab (Chart, bisherige Konversationen).

**Auth:** Bearer JWT (aus `/api/agent/session`)

**Request:**
```json
{}
```

**Response (Success, 200):**
```json
{
  "user_id": "uuid",
  "chart": {
    "id": "uuid",
    "birth": { /* birth_json */ },
    "analysis": { /* analysis_json */ }
  },
  "conversations": [
    {
      "id": "uuid",
      "started_at": "2026-01-15T10:00:00Z",
      "ended_at": "2026-01-15T10:30:00Z",
      "status": "completed"
    }
  ]
}
```

**Errors:**
- `401 UNAUTHORIZED` — JWT fehlt oder ungültig
- `403 FORBIDDEN` — JWT gültig, aber conversation_id/chart_id gehört nicht zu user_id im Token
- `404 CHART_NOT_FOUND` — chart_id aus JWT existiert nicht

**Scoping Rule:**
- JWT enthält: `user_id`, `conversation_id`, `chart_id`, `agent_id`
- Tool darf nur Daten zu diesem `user_id` + `chart_id` liefern
- Keine Daten von anderen Usern/Charts

---

## Endpoint: POST /api/webhooks/elevenlabs/post-call

**Zweck:** ElevenLabs sendet Post-Call-Daten (Transcript, Metadata).

**Auth:** Secret-Header (z.B. `x-elevenlabs-signature` oder `authorization: Bearer <ELEVENLABS_TOOL_SECRET>`)

**Request (von ElevenLabs):**
```json
{
  "conversation_id": "elevenlabs-conv-id",
  "agent_id": "elevenlabs-agent-id",
  "status": "completed",
  "transcript": "...",
  "custom_variables": {
    "conversation_id": "uuid" // unser interner conversation_id
  }
}
```

**Response (Success, 200):**
```json
{
  "status": "ok",
  "request_id": "uuid"
}
```

**Errors:**
- `401 UNAUTHORIZED` — Secret fehlt oder ungültig
- `400 INVALID_INPUT` — custom_variables.conversation_id fehlt
- `404 CONVERSATION_NOT_FOUND` — conversation_id existiert nicht
- `500 DB_UPDATE_FAILED` — Transcript/Metadata konnten nicht gespeichert werden

**No Silent Fallback Rule:**
- Ohne gültigen Secret → `401`, kein "orphan log"
- Wenn conversation_id nicht gefunden → `404`, kein "proceed anyway"

---

## DB Schema Requirements (für PR1)

**profiles:**
- `ui_state JSONB NULL` — für Frontend-State (selectedAgent, lastView, etc.)

**conversations:**
- `status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started','active','completed','failed'))`
- `metadata JSONB NULL` — für ElevenLabs Payload
- `transcript TEXT NULL` — optional, siehe Compliance-Diskussion (PR3)

**jobs:**
- `type TEXT NOT NULL CHECK (type IN ('report','pdf','email'))` — konsistent mit Code
- `status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','done','failed'))`

**charts:**
- Keine Änderung (bereits korrekt)

---

## Non-Negotiables (Definition of Done)

1. `/api/analysis` persistiert Chart und liefert `chart_id` — kein flow ohne `user_id`
2. `/api/agent/session` bricht hart ab, wenn DB Insert fehlschlägt — kein Token bei DB-Fehler
3. Webhook ohne Secret → `401` — kein "orphan log"
4. Tools sind strikt auf `user_id` + `conversation_id` + `chart_id` gescoped — keine Cross-User-Daten
5. Kein Default-Secret (`dev-secret-*`) in Production — Server startet nicht ohne Secret

