# Handoff: KADRA – Dokumentstruktur (Sitzungsprotokoll-Viewer)

## Überblick

Diese Vorlage zeigt einen **interaktiven Protokoll-Viewer** für die KADRA-Anwendung
(Real Estate Information Management). Konkret: ein „Protokoll zum Planer Jour Fixe"
(Sitzungsprotokoll eines Bauprojekt-Jour-Fixe) wird als strukturiertes, navigierbares
Dokument dargestellt — mit einklappbaren Kapiteln, einer Dokumentstruktur-Seitenleiste
(Inhaltsverzeichnis mit Scroll-Spy), Protokolleinträgen (kategorisiert nach
Info/Aufgabe/Festlegung/Risiko/Status) und einer interaktiven **Aufgabenübersicht**
(Kanban-artige Karten mit Drag-&-Drop-Sortierung, Verantwortlichkeits-Filter,
Erledigt-Markierung und TSV-Export).

Die Vorlage ist Teil einer KADRA-App-Shell: links die App-Navigation (Protokoll-Liste,
Aktionen), in der Mitte die Dokumentstruktur, rechts der Protokollinhalt.

## Über die Design-Dateien

Die Dateien in diesem Paket sind **Design-Referenzen, erstellt in HTML** — Prototypen,
die das beabsichtigte Aussehen und Verhalten zeigen, **kein Produktionscode zum direkten
Kopieren**. Die Aufgabe ist, diese HTML-Designs in der **bestehenden Umgebung der
Zielcodebasis** (React, Vue, Angular, Svelte o.ä.) mit deren etablierten Mustern,
Komponenten und Bibliotheken **nachzubauen**. Falls noch keine Umgebung existiert, wählt
ihr das für das Projekt am besten geeignete Framework und setzt die Designs dort um.

Die Inhalte (Firmen, Personen, Protokoll-Texte) sind reale Beispieldaten aus einem
Bauprojekt und dienen als Referenz für Struktur und Datenmodell — in der echten App
kommen sie aus einer Datenbank (vgl. die referenzierte `…_Testdatenbank.json` in der
App-Sidebar).

## Fidelity

**High-Fidelity (hifi).** Pixelgenaue Mockups mit finalen Farben, Typografie, Abständen
und Interaktionen. Die UI sollte pixelgenau mit den bestehenden Bibliotheken und Mustern
der Codebasis nachgebaut werden. Alle Maße, Hex-Werte und Schriftgrößen unten sind
verbindlich. Das visuelle Fundament folgt dem **VOCTA / General Design System**
(Navy + Warm-Sand, Nunito Sans + JetBrains Mono).

---

## Globales Layout

Drei sticky Spalten in einem Flex-Container (`.app`, `display:flex; min-height:100vh`),
Seitenhintergrund `#E9ECF2`:

| Spalte | Breite | Rolle |
|---|---|---|
| **KADRA App-Sidebar** (`.kadra-sb`) | `266px` (`--kadra-w`), fix | App-Navigation (Mock, nur Optik) |
| **Dokumentstruktur** (`.sidebar`) | `300px` (`--sidebar-w`), einklappbar | Inhaltsverzeichnis + Scroll-Spy |
| **Inhalt** (`.content`) | `flex:1` | Protokoll-Dokument |

- Alle drei Spalten sind `position:sticky; top:0; height:100vh` mit eigenem internen
  Scroll (`overflow-y:auto`), sodass nur der Inhalt scrollt und die beiden Sidebars stehen
  bleiben.
- Die Dokumentstruktur lässt sich **einklappen** (Push-Animation): `.app.ds-collapsed
  .sidebar { width:0; opacity:0 }` über `width .26s ease`. Im eingeklappten Zustand
  erscheint ein schmaler **Reopen-Handle** (`.ds-reopen`, `36px` breit, sticky) zum
  Wiedereinblenden.
