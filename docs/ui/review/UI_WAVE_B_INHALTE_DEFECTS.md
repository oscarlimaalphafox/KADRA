# Welle B Defect Backlog: INHALTE

Stand: 2026-03-13

## Legende
- Severity: Blocker | Hoch | Mittel | Niedrig
- Status: Offen | In Analyse | In Arbeit | Behoben | Verifiziert

## Defects

### B-001 Struktur-Rendering bricht/verschiebt sich in bestimmten Hierarchien
- Severity: Hoch
- Status: Offen
- Repro: tbd
- Erwartet: Kapitel/Unterkapitel/Thema/Punkt werden konsistent und stabil gerendert.
- Ist: laut Produktfeedback ist der Frame nach UI-Umstellung funktional inkonsistent.
- Betroffene Bereiche: `renderPoints()`, `createPointRow()`.

### B-002 Persistenz-Sync unzuverlaessig bei schnellen UI-Aktionen
- Severity: Hoch
- Status: Offen
- Repro: tbd
- Erwartet: Aenderungen sind nach Save/Reload vollstaendig konsistent.
- Ist: tbd (zu verifizieren in manueller Testserie).
- Betroffene Bereiche: `saveCurrentProtocol()`, Blur-/Change-Handler im INHALTE-Rendering.

### B-003 Struktur-Aktionen (KAP/UKAP/THEMA) inkonsistent
- Severity: Hoch
- Status: Offen
- Repro: tbd
- Erwartet: Add/Edit/Delete fuer Kapitelstruktur ohne Seiteneffekte.
- Ist: tbd
- Betroffene Bereiche: `startAddSubchapter()`, `saveSubchapter()`, `startAddTopic()`, `saveTopic()`, `deleteSubchapter()`, `deleteTopic()`.

### B-004 Filter/Collapse/Suche interferieren miteinander
- Severity: Mittel
- Status: Offen
- Repro: tbd
- Erwartet: Filter, Collapse und Suche sind kombinierbar ohne falsch versteckte Zeilen.
- Ist: tbd
- Betroffene Bereiche: `applyPointFilters()`, `applyChapterFilter()`, `executeSearch()`.

### B-005 Drag-&-Drop in INHALTE instabil bei laengeren Sessions
- Severity: Mittel
- Status: In Arbeit
- Repro: laengere Session mit vielen Re-Renders (Edit/Add/Drag)
- Erwartet: DnD bleibt stabil, keine Geisterzustande.
- Ist: Listener-Leak war wahrscheinlich; Render-Lifecycle wurde bereits per AbortController abgesichert (technischer Teilfix).
- Betroffene Bereiche: Drag-Handler in Kapitel/Unterkapitel/Thema/Punkt-Abschnitten.

## Naechster Schritt
- Manuelle Repro-Erfassung je Defect (Schrittfolge + Ist/Erwartet + Datenstand).
- Danach jeweils isolierter Fix pro Defect-ID.


## Letzter technischer Schritt
- `renderPoints()` fuehrt jetzt einen Render-scope `AbortController`, der document-Listener aus dem vorherigen Render aufraeumt.
- Offene Arbeit: fachliche Repro-Faelle fuer B-001 bis B-004/B-005 verifizieren.

## Update 2026-03-13 (laufend)
- B-001: Teilfix umgesetzt: Selektion wird nach jedem INHALTE-Render gegen DOM synchronisiert (syncSelectionAfterRender).
- B-002: Teilfix umgesetzt: Sequenzvergabe fuer neue Punkte nutzt Max-Seq statt Count; Speichern nutzt robuste ID-Queues bei doppelten IDs.

- B-004: Teilfix umgesetzt: aktive Suche wird nach Punkt-/Kapitel-Filter-Aenderungen automatisch neu berechnet; leeres Suchfeld blendet Zaehler/Navi konsistent aus.
- B-004: Teilfix erweitert: Suche ignoriert jetzt eingeklappte (ow-hidden) Punktzeilen; Collapse/Collapse-All triggern bei aktiver Suche eine automatische Re-Synchronisierung.
- B-003: Teilfix umgesetzt: addPoint() validiert jetzt Kapitel/Unterkapitel/Thema hart (verhindert verwaiste Punkte); saveSubchapter() zeigt bei stale Auswahl einen klaren Fehler; beim Loeschen von Kapitel/Unterkapitel werden Filter-/Collapse-Reste mit aufgeraeumt.
- B-004: Teilfix erweitert: Collapse-All-Button/Zustand wird jetzt aus den realen Section-Collapse-States synchronisiert (inkl. Icon), auch nach Einzel-Collapse, Re-Render und Struktur√§nderungen.
- B-002: Teilfix erweitert: saveCurrentProtocol() wird jetzt serialisiert (_saveQueue), damit schnelle Change-/Blur-/Input-Events keine konkurrierenden DB-Schreibvorgaenge ausloesen.

- B-003: Teilfix erweitert: KAP/UKAP/THEMA-Aktionen gegen stale Protokollwechsel gehaertet (Modal-Flow prueft protocolId vor Save), Duplicate-Checks fuer UKAP/THEMA ergaenzt und Auswahlzustand nach Loeschaktionen konsistent geleert.
- B-003: Teilfix erweitert: Kapitel-Delete-Guardrails vereinheitlicht (Aktennotiz P/N fix, Mindestabschnitt, A-E Schutz), Nutzertexte fuer diese Flows bereinigt (ASCII-safe).

- B-004/B-003 Vorbereitung Test-Ready: Such-/Filter-/Collapse-Hooks erneut auf Konsistenz geprueft; sichtbare Interaktionsmeldungen und Strukturtexte in INHALTE bereinigt, damit Repro-/Abnahmetests nicht durch kaputte UI-Texte verf‰lscht werden.

- Vor Testphase: INHALTE-Bereich textlich/technisch auf testbaren Stand gebracht; Strukturaktionen (B-003) gehaertet, Such-/Filter-/Collapse-Pfade konsolidiert, keine Encoding-Artefakte mehr in UI-relevanten Strings.
