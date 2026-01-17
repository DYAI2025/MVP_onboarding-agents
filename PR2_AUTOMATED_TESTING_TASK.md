# PR2 Automated Testing Task: Security Hardening

## Ziel

Automatisierte Verifikation der Sicherheitsmechanismen (Security Hardening), die in PR2 implementiert wurden:

- JWT Session Token Validierung
- Token-gebundener Zugriff auf Agent Tools
- RLS (Row Level Security) im Supabase Backend
- Schutz vor Exposure von Sensitiven Daten

## Testumgebung

- **Lokaler Server**: `http://localhost:3000` (Backend an Port 8787 via Proxy oder Direktzugriff)
- **Supabase**: Backend mit RLS-Policies aktiv
- **Auth**: Mock JWT oder echte Supabase Sessions

---

## Test-Suite: PR2 Security Validation

### Test 1: JWT Session Token Integrity

**Ziel**: Verifiziere, dass `/api/agent/session` einen gültigen, signierten Token ausstellt.

#### Schritte

1. Sende POST Request an `/api/agent/session`.
2. Extrahiere `session_token`.
3. Validiere Signature und Payload mit dem Server-Secret (lokal simuliert).
4. **Erwartetes Ergebnis**:
   - Token enthält `user_id`, `chart_id`, `conversation_id`.
   - `exp` (Expiration) ist auf die korrekte Dauer gesetzt (z.B. 1h).

---

### Test 2: Secure Agent Tools Access (Negative Test)

**Ziel**: Verifiziere, dass `/api/agent/tools/get_user_context` ohne oder mit ungültigem Token den Zugriff verweigert.

#### Schritte

1. Rufe `/api/agent/tools/get_user_context` ohne Token auf.
   - **Erwartet**: `401 Unauthorized` oder `403 Forbidden`.
2. Rufe `/api/agent/tools/get_user_context` mit einem abgelaufenen oder falsch signierten Token auf.
   - **Erwartet**: `403 Forbidden`.

---

### Test 3: Data Isolation (RLS Verification)

**Ziel**: Verifiziere, dass User A keine Daten von User B lesen kann.

#### Schritte

1. Registriere zwei User (User A, User B).
2. Erstelle einen Chart für User B.
3. Versuche, den Chart via Client-SDK als User A zu lesen.
4. **Erwartetes Ergebnis**:
   - Supabase gibt leeres Resultat oder Fehler zurück (RLS greift).

---

### Test 4: Environment & Secrets Protection

**Ziel**: Verifiziere, dass keine Secrets im Client-Build oder via Public Endpoints landen.

#### Schritte

1. Scanne `dist/` Verzeichnis nach verbotenen Mustern (`AIza`, `sk_live`, etc.).
2. Prüfe `/health` Endpoint, dass er keine System-Internals ausgibt.
3. **Erwartetes Ergebnis**:
   - Keine sensitiven Informationen in öffentlichen Artefakten.

---

## Ausführung: PR2 Security Audit Plan

### 1. Ausführung der API Security Tests

```bash
# Test 1 & 2: Token Check
# (Skript: tests/security/token-verify.sh)
./scripts/test-agent-security.sh
```

### 2. Ausführung der RLS Tests

```bash
# Benötigt konfiguriertes Test-Profil in Supabase
npx vitest tests/security/rls-isolation.test.ts
```

### 3. Statische Sicherheits-Analyse

```bash
# Suche nach Leaks in gebauten Artefakten
grep -r "AIza" dist/ || echo "Keine Google Keys gefunden"
grep -r "sk_" dist/ || echo "Keine ElevenLabs/Stripe Keys gefunden"
```

---

## Erfolgs-Kriterien

\u2705 **Test 1**: Tokens sind kryptographisch korrekt signiert.  
\u2705 **Test 2**: Agent Tools weisen unberechtigte Anfragen ab.  
\u2705 **Test 3**: RLS verhindert Cross-User-Data Access.  
\u2705 **Test 4**: Keine Secrets im Frontend-Bundle.  