- Responsive Breakpoint `@media (max-width:1100px)`: Header-Grid, Teilnehmer-Liste und
  Abkürzungs-Grid wechseln von 3–4 auf 2 Spalten.

---

## Screens / Views

Es ist **eine** durchgehende Ansicht. Die wichtigen Bereiche:

### 1. KADRA App-Sidebar (`.kadra-sb`) — Navigations-Mock

- **Breite** `266px`, weißer Hintergrund, rechte Hairline `1px var(--border-light)`.
- **Brand-Kopf** (`.ks-brand`, `padding:15px 14px 13px`, untere Hairline):
  - Logo-Mark: `30×30px`, `border-radius:7px`, Navy-Hintergrund, darin ein **3×3-Raster**
    (`grid-template-columns:repeat(3,1fr)`, `gap:2px`, `padding:4px`) aus 9 farbigen
    Kacheln — Reihenfolge der Füllfarben: `#9DBE7C #E8B84B #5B7FB4 / #E08E5A #ffffff #C9606E
    / #7FA8C9 #CC4933 #9DBE7C` (Mitte weiß). Kacheln `border-radius:1.5px`.
  - Wortmarke: **„KADRA"** Nunito Sans `19px / 800`, `letter-spacing:.05em`, Navy; darunter
    Untertitel „Real Estate Information Management" `7px / 700`, uppercase, `--text-tertiary`.
  - Rechts zwei Icon-Buttons (`30×30`, Lucide `menu` + `panel-left`), Hover
    `background:var(--surface-hover); color:var(--primary)`.
- **Scroll-Bereich** (`.ks-scroll`, `padding:14px 14px 30px`):
  - Projekt-Wähler-Button „HIS" + Chevron-down (`.ks-project`, umrandeter Button,
    `700/15px`, Navy).
  - Aktionsliste (`.ks-action`, `padding:9px 12px`, `gap:12px`, Icon `18px` + Label
    `600/14px var(--text-secondary)`, Hover Navy): „Neues Protokoll", „Import Protokoll",
    „Protokoll suchen…", „Save DB". Lucide-Icons: `file-plus`, `download`, `search`,
    `save`.
  - Darunter Mono-Dateiname `260603_KADRA-HIS_Testdatenbank.json` (`.ks-dbfile`,
    `10px var(--font-mono) var(--text-tertiary)`).
  - Trenner `.ks-sep` (1px Linie, `margin:16px 2px`).
  - Aufklappbare Gruppen (`.ks-group-head`: uppercase `12.5px/700`, Icon `17px`,
    Chevron rechts): „Terminserien" → Untergruppe „Protokoll zum Planer Jour Fixe" →
    Liste von Protokoll-Einträgen (`.ks-item`). Jeder Eintrag: Titel `12.5px/600` +
    Mono-Datum `10.5px`. Aktiver Eintrag (`.ks-item.active`): Hintergrund `#E7EDF7`,
    linker Rand `2px var(--secondary)`, Titel Navy/700. Manche Einträge tragen ein
    kleines Lucide-`paperclip`-Icon (Anhang).
  - Zweite Gruppe „Einzeldokumente" (Lucide `folder`).

### 2. Dokumentstruktur-Sidebar (`.sidebar`) — Inhaltsverzeichnis + Scroll-Spy

- **Breite** `300px`, Hintergrund `--surface-sunken` (`#F5F4F0`), rechte Hairline.
- **Kopf** (`.sb-head`): Mono-Label „Dokumentstruktur" (`10.5px`, uppercase,
  `letter-spacing:.16em`, `--text-tertiary`) + Einklapp-Button (`.ds-collapse`, `30×30`,
  umrandet, Lucide `panel-left-close`).
