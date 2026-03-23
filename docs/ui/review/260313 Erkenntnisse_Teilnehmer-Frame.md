# Erkenntnisse aus der Implementierung des TEILNEHMER-Frames
> Übertragbar auf alle weiteren Frames: INHALTE, ANLAGEN, TITELBLOCK etc.
> Stand: 2026-03-13

---

## 1. SVG-Icon Hover-States

**Problem:** Lucide-Icons reagieren nicht auf `color`-Overrides am Parent-Button, weil `stroke="currentColor"` als HTML-Präsentationsattribut gesetzt ist — nicht als CSS.

**Lösung:** SVG-Kind-Elemente direkt per CSS targeten:

```css
.mein-button:hover svg path,
.mein-button:hover svg polyline,
.mein-button:hover svg circle,
.mein-button:hover svg line,
.mein-button:hover svg rect {
  stroke: var(--ziel-farbe) !important;
}
```

**Niemals** nur `color` am Button-Element setzen — kein Effekt auf SVG-Icons.

| Kontext | Hover-Farbe | Token |
|---------|-------------|-------|
| Löschen / Destruktiv | Rot | `var(--accent-red)` |
| Hinzufügen / Neutral | Schwarz | `var(--text-primary)` |
| Standard-Aktion | Dunkelblau | `var(--accent-blue)` |

---

## 2. Drei-Stufen Hover-State für Löschen-Buttons

Löschen-Buttons in Tabellenzeilen folgen diesem Muster:

| Zustand | CSS | Ergebnis |
|---------|-----|----------|
| Standard | `opacity: 0` | unsichtbar |
| Zeile gehovert | `.zeile:hover .btn-delete-row { opacity: 1 }` | grau sichtbar |
| Button gehovert | `.btn-delete-row:hover svg path, ... { stroke: var(--accent-red) !important }` | rot |

---

## 3. CSS-Änderungen brauchen immer Tailwind-Build

Alle Änderungen in `css/legacy.css` oder `themes/kadra.css` wirken erst nach:

```bash
node node_modules/@tailwindcss/cli/dist/index.mjs -i src/main.css -o css/style.css
```

Ohne Build: keine sichtbare Wirkung im Browser, egal wie korrekt das CSS ist.

---

## 4. Service Worker Cache

Bei Änderungen an CSS/JS die über GitHub Pages deployed werden: Cache-Version in `sw.js` hochzählen (`protokoll-app-v2.XX`), sonst liefert der Browser die alte Version aus.

Lokal (Live Server): kein Problem, da SW inaktiv oder direkt neu geladen.

---

## 5. Debugging-Workflow für CSS-Probleme

Wenn eine CSS-Regel scheinbar keinen Effekt hat:

1. **Ist der Build gelaufen?** → `css/style.css` prüfen ob die Regel drin ist
2. **Ist der Selektor korrekt?** → In Browser-Console: `document.querySelector('.mein-selektor')` — `null` = Selektor falsch
3. **Welche Farbe ist tatsächlich aktiv?** → `getComputedStyle(el).color` oder `.stroke`
4. **Welche Regel gewinnt?** → DevTools → Elements → Styles-Panel zeigt durchgestrichene Regeln
5. **SVG direkt testen:** → `document.querySelectorAll('.btn svg *').forEach(el => el.setAttribute('stroke', 'red'))` — wenn das funktioniert, ist das Problem der CSS-Selektor

---

## 6. Grid-Layout für Tabellenzeilen

Alle Zeilen eines Frames (Header, Datenzeilen, Eingabezeile) teilen dieselbe CSS-Variable für `grid-template-columns`:

```css
:root { --pg-cols: 28px 14% 27.5% 77px 1fr 72px 72px 44px; }

.pg-header,
.pg-row,
.pg-add-row { grid-template-columns: var(--pg-cols); }
```

Vorteil: Spaltenbreiten an einer Stelle ändern, alle Zeilen passen sich automatisch an.

Wichtig: Aktions-Spalten (Icons) brauchen `justify-content: center` explizit auf **allen** Zeilen-Typen — auch auf der Eingabezeile, nicht nur auf Datenzeilen.

---

## 7. Token-Änderungen sofort in allen Dateien synchron halten

Farbwerte nie hardcoden — immer Token verwenden. Bei Token-Änderungen in `themes/kadra.css` muss synchron angepasst werden:
- `docs/ui/tokens/260313 KADRA_Color_Tokens.html` (visuelle Vorschau)

---

## Checkliste für neue Frames

- [ ] Grid-Layout mit geteilter `--frame-cols`-Variable für Header + Zeilen + Eingabezeile
- [ ] Aktions-Spalte: `justify-content: center` auf allen Zeilen-Typen
- [ ] Löschen-Button: drei Hover-Zustände (unsichtbar → grau → rot)
- [ ] Hinzufügen-Button: Hover schwarz (`--text-primary`) via SVG-Kind-Selektor
- [ ] Alle Farben via Token, keine Hardcodes
- [ ] Tailwind-Build nach jeder CSS-Änderung


