# E2E Voice-Loop Sprint Plan

## Sprint Goal (DoD)
**"E2E Voice-Loop läuft: Analyse → chart_id persistiert → Voice-Session startet → Webhook schreibt Transcript → Resume möglich."**

---

## Priority 1: Analyse-Flow reparieren ⚠️ HIGHEST PRIORITY

### Problem
- ❌ Keine lat/lon/tz Eingabe in UI
- ❌ fetchRemoteAnalysis() Payload passt nicht zum Gateway-Contract
- ❌ chart_id landet nicht in FusionResult.chartId
- ❌ AgentSelectionView läuft ins Leere ohne chart_id

### Decision: Lat/Lon/TZ Herkunft
**MVP-schnell (gewählt)**: UI-Felder für lat/lon hinzufügen
- ✅ Kein Drittanbieter-Risiko
- ✅ Sofort umsetzbar
- ✅ User kann Werte aus Google Maps kopieren
- ❌ Weniger User-friendly (aber MVP-akzeptabel)

**Alternative (später)**: Gateway macht Geocoding + TZ-Lookup
- ❌ Mehr Arbeit
- ❌ Drittanbieter-Risiko (API-Limits, Kosten)
- ✅ Bessere UX

### Implementation Steps

#### Step 1.1: Erweitere BirthData Type
**File**: `types.ts`

```typescript
export interface BirthData {
  date: string;      // YYYY-MM-DD
  time: string;      // HH:mm
  place: string;     // City name (for display only)
  lat: number;       // NEW: Latitude
  lon: number;       // NEW: Longitude
  tz: string;        // NEW: Timezone (IANA format, e.g. "Europe/Berlin")
}
```

#### Step 1.2: Erweitere InputCard UI
**File**: `components/InputCard.tsx`

Add three new input fields:
1. Latitude (number input, -90 to 90)
2. Longitude (number input, -180 to 180)
3. Timezone (text input with suggestions, default: Browser TZ)

**UI Layout**:
```
┌─────────────────────────────────────┐
│ Birth Date: [YYYY-MM-DD]            │
│ Birth Time: [HH:mm]                 │
│ Birth Place: [City Name]            │
│                                     │
│ Coordinates (required):             │
│ Latitude:  [  52.52  ] °N/S        │
│ Longitude: [ 13.405  ] °E/W        │
│                                     │
│ Timezone: [Europe/Berlin] ▼         │
│ (Auto-detected: Europe/Berlin)      │
│                                     │
│ 💡 Tip: Copy coordinates from       │
│    Google Maps                      │
└─────────────────────────────────────┘
```

**Helper Text**:
- "Find your coordinates on [Google Maps](https://www.google.com/maps)"
- "Right-click on your birth location → Copy coordinates"

**Validation**:
- Latitude: -90 to 90
- Longitude: -180 to 180
- Timezone: IANA format (e.g. "Europe/Berlin", "America/New_York")

**Default Timezone**:
```typescript
const defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
```

#### Step 1.3: Frontend - Ensure Supabase Session
**File**: `App.tsx`

Before calling `runFusionAnalysis()`, ensure Supabase session exists:

```typescript
const handleValidation = async (data: BirthData) => {
  // 1. Ensure Supabase session (anon or logged in)
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    // Sign in anonymously if no session
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError || !anonData.user) {
      setAnalysisError('Failed to create session. Please refresh and try again.');
      return;
    }
    console.log('[App] Created anonymous session:', anonData.user.id);
  }
  
  // 2. Proceed with analysis
  runAnalysis(data);
};
```

#### Step 1.4: Fix fetchRemoteAnalysis() Payload
**File**: `services/astroPhysics.ts`

**Current (WRONG)**:
```typescript
const response = await fetch(`${REMOTE_ANALYSIS_ENDPOINT}`, {
  method: 'POST',
  body: JSON.stringify(data), // ❌ Wrong format
});
```