- **Inhalt** (`.sb-scroll`): hierarchische Linkliste, dreistufig:
  - **Kapitel** (`.sb-kap-link`): `padding:9px 20px`, `700/13.5px`, davor ein farbiger
    Punkt `.sb-dot` (`9px` Kreis, Farbe = Kapitelfarbe `--kc`, mit weichem Navy-Glow
    `box-shadow:0 0 0 3px rgba(14,45,88,.07)`).
  - **Unterkapitel** (`.sb-ukap-link`): `padding:5px 20px 5px 38px`, `12.5px
    var(--text-secondary)`, linker Rand `2px` in Kapitelfarbe, `margin-left:24px`.
  - **Thema** (`.sb-thema-link`): `padding:3px 20px 3px 50px`, `11.5px
    var(--text-tertiary)`, linker Rand `2px var(--border-light)`.
  - Extra-Links unten (`.sb-extra`, oben Hairline): „Aufgabenübersicht" (Punkt
    `--tertiary`), „Abkürzungen" (Punkt `--text-tertiary`).
- **Scroll-Spy:** Ein `IntersectionObserver` (`rootMargin:'-10% 0px -80% 0px'`) markiert
  den zum aktuell sichtbaren Abschnitt gehörenden Link mit `.sb-link-active`
  (`background:rgba(14,45,88,.10)`, Navy, `700`).
- **Klick auf Link:** klappt ggf. das übergeordnete (eingeklappte) Kapitel/Unterkapitel
  auf, bevor per `#anchor` dorthin gescrollt wird (`html{scroll-behavior:smooth}`).

**Kapitel & ihre Farben** (jedes Kapitel hat eine eigene `--kc`-Akzentfarbe):

| Kap | Titel | Farbe (`--kc`) |
|---|---|---|
| A | Organisation \| Information | `--secondary` `#154384` |
| B | Qualitäten \| Planung | `--tag-5` `#96B4C9` |
| C | Kosten | `--tag-2` `#F4BD48` |
| D | Termine | `--tag-4` `#99BDB8` |
| E | Vertragswesen \| Rechtliche Themen | `--tag-6` `#E199AA` |
| F | Property Themen | `--tag-3` `#968B79` |
| (extra) | Aufgabenübersicht | `--tertiary` `#CC4933` |
| (extra) | Abkürzungen | `--text-tertiary` `#AEAEAE` |

### 3. Dokument-Header (`.doc-header`)

Weiße Fläche, `padding:42px 54px 34px`, untere Hairline.

- **Eyebrow** (`.dh-eyebrow`): „Planer Jour Fixe · HIS" — Mono `12px`,
  `letter-spacing:.18em`, uppercase, **`--tertiary`** (Terracotta).
- **Titel** (`.dh-title`): „Protokoll zum Planer Jour Fixe Nr. 24" — `30px / 800`,
  `line-height:1.15`, Navy.
- **Metadaten-Grid** (`.dh-grid`): 3 Spalten, `gap:14px 28px`. Jedes Item: Mono-Label
  (`11px`, uppercase, `--text-tertiary`) über Wert (`14px / 600`). Felder: Projekt
  (hillsite Schwalbach), Mieterin, Vermieterin, Datum (03.06.2026), Zeit (12:31 – 13:49),
  Ort (per Teams).
- „Aufgestellt: …" Zeile (`12px var(--text-secondary)`).
- **Teilnehmer** (`.teilnehmer`): Mono-Label „Teilnehmer" (`12px`, `letter-spacing:.16em`,
  uppercase), darunter 4-Spalten-Grid von Karten (`.tn-card`): sunken-Hintergrund,
  Hairline, `radius-md`, `padding:12px 14px`. Jede Karte: Kürzel-Badge (`.tn-k`,
  Mono `11px/600`, weiße Schrift auf Personenfarbe `--tc`, `radius-sm`), Name (`14px/700`),
  Firma (`11.5px var(--text-secondary)`), Anwesenheits-Status oben rechts (`x` oder
  `(zeitw.)` — bei `(zeitw.)` in `--warning` eingefärbt).
  Personenfarben: RSE `#154384`, KH `#94AF83`, BI `#96B4C9`, HOP `#0E2D58`.

