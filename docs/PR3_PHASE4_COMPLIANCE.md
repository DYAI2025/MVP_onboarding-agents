# PR3 Phase 4: Compliance Architecture (DSGVO/GDPR)

## Ziel
Implementiere DSGVO-konforme Datenschutz-Architektur für Voice-Interaktionen und Transcript-Verarbeitung.

---

## Compliance-Anforderungen (EU/DE)

### 1. Rechtsgrundlage für Datenverarbeitung
- **Art. 6 Abs. 1 lit. a DSGVO**: Einwilligung des Nutzers
- **Art. 9 DSGVO**: Besondere Kategorien personenbezogener Daten (Gesundheitsdaten, Astrologie-Daten)
- **Transparenzgebot**: Klare Information über Datenverarbeitung

### 2. Betroffenenrechte
- **Recht auf Auskunft** (Art. 15 DSGVO)
- **Recht auf Löschung** (Art. 17 DSGVO)
- **Recht auf Datenübertragbarkeit** (Art. 20 DSGVO)

### 3. Technische Maßnahmen
- **Datensparsamkeit**: Nur notwendige Daten erheben
- **Verschlüsselung**: Daten in Transit und at Rest
- **Zugriffskontrolle**: Row Level Security (RLS) in Supabase

---

## Phase 4 Implementation Plan

### Step 1: Database Schema - Transcript Optional
**Ziel**: Transcript-Speicherung nur mit expliziter Einwilligung

#### Änderungen:
1. **conversations.transcript** - Bereits optional (NULL erlaubt)
2. **conversations.metadata** - Neues Feld `consent_given: boolean`
3. **conversations.metadata** - Neues Feld `consent_timestamp: ISO8601`

#### Migration:
```sql
-- File: supabase/migrations/005_compliance_consent.sql

-- Add consent tracking to conversations table
COMMENT ON COLUMN conversations.transcript IS 
  'Optional. Only stored if user gave explicit consent (GDPR Art. 6 Abs. 1 lit. a)';

COMMENT ON COLUMN conversations.metadata IS 
  'JSONB field containing: { consent_given: boolean, consent_timestamp: ISO8601, ... }';

-- Add index for consent queries
CREATE INDEX idx_conversations_consent ON conversations 
  ((metadata->>'consent_given')) 
  WHERE metadata->>'consent_given' = 'true';
```

---

### Step 2: Backend - Consent Validation
**Ziel**: Webhook speichert Transcript nur mit Consent

#### Änderungen in `server/routes/elevenLabsWebhook.ts`:

```typescript
interface WebhookPayload {
  conversation_id: string;
  transcript?: string;
  analysis?: any;
  recording_url?: string;
  consent_given?: boolean; // NEW: Consent flag from frontend
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      conversation_id, 
      transcript, 
      analysis, 
      recording_url,
      consent_given = false // Default: no consent
    } = req.body as WebhookPayload;

    // Validate conversation exists
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversation_id)
      .single();

    if (convError || !conv) {
      throw new GatewayError('CONVERSATION_NOT_FOUND', 
        `Conversation ${conversation_id} not found`, 404);
    }

    // COMPLIANCE: Only store transcript if consent given
    const updatePayload: any = {
      status: 'completed',
      ended_at: new Date().toISOString(),
      metadata: {
        consent_given,
        consent_timestamp: consent_given ? new Date().toISOString() : null,
        analysis: analysis || null,
        recording_url: recording_url || null
      }
    };

    // Only add transcript if consent given
    if (consent_given && transcript) {
      updatePayload.transcript = transcript;
    } else {
      console.log(`[Webhook] Transcript not stored (consent: ${consent_given})`);
    }

    // Update conversation
    const { error: updateError } = await supabase
      .from('conversations')
      .update(updatePayload)
      .eq('id', conversation_id)
      .eq('user_id', conv.user_id); // Scoping rule

    if (updateError) {
      throw new GatewayError('DB_UPDATE_FAILED', 
        `Failed to update conversation: ${updateError.message}`, 500);
    }

    res.json({ status: 'ok', consent_honored: consent_given });

  } catch (error: unknown) {
    // ... error handling
  }
});
```

---

### Step 3: Frontend - Consent Screen
**Ziel**: User muss vor Voice-Interaktion Einwilligung geben

