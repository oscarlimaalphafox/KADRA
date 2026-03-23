# Welle B Vorbereitung: Frame INHALTE

Stand: 2026-03-13
Status: Vorbereitungsdokument fuer gezielte Reparatur nach Welle A

## Ziel
`INHALTE` (Kapitel/Unterkapitel/Themen/Punkte/Termine/Filter) funktional stabil und UI-konsistent zum neuen Interface machen.

## Nicht-Ziel
- Keine Aenderung an Datenmodell, IDs, DB-API, PDF-Export.

## Kern-Hotspots in `js/app.js`
- `renderPoints(protocol)`
- `createPointRow(...)`
- `saveCurrentProtocol()`
- `addPoint()`
- `startAddSubchapter()` / `saveSubchapter()`
- `startAddTopic()` / `saveTopic()`
- `deleteSubchapter(...)` / `deleteTopic(...)`
- `applyPointFilters()` / `setupPointFilter()`
- `applyChapterFilter()` / `setupChapterFilter()`

## Defect-Erfassung (Template)
Pro Defect bitte erfassen:
1. Titel
2. Reproduktionsschritte
3. Erwartetes Verhalten
4. Ist-Verhalten
5. Betroffene Daten (Kapitel/UKAP/Thema/ID/Termin)
6. Schweregrad (Blocker/Hoch/Mittel/Niedrig)

## Empfohlene Fix-Reihenfolge (risikoarm)
1. Rendering-Stabilitaet (nur Anzeige, keine Mutationen)
2. Save-Synchronisierung (DOM -> Model)
3. Struktur-Aktionen (KAP/UKAP/THEMA anlegen/loeschen)
4. Punkt-Aktionen (anlegen/loeschen/editieren)
5. Filter + Suche + Collapse-Zustaende
6. Drag & Drop zuletzt (hoechstes Interaktionsrisiko)

## Smoke-Suite fuer INHALTE (Welle B)
1. Kapitel ein-/ausklappen (mehrfach)
2. Unterkapitel anlegen, umbenennen, loeschen
3. Thema anlegen, umbenennen, loeschen
4. Punkt anlegen und speichern
5. Kategorie-Logik pruefen (Info/Festlegung deaktiviert Felder korrekt)
6. Termin setzen/aendern
7. Filterkombinationen pruefen
8. Suche + Treffer-Navigation pruefen
9. Nach Reload Zustand pruefen (Persistenz)

## Technische Guardrails waehrend Welle B
- Keine Aenderung an `DB.*` Signaturen.
- Keine Aenderung an Point-ID-Logik.
- Kein Eingriff in PDF-Funktionen.
- Pro Defect ein isolierter Fix mit direktem Retest.