### 4. Kapitel / Unterkapitel / Themen / Einträge (Protokoll-Inhalt)

- **Kapitel** (`.kap`, `margin:0 54px`, untere Hairline). Kopf (`.kap-head`, klickbar):
  Chevron (`▸`/`▾`, dreht `-90°` bei `.collapsed`), farbiger Balken (`.kap-bar`, `5×26px`,
  `--kc`), Titel `21px/800` Navy. Body (`.kap-body`) wird per `.collapsed{display:none}`
  ein-/ausgeblendet.
- Optionaler **Hinweis-Block** (`.kap-hinweis`): sunken-Box mit linkem `3px`-Rand in
  Kapitelfarbe, `13px var(--text-secondary)`.
- **Unterkapitel** (`.ukap`): weiße Karte mit Hairline + `radius-lg`. Kopf (`.ukap-head`):
  sunken-Hintergrund, linker `4px`-Rand in `--kc`, Chevron + Titel `15px/700`
  `--secondary`. Body `padding:8px 18px 16px`.
- **Thema** (`.thema`, optionale 3. Ebene): Mono `13px/700`, davor `▪ ` in Kapitelfarbe.
- **Eintrag** (`.entry`): 2-Spalten-Grid `88px 1fr`, `gap:14px`, sunken-Hintergrund,
  `radius-md`, transparenter Rand (Hover → `--border`).
  - **ID-Spalte** (`.entry-id`): Mono `11px var(--text-secondary)`, Format
    `#<Sitzungsnr>|<Kapitel>.<Nr>` z.B. `#24|A.02`.
  - **Meta-Zeile** (`.entry-meta`): Kategorie-Badge + optionale Verantwortlichkeits-Tags +
    optionale Frist (Mono `11px`) + Status-Icon (rechtsbündig).
  - **Text** (`.entry-text`): `13.5px`, `line-height:1.55`.
  - Erledigte Einträge (`.entry-done`): `opacity:.62`.

**Kategorie-Badges** (`.kat`, Mono `10.5px/600`, uppercase, `letter-spacing:.04em`,
weiße Schrift, `radius-sm`, `padding:2px 8px`):

| Klasse | Label | Hintergrund |
|---|---|---|
| `.kat-info` | Info | `--text-secondary` `#6E6E6E` |
| `.kat-aufgabe` | Aufgabe | `#F4BD48` |
| `.kat-festlegung` | Festlegung | `--success` `#94AF83` |
| `.kat-risiko` | Risiko | `--danger` `#D66D5C` |
| `.kat-status` | Status | `--warning` `#E88E5A` |

**Verantwortlichkeits-Tags** (`.minitag`, Mono `10px/600`, weiße Schrift auf `--tc`,
`radius-sm`). Akteurs-Farben siehe Filter-Tabelle unten.

**Status-Icon** (`.erl`): erledigt `☑` in `--success`; offen `☐` in `--text-tertiary`;
nicht zutreffend `–` in `--text-tertiary`.

### 5. Aufgabenübersicht (`#aufgaben`) — interaktives Kanban

Eigenes Kapitel mit `--kc:--tertiary`. Enthält Filterleiste + Karten-Grid.

- **Filterleiste** (`.filterbar`, Flex, `gap:8px`, umbrechend):
  - **Pills** (`.pill`, `radius:32px`, `12.5px/600`, Hairline, weißer Hintergrund): „Alle"
    (`.pill-all`) + ein Pill pro Akteur, jeweils mit farbigem `.pill-dot` (`9px`). Aktiver
    Pill (`.active`): Hintergrund = Akteursfarbe `--tc`, weiße Schrift; `.pill-all.active`
    nutzt Navy.
  - **Toggle** „erledigte zeigen" (`.show-done`, Checkbox + Label `12.5px`).
  - **Export-Button** (`.export-btn`, Mono `11.5px`, rechtsbündig `margin-left:auto`):
    „↧ Reihenfolge exportieren".
  - **Reset-Button** (`.reset-btn`): „⟳ Zurücksetzen".