#### Neue Component: `components/ConsentScreen.tsx`

```typescript
import React, { useState } from 'react';

interface ConsentScreenProps {
  onConsent: (consentGiven: boolean) => void;
}

export const ConsentScreen: React.FC<ConsentScreenProps> = ({ onConsent }) => {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-astro-card border border-astro-border rounded-2xl p-8 max-w-2xl w-full space-y-6">
        <h2 className="font-serif text-2xl text-astro-gold">Datenschutz & Einwilligung</h2>
        
        <div className="space-y-4 text-sm text-astro-subtext">
          <p>
            Um Ihre persönliche Astrologie-Beratung durchzuführen, verarbeiten wir folgende Daten:
          </p>
          
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Geburtsdaten</strong>: Datum, Uhrzeit, Ort (für astrologische Berechnung)</li>
            <li><strong>Voice-Aufnahmen</strong>: Ihre Sprachnachrichten während der Beratung</li>
            <li><strong>Transkripte</strong>: Textversion Ihrer Gespräche (optional)</li>
          </ul>

          <p className="text-astro-gold">
            <strong>Ihre Rechte (DSGVO):</strong>
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Recht auf Auskunft über Ihre gespeicherten Daten</li>
            <li>Recht auf Löschung Ihrer Daten</li>
            <li>Recht auf Datenübertragbarkeit</li>
          </ul>

          <p>
            <strong>Speicherung:</strong> Ihre Daten werden verschlüsselt auf EU-Servern gespeichert.
            Transkripte werden nur mit Ihrer Zustimmung gespeichert.
          </p>

          <p className="text-xs text-astro-subtext/60">
            Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)
          </p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-5 h-5 rounded border-astro-border bg-astro-bg text-astro-gold focus:ring-astro-gold"
          />
          <span className="text-sm text-astro-text">
            Ich willige in die Verarbeitung meiner Daten gemäß der Datenschutzerklärung ein.
          </span>
        </label>

        <div className="flex gap-4">
          <button
            onClick={() => onConsent(false)}
            className="flex-1 px-6 py-3 bg-astro-bg border border-astro-border rounded-lg text-astro-subtext hover:bg-astro-card transition-colors"
          >
            Ablehnen
          </button>
          <button
            onClick={() => onConsent(true)}
            disabled={!agreed}
            className="flex-1 px-6 py-3 bg-astro-gold text-black rounded-lg font-semibold hover:bg-astro-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Zustimmen & Fortfahren
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

### Step 4: Frontend - Consent Integration in AgentSelectionView
**Ziel**: Consent-Screen vor Agent-Start anzeigen

#### Änderungen in `components/AgentSelectionView.tsx`:

```typescript
import { ConsentScreen } from './ConsentScreen';

interface AgentSelectionViewProps {
  // ... existing props
  onConsentGiven?: (consentGiven: boolean) => void;
}

