# Welle A Abnahme (Readiness)

Stand: 2026-03-13

## Automatisiert verifiziert
- `js/app.js` ist syntaktisch gueltig (Parser-Check).
- Tailwind-Build laeuft erfolgreich: `npm.cmd run build`.
- Legacy-Suche ist konsolidiert (kein doppelter Search-Container im HTML).
- Inline-`onclick` wurde aus `index.html` entfernt.

## In Scope geaendert
- `index.html`
- `js/app.js` (UI/DOM/Event)
- `src/main.css`
- `css/legacy.css`
- Dokumentationsdateien (`UI_*`)

## Explizit unveraendert (funktional)
- `js/db.js`
- Datenmodell/ID-Logik
- `js/pdf-export.js`

## Manuelle Smoke-Checks (offen fuer finales A12)
1. Login und App-Start.
2. Projekt waehlen und Protokoll oeffnen.
3. `TEILNEHMER`: Add/Remove + Checkbox-Verhalten.
4. `INHALTE`: Anzeige + Kapitel ein/ausklappen (ohne Reparatur in Welle A).
5. Toolbar-Suche: Treffer, Navigation, ESC.
6. Sidebar-Menues/Projektmenue.
7. Papierkorb oeffnen/schliessen.
8. PDF-Button ausloesen.

## A12 Abschlusskriterium
- Alle manuellen Smoke-Checks gruen, keine Regression gegen Baseline.