- **Karten-Grid** (`.todo-grid`): `grid-template-columns:repeat(auto-fill,minmax(220px,1fr))`,
  `gap:14px`.
- **Aufgaben-Karte** (`.todo-card`, weiß, Hairline, `radius-lg`, `padding:14px`,
  `box-shadow:0 1px 3px rgba(14,45,88,.05)`, `cursor:grab`, `draggable="true"`):
  - Kopf (`.todo-top`): Drag-Handle `⠿` (`.todo-handle`), Erledigt-Checkbox (`.todo-check`,
    `accent-color:var(--success)`), Referenz-ID rechts (Mono `10.5px`).
  - Tags (`.todo-tags`): Minitags der Verantwortlichen.
  - Text (`.todo-text`, `13px`, `line-height:1.5`).
  - Fuß (`.todo-foot`): Frist-Badge (`.todo-frist`, Mono `11px`, `--secondary` auf sunken)
    oder „ohne Frist" (`.todo-frist-none`, `--text-tertiary`, ohne Hintergrund).
  - **Datenattribute:** `data-id` (eindeutige Ref, z.B. `#24|A.02`), `data-tags`
    (kommagetrennte Akteure, z.B. `HOP,RSE,HEICO`), `data-order`, `data-cur`.
  - Hover → `box-shadow:0 6px 18px rgba(14,45,88,.12)`. Beim Ziehen `.dragging`
    (`opacity:.4`). Drop-Ziel `.drop-target` (`outline:2px dashed var(--secondary)`).
    Erledigt `.done` (`opacity:.5`, sunken, Text durchgestrichen).
- **Leerzustand** (`.todo-empty`): „Keine Aufgaben für die aktive Filterauswahl."

### 6. Abkürzungen (`#abk`)

Eigenes Kapitel (standardmäßig **eingeklappt**), kleinerer Titel (`16px`). Grid
(`.abk-grid`, 3 Spalten, `gap:3px 18px`) aus Items (`.abk-item`, Flex `gap:8px`):
Kürzel (`.abk-k`, Mono `11px/600` `--secondary`, `min-width:74px`) + Bedeutung
(`.abk-v`, `11px var(--text-secondary)`).

### 7. Footer (`.doc-footer`)

`margin:36px 54px 0`, obere Hairline, Mono `11px var(--text-tertiary)`, rechtsbündig:
„hillsite Schwalbach · HIS · Planer JFx 24 · 03.06.2026 — interaktive Fassung".

---

## Interaktionen & Verhalten

Alle Zustände werden in **`localStorage`** unter dem Schlüssel `hisJFx24state`
persistiert (siehe State Management).

1. **Kapitel/Unterkapitel ein-/ausklappen.** Klick auf `.kap-head` / `.ukap-head` togglet
   `.collapsed` an Kopf und Body; Chevron dreht; Zustand wird gespeichert
   (`state.collapsed[bodyId]`).
2. **Dokumentstruktur ein-/ausklappen.** `.ds-collapse` → `_setDS(false)`; Reopen-Handle
   `.ds-reopen` → `_setDS(true)`. Setzt `.ds-collapsed` an `.app`, speichert `state.dsOpen`.
3. **Scroll-Spy.** IntersectionObserver hebt den aktiven TOC-Link hervor (siehe oben).
4. **TOC-Sprung.** Klick auf TOC-Link klappt übergeordnete Container auf und scrollt
   smooth zum Anker.
5. **Aufgaben-Filter.** Klick auf Akteurs-Pill togglet ihn in `state.filters` (Mehrfach-
   auswahl, OR-Logik); „Alle" leert die Auswahl. `applyFilters()` blendet Karten per
   `display:none` aus, deren Tags nicht matchen, und respektiert den Erledigt-Toggle.
   Aktualisiert Pill-Aktivzustände und Leerzustand. **Standard beim ersten Laden:** HOP
   und RSE aktiv.
