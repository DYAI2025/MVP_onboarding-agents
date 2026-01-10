# Plan zur Integration der BaZiEngine ins Backend

Basierend auf der Analyse des Repositories ist die Integration der vollständigen `BaZiEngine` (Python-basiert) möglich und der empfohlene Weg, um präzise astronomische Berechnungen (Swiss Ephemeris) zu gewährleisten.

## Analyse-Status

1.  **Frontend (Aktuell)**:
    -   Verwendet `services/astroPhysics.ts` für Berechnungen.
    -   Nachteil: Nutzt vereinfachte Algorithmen ("Simulation"), die für professionelle Astrologie nicht ausreichen (z.B. keine exakten Planetenpositionen, keine echten Häusersysteme).
2.  **Backend (Ziel)**:
    -   Das Verzeichnis `BaZiEngine_v2/bazi_engine_v0_2` enthält eine vollständige FastAPI-Applikation.
    -   Technologie: Python, `fastapi`, `pyswisseph` (Swiss Ephemeris).
    -   Status: Der Code sieht vollständig und korrekt aus. Er implementiert präzise westliche Astrologie (inkl. Chiron, Lilith, True Node) und chinesische BaZi-Berechnungen.

## Integrations-Plan

### Phase 1: Backend-Infrastruktur einrichten

1.  **Python-Environment erstellen**:
    -   Einrichten eines Virtual Environments (`venv`) im Ordner `BaZiEngine_v2/bazi_engine_v0_2`.
    -   Installation der Abhängigkeiten: `pip install uvicorn fastapi pyswisseph`.
    -   *Optional*: Herunterladen der Ephemeriden-Dateien (für höchste Präzision über längere Zeiträume), falls diese nicht standardmäßig von `pyswisseph` gefunden werden.

2.  **Server-Start & Test**:
    -   Starten des API-Servers via `uvicorn`.
    -   Testen der Endpunkte `/calculate/western` und `/calculate/bazi` mittels `curl` oder Postman.

### Phase 2: Frontend-Integration

1.  **Proxy-Konfiguration**:
    -   Einrichten eines Proxys in `vite.config.ts`, um API-Anfragen (z.B. `/api/v1`) an den lokalen Python-Server (Port 8000) weiterzuleiten.

2.  **API-Client implementieren**:
    -   Erstellen eines neuen Service `services/astroApi.ts`.
    -   Dieser Service ersetzt die Logik in `services/astroPhysics.ts`. Anstatt lokal zu rechnen, sendet er die Geburtsdaten an das Backend.

3.  **Daten-Mapping (Adapter Pattern)**:
    -   Das Backend liefert sehr detaillierte Daten (Gradzahlen, Geschwindigkeiten).
    -   Das Frontend erwartet aktuell vereinfachte Interfaces (`WesternAnalysis`, `EasternAnalysis`).
    -   Erstellen einer Adapter-Funktion, die die Backend-Antwort in das vom Frontend erwartete Format umwandelt, damit die UI ohne große Änderungen weiterfunktioniert.
    -   *Langfristig*: UI erweitern, um die präzisen Daten (z.B. genaue Gradzahlen) anzuzeigen.

### Phase 3: Validierung

1.  **Vergleichstest**:
    -   Vergleich der Ergebnisse eines Test-Charts (z.B. "Jetzt") mit einer Referenz (z.B. Astro.com).
    -   Sicherstellen, dass Aszendent, Mond und Häuserspitzen korrekt sind.

## Zeitplan (Schätzung)

-   **Backend Setup**: 30 Min
-   **Frontend API Integration**: 1-2 Stunden
-   **Testing & Bugfixing**: 1 Stunde

## Fallback (Falls Integration scheitert)

Sollte das Python-Backend aus technischen Gründen (z.B. Hosting-Einschränkungen) nicht nutzbar sein, wäre die Alternative:
-   Portierung der `pyswisseph`-Logik nach Node.js mittels `swisseph`-NPM-Paket (C++ Binding). Dies ist aufwändiger, da der komplette Python-Code (insb. BaZi-Logik) nach TypeScript übersetzt werden müsste.
-   Daher ist die Python-Integration **dringend empfohlen**.
