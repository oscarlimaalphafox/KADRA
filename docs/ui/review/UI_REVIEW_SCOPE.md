# UI Review Scope (Welle A)

Stand: 2026-03-13

## Ziel
Frontend, Interface und Design-Schicht aufraeumen/straffen, ohne Fachfunktionalitaet zu aendern.

## In Scope (Welle A)
- `index.html`
- `js/app.js` (nur UI/Render/Event-Organisation)
- `src/main.css`
- `themes/hopro.css`
- `themes/kadra.css`
- `css/legacy.css`

## Explizit Out of Scope (funktional unveraendert)
- `js/db.js`
- Datenmodell (Projekte, Protokolle, Punkte, Anlagen)
- ID-Generierung und ID-Syntax
- Import/Export-Datenstruktur
- `js/pdf-export.js`

## Frame-Regel
- `TEILNEHMER`: Referenz-Frame, nur technische Mini-Anpassungen erlaubt, keine visuelle/funktionale Abweichung.
- `INHALTE`: in Welle A nicht reparieren; nur stabilisierende Umgebungsaenderungen.

## Aenderungsregeln
1. Kleine, isolierte Schritte.
2. Nach jedem Schritt Smoke-Test gegen `docs/ui/review/UI_BASELINE_WAVE_A.md`.
3. Keine Misch-PRs aus Design-Refactor und Fachlogik.
4. Bei Regression: Schritt rueckgaengig machen, Ursache isolieren.

