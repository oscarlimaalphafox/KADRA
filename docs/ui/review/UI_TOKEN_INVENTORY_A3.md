# A3 Token-Inventur (Theme vs. Legacy)

Stand: 2026-03-13
Ziel: Konfliktfreie Token-Basis fuer Welle A vorbereiten.

## Ausgangslage
- `src/main.css` importiert zuerst `themes/hopro.css`, dann `themes/kadra.css`, danach `css/legacy.css`.
- Dadurch kann `legacy.css` zentrale `:root`-Variablen ueberschreiben.

## Metrik
- Token-Definitionen:
  - `themes/hopro.css`: 41
  - `themes/kadra.css`: 71
  - `css/legacy.css`: 35

## Kollisionen (gleicher Variablenname, anderer Wert)
- `--accent-blue`: THEME `#0F3188` vs LEGACY `#0e2d58`
- `--accent-blue-10`: THEME `rgba(15, 49, 136, 0.08)` vs LEGACY `rgba(14, 45, 88, 0.08)`
- `--accent-blue-20`: THEME `rgba(15, 49, 136, 0.16)` vs LEGACY `rgba(14, 45, 88, 0.16)`
- `--bg-app`: THEME `#F0F0F0` vs LEGACY `#e0e0e0`
- `--border`: THEME `#D2D2D7` vs LEGACY `#e0e0e0`
- `--border-light`: THEME `#E5E5EA` vs LEGACY `#e8e8e8`
- `--font`: THEME `"Nunito Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` vs LEGACY `"Nunito Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- `--shadow-sm`: THEME `0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)` vs LEGACY `0 2px 8px rgba(0,0,0,.08)`
- `--shadow-toolbar`: THEME `0 4px 16px rgba(15, 49, 136, 0.15), 0 1px 4px rgba(15, 49, 136, 0.08)` vs LEGACY `4px 8px 8px rgba(14, 45, 88, 0.5)`
- `--sidebar-width`: THEME `240px` vs LEGACY `272px`
- `--text-blue`: THEME `#0F3188` vs LEGACY `#0e2d58`
- `--text-done`: THEME `#C0C0C0` vs LEGACY `#989898`
- `--text-primary`: THEME `#000000` vs LEGACY `#1a1a1a`
- `--text-secondary`: THEME `#6E6E73` vs LEGACY `#666666`
- `--text-tertiary`: THEME `#AEAEB2` vs LEGACY `#989898`
- `--toolbar-h`: THEME `56px` vs LEGACY `64px`

## Bewertung
- Hauptrisiko liegt in der spaeten Ueberschreibung durch `legacy.css`.
- Das erschwert eine saubere Umstellung auf das neue UI, weil Theme-Werte nicht verlässlich gelten.

## A4-Richtung (Token-Bridge)
- `legacy.css` soll nur noch Legacy-spezifische Variablen halten.
- Kollidierende Basis-Tokens sollen auf Theme-Tokens gemappt oder entfernt werden.
- Keine Funktionsaenderung an DB/IDs/PDF, keine Fachlogik-Reparatur in Welle A.
