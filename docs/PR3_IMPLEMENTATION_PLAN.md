# PR3 Implementation Plan: Mock/Demo-Removal

## Ziel
Entferne alle Mock/Demo-Daten und implementiere Production-Ready Error-Handling.

## Gefundene Mock/Demo-Stellen

### 1. Dummy-IDs
- **Datei**: `components/AgentSelectionView.tsx`
  - `chart_id: result?.chartId || 'unknown-chart-id'`
  - `user_id: userId || 'anon-user'`

### 2. Demo-Modi
- **Datei**: `App.tsx`
  - `DEMO_MODE` Import und Verwendung
  - `FORCE_HAPPY_PATH` Import und Verwendung
  - Conditional Rendering basierend auf `DEMO_MODE`
  
- **Datei**: `src/config.ts`
  - `DEMO_MODE` Export
  - `FORCE_HAPPY_PATH` (vermutlich auch hier)

### 3. Error-Handling
- Keine "proceed anyway" Patterns gefunden (gut!)
- Aber: Fallback-Logik mit Dummy-IDs muss durch echte Error-States ersetzt werden

---

## Implementierungsplan

### Phase 1: Dummy-IDs entfernen ✅

#### 1.1 AgentSelectionView.tsx
**Problem**: Fallback zu Dummy-IDs wenn `chartId` oder `userId` fehlen.

**Lösung**:
```typescript
// VORHER:
chart_id: result?.chartId || 'unknown-chart-id',
user_id: userId || 'anon-user'

// NACHHER:
if (!result?.chartId) {
  throw new Error('Chart ID is required. Please complete the quiz first.');
}
if (!userId) {
  throw new Error('User authentication required. Please log in.');
}

chart_id: result.chartId,
user_id: userId
```

**Frontend Error-Handling**:
- Zeige klare Fehlermeldung im UI
- Button "Complete Quiz" oder "Log In" statt "Start Conversation"
- Keine Silent-Fails mehr

---

### Phase 2: DEMO_MODE & FORCE_HAPPY_PATH entfernen ✅

#### 2.1 src/config.ts
**Aktion**: Entferne DEMO_MODE und FORCE_HAPPY_PATH komplett.

```typescript
// LÖSCHEN:
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
export const FORCE_HAPPY_PATH = ...; // falls vorhanden
```

#### 2.2 App.tsx
**Aktion**: Entferne Imports und Conditional-Logik.

```typescript
// LÖSCHEN:
import { DEMO_MODE, FORCE_HAPPY_PATH } from './src/config';

// LÖSCHEN:
if (FORCE_HAPPY_PATH || DEMO_MODE) {
  // ...
}

// ÄNDERN:
<span>Core_Logic_V5.1_PROD</span> // Kein DEMO-Suffix mehr
```

#### 2.3 .env.example
**Aktion**: Entferne `VITE_DEMO_MODE` Referenz.

---

### Phase 3: Frontend Error-States verbessern ✅

#### 3.1 ErrorCard Component erweitern
**Datei**: `components/ErrorCard.tsx`

**Neue Props**:
```typescript
interface ErrorCardProps {
  title: string;
  message: string;
  actionLabel?: string;        // z.B. "Complete Quiz"
  onAction?: () => void;       // Callback für Action-Button
  severity?: 'error' | 'warning' | 'info';
}
```

#### 3.2 AgentSelectionView Error-Handling
**Datei**: `components/AgentSelectionView.tsx`

```typescript
const [error, setError] = useState<{
  title: string;
  message: string;
  action?: { label: string; handler: () => void };
} | null>(null);

// Bei fehlender chartId:
setError({
  title: 'Quiz Required',
  message: 'Please complete the personality quiz before starting a conversation.',
  action: {
    label: 'Go to Quiz',
    handler: () => navigate('/quiz')
  }
});

// Bei fehlender userId:
setError({
  title: 'Authentication Required',
  message: 'Please log in to start a conversation with your astrology agent.',
  action: {
    label: 'Log In',
    handler: () => navigate('/login')
  }
});
```

#### 3.3 AnalysisView Error-Handling
**Datei**: `components/AnalysisView.tsx`

**Problem**: Wenn `/api/analysis` fehlschlägt, sollte klare Fehlermeldung erscheinen.

```typescript
try {
  const response = await fetch('/api/analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chartId, userId })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Analysis failed');
  }
  
  const data = await response.json();
  setAnalysisResult(data);
} catch (err) {
  setError({
    title: 'Analysis Failed',
    message: err.message,
    action: {
      label: 'Retry',
      handler: () => window.location.reload()
    }
  });
}
```

---

### Phase 4: Compliance-Architektur (Consent-Screen) ✅

#### 4.1 Neue Component: ConsentScreen
**Datei**: `components/ConsentScreen.tsx`

