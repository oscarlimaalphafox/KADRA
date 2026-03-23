# KADRA Design System v1.3.1 (Current-State gepflegt)

> Verbindliche Referenz für die Frontend-Implementierung.
> Definiert das visuelle System auf Basis von Tailwind v4 + Vanilla JS — ohne externe Komponenten-Bibliothek.
> Enthält Integrations- und Umsetzungshinweise für Claude Code.

---

## Inhaltsverzeichnis

0. [Current-State Snapshot (2026-03-14)](#0-current-state-snapshot-2026-03-14)
1. [Technischer Stack & Integration](#1-technischer-stack--integration)
2. [Design-Philosophie](#2-design-philosophie)
3. [Hopro Theme — Farbsystem](#3-hopro-theme--farbsystem)
4. [Typografie](#4-typografie)
5. [Spacing & Layout](#5-spacing--layout)
6. [Shape, Elevation, Motion](#6-shape-elevation-motion)
7. [Komponenten — Sidebar](#7-komponenten--sidebar)
8. [Komponenten — Toolbox / Action Bar](#8-komponenten--toolbox--action-bar)
9. [Komponenten — Buttons](#9-komponenten--buttons)
10. [Komponenten — Inputs & Formulare](#10-komponenten--inputs--formulare)
11. [Komponenten — Tabellen & Protokollpunkte](#11-komponenten--tabellen--protokollpunkte)
12. [Komponenten — Overlays & Modals](#12-komponenten--overlays--modals)
13. [Semantische Farben — KADRA-spezifisch](#13-semantische-farben--kadra-spezifisch)
14. [Accessibility](#14-accessibility)
15. [Z-Index-System](#15-z-index-system)
16. [Icon-System](#16-icon-system)
17. [Umsetzungs-Phasen](#17-umsetzungs-phasen)
18. [Ausnahmen & Sonderfälle](#18-ausnahmen--sonderfälle)
19. [Audit-Auflösungsmatrix](#19-audit-auflösungsmatrix)

---

## 0. Current-State Snapshot (2026-03-14)

Dieses Kapitel ist die verbindliche Ist-Lage der laufenden UI-Ueberarbeitung.  
Falls spaetere Kapitel im Dokument davon abweichen, gilt **dieses** Kapitel als Prioritaet.

### 0.1 Referenzen (Source of Truth)

- Color Tokens: `docs/ui/tokens/260313 KADRA_Color_Tokens.html`
- Button Tokens (Preview): `docs/ui/tokens/260315_KADRA_Buttons.html`
- Icon-System: `docs/ui/icon-system.md`
- Review-Baseline: `docs/ui/review/UI_BASELINE_WAVE_A.md`
- App-Kontext: `CLAUDE.md`

### 0.2 Build / Technik

- CSS-Build ist aktiv und verpflichtend: `npm run build`
- Build-Kette: `src/main.css` -> `css/style.css` (inkl. `themes/kadra.css` + `css/legacy.css`)
- Kein SPA-Framework; UI-Komponenten bleiben Vanilla JS.

### 0.3 Toolbar (Ist)

- Reihenfolge und Gruppen sind auf das neue Figma-Zielbild ausgerichtet:
  - `KAP`, `UKAP`, `THEMA`, `PKT`
  - `Auge`, `Filter`, `Refresh`
  - Suche
  - `PDF`, `XLSX`
  - Shredder (Protokoll loeschen)
- Hover/State-Regeln:
  - kleine Icon-Buttons: blaues Hover (`--accent-blue-dark` + helles Quadrat)
  - Shredder-Hover: `--accent-red`
  - `PKT`: Primary-Pill (active look)

### 0.4 Icon-System (Ist)

- UI-Icons kommen aus `js/icons.js`; statische Icons werden zentral in `initStaticIcons()` (`js/app.js`) gesetzt.
- Neue/angepasste Icons werden **nicht nachgebaut**.
- Vektoren nur 1:1 aus Lucide (`lucide.dev` oder `lucide-static`).
- `file-spreadsheet` und `shredder` sind auf Original-Lucide-Vektoren umgestellt.
- Checkbox-Icons in Auge- und Filter-Dropdown laufen ueber Lucide-Icons (`iconSquare`, `iconSquareCheckBig`).

### 0.5 Farben / Tokens (Ist)

- Frame-Header: `--kadra-section-bg: #0E2D58`
- Hintergrund:
  - `--bg-app: #E3E5E8`
  - `--bg-sidebar: #FFFFFF`
- Warnhinweise/Warning-Use-Cases: `--warning`

### 0.6 Offene Delta-Punkte zu Figma

- Finales Pixel-Tuning (Spacing/Alignment) in der Toolbar bleibt als Feinschliff offen.
- Laufende Wellen-Arbeit dokumentiert unter `docs/ui/review/`.

---

## 1. Technischer Stack & Integration

### 1.1 Stack-Übersicht

| Schicht | Technologie | Version | Rolle |
|---------|-------------|---------|-------|
| CSS-Framework | **Tailwind CSS** | **v4.x** | Utility-Klassen, Spacing, Responsive |
| Komponenten | **Vanilla JS** | — | Eigene UI-Komponenten, kein externes Framework |
| Theming | **Hopro Theme** (`themes/hopro.css`, `themes/kadra.css`) | — | Semantische CSS-Variablen → Tailwind Mapping |
| Font | **Nunito Sans** (lokal, woff2) | — | Einzige Schriftfamilie für alle Elemente |
| Icons | **`js/icons.js`** | — | Eigene SVG-Inline-Bibliothek (Lucide-Geometrie, 16px, stroke 1.5) |
| Build | **npm** + Tailwind CLI | — | Einmaliger Build-Schritt für CSS |

> **Entscheidung:** Kein Preline. Die Sidebar, Dropdowns und alle UI-Komponenten sind Vanilla JS — das reicht für den KADRA-Scope und vermeidet fremdes JS ohne Mehrwert. Node.js ist durch Claude Code bereits installiert.

### 1.2 Einbindung — npm + Build-Pipeline

**Initiales Setup (einmalig):**

```bash
# Im KADRA-Projektordner
npm init -y
npm i -D tailwindcss @tailwindcss/cli
```

**CSS-Quelldatei (`src/main.css`):**

```css
@import "tailwindcss";

/* KADRA Themes */
@import "../themes/hopro.css";
@import "../themes/kadra.css";

/* Legacy Styles (werden schrittweise abgebaut) */
@import "../css/legacy.css";
```

**Build-Befehl:**

```bash
# CSS bauen (einmalig nach Änderungen)
node node_modules/@tailwindcss/cli/dist/index.mjs -i src/main.css -o css/style.css

# Oder mit Watch-Mode während der Entwicklung
node node_modules/@tailwindcss/cli/dist/index.mjs -i src/main.css -o css/style.css --watch
```

**HTML-Einbindung:**

```html
<!-- Generiertes CSS (Tailwind + Hopro Theme) -->
<link rel="stylesheet" href="css/style.css">

<!-- Icons (Vanilla SVG-Bibliothek) -->
<script src="js/icons.js"></script>
```

> **Hinweis:** `node_modules/` wird nicht auf GitHub Pages deployed. `css/style.css` (der Build-Output) wird eingecheckt. Die Fonts sind als lokale woff2-Dateien in `fonts/` vorhanden — kein Google Fonts CDN nötig.

### 1.3 Dateistruktur

```
KADRA/
|- index.html
|- manifest.json
|- sw.js
|- README.md
|- CLAUDE.md
|- DEV_LOG.md
|- package.json
|- package-lock.json
|
|- src/
|  |- main.css                <- CSS-Quelle fuer Tailwind-CLI-Build
|
|- css/
|  |- style.css               <- Build-Output (nicht manuell pflegen)
|  |- legacy.css              <- Legacy-/Komponenten-Styles (wird importiert)
|
|- themes/
|  |- hopro.css               <- Primitive/semantische Basis-Tokens
|  |- kadra.css               <- KADRA-spezifische Tokens
|
|- js/
|  |- app.js                  <- App-Logik + Rendering + initStaticIcons()
|  |- db.js                   <- IndexedDB API
|  |- icons.js                <- Inline-SVG Icon-System (Lucide-Vektoren)
|  |- pdf-export.js           <- PDF-Export
|  \- lib/                    <- Vendor libs (jsPDF, AutoTable, Fonts)
|
|- docs/
|  |- README.md
|  |- ui/
|  |  |- icon-system.md
|  |  |- tokens/              <- z. B. 260313 KADRA_Color_Tokens.html
|  |  |- review/              <- UI-Wellen, Baseline, Defects/Plan
|  |  \- reports/             <- z. B. INLINE_SVG_REPORT.txt
|  |- future_features/        <- geplante Features/Spezifikationen
|  \- reviews/                <- allgemeiner Review-Sammelordner
|
|- fonts/
|- icons/
\- node_modules/              <- lokal, nicht committen
```

> **Hinweis:** `node_modules/` bleibt in `.gitignore`. Nach `git clone` reicht `npm install`.

### 1.4 Wichtig: `app.js` ist im Scope

Die bestehende `app.js` (~3800 Zeilen) generiert HTML per String-Concatenation mit hardcoded CSS-Klassen. Jede Klassen-Änderung im CSS erfordert Anpassungen in `app.js`. Das betrifft praktisch alle Render-Funktionen. Dies muss bei jeder Komponenten-Phase mitgedacht werden.

`pdf-export.js` bleibt in der ersten Phase unverändert — PDF-Export hat eigene Inline-Styles und ist vom UI-Redesign entkoppelt.

---

## 2. Design-Philosophie

### Leitprinzipien

- **Clarity** — Inhalte stehen im Vordergrund. Kein visuelles Rauschen.
- **Deference** — Das Interface unterstützt den Inhalt, drängt sich nicht auf.
- **Depth** — Hierarchie durch flächige Elemente, die zusammengehörige Objekte gruppieren. Nicht durch typografische Vielfalt, Rahmen oder Schatten.
- **Konsistenz** — Jede visuelle Entscheidung geht durch das Token-System. Keine Hardcodes.

### Gesamtanmutung

- **Hell und luftig** — Weißer Arbeitsbereich, helle Sidebar, dezente Grautöne
- **Unaufgeregt und professionell** — Preline-Ästhetik: sauber sortiert, klar gegliedert
- **Wenige Mittel, konsequent eingesetzt** — Maximal 3 Schriftgrößen, 2 Gewichte, Hierarchie durch Flächen und Farbe

### Flächen-Prinzip

Inhaltsblöcke (Titelblock, Teilnehmer, Protokollpunkte, Toolbox, Anlagen, Legende) sind weiße Cards, die auf einer leicht getönten Raumfläche „schweben". Die Flächen schaffen die visuelle Struktur — nicht Überschriften-Hierarchien oder dekorative Elemente.

---

## 3. Hopro Theme - Farbsystem

**Status:** Dieser Abschnitt beschreibt den aktuellen Stand aus `themes/hopro.css` und `themes/kadra.css` (Stand 2026-03-14).

### 3.1 Primitive + Semantic (Hopro-Basis aus `themes/hopro.css`)

Die Hopro-Basis liegt in `@theme inline` und liefert primitive und semantische Grundfarben:

```css
@theme inline {
  /* Primitive Hopro */
  --color-hopro-600: #0F3188;
  --color-hopro-800: #0A2870;
  --color-hopro-red-500: #FF3300;
  --color-neutral-950: #1D1D1F;
  --color-neutral-700: #6E6E73;
  --color-neutral-500: #AEAEB2;
  --color-neutral-300: #D2D2D7;
  --color-neutral-200: #E5E5EA;
  --color-neutral-50:  #F5F5F5;
  --color-neutral-0:   #FFFFFF;

  /* Semantic Hopro */
  --color-primary:      var(--color-hopro-600);
  --color-primary-dark: var(--color-hopro-800);
  --color-danger:       var(--color-hopro-red-500);

  --color-text-primary:   var(--color-neutral-950);
  --color-text-secondary: var(--color-neutral-700);
  --color-text-tertiary:  var(--color-neutral-500);
  --color-text-inverted:  var(--color-neutral-0);

  --color-bg-app:      var(--color-neutral-100);
  --color-bg-surface:  var(--color-neutral-0);
  --color-bg-sidebar:  var(--color-neutral-0);
  --color-bg-hover:    var(--color-neutral-50);
}
```

### 3.2 KADRA-App-Tokens (aus `themes/kadra.css`)

KADRA definiert die tatsaechlich genutzten Laufzeit-Tokens fuer UI-Komponenten:

```css
:root {
  /* App-Flaechen */
  --bg-app:     #E3E5E8;
  --bg-surface: #FFFFFF;
  --bg-sidebar: #FFFFFF;
  --bg-input:   #F2F2F2;
  --bg-hover:   #F5F5F5;

  /* Interaktion / Akzent */
  --accent-blue:      #154384;
  --accent-blue-dark: #0E2D58;
  --accent-blue-10:   #EDF1F7;
  --accent-blue-20:   #DBE3F0;

  --accent-red:       #CC4933;
  --accent-red-10:    #F5DBD6;
  --danger:           #CC4933;
  --warning:          #E0661F;
  --success:          #94AF83;

  /* Text / Border */
  --text-primary:   #000000;
  --text-secondary: #6E6E6E;
  --text-tertiary:  #AEAEAE;
  --text-inverted:  #FFFFFF;
  --icon-color:     #999999;

  --border:       #D2D2D2;
  --border-light: #E5E5E5;

  /* Abschnittsfarben */
  --kadra-section-bg:   #0E2D58;
  --kadra-section-text: #FFFFFF;
}
```

### 3.3 Verbindliche Farbregeln (UI-Review)

- Frame-Header (TEILNEHMER/INHALTE/ANLAGEN/AUFGESTELLT/LEGENDE): `--kadra-section-bg`
- Toolbar-Primary/aktive Pill: `--accent-blue-dark`
- Destruktiv-Hover (z. B. Shredder): `--accent-red`
- Warnhinweise/Toast-Warnungen: `--warning`
- Keine Hardcodes in Komponenten; nur Tokens aus `themes/kadra.css` verwenden.

---
## 4. Typografie

### 4.1 Font

Einzige Schriftfamilie für die gesamte App:

```css
@theme {
  --font-sans: 'Nunito Sans', -apple-system, 'Segoe UI', sans-serif;
}
```

Keine Serif-Schrift, kein Monospace. Eine Schrift, konsequent.

### 4.2 Type Scale — 3 Größen

Ersetzt die 8 hardcoded Schriftgrößen aus dem Bestand. Hierarchie entsteht durch Flächen und Farbe, nicht durch viele Schriftgrößen.

| Stufe | Größe | Tailwind | Verwendung |
|-------|-------|----------|------------|
| **Klein** | 11px | `text-xs` | Labels, Protokoll-IDs, Timestamps, Badges, Spaltenköpfe, Sidebar-Datum |
| **Standard** | 13px | `text-sm` | Body-Text, Protokollpunkte, Tabellen, Inputs, Buttons, Sidebar-Einträge |
| **Groß** | 20px | `text-xl` | Protokolltitel, Kapitel-Header |

### 4.3 Font Weights — 2 Gewichte

| Gewicht | Wert | Tailwind | Verwendung |
|---------|------|----------|------------|
| **Normal** | 400 | `font-normal` | Standard-Text, Protokollpunkte, Labels |
| **Semibold** | 600 | `font-semibold` | Betonung: Buttons, aktive Sidebar-Einträge, Kapitel-Header, neue Punkte, Unterkapitel |

### 4.4 Spezielle Typografie-Regeln

| Kontext | Größe | Gewicht | Zusatz |
|---------|-------|---------|--------|
| Protokoll-ID (`#13\|B.1.01`) | Klein | Normal | — |
| Protokolltitel | Groß | Semibold | — |
| Kapitel-Header | Groß | Semibold | Weiß auf dunkelgrauem Hintergrund |
| Unterkapitel | Standard | Semibold | — |
| Thema | Standard | Normal | `underline` |
| Neuer Punkt | Standard | **Semibold** | Fett-Gewicht signalisiert „neu" |
| Ergänzung | Standard | Normal | `text-primary` (blau), nur geänderte Passage |
| Erledigter Punkt | Standard | Normal | `text-muted-foreground-2` (grau) |

> **Audit-Auflösung:** 8 hardcoded Schriftgrößen → 3 Stufen. 6 Font-Weights → 2 Gewichte. Typografische Vielfalt bewusst reduziert.

---

## 5. Spacing & Layout

### 5.1 Spacing Scale

Tailwind liefert das Spacing-System nativ (4px-Basis). Die KADRA-relevante Teilmenge:

| Tailwind | Wert | Verwendung |
|----------|------|------------|
| `gap-1` | 4px | Inline-Abstände, Icon-Gaps |
| `gap-2` / `p-2` | 8px | Toolbox-Gaps, kleine Paddings |
| `gap-3` / `p-3` | 12px | Sidebar-Items, Formularfelder |
| `gap-4` / `p-4` | 16px | Standard-Sektionsabstand |
| `gap-5` / `p-5` | 20px | Sidebar-Header, Titelblock |
| `gap-6` / `p-6` | 24px | Card-Padding, Arbeitsbereich |
| `gap-8` / `p-8` | 32px | Abstand zwischen Cards |

> **Audit-Auflösung:** Die ~347 hardcoded Spacing-Werte werden durch Tailwind-Utilities ersetzt.

### 5.2 Layout-Grundstruktur

```
┌───────────────────────────────────────────────────────────────┐
│  Sidebar (weiß, 272px, fixed)  │  Arbeitsbereich (flex-1)    │
│                                 │  bg: Raumfläche (#F8F9FB)   │
│  ☰ Logo + KADRA                │  ┌─────────────────────┐    │
│  Projekt-Dropdown               │  │ Toolbox (weiße Card,│    │
│  Backup-Anzeige                 │  │ sticky top)         │    │
│  [NEUES PROTOKOLL]              │  └─────────────────────┘    │
│  [IMPORT PROTOKOLL]             │  ┌─────────────────────┐    │
│  [Suchen …]                     │  │ Titelblock          │    │
│  ─────────────────              │  │ (weiße Card)        │    │
│  ▾ Planer Jour Fixe            │  └─────────────────────┘    │
│    ▪ Nr. 13 (aktiv)            │  ┌─────────────────────┐    │
│      Nr. 12                     │  │ Teilnehmer          │    │
│  ▾ Einzeldokumente             │  │ (weiße Card)        │    │
│    Testnotiz                    │  └─────────────────────┘    │
│                                 │  ┌─────────────────────┐    │
│  ─────────────────              │  │ Protokollpunkte     │    │
│  🗑 Papierkorb                  │  │ (weiße Card)        │    │
│                                 │  └─────────────────────┘    │
│                                 │  ┌─────────────────────┐    │
│                                 │  │ Anlagen (weiße Card)│    │
│                                 │  └─────────────────────┘    │
│                                 │  ┌─────────────────────┐    │
│                                 │  │ Legende (weiße Card)│    │
│                                 │  └─────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

- **Sidebar:** `w-[272px]`, fixed, weiß, dezente Linie rechts (`border-line-2`)
- **Raumfläche:** `bg-background` (#F8F9FB) — leicht getönt
- **Cards:** `bg-background-1` (#FFFFFF), `rounded`, Abstand untereinander über Spacing
- **Toolbox:** Weiße Card, `sticky top-0`, gleiche Optik wie andere Cards
- **Sidebar ein-/ausklappbar** (Preline Sidebar-Komponente)

---

## 6. Shape, Elevation, Motion

### 6.1 Border Radius — 3 Stufen

| Tailwind | Wert | Verwendung |
|----------|------|------------|
| `rounded-sm` | 4px | Badges, Tags, kleine Elemente |
| `rounded` | 6px | Standard: Inputs, Cards, Buttons |
| `rounded-lg` | 12px | Modals |

> **Audit-Auflösung:** `border-radius: 3px` (3× hardcoded) wird durch `rounded-sm` (4px) vereinheitlicht.

### 6.2 Elevation — Minimal

Die Flächen-Hierarchie (weiße Cards auf grauer Raumfläche) macht Schatten weitgehend überflüssig:

| Kontext | Schatten |
|---------|---------|
| Cards auf Raumfläche | `shadow-none` oder maximal `shadow-sm` |
| Dropdowns, Popovers | `shadow` |
| Modals | `shadow-md` |

### 6.3 Motion — Eine Geschwindigkeit

```css
/* Standard-Transition für alle interaktiven Elemente */
transition: all 200ms ease-out;
/* Tailwind: transition-all duration-200 ease-out */
```

---

## 7. Komponenten — Sidebar

**Basis:** Vanilla JS + CSS — kein externes Framework.

**Referenz-Ästhetik:** Hell, weiß, klar gegliedert, dezente Trennlinien, viel Luft.

### Struktur

```
Sidebar (weiß, w-[272px], h-screen, fixed, border-r border-line-2)
│
├── Kopfzeile
│   ├── ☰ Hamburger-Menü (öffnet Optionen-Dropdown)
│   ├── [K] Logo + "KADRA"
│   └── [⊞] Sidebar-Toggle (ein-/ausklappen)
│
├── Trennlinie
│
├── Projekt-Zone
│   ├── [HIS ▾ Projektname] Dropdown + [+] Neues Projekt
│   └── Backup-Anzeige (Dateiname, dezent)
│
├── Trennlinie
│
├── Aktionen
│   ├── [NEUES PROTOKOLL] Button (Primary, gefüllt)
│   ├── [IMPORT PROTOKOLL] Button (Outlined)
│   └── [🔍 Suchen …] Suchfeld
│
├── Trennlinie
│
├── Protokollliste
│   ├── ▾ Terminserien (collapsible Sektion)
│   │   ├── Protokolltyp-Label (z.B. "PLANER JOUR FIXE")
│   │   ├── Aktives Protokoll (dezente Hintergrundfläche, Semibold)
│   │   └── Weitere Protokolle (Normal, hover: dezente Fläche)
│   │
│   └── ▾ Einzeldokumente (collapsible Sektion)
│       └── Einträge mit Datum + Attachment-Icon
│
├── Trennlinie
│
└── 🗑 Papierkorb
```

### Hamburger-Menü (☰) — Inhalt

Öffnet als Vanilla-Dropdown (`<div>` + click-Toggle + CSS):

```
┌──────────────────────────┐
│  ↑  Datenbank öffnen     │
│  ↓  Datenbank speichern  │
│  ⊗  Datenbank schließen  │  ← text-danger
│  ─────────────────────── │
│  ↗  Projekt öffnen       │
│  ↓  Projekt speichern    │
│  🗑  Projekt löschen      │  ← text-danger
│  ─────────────────────── │
│  ℹ  Info                 │
│  →  Abmelden             │
└──────────────────────────┘
```

### Design-Entscheidungen

| Aspekt | Entscheidung | Begründung |
|--------|-------------|------------|
| Hintergrund | Weiß (#FFFFFF) | Hell und luftig, kein Kontrastbruch zum Arbeitsbereich |
| Trennung zum Arbeitsbereich | Dezente Linie (`border-line-2`) | Klar aber unauffällig |
| Aktives Item | Dezente Hintergrundfläche + Semibold | Flächen-Prinzip: Gruppierung durch Fläche |
| Sektionen | Collapsible mit Chevron | Vanilla JS Collapse (bestehende Logik in app.js), spart Platz |
| Hamburger-Menü | Oben links, öffnet Dropdown | Enthält Datenbank- und Projekt-Operationen |

---

## 8. Komponenten — Toolbox / Action Bar

**Basis:** Vanilla JS + CSS (`<div>` + `<button>` Gruppen)

Die Toolbox ist eine **weiße Card** (wie alle anderen Inhaltsblöcke), **sticky am oberen Rand**. Beim Scrollen gleiten die anderen Cards darunter durch.

### Struktur

Buttons sind in **gruppierten Inseln** angeordnet — zusammengehörige Aktionen sitzen in einer gemeinsamen, leicht getönten Fläche innerhalb der weißen Card:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌───────────┐  ┌──────────────────────────┐  ┌─────────┐              │
│  │ 👁 KAP ▾  │  │ ⊕ KAP  ≡ UKAP  ≡ THEMA │  │ + PKT   │              │
│  └───────────┘  └──────────────────────────┘  └─────────┘              │
│                                                                          │
│           ┌──────────────────┐  ┌───────────┐  ┌──────────┐            │
│           │ 🔽 Filter  ⌕  ↻ │  │ PDF  XLSX │  │ Löschen  │            │
│           └──────────────────┘  └───────────┘  └──────────┘            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Button-Gruppen

| Gruppe | Inhalt | Funktion |
|--------|--------|----------|
| **Kapitel-Filter** | 👁 KAP (Dropdown) | Kapitel ein-/ausblenden (Checkboxen A–F) |
| **Struktur anlegen** | ⊕ KAP, ≡ UKAP, ≡ THEMA | Neue Gliederungselemente anlegen |
| **Hauptaktion** | + PKT | Neuen Protokollpunkt anlegen (Primary) |
| **Punkt-Filter & Utilities** | 🔽 Filter (Dropdown), ⌕ Suche, ↻ Aktualisieren | Filtern nach Punkt-Eigenschaften (erledigt, überfällig, neu, Aufgaben, Freigabe) |
| **Export** | PDF, XLSX | Export-Funktionen |
| **Destruktiv** | Löschen | Protokoll löschen (Danger) |

### Design-Entscheidungen

| Aspekt | Entscheidung | Begründung |
|--------|-------------|------------|
| Card-Prinzip | Weiße Card wie alle Inhaltsblöcke | Einheitliches Flächen-Prinzip |
| Sticky | `sticky top-0` | CTA und Export immer erreichbar |
| Gruppierung | Tonal hinterlegte Inseln | Zusammengehörigkeit visuell klar |
| Kein "TOOLBOX"-Label | Entfernt | Selbsterklärend, reduziert Rauschen |
| Zwei verschiedene Filter | Kapitel-Filter (Struktur) vs. Punkt-Filter (Inhalt) | Unterschiedlicher Scope, klar getrennt |

---

## 9. Komponenten — Buttons

**Basis:** Vanilla `<button>` + CSS-Klassen

### Button-Varianten — 4 Typen

| Variante | Aussehen | Verwendung |
|----------|---------|------------|
| **Primary** (gefüllt) | Blauer Hintergrund, weiße Schrift | Neues Protokoll, + Punkt, Speichern, Protokoll erstellen |
| **Tonal** (leicht getönt) | Leicht grauer Hintergrund auf weißem Grund | Toolbox-Buttons (KAP, UKAP, THEMA, PDF, XLSX) |
| **Outlined** (Rahmen) | Transparenter Hintergrund, Rahmen | Import Protokoll, Abbrechen in Dialogen |
| **Danger** (rot) | Rote Schrift oder roter Hintergrund | Löschen, Datenbank schließen, Projekt löschen |

### Button-Größen — 2 Stufen

| Größe | Höhe | Verwendung |
|-------|------|------------|
| `sm` | 32px | Toolbox-Buttons, Inline-Aktionen in Tabellen |
| `md` | 36px | Standard: Formulare, Dialoge, Sidebar CTA |

> **Audit-Auflösung:** 10+ Button-Varianten ohne Basisklasse → 4 semantische Varianten. 3 verschiedene Button-Höhen → 2 Stufen.

---

## 10. Komponenten — Inputs & Formulare

**Basis:** Vanilla `<input>`, `<select>`, `<textarea>` + CSS

### Input-Höhen — 2 Stufen

| Kontext | Höhe | Verwendung |
|---------|------|------------|
| Standard | 36px | Formulare, Dialoge, Titelblock |
| Kompakt | 32px | Innerhalb von Tabellen (Kategorie, Zuständig, Termin) |

### Formularelemente in KADRA

| Element | Lösung | Kontext |
|---------|--------|---------|
| Textfeld | `<input type="text">` | Titelblock (Titel, Ort, Uhrzeit), Teilnehmer (Name, Firma, E-Mail) |
| Textarea | `<textarea>` | Protokollpunkt-Inhalt (mehrzeilig, variable Höhe) |
| Datepicker | `<input type="date">` oder Custom-Vanilla | Protokolldatum, Termin |
| Dropdown (einfach) | `<select>` + Custom-Styling | Kategorie, Protokolltyp |
| Dropdown (Mehrfach) | Custom Vanilla (bestehende Logik) | Zuständig (mehrere Firmenkürzel) |
| Checkbox | SVG-Icons via `icons.js` (`iconSquare`/`iconSquareCheckBig`) | Teilnehmer, Verteiler, Erledigt |
| Suchfeld | `<input type="search">` | Sidebar-Suche, Toolbox-Suche |

> **Audit-Auflösung:** 5 verschiedene Input-Höhen → 2 Stufen (Standard + Kompakt).

---

## 11. Komponenten — Tabellen & Protokollpunkte

### Teilnehmer-Tabelle

**Basis:** Vanilla `<table>`. Weiße Card, collapsible.

```
Teilnehmer (weiße Card, collapsible)
├── Spaltenköpfe: Name | Firma | Kürzel | E-Mail | Teilnehmer ☑ | Verteiler ☑ | ⋮
├── Zeilen: hover-Effekt, dezente Trennlinie
└── Footer: Eingabezeile + "Hinzufügen" Button
```

### Protokollpunkte-Tabelle

**Basis:** Vanilla `<table>` + JS Collapse (bestehende Logik).

Eine weiße Card mit dem Label „PROTOKOLLPUNKTE" und **drei verschachtelte Collapse-Ebenen**:

```
Protokollpunkte (weiße Card)
├── ▾ Card-Titel "PROTOKOLLPUNKTE" (collapsible — Ebene 1: gesamte Card)
│   ├── Spaltenköpfe: ID | Inhalt | Kategorie | Zuständig | Termin | Erledigt
│   │
│   ├── ▾ Kapitel-Header "A — ORGANISATION | INFORMATION" (collapsible — Ebene 2)
│   │   │   (dunkelgrauer Balken, weiße Schrift, Groß + Semibold)
│   │   │
│   │   ├── ▾ Unterkapitel "A.1 …" (collapsible — Ebene 3)
│   │   │   │   (Semibold, dezente Linie)
│   │   │   │
│   │   │   ├── Thema "Gebäudeautomation" (unterstrichen)
│   │   │   ├── Punkt #12|A.01 — ID | Inhalt | Kategorie | Zuständig | Termin | ☐
│   │   │   └── Punkt #13|A.01 — ...
│   │   │
│   │   └── ▾ Unterkapitel "A.2 …"
│   │       └── ...
│   │
│   └── ▾ Kapitel-Header "B — QUALITÄTEN | PLANUNG"
│       └── ...
```

### Kapitel-Header-Farbgebung

| Element | Hintergrund | Text |
|---------|------------|------|
| Kapitel-Header (A, B, C …) | Dunkelgrau (`--color-neutral-700`) | Weiß |
| Unterkapitel (B.1, B.2 …) | Transparent | `--foreground`, Semibold |
| Thema | Transparent | `--foreground`, unterstrichen |

### Protokollpunkt-Zustände

| Zustand | Gewicht | Farbe |
|---------|---------|-------|
| **Neu** (aktuelles Protokoll) | Semibold | `--foreground` |
| **Bearbeitet** (Ergänzung) | Normal | `--primary` (blau, nur geänderte Passage) |
| **Offen** (aus Vorgänger) | Normal | `--foreground` |
| **Erledigt** | Normal | `--muted-foreground-2` (grau) |
| **Termin überfällig** | — | `--danger` (rot) |

### Kategorie-Badges

| Kategorie | Hintergrund | Text |
|-----------|------------|------|
| Aufgabe | `--color-primary-50` | `--primary` |
| Info | `--color-neutral-100` | `--color-neutral-600` |
| Festlegung | `--color-orange-100` | `--warning` |
| Freigabe | `--color-green-100` | `--success` |

> **Audit-Auflösung:** Hardcoded Kategorie-Farben (`#B35900`, `#1A7034`) → semantische Tokens. Kapitel-Header: dunkelgrau statt Primary-Blau.

---

## 12. Komponenten — Overlays & Modals

**Basis:** Vanilla JS + CSS — eigene Modal/Dropdown-Implementierung.

### Modals

Für alle Dialoge: Neues Projekt, Neues Protokoll, Bestätigungsdialoge, Papierkorb.

**Wichtig:** Keine nativen Browser-Dialoge (`confirm()`, `alert()`) mehr verwenden. Alle durch eigene Vanilla-Modals ersetzen.

| Aspekt | Spezifikation |
|--------|--------------|
| Hintergrund | Weiß |
| Border Radius | 12px (`--kadra-radius-card` o.ä.) |
| Scrim | Abgedunkelter Hintergrund (rgba(0,0,0,0.32)) |
| Max-Breite | 480px für Formulare, 720px für Listen (Papierkorb) |
| Button-Anordnung | Rechts unten: [Abbrechen (outlined)] [Primäraktion (filled)] |
| Destruktive Dialoge | Primäraktion als Danger-Button (rot) statt Primary |
| ARIA | `role="dialog"`, `aria-modal="true"`, Focus-Trap manuell |

### Dropdowns

Für: Hamburger-Menü, Kapitel-Filter (👁 KAP), Punkt-Filter (🔽), Kategorie-Auswahl, Zuständig-Auswahl.

Vanilla `<div>` + click-Toggle + CSS. `role="menu"` und Keyboard-Navigation manuell ergänzen.

### Toast-Notifications

Drei Varianten:

| Typ | Farbe | Beispiel |
|-----|-------|---------|
| **Erfolg** | Grün (`--success`) | „Exportiert: 1 Projekt(e), 3 Protokoll(e)." |
| **Warnung** | Orange (`--warning`) | „Nicht gespeicherte Änderungen" |
| **Fehler** | Rot (`--danger`) | „Export fehlgeschlagen" |

Toasts erscheinen oben oder unten, verschwinden automatisch nach wenigen Sekunden.

> **Audit-Auflösung:** Native Browser-Dialoge → ersetzt durch eigene Vanilla-Modals.

---

## 13. Semantische Farben — KADRA-spezifisch

Zusätzlich zu Prelines Standard-Tokens:

```css
:root {
  /* ── Protokollpunkt-Zustände ── */
  --kadra-point-new:      var(--foreground);
  --kadra-point-edited:   var(--primary);
  --kadra-point-done:     var(--muted-foreground-2);
  --kadra-due-overdue:    var(--danger);

  /* ── Kategorie-Badges ── */
  --kadra-cat-aufgabe-bg:      var(--color-primary-50);
  --kadra-cat-aufgabe-text:    var(--primary);
  --kadra-cat-info-bg:         var(--color-neutral-100);
  --kadra-cat-info-text:       var(--color-neutral-600);
  --kadra-cat-festlegung-bg:   var(--color-orange-100);
  --kadra-cat-festlegung-text: var(--warning);
  --kadra-cat-freigabe-bg:     var(--color-green-100);
  --kadra-cat-freigabe-text:   var(--success);

  /* ── Suche ── */
  --kadra-search-match:  rgba(255, 220, 40, 0.25);
  --kadra-search-active: rgba(255, 160, 0, 0.35);

  /* ── Aktennotiz ── */
  --kadra-aktennotiz-chapter-bg: var(--color-neutral-200);

  /* ── Kapitel-Header ── */
  --kadra-chapter-bg:   var(--color-neutral-700);
  --kadra-chapter-text: #FFFFFF;
}
```

> **Audit-Auflösung:** Alle hardcoded Spezialfarben erhalten eigene `--kadra-*` Tokens.

---

## 14. Accessibility

### 14.1 Focus-States

```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
/* NIEMALS: outline: none ohne Ersatz */
```

> **Audit-Auflösung:** 4× `outline: none` eliminiert. Preline + globale Regel setzen konsistente Focus-Styles.

### 14.2 ARIA-Rollen

| Element | ARIA | Quelle |
|---------|------|--------|
| Modals | `role="dialog"`, `aria-modal="true"` | Manuell im HTML |
| Dropdowns | `role="menu"`, `role="menuitem"` | Manuell im HTML |
| Sidebar | `role="navigation"`, `aria-label` | Manuell: `<nav aria-label="Protokoll-Navigation">` |
| Multi-Select | `role="listbox"`, `role="option"` | Manuell (Custom-Lösung) |
| Collapsible Sections | `aria-expanded`, `aria-controls` | Manuell in JS (bestehende Logik erweitern) |

### 14.3 Farbkontrast

| Token | Wert | Kontrast gegen Weiß | WCAG |
|-------|------|---------------------|------|
| `--foreground` | #111827 | 16.8:1 | ✅ AAA |
| `--muted-foreground` | #6B7280 | 5.0:1 | ✅ AA |
| `--muted-foreground-2` | #9DA2AE | 3.4:1 | ⚠️ Nur für nicht-essentiellen Text |
| `--primary` | #0F3188 | 10.2:1 | ✅ AAA |
| `--danger` | #FF3300 | 4.6:1 | ✅ AA |

> **Audit-Auflösung:** `--text-tertiary` (#AEAEB2, 3.5:1) ersetzt durch WCAG-konforme Tokens.

---

## 15. Z-Index-System

| Stufe | Z-Index | Verwendung |
|-------|---------|------------|
| Base | 0 | Standard-Content |
| Sticky | 10 | Toolbox (sticky top) |
| Sidebar | 30 | Sidebar |
| Dropdown | 40 | Dropdowns, Popovers |
| Overlay | 50 | Modal-Scrim |
| Modal | 60 | Modal-Content |
| Toast | 70 | Toast-Notifications |

> **Audit-Auflösung:** Chaotische Z-Indices (10 – 2000) → 7 Stufen (0 – 70). Toasts korrekt über Modals.

---

## 16. Icon-System

| Aspekt | Spezifikation |
|--------|--------------|
| Library | **`js/icons.js`** — eigene Vanilla SVG-Bibliothek (Lucide-Geometrie) |
| Größe | 16px × 16px (einheitlich) |
| Farbe Standard | `#999999` (Grau) via `.kadra-icon { color: #999999 }` |
| Farbe Schwarz | `#000000` via `.kadra-icon.icon-black` |
| Stroke | `stroke="currentColor"`, `stroke-width: 1.5` |
| Rendering | Inline SVG via JS-Funktionen, z.B. `iconSquare()`, `iconSquareCheckBig('icon-black')` |
| State (Checkboxen) | `data-checked="1|"` auf Container-Div, kein `<input>` |

### 16.1 Hover-States (Pflicht)

Alle Icons und Buttons die eine Aktion auslösen **müssen** einen `:hover`-State haben.

Da Lucide-Icons `stroke="currentColor"` als SVG-Präsentationsattribut nutzen, greift `color` am Parent-Element nicht zuverlässig. SVG-Kind-Elemente müssen direkt per CSS angesprochen werden:

```css
/* ✅ Korrekte Implementierung */
.mein-button:hover svg path,
.mein-button:hover svg polyline,
.mein-button:hover svg circle,
.mein-button:hover svg line,
.mein-button:hover svg rect {
  stroke: var(--ziel-farbe) !important;
}
```

| Kontext | Hover-Farbe | Token |
|---------|-------------|-------|
| Löschen / Destruktiv | Rot | `var(--accent-red)` |
| Hinzufügen / Neutral | Schwarz | `var(--text-primary)` |
| Standard-Aktion | Dunkelblau | `var(--accent-blue)` |

**Niemals** nur `color` am Button-Element setzen — das hat bei SVG-Icons keinen Effekt.

---

## 17. Umsetzungs-Phasen

Der Umbau erfolgt komponentenweise. Die bestehende App (GitHub) bleibt in Betrieb, bis das neue UI lokal steht und getestet ist.

### Phase 1 — Grundgerüst & Build-Pipeline

- ✅ npm Setup: `npm init -y`, Pakete installieren (Tailwind v4)
- ✅ `src/main.css` anlegen, Build-Befehl einrichten
- ✅ `themes/hopro.css` mit Tokens angelegt
- ✅ `themes/kadra.css` mit KADRA-spezifischen Tokens angelegt
- ✅ `node_modules/` in `.gitignore`
- ✅ `js/icons.js` mit SVG-Icon-Bibliothek (Lucide-Geometrie)
- ✅ Preline komplett entfernt (`src/main.css`, `index.html`, `legacy.css`)
- Basis-Layout: Sidebar + Raumfläche + erste leere Card
- **Testen:** Build läuft durch, Theme lädt, Farben stimmen, Layout-Struktur steht

### Phase 2 — Sidebar

- Sidebar gemäß §7 aufbauen (alle Elemente inkl. Hamburger-Menü)
- Vanilla JS: `<div>` + click-Toggle für Dropdown, bestehende Collapse-Logik
- Projekt-Dropdown, Protokollliste, Suchfeld
- **Testen:** Navigation funktioniert, Collapse auf/zu, aktives Protokoll hervorgehoben

### Phase 3 — Toolbox

- Toolbox als weiße Card, sticky, gemäß §8
- Button-Gruppen als Inseln (Vanilla `<div>` + CSS)
- Kapitel-Filter und Punkt-Filter als Vanilla-Dropdowns mit Checkboxen
- **Testen:** Alle Buttons klickbar, Filter-Dropdowns öffnen/schließen

### Phase 4 — Arbeitsbereich: Titelblock + Teilnehmer

- Titelblock als weiße Card mit Formularfeldern
- Teilnehmer-Tabelle als weiße Card (collapsible)
- ✅ SVG-Checkboxen via `icons.js` für Teilnehmer/Verteiler
- **Testen:** Daten eingeben, Teilnehmer hinzufügen/entfernen

### Phase 5 — Arbeitsbereich: Protokollpunkte

- Protokollpunkte-Card mit verschachtelten Collapse-Ebenen
- Kapitel-Header (dunkelgrau), Unterkapitel, Themen, Punkte
- Punkt-Zustände (neu/bearbeitet/erledigt) über Tokens
- Kategorie-Badges
- Drag & Drop (bestehende Logik beibehalten, siehe §18)
- **Testen:** Punkte anlegen, bearbeiten, Zustände korrekt dargestellt

### Phase 6 — Overlays & Restliche Cards

- Modals: Neues Protokoll, Bestätigungsdialoge (Preline Modal, ersetzt `confirm()`)
- Toasts: Erfolg, Warnung, Fehler
- Anlagen-Card, Aufgestellt-Card, Legende-Card
- **Testen:** Dialoge öffnen/schließen, Focus-Trap, Toasts erscheinen

### Phase 7 — Integration & Feinschliff

- Bestehende `app.js`-Logik an neue Klassen/Markup anpassen
- Fortschreibungslogik testen (Punkte übernehmen, erledigte grau/entfernen)
- Suche testen (Suchtreff-Hervorhebung über `--kadra-search-*` Tokens)
- Responsive-Verhalten prüfen
- **Testen:** Vollständiger Workflow: Protokoll anlegen → Punkte erfassen → Fortschreiben → PDF-Export

### Phase 8 — PDF-Export (optional, separat)

- PDF-Export hat eigene Inline-Styles und ist vom UI-Redesign entkoppelt
- Kann in einer späteren Iteration an das neue Design angepasst werden

---

## 18. Ausnahmen & Sonderfälle

### 18.1 Drag & Drop — Bestehende Logik beibehalten

Das bestehende Drag & Drop für Protokollpunkte, Themen und Unterkapitel (3 Ebenen, `_dragType`-Mechanismus) ist komplex und custom. Es bleibt erhalten:

- Die bestehende JS-Logik bleibt erhalten
- Nur die visuellen Styles (Drag-Handle-Icon, Hover-Feedback, Drop-Indikator) werden an das Design System angepasst
- Drag Handles verwenden Icons aus `icons.js`, Farben über Tokens (`#999999`)

### 18.2 Zuständig-Feld (Multi-Select) — Eigene Lösung

Das Zuständig-Feld funktioniert mit freitext-basierten Firmenkürzel-Eingaben. Da kein Preline Advanced Select mehr vorhanden ist:

- Bestehende Custom-Lösung beibehalten, nur visuell ans Design System anpassen

### 18.3 `app.js` — HTML-Generierung anpassen

`app.js` generiert HTML per String-Concatenation. Bei jeder Komponenten-Phase müssen die entsprechenden Render-Funktionen in `app.js` mitangepasst werden:

| Phase | Betroffene Bereiche in `app.js` |
|-------|-------------------------------|
| Phase 2 (Sidebar) | `renderSidebar()`, `renderProtocolList()`, Projekt-Dropdown |
| Phase 3 (Toolbox) | `renderToolbox()`, Filter-Logik |
| Phase 4 (Titelblock) | `renderTitleBlock()`, `renderParticipants()` |
| Phase 5 (Protokollpunkte) | `renderPoints()`, `renderChapterHeaders()`, Drag-Handlers |
| Phase 6 (Overlays) | Modal-Aufrufe (`confirm()` → Preline Modal), Toast-Aufrufe |

**Wichtig:** Nicht nur CSS-Klassen in `app.js` ersetzen, sondern auch HTML-Struktur anpassen wo Vanilla-Komponenten ein bestimmtes Markup erwarten.

### 18.4 PDF-Export — Entkoppelt

`pdf-export.js` (~700 Zeilen) verwendet eigene Inline-Styles und ist vom UI-Redesign unabhängig. Der PDF-Export wird in dieser Phase **nicht** verändert. Eine spätere Anpassung ist möglich, hat aber keine Priorität.

---

## 19. Audit-Auflösungsmatrix

### KRITISCH (Accessibility)

| # | Audit-Finding | Lösung | § |
|---|--------------|--------|---|
| 1 | `--text-tertiary` (#AEAEB2) WCAG-Verstoß | `--muted-foreground` (#6B7280) + `--muted-foreground-2` (#9DA2AE) | 3.2, 14.3 |
| 2 | `outline: none` an 4 Stellen | Eliminiert — globale `:focus-visible` Regel | 14.1 |
| 3 | Modals ohne `role="dialog"`, Focus-Trap | Vanilla Modal mit manuellen ARIA-Attributen | 12 |
| 4 | Dropdowns ohne `role="menu"` | Vanilla Dropdown mit manuellen `role="menu"` Attributen | 12 |
| 5 | Multi-Select ohne `role="listbox"` | Custom-Lösung mit manuellen ARIA-Attributen | 14.2 |
| 6 | Sidebar ohne `role="navigation"` | Manuell: `<nav aria-label="…">` | 14.2 |

### HOCH (Wartbarkeit)

| # | Audit-Finding | Lösung | § |
|---|--------------|--------|---|
| 7 | Button-Hover `#0a2570` 3× hardcoded | `--primary-hover` Token | 3.2 |
| 8 | `--accent-green` undefiniert | `--success` (#1A7034) | 3.2 |
| 9 | `--accent-orange` undefiniert | `--warning` (#B35900) | 3.2 |
| 10 | Kategorie-Farben hardcoded | `--kadra-cat-*` Tokens | 13 |
| 11 | Suchtreffer-Farben hardcoded | `--kadra-search-match/active` | 13 |
| 12 | Aktennotiz-Kapitel #D8D8D8 hardcoded | `--kadra-aktennotiz-chapter-bg` | 13 |
| 13 | ~347 Spacing-Hardcodes | Tailwind Spacing Utilities | 5.1 |
| 14 | 8 Schriftgrößen hardcoded | 3 Stufen (11/13/20px) | 4.2 |
| 15 | Kein Font-Weight-System | 2 Gewichte (400/600) | 4.3 |

### MITTEL (UX-Konsistenz)

| # | Audit-Finding | Lösung | § |
|---|--------------|--------|---|
| 16 | 10+ Button-Varianten ohne Basis | 4 Vanilla-Varianten (CSS-Klassen) | 9 |
| 17 | 5 verschiedene Input-Höhen | 2 Stufen: 36px + 32px | 10 |
| 18 | `border-radius: 3px` 3× hardcoded | `rounded-sm` (4px) | 6.1 |
| 19 | Z-Index-Chaos (10 – 2000) | 7 Stufen (0 – 70) | 15 |
| 20 | Native Browser-Dialoge (`confirm()`) | Eigene Vanilla-Modals | 12 |

---

## Anhang A: Vanilla-Komponenten-Mapping

| KADRA-Bereich | Lösung |
|--------------|--------|
| Sidebar | Bestehende HTML-Struktur + CSS-Redesign |
| Hamburger-Menü | `<div>` + click-Toggle + CSS (`position: absolute`) |
| Toolbox | `<div>` + `<button>`-Gruppen + CSS |
| Projekt-Dropdown | `<div>` + click-Toggle, befüllt aus `App.projects` |
| Kategorie-Dropdown | `<select>` oder Custom `<div>`-Dropdown |
| Zuständig (Multi) | Bestehende Custom-Lösung (§18.2) |
| Kapitel-Filter (👁) | `<div>`-Dropdown + SVG-Checkboxen via `icons.js` |
| Punkt-Filter (🔽) | `<div>`-Dropdown + SVG-Checkboxen via `icons.js` |
| Teilnehmer-Tabelle | Bestehende `<table>` + CSS-Redesign |
| Protokollpunkte | Bestehende `<table>` + JS-Collapse + CSS-Redesign |
| Drag & Drop (Punkte) | Bestehende Custom-Logik (§18.1) |
| Datumsfelder | `<input type="date">` |
| Modals | Vanilla: `<div role="dialog">` + Scrim + CSS |
| Bestätigungsdialoge | Vanilla Modal (ersetzt `confirm()`) |
| Toasts | Vanilla: `<div>` ins DOM einfügen, nach Timeout entfernen |
| Checkboxen | SVG via `iconSquare()`/`iconSquareCheckBig()` aus `icons.js` |
| Suchfeld | `<input type="search">` + bestehende Suchlogik |

## Anhang B: Änderungshistorie

| Version | Datum | Änderungen |
|---------|-------|------------|
| v1.0 | 10.03.2026 | Erstfassung auf Basis M3 + Preline |
| v1.1 | 10.03.2026 | Review: helle Sidebar, kein Georgia/Mono, 3 Größen/2 Gewichte, Flächen-Prinzip, Toolbox als Card, vollständige Sidebar-Elemente, Browser-Dialoge ersetzt, Toast-Varianten, Collapse-Ebenen |
| v1.2 | 11.03.2026 | Integration Claude Code Feedback: Umsetzungs-Phasen, Ausnahmen (Drag&Drop, Zuständig-Select), `app.js` im Scope |
| v1.2.1 | 11.03.2026 | Fix: Tailwind v3 CDN statt v4, Preline v2.6.x, sw.js-Korrektur |
| v1.2.2 | 11.03.2026 | Stack-Entscheidung revidiert: **npm + Tailwind v4 + Preline v4.1.x** (zukunftsfähig). §1 komplett überarbeitet: Build-Pipeline, Dateistruktur, Setup-Befehle. §4.1 zurück auf v4-Syntax |
| v1.2.3 | 11.03.2026 | Fix: Preline JS-Pfad korrigiert (`js/lib/preline.js` statt `node_modules/`), Deployment-Hinweis ergänzt. Phase 1 auf npm-Build-Pipeline aktualisiert (war noch CDN-Formulierung aus v1.2) |
| v1.4 | 12.03.2026 | **Preline komplett entfernt.** Stack-Entscheidung: Vanilla JS statt Preline. §1 (Stack, Einbindung), §7–12 (alle Komponenten), §14 (ARIA), §16 (Icons), §17 (Phasen), §18 (Ausnahmen) aktualisiert. Anhang A: Preline-Mapping → Vanilla-Mapping. Icon-System: `js/icons.js` statt Lucide-Library, 16px/stroke 1.5/grau #999999. |



