# KADRA — Icon-System

> Für Coding-Assistenten: Wie Icons in KADRA eingebunden sind, wie man sie nutzt und wie man neue hinzufügt.

---

## Überblick

KADRA verwendet **keine externe Icon-Bibliothek zur Laufzeit**. Alle Icons sind in `js/icons.js` als einfache JavaScript-Funktionen definiert, die inline-SVG-Strings zurückgeben. Die SVG-Vektordaten (Pfade) stammen 1:1 aus der [Lucide-Bibliothek](https://lucide.dev) (MIT-Lizenz), das Wrapper-System wurde für KADRA selbst geschrieben.

> **Hinweis (Ist-Stand):** Es gibt aktuell **kein** `js/lib/lucide.min.js` im Repo. Alle Icons laufen ausschließlich über `js/icons.js`.

---

## Dateistruktur

```
js/
├── icons.js     ← Alle Icon-Funktionen, eine Datei, keine Runtime-Abhängigkeit
└── app.js       ← `initStaticIcons()` setzt statische UI-Icons beim Start
```

---

## Wie das System funktioniert

### Die private Hilfsfunktion `_svg()`

Alle Standard-Icons (Stroke-Icons) werden über diese eine Funktion generiert:

```js
function _svg(paths, cls) {
  const c = cls ? ` class="kadra-icon ${cls}"` : ' class="kadra-icon"';
  return `<svg${c} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    width="var(--icon-size,16px)" height="var(--icon-size,16px)"
    fill="none" stroke="currentColor"
    stroke-width="var(--icon-stroke,1.5)"
    stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
```

Jedes Icon ist dann eine Einzeiler-Funktion:

```js
function iconTrash(cls) {
  return _svg('<polyline points="3 6 5 6 21 6"/>...', cls);
}
```

### Rückgabewert

Alle `iconXxx()`-Funktionen geben einen **HTML-String** zurück — kein DOM-Element. Einbinden immer über `innerHTML` oder Template-Literals.

---

## CSS-Steuerung

Alle Icons erben Größe, Strichstärke und Farbe aus dem CSS — nie direkt im SVG gesetzt:

| CSS-Variable | Default | Wirkung |
|---|---|---|
| `--icon-size` | `16px` | Breite + Höhe aller Icons |
| `--icon-stroke` | `1.5` | Linienstärke aller Icons |
| `currentColor` | — | Farbe erbt vom Elternelement (immer) |

Lokale Überschreibung für einen einzelnen Kontext:

```css
.my-button {
  --icon-size: 20px;
  --icon-stroke: 2;
}
```

### CSS-Klassen

Jedes generierte SVG bekommt automatisch `class="kadra-icon"`. Optional kann eine zweite Klasse übergeben werden:

```js
iconTrash('icon-danger')
// → <svg class="kadra-icon icon-danger" ...>
```

---

## Verwendung im Code

### In JS (dynamisch)

```js
// In app.js via Template-Literal
button.innerHTML = `${iconPlus()} Punkt hinzufügen`;

// Mit extra Klasse
button.innerHTML = iconTrash('icon-sm');
```

### In HTML (statisch / beim Initial-Render)

Statische UI-Icons werden zentral in `app.js` über `initStaticIcons()` gesetzt (z. B. Toolbar, Sidebar, Section-Header).  
Der bevorzugte Weg ist daher: Placeholder-Element im HTML (`<i aria-hidden="true"></i>`) + Befüllung via `setLeadingIcon()` / `setOnlyIcon()`.

```html
<!-- Beispiel: Button-Placeholder -->
<button id="btnExportPdf" class="toolbar-btn">
  <i aria-hidden="true"></i>
  <span>PDF</span>
</button>
```

```js
// app.js (initStaticIcons)
setLeadingIcon('#btnExportPdf', iconFileText);
```

### Fallback: Direktes Inline-SVG (Ausnahme)

Falls ein Icon in einem Sonderfall nicht ueber `initStaticIcons()` gesetzt werden kann, ist direktes Inline-SVG technisch weiterhin erlaubt.  
Das Markup muss dann dem KADRA-Wrapper entsprechen (`kadra-icon`, `currentColor`, CSS-Variablen):

```html
<svg class="kadra-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
  width="var(--icon-size,16px)" height="var(--icon-size,16px)"
  fill="none" stroke="currentColor" stroke-width="var(--icon-stroke,1.5)"
  stroke-linecap="round" stroke-linejoin="round">
  <line x1="4" y1="6" x2="20" y2="6"/>
</svg>
```

---

## Source Of Truth (wichtig)

Neue oder geänderte Icons werden **nicht nachgebaut**.  
Vektoren müssen 1:1 aus einer offiziellen Lucide-Quelle kommen:

1. `lucide.dev` → "Copy SVG", oder  
2. `lucide-static` Paket (`icons/<name>.svg`).

Dann nur den Inhalt innerhalb von `<svg>...</svg>` in `icons.js` übernehmen (`<path>`, `<line>`, `<circle>`, ...), ohne eigene Geometrie-Änderungen.

---

## Ausnahme: `iconGrip` (Fill-Icon)

Das Drag-Handle-Icon umgeht `_svg()`, weil es ausgefüllte Punkte braucht (`fill="currentColor"`) statt Strichen. `_svg()` setzt immer `fill="none"`, daher wird der SVG-String hier direkt geschrieben:

```js
function iconGrip(cls) {
  const c = cls ? ` class="kadra-icon ${cls}"` : ' class="kadra-icon"';
  return `<svg${c} xmlns="..." viewBox="0 0 24 24"
    width="var(--icon-size,16px)" height="var(--icon-size,16px)">
    <circle cx="9" cy="5" r="1.8" fill="currentColor"/>
    ...
  </svg>`;
}
```

**Merksatz:** Jedes Icon das `fill` statt `stroke` braucht, muss so gebaut werden.

---

## Alle vorhandenen Icons

| Funktion | Lucide-Name | Kategorie |
|---|---|---|
| `iconMenu` | `menu` | Navigation |
| `iconX` | `x` | Navigation |
| `iconCircleX` | `circle-x` | Navigation |
| `iconChevronUp` | `chevron-up` | Navigation |
| `iconChevronDown` | `chevron-down` | Navigation |
| `iconChevronRight` | `chevron-right` | Navigation |
| `iconChevronsDown` | `chevrons-down` | Navigation |
| `iconChevronsRight` | `chevrons-right` | Navigation |
| `iconPanelLeftClose` | `panel-left-close` | Navigation |
| `iconPanelLeftOpen` | `panel-left-open` | Navigation |
| `iconSettings` | `settings` | Navigation |
| `iconLogOut` | `log-out` | Navigation |
| `iconInfo` | `info` | Navigation |
| `iconFolder` | `folder` | Dateien |
| `iconFolderOpen` | `folder-open` | Dateien |
| `iconFolderPlus` | `folder-plus` | Dateien |
| `iconFolderDown` | `folder-down` | Dateien |
| `iconFilePlus2` | `file-plus-2` | Dateien |
| `iconFileInput` | `file-input` | Dateien |
| `iconFileText` | `file-text` | Dateien |
| `iconFileSearch2` | `file-search-2` | Dateien |
| `iconFileSpreadsheet` | `file-spreadsheet` | Dateien |
| `iconSave` | `save` | Dateien |
| `iconUpload` | `upload` | Dateien |
| `iconDownload` | `download` | Dateien |
| `iconPaperclip` | `paperclip` | Dateien |
| `iconShredder` | `shredder` | Dateien |
| `iconTrash` | `trash` | Bearbeiten |
| `iconCopy` | `copy` | Bearbeiten |
| `iconPlus` | `plus` | Bearbeiten |
| `iconCirclePlus` | `circle-plus` | Bearbeiten |
| `iconList` | `list` | Bearbeiten |
| `iconListPlus` | `list-plus` | Bearbeiten |
| `iconPenLine` | `pen-line` | Bearbeiten |
| `iconCalendar` | `calendar` | Bearbeiten |
| `iconSearch` | `search` | Bearbeiten |
| `iconFilter` | `filter` | Bearbeiten |
| `iconEye` | `eye` | Bearbeiten |
| `iconRefreshCw` | `refresh-cw` | Bearbeiten |
| `iconUsers` | `users` | Personen |
| `iconUserPlus` | `user-plus` | Personen |
| `iconBookOpen` | `book-open` | Sektionen |
| `iconSquare` | `square` | Checkbox |
| `iconSquareCheckBig` | `square-check-big` | Checkbox |
| `iconGrip` | `grip` (Fill-Variante) | Drag-Handle |

---

## Neues Icon hinzufügen

### Schritt 1 — Lucide-Vektordaten holen (Original, 1:1)

Auf [lucide.dev](https://lucide.dev) das gewünschte Icon suchen → "Copy SVG"  
oder aus `lucide-static/icons/<icon-name>.svg` nehmen.  
Dann nur den **Inhalt** des `<svg>`-Tags kopieren (die `<path>`-, `<line>`-, `<circle>`-Elemente), nicht das `<svg>`-Tag selbst.

### Schritt 2 — Funktion in `icons.js` eintragen

```js
// In den passenden Abschnitt einfügen (nach Kategorie sortiert)
function iconBell(cls) { return _svg('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>', cls); }
```

**Namenskonvention:** `icon` + Lucide-Name in camelCase. Beispiele:
- `bell` → `iconBell`
- `alert-triangle` → `iconAlertTriangle`
- `file-plus-2` → `iconFilePlus2`

### Schritt 3 — Verwenden

```js
// In app.js
element.innerHTML = iconBell();

// Mit extra Klasse
element.innerHTML = iconBell('my-class');
```

### Fill-Icon hinzufügen (Sonderfall)

Wenn das Icon ausgefüllte Flächen statt Striche braucht (z.B. `fill="currentColor"`), `_svg()` nicht verwenden — stattdessen nach dem Muster von `iconGrip` vorgehen:

```js
function iconStar(cls) {
  const c = cls ? ` class="kadra-icon ${cls}"` : ' class="kadra-icon"';
  return `<svg${c} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    width="var(--icon-size,16px)" height="var(--icon-size,16px)">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
      fill="currentColor"/>
  </svg>`;
}
```

---

## Häufige Fehler

**Icon erscheint nicht:** Prüfen ob `icons.js` in `index.html` vor `app.js` eingebunden ist.

**Icon hat falsche Größe:** Nicht direkt `width`/`height` am SVG setzen — stattdessen `--icon-size` am Elternelement überschreiben.

**Farbe stimmt nicht:** SVGs in KADRA verwenden immer `currentColor`. Die Farbe am Elternelement (Button, Span) setzen, nicht am SVG.

**Fill-Icon zeigt nichts:** `_svg()` setzt `fill="none"` — für Fill-Icons das SVG-Markup direkt schreiben (siehe `iconGrip`).
