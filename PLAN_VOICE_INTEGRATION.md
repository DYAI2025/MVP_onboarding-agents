# Plan zur Integration von Datenbank & Voice Agent

## 1. Datenbank (Supabase)

Der Status der Datenbank ist **aktiv und funktionstüchtig**. Wir haben das Projekt `BaZidiac` verbunden, welches bereits eine vollständige Schema-Struktur (`profiles`, `natal_charts`, `astro_profiles`) besitzt.

Wir haben folgende Schritte unternommen:
1.  **Client Installiert**: `@supabase/supabase-js` wurde installiert.
2.  **Service Erstellt**: Ein `supabaseClient.ts` Service wurde erstellt, der:
    -   Automatisch eine (anonyme/temporäre) Authentifizierung durchführt.
    -   Die Berechnungsergebnisse (`FusionResult`) in die Tabellen `profiles` und `astro_profiles` schreibt.
3.  **Integration**: Die Speicher-Funktion wird nun automatisch nach jeder erfolgreichen Berechnung in `App.tsx` aufgerufen.

**Wichtig**: Damit dies funktioniert, müssen Sie die folgenden Umgebungsvariablen in ihrer `.env` Datei setzen:
```bash
VITE_SUPABASE_URL=https://ykoijifgweoapitabgxx.supabase.co
VITE_SUPABASE_ANON_KEY=... (Ihr public key von Supabase)
```

## 2. Voice Agent Integration (ElevenLabs)

Um dem Agenten "sofortigen Zugriff" auf die Ergebnisse zu geben, haben wir das `elevenlabs-convai` Widget in die `index.html` integriert.

### Strategie zur Datenübergabe
Da der Agent als externe Komponente läuft, gibt es zwei Wege, ihm Daten zu geben:

1.  **Frontend-Push (Implementiert)**:
    -   Sobald die Berechnung fertig ist, feuert die App ein Event `astro-data-ready`.
    -   Das Widget-Skript (in `index.html`) empfängt dieses Event.
    -   *Limitation*: Das Standard-Widget erlaubt keine einfache "stumme" Injection von Kontext in eine laufende Session ohne SDK-Anpassung.
    
2.  **Datenbank-Pull (Empfohlen für MVP+)**:
    -   Der Agent sollte in ElevenLabs so konfiguriert werden, dass er Zugriff auf eine "Tool" (API-Funktion) hat: `getUserProfile(userId)`.
    -   Da wir die Daten jetzt in Supabase speichern (`astro_profiles`), kann der Agent diese **persistent** abrufen, egal wann das Gespräch stattfindet.

### Nächste Schritte für Sie

1.  Tragen Sie Ihre `agent-id` in der `index.html` ein (`<elevenlabs-convai agent-id="...">`).
2.  Konfigurieren Sie im ElevenLabs Dashboard den System-Prompt des Agenten so, dass er weiß, dass er ein Astrologe ist.
3.  (Optional) Erstellen Sie eine Edge Function in Supabase, die der Agent aufrufen kann, um das Profil zu lesen.

## Zusammenfassung
Die technische Grundlage steht: Die Berechnungen sind präzise (Python-Backend), sie werden gespeichert (Supabase), und das Voice-Widget ist eingebettet.
