# KADRA — Import-Funktion: VOCTA-Markdown-Import

> Stand: 2026-05-21 · Code-Basis: `js/app.js`, `js/markdown-export.js`
> Ersetzt die fruehere meetjamie-Analyse — Jamie wird nicht mehr genutzt.

## Zusammenfassung

Der „Import Protokoll"-Button in der Sidebar importiert **VOCTA-Markdown**
(`.md`-Dateien). VOCTA (recording + transcript + summary) erzeugt ein
Markdown, dessen Format der **Markdown-Export von KADRA** vorgibt
(`MarkdownExport.exportProtocolMarkdown()`). Damit ist ein Round-Trip
moeglich: KADRA exportiert → VOCTA orientiert sich am Format → KADRA
importiert wieder.

Aus jeder importierten Datei wird eine **Aktennotiz** erzeugt
(`type: 'Aktennotiz'`, `number: null`, keine Serienfortfuehrung).

## Import-Pfade

Der Import-Button oeffnet einen Auswahl-Dialog (`openImportModeDialog`):

| Modus | Funktion | Verhalten |
|---|---|---|
| **Komplett importieren** | `openVoctaImportModal` → `importVoctaMarkdown` | Erzeugt eine neue Aktennotiz aus dem gesamten Markdown |
| **Schrittweise importieren** | `openImportStepperPanel` | Verschiebbares Panel; Punkte per Drag & Drop in das offene Protokoll |

### Schrittweiser Import — Voraussetzungen im `.md`

`parseKadraMarkdown` versteht **ausschliesslich Markdown-Pipe-Tabellen**,
keinen Fliesstext und keine Bullet-Listen. Damit Punkte erkannt werden:

- Punkte muessen als **Pipe-Tabelle** stehen, mit Header-Zeile.
- Der Header braucht **mindestens eine `Inhalt`-Spalte** (Synonyme:
  `Beschreibung`, `Text`); optional `ID`, `Kategorie`, `Verantw.`,
  `Frist`, `Erledigt`. Ohne `Inhalt`-Spalte wird die Tabelle ignoriert.
- Jeder Tabelle muss ein **`## Kapitel`-Header** vorausgehen — Tabellen
  ohne Kapitel-Kontext werden verworfen. `### UKAP` / `#### Thema` sind
  optional (nur Gruppierung im Panel).

Der KADRA-Export erzeugt immer dieses Format. Ein VOCTA-Markdown muss es
ebenso liefern, sonst meldet der Stepper „Keine Punkte gefunden".

Der schrittweise Import ist zudem nur waehlbar, wenn bereits ein
Protokoll geoeffnet ist (die Punkte werden dort eingefuegt).

## Relevante Code-Stellen

| Funktion | Datei / Zeile | Zweck |
|---|---|---|
| `parseVoctaMarkdown(text)` | `js/app.js` ~4987 | Parst die MD-Datei: Metadaten, Teilnehmer, Struktur, Punkte |
| `parseKadraMarkdown(text)` | `js/app.js` ~5349 | Duenner Wrapper: liefert nur `items[]` fuer den Stepper |
| `openVoctaImportModal(file)` | `js/app.js` ~4099 | Liest Datei vorab, befuellt Import-Modal mit Metadaten |
| `importVoctaMarkdown()` | `js/app.js` ~4139 | Erzeugt die Aktennotiz inkl. Struktur & Teilnehmer |
| `buildMarkdown(...)` | `js/markdown-export.js` | Export — definiert das Zielformat (VOCTA-Vorgabe) |

## Erwartetes Markdown-Format

`parseVoctaMarkdown()` liest exakt das vom Export erzeugte Format:

```
# Protokoll zum Planer Jour Fixe Nr. 19

**Projekt:** hillsite Schwalbach
**Projektkuerzel:** HIS
**Mieterin:** ...
**Vermieterin:** ...
**Datum:** 15.04.2026
**Zeit:** 13:00 - 14:00
**Ort:** per Teams
**Aufgestellt:** Olaf Schueler, Hopro GmbH & Co. KG, 20.04.2026

---

## Teilnehmer

| Name | Firma | Kuerzel | E-Mail | Teilgenommen | Verteiler |
|---|---|---|---|:---:|:---:|
| ... | ... | ... | ... | x | x |

## A - Organisation | Information
| ID | Inhalt | Kategorie | Verantw. | Frist | Erledigt |
...

### B.1 - Objektplanung
#### Thema: ...
| ID | Inhalt | ... |
```

## Was extrahiert wird

### Metadaten (Block vor der ersten `##`-Ueberschrift)
Format `**Label:** Wert`. Erkannt werden: `Projekt`, `Projektkuerzel`,
`Mieterin`, `Vermieterin`, `Datum`, `Zeit`, `Ort`, `Aufgestellt`.
Der `# H1`-Titel wird als Dokumenttitel uebernommen.

### Teilnehmer (`## Teilnehmer` + Tabelle)
**Die volle Teilnehmer-Tabelle wird uebernommen** — inkl. der Spalte
**`E-Mail`**. Jeder Eintrag wird zu einem Teilnehmer-Objekt:

```js
{ id, name, company, abbr, email, attended, inDistrib }
```

`Teilgenommen` / `Verteiler` werden aus `x`/`-` als Boolean gelesen.
Fehlt eine Spalte, gilt der Default `true`.

### Struktur (Kapitel / Unterkapitel / Themen)
Die Kapitelstruktur wird **1:1** uebernommen:
- `## A - Label` → Kapitel
- `### A.1 - Label` → Unterkapitel
- `#### Thema: Label` → Thema (auch leere Themen ohne Punkte bleiben erhalten)

Reihenfolge der Kapitel folgt dem Markdown. Die Aktennotiz erhaelt
zusaetzlich ein vorangestelltes Kapitel `P` (Praeambel).

### Punkte (Tabellen unter den Kapiteln)
Spalten `ID | Inhalt | Kategorie | Verantw. | Frist | Erledigt`.
- Escaped Pipes `\|` in IDs (z.B. `#19\|B.1.01`) werden korrekt gelesen.
- Marker `*(neu)*` an der ID setzt `isNew: true`; die ID wird bereinigt.
- `**fett**` / `*kursiv*` im Inhalt wird entfernt.
- Kategorie/Frist/Erledigt werden auf KADRA-Werte gemappt.

### Ignoriert
`## Anlagen`, `## Abkuerzungsverzeichnis`, `## Hinweis` und
`## Aufgabenuebersicht` werden uebersprungen (Abkuerzungen werden beim
Export ohnehin aus den Teilnehmer-Kuerzeln neu erzeugt).

## Rueckgabe von `parseVoctaMarkdown()`

```js
{
  meta:         { title, date, time, location, tenant, landlord,
                  project, projectCode, authorRaw },
  participants: [ { name, company, abbr, email, attended, inDistrib } ],
  structure:    { A: { label, subchapters: [ { id, label, topics: [...] } ] } },
  chapterOrder: [ 'A', 'B', ... ],
  points:       [ { id, chapter, subchapter, topic, content, category,
                    responsible, deadline, done, isNew } ],
  items:        [ ...wie points + origId/sourceChapter/... fuer den Stepper ],
}
```

## Offene Punkte

- `meta.authorRaw` wird geparst, aber nicht verwertet — `importVoctaMarkdown`
  setzt `author` fest auf „Olaf Schueler / Hopro GmbH & Co. KG".
- Anbindung an das geplante **Kontakte-Feature** (`CLAUDE.md`, TODO
  „Option B"): Auto-Fill der Teilnehmer-Kontaktdaten beim Import.
