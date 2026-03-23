# KADRA AI-Chat Feature — Spezifikation

> Ergebnis der Konzeptionsphase vom 03.03.2026.
> Dieses Dokument dient als Briefing fuer Claude Code bei der Umsetzung.

---

## Ueberblick

KADRA erhaelt ein integriertes AI-Chat-Feature, mit dem der Benutzer Fragen zu seinen Protokolldaten stellen kann. Der Chat greift ueber die Anthropic API direkt auf Claude zu und nutzt die in IndexedDB gespeicherten Protokolldaten als Kontext.

Referenz-UI: Jamie AI (Screenshots vorhanden) — Chat-Fenster mit History-Liste.

---

## Architektur-Entscheidungen

| Thema | Entscheidung | Begruendung |
|-------|-------------|-------------|
| **API-Anbindung** | Option A: Direkter Browser-Aufruf | Kein Backend noetig. Einzelnutzer-Setup, Key liegt nicht im Code. Header `anthropic-dangerous-direct-browser-access: true` erforderlich. |
| **API-Key Speicherung** | `localStorage` | Analog zu `kadra_saveFileName`. Key wird NICHT im Code/Repo gespeichert. |
| **API-Key Eingabe** | Beim ersten Chat-Oeffnen abfragen | Wenn `localStorage` keinen Key enthaelt, erscheint ein Eingabefeld bevor der Chat nutzbar ist. |
| **Modell** | Claude Sonnet 4 (`claude-sonnet-4-20250514`) | Gutes Preis-Leistungs-Verhaeltnis fuer den Anwendungsfall. |
| **Streaming** | Ja (Server-Sent Events) | Fluessigere UX, Antwort erscheint Wort fuer Wort. |
| **Sprache** | System-Prompt: immer Deutsch antworten | Claude versteht trotzdem englische Protokollinhalte und kann darueber auf Deutsch antworten. User kann per Nachricht uebersteuern. |

---

## Kontext-Handling

### Scope-Auswahl
- **Dropdown im Chat-Fenster** (nicht an Sidebar-Auswahl gekoppelt)
- Optionen: "Projekt" (Default) oder eine spezifische Serie aus dem aktuellen Projekt
- Serien-Liste wird dynamisch aus den Protokollen des aktuellen Projekts generiert

### Kontext-Aufbereitung
- **Zeitpunkt**: Einmalig beim Chat-Oeffnen (on-demand)
- **Lebensdauer**: Bleibt fuer die gesamte Chat-Session fix (kein Refresh bei Aenderungen)
- **Format**: Kompakter strukturierter Text (kein rohes JSON), z.B.:
  ```
  Serie: Planer Jour Fixe — Projekt: Buerogebaeude Mainzer Str.

  Protokoll #11 (15.01.2026)
    #11|B.1.01 [Aufgabe] Grundrisse Ebene 3 — Mueller GmbH — Frist: 22.01.2026 — offen
    #11|B.1.02 [Festlegung] Tuerbreiten lt. Norm — erledigt
    ...
  ```

### Token-Budget (Schaetzung)
| Scope | Protokolle | Tokens | Machbar? |
|-------|-----------|--------|----------|
| 1 Serie (10-15 Protokolle) | 10-15 | ~15.000 | Problemlos |
| 1 Projekt (30-50 Protokolle) | 30-50 | ~50.000-75.000 | Gut machbar |
| 3 Projekte (spaeter, Stufe 3) | 90-150 | ~150.000+ | Grenzwertig, nicht fuer V1 |

Verfuegbares Kontextfenster Claude Sonnet 4: 200.000 Tokens. Abzueglich System-Prompt, Chat-Historie und Antwort bleiben ca. 150.000 Tokens fuer Protokolldaten.

---

## UI-Design

### Chat-Button
- **Position**: Sidebar, immer sichtbar, oberhalb "Papierkorb anzeigen"
- **Icon**: Sparkle/Sternchen-Symbol (typisches AI-Icon)
- **Label**: "AI-Chat" o.ae.

### Chat-Fenster
- **Layout**: Noch offen — Overlay/Modal ODER eingeschobenes Panel zwischen Sidebar und Protokollbereich. Wird bei der Umsetzung entschieden.
- **Bestandteile**:
  - Header mit Titel, History-Button, Neuer-Chat-Button, Schliessen-Button
  - Scope-Dropdown (Projekt / Serie)
  - Nachrichtenverlauf (User + Assistant, scrollbar)
  - Eingabefeld + Senden-Button

### Chat-Historie (Jamie-Pattern)
- **Mehrere Chats** pro Projekt/Serie moeglich
- **History-Ansicht**: Liste aller bisherigen Chats (Titel + Zeitstempel)
- **Navigation**: Chat-Fenster ↔ History-Liste ueber Button im Header
- **Neuer Chat**: Aus History heraus oder ueber Button → leere Seite

---

## Datenmodell

Neuer Object Store in IndexedDB:

```
chats — {
  id,                    // UUID
  scope: 'series' | 'project',
  scopeId,               // seriesId oder projectId
  title,                 // z.B. erste Frage oder automatisch generiert
  messages: [
    { role: 'user', content: '...' },
    { role: 'assistant', content: '...' }
  ],
  contextSnapshot,       // aufbereiteter Kontext-Text zum Zeitpunkt des Chat-Starts
  createdAt,             // ISO-Timestamp
  updatedAt              // ISO-Timestamp
}
```

### DB-Integration
- Chat-Verlauf lebt in derselben IndexedDB wie Protokolldaten
- **DB exportieren/importieren**: Chat-Verlauf wandert mit (`exportFullDB`/`importFullDB` erweitern)
- **DB schliessen**: Chat-Verlauf wird mit geloescht (normales Verhalten)

---

## API-Aufruf (Referenz)

```js
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': localStorage.getItem('kadra_claude_api_key'),
    'content-type': 'application/json',
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    stream: true,
    system: `Du bist ein Assistent fuer Besprechungsprotokolle im Bauwesen (AHO-Standard).
             Antworte immer auf Deutsch.
             Hier sind die Protokolldaten:\n\n${kontextText}`,
    messages: chatMessages
  })
});
```

---

## Kosten-Schaetzung

| Scope | Kosten pro Nachricht (Sonnet) |
|-------|------------------------------|
| 1 Serie (~15K Tokens) | ~$0.05 |
| 1 Projekt (~60K Tokens) | ~$0.18 |

Bei normaler Nutzung (wenige Chats pro Tag): wenige Dollar pro Monat.

---

## Nicht in V1 (spaeter)

- Stufe 3: Chat ueber alle Projekte (Zusammenfassungs-Strategie noetig)
- Quick-Actions / vorgefertigte Prompts ("Offene Aufgaben", "Zusammenfassung")
- Chat-Fenster-Layout endgueltig festlegen (Overlay vs. Panel)
- API-Key aendern/loeschen ueber Drei-Punkte-Menue
- Token-Verbrauch / Kosten-Anzeige im Chat

---

## Voraussetzungen

- Anthropic API-Key (console.anthropic.com)
- Kein Build-Tool noetig (fetch + SSE nativ im Browser)
- CORS: Anthropic erlaubt Browser-Aufrufe mit `anthropic-dangerous-direct-browser-access` Header