export const AgentSelectionView: React.FC<AgentSelectionViewProps> = ({
  // ... existing props
  onConsentGiven
}) => {
  const [showConsent, setShowConsent] = useState(false);
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);
  const [selectedAgentForConsent, setSelectedAgentForConsent] = useState<string | null>(null);

  const handleAgentClick = (agentId: string) => {
    // Show consent screen before starting agent
    setSelectedAgentForConsent(agentId);
    setShowConsent(true);
  };

  const handleConsent = (agreed: boolean) => {
    setShowConsent(false);
    setConsentGiven(agreed);
    
    if (agreed && selectedAgentForConsent) {
      // Proceed with agent selection
      onAgentSelect(selectedAgentForConsent);
      onConsentGiven?.(true);
    } else {
      // User declined - show message
      setError('Ohne Einwilligung können wir keine persönliche Beratung anbieten.');
    }
  };

  return (
    <>
      {showConsent && <ConsentScreen onConsent={handleConsent} />}
      
      {/* ... rest of component */}
    </>
  );
};
```

---

### Step 5: ElevenLabs Widget - Consent Transmission
**Ziel**: Consent-Flag an ElevenLabs Widget übergeben

#### Änderungen in `services/elevenLabsAgents.ts`:

```typescript
export const initializeWidget = async (
  agentId: string, 
  sessionToken: string,
  consentGiven: boolean = false // NEW parameter
) => {
  const widget = await ElevenLabs.ConversationalAI.Widget({
    agentId,
    customVariables: {
      session_token: sessionToken,
      consent_given: consentGiven.toString() // Pass to backend
    },
    // ... other config
  });

  return widget;
};
```

---

### Step 6: App.tsx - Consent State Management
**Ziel**: Consent-State global verwalten

#### Änderungen:

```typescript
function AppContent() {
  // ... existing states
  const [userConsent, setUserConsent] = useState<boolean | null>(null);

  const handleConsentGiven = (consentGiven: boolean) => {
    setUserConsent(consentGiven);
    // Save to localStorage for session persistence
    if (consentGiven) {
      localStorage.setItem('user_consent', 'true');
      localStorage.setItem('consent_timestamp', new Date().toISOString());
    }
  };

  // Check for existing consent on mount
  useEffect(() => {
    const savedConsent = localStorage.getItem('user_consent');
    if (savedConsent === 'true') {
      setUserConsent(true);
    }
  }, []);

  return (
    // ...
    <AgentSelectionView
      onAgentSelect={handleAgentSelect}
      onConsentGiven={handleConsentGiven}
    />
    // ...
  );
}
```

---

## Testing Checklist

### Manual Testing:
1. ✅ Consent-Screen erscheint vor Agent-Start
2. ✅ "Ablehnen" verhindert Agent-Start mit klarer Fehlermeldung
3. ✅ "Zustimmen" startet Agent und speichert Consent
4. ✅ Webhook speichert Transcript nur wenn consent_given=true
5. ✅ Consent wird in localStorage gespeichert (Session-Persistenz)
6. ✅ Supabase RLS verhindert Cross-User-Zugriff auf Transcripts

### Database Verification:
```sql
-- Check consent tracking
SELECT 
  id, 
  user_id, 
  transcript IS NOT NULL as has_transcript,
  metadata->>'consent_given' as consent_given,
  metadata->>'consent_timestamp' as consent_timestamp
FROM conversations
ORDER BY created_at DESC
LIMIT 10;
```

### Expected Results:
- Conversations with `consent_given=true` → `has_transcript=true`
- Conversations with `consent_given=false` → `has_transcript=false`

---

## Compliance Documentation

### Privacy Policy Additions (Datenschutzerklärung):

```markdown
## Verarbeitung von Voice-Daten

### Rechtsgrundlage
Die Verarbeitung Ihrer Voice-Aufnahmen und Transkripte erfolgt auf Grundlage Ihrer 
ausdrücklichen Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO.

### Zweck der Verarbeitung
- Durchführung der astrologischen Beratung
- Verbesserung der Beratungsqualität
- Technische Optimierung der Voice-Interaktion

### Speicherdauer
- Voice-Aufnahmen: 30 Tage nach Beratung
- Transkripte: Nur mit Einwilligung, 90 Tage nach Beratung
- Geburtsdaten: Dauerhaft (für wiederkehrende Beratungen)

### Ihre Rechte
Sie können Ihre Einwilligung jederzeit widerrufen und die Löschung Ihrer Daten 
verlangen unter: datenschutz@example.com

### Datenübermittlung
- Voice-Processing: ElevenLabs (USA, Standardvertragsklauseln)
- Datenbank: Supabase (EU-Region)
- LLM: Google Gemini (EU-Region)
```

---

## Success Criteria

✅ **Legal Compliance:**
- Consent-Screen vor Datenverarbeitung
- Klare Information über Datenverarbeitung
- Widerrufsmöglichkeit implementiert

✅ **Technical Implementation:**
- Transcript-Speicherung nur mit Consent
- Consent-Flag in DB gespeichert
- RLS verhindert unauthorisierten Zugriff

✅ **User Experience:**
- Consent-Screen verständlich formuliert
- Ablehnen verhindert Service mit klarer Message
- Zustimmen ermöglicht nahtlose Voice-Interaktion

---

## Next Steps After Phase 4

1. **Legal Review**: Datenschutzerklärung von Anwalt prüfen lassen
2. **User Testing**: Consent-Flow mit Test-Usern validieren
3. **Documentation**: Privacy Policy auf Website veröffentlichen
4. **Monitoring**: Consent-Rate tracken (Analytics)

