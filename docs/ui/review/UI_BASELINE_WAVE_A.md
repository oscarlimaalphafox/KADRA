# Welle A Baseline (UI/Frontend)

Stand: 2026-03-13
Zweck: Referenzzustand vor dem technischen Aufraeumen (ohne Funktionsumbau)

## Scope dieser Baseline
- Fokus: `index.html`, `js/app.js`, `src/main.css`, `themes/*`, `css/legacy.css`
- Ausserhalb Scope: Datenmodell, IDs, DB-Logik, PDF-Export-Funktionalitaet

## Referenz-Screenshots (Baseline-Set)
- `S1` Gesamtansicht mit geoeffnetem Projekt-Menue (von User bereitgestellt)
- `S2` Gesamtansicht mit Fokus auf `TEILNEHMER` + `INHALTE` (von User bereitgestellt)
- `S3` Gesamtansicht mit geoeffnetem Projekt-Menue und sichtbaren Tabellenzeilen (von User bereitgestellt)

Hinweis:
- `TEILNEHMER` gilt als Referenz-Frame (optisch/strukturell bereits korrekt).
- In Welle A werden Screens als Vergleichsgrundlage genutzt, nicht als Redesign-Vorgabe fuer Fachlogik.

## Smoke-Test Checkliste (nach jedem Task in Welle A)
1. App startet, Login funktioniert.
2. Projekt kann ausgewaehlt werden.
3. Protokollliste laedt (Terminserien + Einzeldokumente sichtbar).
4. Protokoll oeffnet, Toolbar wird sichtbar.
5. `TEILNEHMER`: Teilnehmer hinzufuegen/entfernen, Checkboxen klicken.
6. `INHALTE`: bestehende Punkte sichtbar, Kapitel ein/ausklappen.
7. Suche in Toolbar: Eingabe, Trefferzaehler, Vor/Zurueck.
8. Menue-Aktionen in Sidebar-Menue sind klickbar.
9. `ANLAGEN`: Zeilen sichtbar, Dateipicker oeffnet.
10. Protokoll-Loeschen in Papierkorb funktioniert.
11. Papierkorb oeffnet/schliesst.
12. PDF-Button ist klickbar (nur Ausloesen pruefen, keine Funktionsaenderung).

## Defect-Log Start (nur dokumentieren in Welle A)
### Frame `INHALTE`
- Status: nach UI-Umstellung funktional inkonsistent (laut Product-Hinweis).
- Welle A Regel: keine inhaltliche Reparatur, nur Stabilisierung der umgebenden UI-Schicht.
- Welle B: gezielte Reparatur mit reproduzierbaren Einzeldefekten.

## Go/No-Go Regel nach jedem Task
- Go nur wenn:
  - Smoke-Test ohne neue Regressionen bestanden.
  - Keine Aenderung an DB-/ID-/PDF-Funktionalitaet.
  - `TEILNEHMER` bleibt visuell und funktional stabil.