6. **Erledigt-Markierung.** Checkbox in der Karte togglet `.done`, pflegt `state.done`
   und sortiert erledigte Karten ans Ende (`sortDoneLast()`).
7. **Drag-&-Drop-Sortierung.** Karten sind sortierbar (HTML5 Drag-API). Während des
   Ziehens zeigt die Zielkarte `.drop-target`; bei `dragover` wird `dragEl` vor/hinter
   die Zielkarte eingefügt (Schwelle = halbe Kartenhöhe). Bei `dragend` werden Reihenfolge
   neu indexiert und in `state.order` (Array von `data-id`) gespeichert. Beim Laden stellt
   `restoreOrder()` die gespeicherte Reihenfolge wieder her.
8. **Export.** „Reihenfolge exportieren" erzeugt eine **TSV-Datei**
   `JFx24_Aufgaben_Reihenfolge.tsv` (Spalten: Nr, ID, Status, Verantwortlich, Frist,
   Aufgabe) per Blob-Download.
9. **Reset.** „Zurücksetzen" fragt per `confirm()` nach, löscht `localStorage` und lädt neu.

**Übergänge:** durchgehend dezent. Sidebar-Collapse `width .26s ease, opacity .2s ease`;
Hover-/Aktiv-Zustände `.15s`; Chevron-Rotation `.2s`. Keine dekorativen/Endlos-Animationen.
`prefers-reduced-motion` sollte in der Implementierung respektiert werden.

---

## State Management

Ein einziges State-Objekt, persistiert als JSON in `localStorage['hisJFx24state']`:

```js
state = {
  collapsed: { [bodyElementId]: true|false },  // Klappzustand je Kapitel/Unterkapitel
  order:     [ "#24|A.02", "#23|B.1.01", … ],  // Reihenfolge der Aufgaben-Karten (data-id)
  done:      [ "#23|B.1.04", … ],              // erledigt markierte Karten (data-id)
  filters:   [ "HOP", "RSE", … ],              // aktive Akteurs-Filter
  showDone:  false,                            // erledigte Aufgaben einblenden
  dsOpen:    true                              // Dokumentstruktur sichtbar
}
```

`loadState()` beim Start, `saveState()` nach jeder Mutation. Beim Laden:
`loadState(); restoreOrder(); applyFilters();` und ggf. `.ds-collapsed` setzen.

**Datenmodell-Hinweis für die Produktiv-App:** Protokoll → Kapitel → (Unterkapitel) →
(Thema) → Einträge. Jeder Eintrag: `id`, `kategorie`
(info|aufgabe|festlegung|risiko|status), `verantwortliche[]`, `frist?`, `status`
(erledigt|offen|—), `text`. Aufgaben-Karten sind die Teilmenge der Einträge mit Kategorie
„Aufgabe" (bzw. mit Verantwortlichen + offenem Status). In der echten App ersetzt
Server-Persistenz das `localStorage`.

---

## Design Tokens

Aus dem **VOCTA / General Design System**. Im Prototyp als CSS-Variablen im `:root`.

```
/* Brand */
--primary:   #0E2D58   (Navy — Überschriften, primäre Aktionen, aktive Zustände)
--secondary: #154384   (Link/Akzent-Blau)
--tertiary:  #CC4933   (Terracotta — Eyebrow, Aufgaben-Akzent)
--neutral:   #E3E5E8

/* Surfaces */
--surface:        #FFFFFF
--surface-hover:  #F5F5F5
--surface-input:  #F2F2F2
--surface-sunken: #F5F4F0   (Warm-Sand Canvas)
Seitenhintergrund (body): #E9ECF2

/* Text */
--text-primary:  #000000
--text-secondary:#6E6E6E
--text-tertiary: #AEAEAE
--text-inverted: #FFFFFF

/* Borders */
--border:       #D2D2D2
--border-light: #E5E5E5

/* Status */
--success: #94AF83   --warning: #E88E5A   --danger: #D66D5C

/* Kategorische Palette (Tags / Kapitel / Akteure) */
--tag-1:#E88E5A  --tag-2:#F4BD48  --tag-3:#968B79  --tag-4:#99BDB8
--tag-5:#96B4C9  --tag-6:#E199AA  --tag-7:#94AF83  --tag-8:#CDAD96

/* Radius */
--radius-sm:4px   --radius-md:8px   --radius-lg:12px   (Pills: 32px)

/* Layout */
--sidebar-w:300px   --kadra-w:266px

/* Schrift */
--font-ui:   'Nunito Sans', -apple-system, 'Segoe UI', Roboto, sans-serif
--font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace
Basis: body 15px / line-height 1.5
```