```typescript
import React, { useState } from 'react';

interface ConsentScreenProps {
  onAccept: () => void;
  onDecline: () => void;
}

export const ConsentScreen: React.FC<ConsentScreenProps> = ({ onAccept, onDecline }) => {
  const [transcriptConsent, setTranscriptConsent] = useState(false);
  const [dataProcessingConsent, setDataProcessingConsent] = useState(false);

  const canProceed = transcriptConsent && dataProcessingConsent;

  return (
    <div className="consent-screen">
      <h2>Privacy & Data Processing Consent</h2>
      
      <div className="consent-section">
        <h3>Voice Data Processing (GDPR Compliant)</h3>
        <p>
          We process your voice conversations to provide personalized astrology insights.
          Your data is stored in EU servers and protected according to GDPR regulations.
        </p>
        
        <label>
          <input
            type="checkbox"
            checked={dataProcessingConsent}
            onChange={(e) => setDataProcessingConsent(e.target.checked)}
          />
          I consent to the processing of my voice data for astrology analysis.
        </label>
      </div>

      <div className="consent-section">
        <h3>Conversation Transcript (Optional)</h3>
        <p>
          We can save transcripts of your conversations for future reference.
          This is optional and can be disabled at any time.
        </p>
        
        <label>
          <input
            type="checkbox"
            checked={transcriptConsent}
            onChange={(e) => setTranscriptConsent(e.target.checked)}
          />
          Save conversation transcripts (optional)
        </label>
      </div>

      <div className="consent-actions">
        <button onClick={onDecline}>Decline</button>
        <button onClick={onAccept} disabled={!canProceed}>
          Accept & Continue
        </button>
      </div>

      <div className="privacy-links">
        <a href="/privacy-policy">Privacy Policy</a>
        <a href="/terms-of-service">Terms of Service</a>
      </div>
    </div>
  );
};
```

#### 4.2 Integration in AgentSelectionView
**Datei**: `components/AgentSelectionView.tsx`

```typescript
const [showConsent, setShowConsent] = useState(false);
const [consentGiven, setConsentGiven] = useState(false);

// Vor dem Start der Conversation:
const handleStartConversation = () => {
  if (!consentGiven) {
    setShowConsent(true);
    return;
  }
  
  // Starte Conversation...
};

const handleConsentAccept = () => {
  setConsentGiven(true);
  setShowConsent(false);
  // Speichere Consent in DB
  saveConsentToDatabase(userId, {
    dataProcessing: true,
    transcriptSaving: transcriptConsent,
    timestamp: new Date().toISOString()
  });
};

return (
  <>
    {showConsent && (
      <ConsentScreen
        onAccept={handleConsentAccept}
        onDecline={() => setShowConsent(false)}
      />
    )}
    {/* Rest of component */}
  </>
);
```

#### 4.3 Backend: Consent-Speicherung
**Datei**: `server/routes/agentSession.ts`

**Neue Tabelle** (Supabase Migration):
```sql
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  data_processing_consent BOOLEAN NOT NULL,
  transcript_consent BOOLEAN NOT NULL,
  consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

**Neue Route**:
```typescript
app.post('/api/consent', async (req, res) => {
  const { userId, dataProcessing, transcriptSaving } = req.body;
  
  const { error } = await supabase
    .from('user_consents')
    .insert({
      user_id: userId,
      data_processing_consent: dataProcessing,
      transcript_consent: transcriptSaving,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json({ status: 'ok' });
});
```

#### 4.4 Transcript-Speicherung optional machen
**Datei**: `server/routes/elevenLabsWebhook.ts`

```typescript
// Prüfe Consent vor Transcript-Speicherung:
const { data: consent } = await supabase
  .from('user_consents')
  .select('transcript_consent')
  .eq('user_id', userId)
  .order('consent_timestamp', { ascending: false })
  .limit(1)
  .single();

const transcriptToSave = consent?.transcript_consent 
  ? transcript 
  : null; // Speichere null wenn kein Consent

await supabase
  .from('conversations')
  .update({
    status: 'completed',
    transcript: transcriptToSave, // Conditional!
    metadata: { ...analysis, recording_url }
  })
  .eq('id', conversationId);
```

---

## Änderungsliste (Dateien)

### Zu ändern:
1. ✅ `components/AgentSelectionView.tsx` - Dummy-IDs entfernen, Error-Handling, Consent
2. ✅ `src/config.ts` - DEMO_MODE entfernen
3. ✅ `App.tsx` - DEMO_MODE Logik entfernen
4. ✅ `components/ErrorCard.tsx` - Erweitern um Action-Button
5. ✅ `components/AnalysisView.tsx` - Error-Handling verbessern
6. ✅ `server/routes/elevenLabsWebhook.ts` - Conditional Transcript-Speicherung
7. ✅ `.env.example` - VITE_DEMO_MODE entfernen

### Neu erstellen:
8. ✅ `components/ConsentScreen.tsx` - GDPR Consent UI
9. ✅ `server/routes/consent.ts` - Consent API
10. ✅ `supabase/migrations/005_user_consents.sql` - Consent-Tabelle

### Tests aktualisieren:
11. ✅ `services/config.test.ts` - DEMO_MODE Tests entfernen

---

## Validierung

### Checkliste:
- [ ] Keine Dummy-IDs mehr im Code
- [ ] DEMO_MODE komplett entfernt
- [ ] Alle Error-States zeigen klare Fehlermeldungen
- [ ] Consent-Screen funktioniert
- [ ] Transcript-Speicherung ist optional
- [ ] `scripts/check-no-placeholders.sh` läuft erfolgreich
- [ ] Alle Tests grün

---

## Nächste Schritte nach PR3

1. **PR2**: Security Hardening (Webhook-Auth, Rate-Limiting, CORS)
2. **Testing**: E2E Tests für Consent-Flow
3. **Deployment**: Fly.io Production-Deployment

