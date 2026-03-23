# Welle A Fortschritt

Stand: 2026-03-13

## Status
- [x] A1 Baseline einfrieren
- [x] A2 Scope-Schutz einbauen
- [x] A3 Token-Inventur
- [x] A4 Token-Bridge (kollidierende Basis-Tokens in legacy reduziert)
- [x] A5 Suche auf einen aktiven Flow reduzieren (Toolbar)
- [x] A6 Inline-Handler entfernen (`onclick` aus `index.html`)
- [x] A7 Event-Binding stabilisieren (Search-Guard, Reload/Checkbox-Binding, Render-Lifecycle fuer INHALTE-Drag-Listener per AbortController)
- [x] A8 Sidebar/Toolbar semantisch haerten (Role/Tab/Keyboard/ARIA)
- [x] A9 CSS-Schichten ordnen (Doku + Import-Layer geklaert)
- [~] A10 Hardcoded-Stile entfernen (Empty-State-SVG tokenisiert, mehrere Inline-Styles in Klassen ueberfuehrt)
- [~] A11 Legacy-Reduktionspass (Legacy-Searchbar-CSS + tote Sidebar-Selektoren + tote projectSelect-Fallbacks + lucide komplett entfernt (Init + Script + SW-Asset) + Projekt-Selector-Resets bereinigt)
- [ ] A12 Welle-A Abnahme (manuelle Smoke-Suite offen)

## In dieser Iteration umgesetzt
1. Dokumente: Baseline/Scope/Token-Inventur/Fortschritt/Abnahme-Readiness.
2. `legacy.css` Root als Bridge/Hilfsvariablen konsolidiert.
3. Legacy-Suchleiste aus HTML + zugehoeriger Legacy-CSS-Block entfernt.
4. Suche auf Toolbar-Flow fokussiert (`openSearch/closeSearch`).
5. Inline-`onclick` entfernt, JS-Bindings fuer Reload + New-Participant-Checkboxen.
6. Sidebar-Interaktion semantisch gehaertet (keyboardfaehige Header/Items, ARIA-Zustaende).
7. Hardcoded Empty-State-Farben auf Tokens umgestellt.
8. Tote Legacy-Fallbacks reduziert (`projectSelect`-Pfade, alte Sidebar-Selectoren).
9. Unbenutzte Lucide vollständig entfernt (Script, Init-Aufruf, SW-Cache-Asset, Datei).

## Sicherheit
- Keine Aenderung an `js/db.js`, IDs, Datenmodell oder `js/pdf-export.js`.
- Nach den Schritten jeweils JS-Parse + CSS-Build erfolgreich.


## Zusatz-Update 2026-03-13 (laufend)
- Produkt-Leitplanke bestätigt: `TEILNEHMER` bleibt als visuelle/funktionale Referenz unangetastet.
- Produkt-Leitplanke bestätigt: `ANLAGEN` bleibt visuell unangetastet; Fokus auf Funktionsreparatur.
- Upload-Fix `ANLAGEN`: Dateipicker-Flow für `Datei auswählen` stabilisiert (Picker wird jetzt direkt im User-Gesture-Kontext geöffnet; neue Anlage wird erst nach Dateiauswahl erstellt).
- Technische Checks nach Fix: `node --check js/app.js` und `npm run build` erfolgreich.
- INHALTE Stabilisierung: Save-Pipeline serialisiert (_saveQueue) zur Reduktion von Persistenz-Rennen bei schnellen UI-Aktionen.

- INHALTE Stabilisierung (B-003): Struktur-Aktionen (KAP/UKAP/THEMA) funktional gehaertet; Duplicate-Checks, stale-selection/protocol-guards und saubere Selection-Cleanup-Logik nach Loeschungen umgesetzt.
- Text-Qualitaet: sichtbare Mojibake-Toastmeldungen in js/app.js systematisch bereinigt (ASCII-safe Messages), um unlesbare UI-Hinweise in laufender Bereinigungsphase zu vermeiden.

- Test-ready Pass: Sichtbare Mojibake-Nutzertexte in js/app.js weitgehend bereinigt (Labels, Placeholder, Confirm-Dialoge, Projekt-/Papierkorbtexte, QuickSave-Label-Sentinel). Verbleibende Marker betreffen primär Kommentare und beeinflussen die UI-Ausgabe nicht.

- Test-ready Abschluss: Encoding-/Mojibake-Bereinigung in index.html und js/app.js abgeschlossen (sichtbare UI-Texte, Placeholder, Labels, Dialogtexte, Kommentare bereinigt).
- Abschluss-Checks: 
ode --check js/app.js und 
pm.cmd run build erfolgreich.