**Akteurs-/Personenfarben** (für Tags, Pills, Teilnehmer-Badges):

| Kürzel | Farbe | Bedeutung |
|---|---|---|
| HOP | `#0E2D58` | Hopro (Projektsteuerung) |
| RSE | `#154384` | RSE (Vermieterin) |
| BI | `#96B4C9` | Brendel Ingenieure |
| KH | `#94AF83` | Klaus Hannappel Architekt |
| Klein | `#E88E5A` | Elektro Klein AG |
| JZ | `#E199AA` | Josef Zohner (Brandschutz) |
| HEICO | `#968B79` | HEICO (Facility Mgmt) |
| Sauter | `#CDAD96` | Sauter (GLT) |

**Schatten** (alle Navy-getönt, weich — nie grau/schwarz):
`card → 0 1px 2px rgba(14,45,88,.04), 0 2px 6px rgba(14,45,88,.03)`;
`hover → 0 6px 18px rgba(14,45,88,.05–.12)`.

**Typografie-Skala (im Einsatz):** Titel `30/800` · Kapitel `21/800` · Unterkapitel
`15/700` · Body-Eintrag `13.5` · Mono-Labels `10.5–12px` uppercase mit weitem Tracking
(`.06–.18em`). Tabellarische Ziffern (`font-variant-numeric: tabular-nums`) für Daten/IDs.

---

## Iconografie

**Lucide-Icons, 1:1** (MIT), als inline-`<svg>` mit `fill="none"`,
`stroke="currentColor"`, `stroke-width="1.5"`, runde Caps. **Keine Emojis.** Verwendete
Slugs: `menu`, `panel-left`, `panel-left-close`, `chevron-down`, `file-plus`, `download`,
`search`, `save`, `folder`, `box` (Terminserien), `paperclip`. Unicode-Glyphen nur als
winzige Chrome: Chevrons `▸ ▾`, Thema-Bullet `▪`, Drag-Handle `⠿`, Status `☑ ☐ –`,
Export `↧`, Reset `⟳`.

In React: bestehende Icon-Komponente der Codebasis (oder `lucide-react`) verwenden;
Geometrie nicht selbst erfinden.

---

## Assets

Keine Bild-Assets. Schriften werden im Prototyp von Google Fonts geladen
(Nunito Sans 300/400/600/700/800, JetBrains Mono 400/500/600) — in der Produktiv-App die
im Design System selbst-gehosteten Fonts nutzen. Das KADRA-Logo ist rein per CSS-Grid
gebaut (9 farbige Kacheln), kein Bild.

## Dateien in diesem Paket

- `KADRA Dokumentstruktur.html` — der vollständige interaktive Prototyp (Referenz für
  Markup-Struktur, Styles und das gesamte JS-Verhalten). **Maßgebliche Quelle.**
- `KADRA Dokumentstruktur (standalone).html` — eigenständige Offline-Fassung (alle Assets
  inline), zum reinen Ansehen ohne Server.

> Hinweis: Bei Anthropic-/Marken-Assets stattdessen das bestehende Markensystem der
> Codebasis verwenden. Hier sind keine solchen Assets enthalten; das visuelle Fundament
> ist das VOCTA / General Design System.
