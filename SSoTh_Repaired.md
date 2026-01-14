# SSoTh (Statement of Work Template) – Präzise Dokumentation für AI-Agenten

**Dokument-ID:** SSoTh_20260114_002  
**Datum:** Mittwoch, 14. Januar 2026  
**Zweck:** Exakte Anweisungen für die Bearbeitung von Bild- und Textelementen auf der Webseite [https://flo.fun/puKfbPk/#contact](https://flo.fun/puKfbPk/#contact).

---

## 1. Allgemeine Struktur der Seite

Die Seite ist ein einfaches Single-Page-Layout mit folgenden Hauptbereichen (kodiert als Markdown-Struktur):

1. **Hero-Bereich** (ID: `hero`)
2. **Fine Art-Sektion** (ID: `fine-art`)
3. **Surf & Action-Sektion** (ID: `surf-action`)
4. **Exclusive Properties-Sektion** (ID: `exclusive`)
5. **Complete Collection-Sektion** (ID: `complete`)
6. **Elite Standard-Sektion** (ID: `elite`)
7. **Kontaktbereich** (ID: `contact`)

> **Hinweis:** Die Sektionen sind durch `##`-Header strukturiert und verfügen über eindeutige IDs (z. B. `#contact` im URL-Anchor).

---

## 2. Detaillierte Struktur & Elementidentifikation

### 2.1 Hero-Bereich (ID: `hero`)

* **Struktur:** `img#hero-image` (Bild)
* **Aktueller Pfad:** `https://r2-bucket.flowith.net/f/31788a5ef239705e/aerial_bw_nude_rocky_stream_index_0%404096x2286.jpeg`
* **Alt-Text:** "Hero Aerial Fine Art"
* **Zu bearbeiten:**
  * **Neuer Bildpfad:** `/assets/hero_2026.jpg` (Hinweis: Datei muss im gleichen Verzeichnis vorhanden sein)
  * **Neuer Alt-Text:** "Hero Aerial Fine Art 2026"

### 2.2 Fine Art-Sektion (ID: `fine-art`)

* **Struktur:**
  * **Header (ID: fine-art-header):** `h2#fine-art-header` (Text: "Fine Art")
  * **Bild (ID: fine-art-image):** `img#fine-art-image` (Bild)
* **Aktueller Pfad:** `https://images.unsplash.com/photo-1496337589254-7e19d01cedf8?auto=format&fit=crop&q=80&w=2000`
* **Alt-Text:** "Fine Art Feature"
* **Zu bearbeiten:**
  * **Neuer Bildpfad:** `/assets/fine_art_2026.jpg`
  * **Neuer Alt-Text:** "Fine Art Feature 2026"
* **Textblock (ID: fine-art-text):** `p#fine-art-text` (Text: "Aerials. Redefining aerial photography through shadow and light. Our fine art collection captures the raw geometry of the natural world in stark black and white.")
* **Zu bearbeiten:**
  * **Neuer Text:** "Aerials. Redefining aerial photography through shadow and light. Our 2026 fine art collection captures the raw geometry of the natural world in stark black and white."

### 2.3 Surf & Action-Sektion (ID: `surf-action`)

* **Struktur:**
  * **Header (ID: surf-action-header):** `h2#surf-action-header` (Text: "Surf &")
  * **Textblock (ID: surf-action-text):** `p#surf-action-text` (Text: "Action. Capturing the pulse of the ocean. From crystal-clear reef breaks to dramatic silhouetted line-ups.")
* **Zu bearbeiten:**
  * **Neuer Text:** "Action. Capturing the pulse of the ocean. From crystal-clear reef breaks to dramatic silhouetted line-ups – now with 4K resolution."

### 2.4 Exclusive Properties-Sektion (ID: `exclusive`)

* **Struktur:**
  * **Header (ID: exclusive-header):** `h2#exclusive-header` (Text: "Exclusive")
  * **Textblock (ID: exclusive-text):** `p#exclusive-text` (Text: "Properties")
* **Zu bearbeiten:**
  * **Neuer Text:** "Properties – Curated for luxury."

### 2.5 Complete Collection-Sektion (ID: `complete`)

* **Struktur:**
  * **Header (ID: complete-header):** `h2#complete-header` (Text: "Complete Collection")
* **Zu bearbeiten:**
  * **Neuer Text:** "Complete Collection 2026"

### 2.6 Elite Standard-Sektion (ID: `elite`)

* **Struktur:**
  * **Header (ID: elite-header):** `h2#elite-header` (Text: "Elite")
  * **Textblock (ID: elite-text):** `p#elite-text` (Text: "Standard. Providing cinema-grade aerial content for luxury brands and exclusive estates globally.")
* **Zu bearbeiten:**
  * **Neuer Text:** "Standard. Providing cinema-grade aerial content for luxury brands and exclusive estates globally – since 2026."

### 2.7 Kontaktbereich (ID: `contact`)

* **Struktur:**
  * **Email (ID: contact-email):** `a#contact-email` (Text: `<agency@tropicalvue.com>`)
* **Zu bearbeiten:**
  * **Neuer Email-Text:** `<agency@tropicalvue2026.com>`
* **Telefon (ID: contact-phone):** `a#contact-phone` (Text: `+49 800 500 200`)
* **Zu bearbeiten:**
  * **Neuer Telefon-Text:** `+49 800 500 2026`

---

## 3. Technische Anweisungen für den AI-Agenten

### 3.1 Bildbearbeitung

* **Regel 1:** Ersetze nur die `src`-Attribute der Bilder mit den in der Tabelle angegebenen Pfaden.
  * *Beispiel:* `<img src="...">`
* **Regel 2:** Prüfe, ob die neue Bilddatei existiert (Pfad: `/assets/...`). Falls nicht, generiere eine Warnung.

### 3.2 Textbearbeitung

* **Regel 1:** Ersetze genau den Text innerhalb der Elemente (nicht die HTML-Struktur).
* **Regel 2:** Ignoriere alle Elemente ohne expliziten Eintrag in der Tabelle (z. B. `div#footer-social`).

### 3.3 Validierungsanforderungen

Prüfe nach der Bearbeitung:

1. Alle Bilder haben korrekte `src`-Pfade und `alt`-Texte.
2. Alle Textelemente wurden exakt mit den neuen Inhalten ersetzt.
3. Der Kontaktbereich (ID: `contact`) enthält die aktualisierten Email- und Telefon-Texte.

> **Wichtig:** Der AI-Agent muss nur die in diesem Dokument spezifizierten Elemente bearbeiten. Änderungen an nicht aufgeführten Elementen sind verboten.

---

## Anhang: Kontext & FAQ

**Frage:** Ist das (SSoTh-)Dokument eine Art Schnittstelle oder Tool?

**Antwort:**
Nein, das SSoTh-Dokument ist keine Schnittstelle oder ein Tool, sondern ein **präzises Referenzdokument (Statement of Work Template)**.

**Wichtigste Unterscheidung:**

* **Schnittstelle (z. B. API):** Wäre ein technisches Verbindungselement zwischen Systemen (z. B. für Datenübertragung).
* **Tool:** Wäre eine Software/Anwendung, die eine Aufgabe ausführt (z. B. Bildbearbeitungsprogramm).
* **SSoTh:** Ist ein dokumentarisches Arbeitsanweisungsformat.

**Es definiert:**

1. Die Seite strukturiert.
2. Exakte Änderungsvorgaben für Bild- und Textelemente.
3. Validierungsregeln für den AI-Agenten.

**Warum es keine Schnittstelle/kein Tool ist:**

* Es enthält keine technischen Protokolle (z. B. API-Endpoints, JSON-Strukturen).
* Es führt keine Aktionen aus – es gibt nur Anweisungen, wie ein Agent handeln soll.
* Es ist ein rein textbasiertes Dokument (in Markdown/Struktur) für menschliche und maschinelle Lesbarkeit.

**Ziel des SSoTh:**
Durch die detaillierte Strukturierung der Seite (mit Element-IDs, Pfaden, Textinhalten) wird ein unmissverständlicher Handlungsleitfaden für den AI-Agenten geschaffen. Dies vermeidet Fehlinterpretationen bei der Bearbeitung.

**Zusammenfassung:**
Das SSoTh ist ein Arbeitsdokument, das als Kommunikationsbrücke zwischen Mensch (der die Änderungen vorgibt) und AI-Agent (der sie ausführt) dient.