**New (CORRECT)**:
```typescript
export const fetchRemoteAnalysis = async (data: BirthData): Promise<FusionResult> => {
  // Get current user_id from Supabase session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No active session. Please refresh and try again.');
  }

  const payload = {
    user_id: user.id,
    birth: {
      date: data.date,
      time: data.time,
      tz: data.tz,
      lat: data.lat,
      lon: data.lon,
      place: data.place
    }
  };

  console.log('[astroPhysics] Sending analysis request:', payload);

  const response = await fetch(`${REMOTE_ANALYSIS_ENDPOINT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Analysis API returned ${response.status}: ${response.statusText}`
    );
  }

  const result = await response.json();
  
  // Validate response contains chart_id
  if (!result.chart_id) {
    throw new Error('Analysis response missing chart_id');
  }

  console.log('[astroPhysics] Analysis complete, chart_id:', result.chart_id);

  return {
    chartId: result.chart_id, // ✅ Map to FusionResult.chartId
    synthesisTitle: result.synthesis_title || result.synthesisTitle,
    synthesisDescription: result.synthesis_description || result.synthesisDescription,
    elementMatrix: result.element_matrix || result.elementMatrix,
    western: result.western,
    eastern: result.eastern,
    prompt: result.prompt
  };
};
```

#### Step 1.5: Erweitere FusionResult Type
**File**: `types.ts`

```typescript
export interface FusionResult {
  chartId?: string;           // NEW: chart_id from backend
  synthesisTitle: string;
  synthesisDescription: string;
  elementMatrix: string;
  western: WesternAnalysis;
  eastern: EasternAnalysis;
  prompt: string;
}
```

#### Step 1.6: Update AgentSelectionView to use chartId
**File**: `components/AgentSelectionView.tsx`

**Current (WRONG)**:
```typescript
const chartId = analysisResult?.chartId || 'MISSING_CHART_ID';
```

**New (CORRECT)**:
```typescript
const chartId = analysisResult?.chartId;

if (!chartId) {
  return (
    <ErrorCard
      title="Chart ID Missing"
      message="Analysis did not return a chart ID. Please try again."
      severity="error"
      actionLabel="Retry Analysis"
      onAction={() => window.location.reload()}
    />
  );
}
```

### DoD for Priority 1
- [ ] UI hat lat/lon/tz Felder mit Validierung
- [ ] Browser-TZ wird als Default verwendet
- [ ] fetchRemoteAnalysis() sendet korrektes Payload-Format
- [ ] Supabase Session wird vor Analyse sichergestellt (anon oder login)
- [ ] FusionResult enthält chartId
- [ ] AgentSelectionView zeigt Error wenn chartId fehlt
- [ ] Neue Analyse liefert reproduzierbar chart_id
- [ ] Backend persistiert Row in `charts` Tabelle

---

## Priority 2: Voice-Persistenz schließen

### Problem
- ❌ conversation_id aus /api/agent/session Response gelangt nicht ins Widget
- ❌ Webhook-Payload Feldnamen sind geraten (nicht verifiziert)
- ❌ Webhook schreibt nicht conversations.transcript

### Implementation Steps

#### Step 2.1: Verify /api/agent/session Response
**File**: `server/routes/agentSession.ts`

Ensure response contains `conversation_id`:

```typescript
res.json({
  session_token: token,
  conversation_id: conversationId, // ✅ Must be present
  expires_at: new Date(Date.now() + 3600000).toISOString()
});
```

#### Step 2.2: Pass conversation_id to Widget
**File**: `services/elevenLabsAgents.ts`

**Current (MISSING)**:
```typescript
const widget = await ElevenLabs.ConversationalAI.Widget({
  agentId,
  customVariables: {
    session_token: sessionToken,
    // ❌ conversation_id missing!
  },
});
```

**New (CORRECT)**:
```typescript
export const initializeWidget = async (
  agentId: string,
  sessionToken: string,
  conversationId: string // NEW parameter
) => {
  const widget = await ElevenLabs.ConversationalAI.Widget({
    agentId,
    customVariables: {
      session_token: sessionToken,
      conversation_id: conversationId, // ✅ Pass to widget
    },
    // ... other config
  });

  console.log('[ElevenLabs] Widget initialized with:', {
    agentId,
    conversationId
  });

  return widget;
};
```

#### Step 2.3: Update AgentSelectionView to pass conversationId
**File**: `components/AgentSelectionView.tsx`

```typescript
const handleAgentSelect = async (agentId: string) => {
  try {
    // 1. Create session
    const sessionData = await createAgentSession(chartId);
    
    // 2. Initialize widget with conversation_id
    await initializeWidget(
      agentId,
      sessionData.session_token,
      sessionData.conversation_id // ✅ Pass conversation_id
    );
    
    onAgentSelect(agentId);
  } catch (error) {
    // ... error handling
  }
};
```

#### Step 2.4: Capture Real Webhook Payload (CRITICAL)
**Action**: Deploy to Fly.io staging and trigger webhook

**Log Webhook Payload**:
```typescript
// File: server/routes/elevenLabsWebhook.ts

router.post('/', async (req: Request, res: Response) => {
  // ⚠️ TEMPORARY: Log full payload for verification
  console.log('=== WEBHOOK PAYLOAD (REDACTED) ===');
  console.log(JSON.stringify({
    body: req.body,
    headers: Object.fromEntries(
      Object.entries(req.headers)
        .filter(([k]) => !['authorization', 'cookie'].includes(k.toLowerCase()))
    )
  }, null, 2));
  console.log('=================================');
  
  // ... rest of webhook logic
});
```

**Deployment Steps**:
1. Deploy to Fly.io: `fly deploy`
2. Trigger voice session via UI
3. Complete voice session
4. Check Fly.io logs: `fly logs`
5. Copy webhook payload
6. Update webhook handler with REAL field names

#### Step 2.5: Update Webhook Handler (AFTER payload verification)
**File**: `server/routes/elevenLabsWebhook.ts`

**Template (to be updated with real field names)**:
```typescript
interface WebhookPayload {
  // ⚠️ REPLACE WITH REAL FIELD NAMES FROM LOGS
  conversation_id?: string;
  transcript?: string;
  analysis?: any;
  recording_url?: string;
  custom_variables?: {
    session_token?: string;
    conversation_id?: string;
  };
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const payload = req.body as WebhookPayload;
    
    // Extract conversation_id (check both locations)
    const conversationId = 
      payload.conversation_id || 
      payload.custom_variables?.conversation_id;
    
    if (!conversationId) {
      throw new GatewayError('MISSING_CONVERSATION_ID', 
        'Webhook payload missing conversation_id', 400);
    }

    // Validate conversation exists
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('id, user_id, chart_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conv) {
      throw new GatewayError('CONVERSATION_NOT_FOUND', 
        `Conversation ${conversationId} not found`, 404);
    }

    // Update conversation with transcript
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        transcript: payload.transcript || null,
        status: 'completed',
        ended_at: new Date().toISOString(),
        metadata: {
          analysis: payload.analysis || null,
          recording_url: payload.recording_url || null
        }
      })
      .eq('id', conversationId)
      .eq('user_id', conv.user_id); // Scoping rule

    if (updateError) {
      throw new GatewayError('DB_UPDATE_FAILED', 
        `Failed to update conversation: ${updateError.message}`, 500);
    }

    // Create job for post-processing
    const { error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: conv.user_id,
        chart_id: conv.chart_id,
        conversation_id: conversationId,
        job_type: 'voice_analysis',
        status: 'queued',
        payload: {
          transcript: payload.transcript,
          analysis: payload.analysis
        }
      });

    if (jobError) {
      console.error('[Webhook] Failed to create job:', jobError);
      // Non-critical, don't fail webhook
    }

    res.json({ status: 'ok', conversation_id: conversationId });

  } catch (error: unknown) {
    // ... error handling
  }
});
```

### DoD for Priority 2
- [ ] /api/agent/session Response enthält conversation_id
- [ ] Widget erhält conversation_id via customVariables
- [ ] Real webhook payload gegen Fly-Staging geloggt
- [ ] Webhook-Handler verwendet verifizierte Feldnamen (nicht geraten)
- [ ] Webhook schreibt conversations.transcript
- [ ] Webhook setzt conversations.ended_at
- [ ] Webhook erstellt jobs Row für Post-Processing
- [ ] Resume möglich (conversation_id vorhanden)

---

## Priority 3: Env & Doku konsolidieren

### Problem
- ❌ .env.example unvollständig/inkorrekt
- ❌ Hardcoded Agent IDs in GitHub Workflows
- ❌ Inkonsistente Naming (SESSION_SECRET vs JWT_SECRET)

### Implementation Steps

#### Step 3.1: Korrigiere .env.example
**File**: `.env.example`

```bash
# === Backend (Node.js Server) ===
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=your-jwt-secret-min-32-chars
GEMINI_API_KEY=AIzaSy...
ELEVENLABS_TOOL_SECRET=your-elevenlabs-tool-secret

# === Frontend (Vite) ===
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ELEVENLABS_AGENT_ID_ASTROLOGER=agent_...
VITE_ELEVENLABS_AGENT_ID_COACH=agent_...
VITE_ELEVENLABS_AGENT_ID_GUIDE=agent_...

# === API Endpoints ===
VITE_REMOTE_ANALYSIS_ENDPOINT=https://your-gateway.fly.dev/api/analysis
VITE_REMOTE_TRANSITS_ENDPOINT=https://your-gateway.fly.dev/api/transits

# === Optional ===
PORT=8000
NODE_ENV=production
```

**Changes**:
1. ✅ Added `SUPABASE_URL` (Backend)
2. ✅ Renamed `ELEVENLABS_AGENT_ID_*` → `VITE_ELEVENLABS_AGENT_ID_*`
3. ✅ Added `ELEVENLABS_TOOL_SECRET` as required
4. ✅ Removed `SESSION_SECRET` (use `JWT_SECRET` consistently)
5. ✅ Clear separation: Backend vs Frontend vars

#### Step 3.2: Update config.ts to use VITE_ prefixed vars
**File**: `src/config.ts`

```typescript
export const ELEVENLABS_AGENT_IDS = {
  astrologer: import.meta.env.VITE_ELEVENLABS_AGENT_ID_ASTROLOGER,
  coach: import.meta.env.VITE_ELEVENLABS_AGENT_ID_COACH,
  guide: import.meta.env.VITE_ELEVENLABS_AGENT_ID_GUIDE,
} as const;

// Validate at build time
if (import.meta.env.PROD) {
  Object.entries(ELEVENLABS_AGENT_IDS).forEach(([key, value]) => {
    if (!value) {
      throw new Error(`Missing VITE_ELEVENLABS_AGENT_ID_${key.toUpperCase()} in production build`);
    }
  });
}
```

#### Step 3.3: Deactivate/Fix GitHub Pages Workflow
**File**: `.github/workflows/deploy.yml`

**Option 1: Deactivate**
```yaml
# Disabled: Use Vercel deployment instead
# name: Deploy to GitHub Pages
# ...
```

**Option 2: Use Secrets Only**
```yaml
env:
  VITE_ELEVENLABS_AGENT_ID_ASTROLOGER: ${{ secrets.VITE_ELEVENLABS_AGENT_ID_ASTROLOGER }}
  VITE_ELEVENLABS_AGENT_ID_COACH: ${{ secrets.VITE_ELEVENLABS_AGENT_ID_COACH }}
  VITE_ELEVENLABS_AGENT_ID_GUIDE: ${{ secrets.VITE_ELEVENLABS_AGENT_ID_GUIDE }}
  # ❌ NO hardcoded values!
```

#### Step 3.4: Add .env Validation Script
**File**: `scripts/validate-env.sh`

```bash
#!/bin/bash
set -e

REQUIRED_BACKEND=(
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "JWT_SECRET"
  "GEMINI_API_KEY"
  "ELEVENLABS_TOOL_SECRET"
)

REQUIRED_FRONTEND=(
  "VITE_SUPABASE_URL"
  "VITE_SUPABASE_ANON_KEY"
  "VITE_ELEVENLABS_AGENT_ID_ASTROLOGER"
  "VITE_ELEVENLABS_AGENT_ID_COACH"
  "VITE_ELEVENLABS_AGENT_ID_GUIDE"
  "VITE_REMOTE_ANALYSIS_ENDPOINT"
  "VITE_REMOTE_TRANSITS_ENDPOINT"
)

echo "Validating .env file..."

if [ ! -f .env ]; then
  echo "❌ .env file not found!"
  echo "💡 Copy .env.example to .env and fill in values"
  exit 1
fi

source .env

for var in "${REQUIRED_BACKEND[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required backend variable: $var"
    exit 1
  fi
done

for var in "${REQUIRED_FRONTEND[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required frontend variable: $var"
    exit 1
  fi
done

echo "✅ All required environment variables present"
```

### DoD for Priority 3
- [ ] .env.example korrigiert (SUPABASE_URL, VITE_ prefixes, ELEVENLABS_TOOL_SECRET)
- [ ] config.ts verwendet VITE_ prefixed vars
- [ ] GitHub Pages Workflow deaktiviert oder Secrets-only
- [ ] Validation Script erstellt und getestet
- [ ] Fresh clone + .env Setup ist eindeutig
- [ ] Keine hardcoded Agent IDs in Code/Workflows

---

## Priority 4: "Mock-frei" hart machen (NACH E2E)

### Problem
- ❌ supabaseClient.ts hat Stub-Fallback
- ❌ Hardcoded User-Display in UI
- ❌ Placeholder-Symbol nicht klar als solches markiert

### Implementation Steps

#### Step 4.1: Remove/Harden supabaseClient.ts Stub
**File**: `services/supabaseClient.ts`

**Current (WRONG)**:
```typescript
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key missing. Persistence will fail.');
  // ❌ Silent fallback - continues with broken client
}
```

**New (CORRECT)**:
```typescript
if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.PROD) {
    // Production: Fail hard
    throw new Error(
      'Supabase configuration missing in production. ' +
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
    );
  } else {
    // Development: Warn but allow (for local dev without Supabase)
    console.warn('⚠️ Supabase not configured. Persistence features disabled.');
  }
}
```

#### Step 4.2: Remove Hardcoded User Display
**File**: `components/Sidebar.tsx` (or wherever user display is)

**Current (WRONG)**:
```typescript
const userDisplay = user?.email || 'Demo User'; // ❌ Hardcoded fallback
```

**New (CORRECT)**:
```typescript
const userDisplay = user?.email || 'Anonymous'; // ✅ Neutral fallback
// Or even better: Don't show user display if not logged in
```

#### Step 4.3: Clarify Placeholder Symbol
**File**: `components/ResultSymbol.tsx`

**Current (UNCLEAR)**:
```typescript
if (!generatedImage) {
  return <div>Loading...</div>; // ❌ Unclear if placeholder or loading
}
```

**New (CLEAR)**:
```typescript
if (!generatedImage) {
  return (
    <div className="text-center p-8 bg-astro-card border border-astro-border rounded-lg">
      <p className="text-astro-subtext">No symbol generated yet</p>
      <button onClick={onGenerate}>Generate Symbol</button>
    </div>
  );
}
```

### DoD for Priority 4
- [ ] supabaseClient.ts fails hard in PROD if config missing
- [ ] Hardcoded "Demo User" removed/neutralized
- [ ] Placeholder-Symbol klar als "not generated" markiert
- [ ] Kein stilles Weiterlaufen mit Fake-Daten in PROD

---

## Implementation Order

### Week 1: Critical Path
1. **Day 1-2**: Priority 1 (Analyse-Flow)
   - UI: lat/lon/tz Felder
   - fetchRemoteAnalysis() Payload fix
   - chart_id Mapping

2. **Day 3**: Priority 2 Part 1 (Voice Setup)
   - conversation_id in Widget
   - Deploy to Fly.io staging

3. **Day 4**: Priority 2 Part 2 (Webhook)
   - Capture real webhook payload
   - Update webhook handler
   - Test E2E flow

4. **Day 5**: Priority 3 (Env & Doku)
   - .env.example korrigieren
   - Validation script
   - GitHub Workflow fix

### Week 2: Hardening
5. **Day 6-7**: Priority 4 (Mock-frei)
   - supabaseClient hardening
   - UI cleanup
   - Final E2E tests

---

## Testing Checklist

### E2E Happy Path
- [ ] User enters birth data (date, time, place, lat, lon, tz)
- [ ] Analysis request succeeds
- [ ] chart_id returned and stored
- [ ] AgentSelectionView shows agents (no error)
- [ ] User selects agent
- [ ] Voice session starts
- [ ] conversation_id passed to widget
- [ ] User completes voice session
- [ ] Webhook receives payload
- [ ] Webhook writes transcript to DB
- [ ] Webhook creates job
- [ ] User can resume conversation (chart_id + conversation_id present)

### Error Paths
- [ ] Missing lat/lon → Validation error
- [ ] Invalid timezone → Validation error
- [ ] No Supabase session → Auto-create anon session
- [ ] Analysis API fails → ErrorCard with Retry
- [ ] chart_id missing → Error overlay in AgentSelectionView
- [ ] Webhook fails → Error logged, conversation marked as failed

---

## Success Metrics

- ✅ 100% of analyses return chart_id
- ✅ 100% of voice sessions persist conversation_id
- ✅ 90%+ webhook success rate
- ✅ 0 silent fallbacks in production
- ✅ Fresh clone + .env setup works first try

---

## Out of Scope (for later PRs)

- ❌ Geocoding service integration
- ❌ GDPR compliance (consent screen, retention)
- ❌ Security hardening (rate limiting, CORS)
- ❌ Automated testing suite
- ❌ Performance optimization

