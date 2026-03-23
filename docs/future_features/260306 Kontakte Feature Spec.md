# Kontakte-Feature — Spezifikation (Entwurf)

**Datum:** 06.03.2026
**Status:** Ausstehend — noch nicht implementiert

---

## Ziel

Eine projektbezogene Kontaktdatenbank, die sich automatisch aus den Teilnehmerdaten aller Protokolle eines Projekts speist. Kontakte koennen manuell gepflegt werden (Master). Die Daten stehen projektintern fuer Auto-Fill bereit.

---

## Architektur-Entscheidung: Option B (explizite IndexedDB-Tabelle)

Neuer IndexedDB-Store `contacts`:

```
{ id, projectId, name, company, abbr, email }
```

- `name` ist der Primaerschluessel innerhalb eines Projekts (Matching-Basis)
- Upsert-Logik: Protokoll-Teilnehmer befuellen **nur leere Felder** im Kontakt — manuell gepflegte Master-Werte werden nie ueberschrieben
- DB-Migration: `openDB` mit erhoehter Version, `createObjectStore('contacts')` wenn nicht vorhanden

---

## Offene Frage: projektspezifisch oder projektuebergreifend?

**Projektspezifisch** (aktueller Ansatz):
- `projectId` ist Teil des Kontakts
- Gleiche Person in zwei Projekten = zwei separate Eintraege
- Einfacher, klar abgegrenzt
- Nachteil: Keine Wiederverwendung von Kontaktdaten ueber Projekte hinweg

**Projektuebergreifend** (Alternative):
- Kein `projectId` — globaler Kontaktpool
- Projektbezug ergibt sich implizit aus den Protokollen
- Komplexer: Welche Kontakte gehoeren "zu diesem Projekt"? Ansicht muss filtern
- Vorteil: Person einmal pflegen, ueberall verfuegbar

**Empfehlung noch offen — vor Implementierung entscheiden.**

---

## Nutzungsstellen

### 1. Auto-Fill beim Jamie-Import
- Teilnehmer aus dem Import-Dialog (kommagetrennte Namen) werden nach dem Matching-Verfahren gegen die Kontaktdatenbank geprueft
- Bei Treffer: `company`, `abbr`, `email` automatisch befuellen
- Matching: Teilstring auf Nachnamen (letztes Wort des `name`-Felds)

### 2. Auto-Fill beim Teilnehmer hinzufuegen im Protokoll
- Beim Tippen im `Name`-Feld: Dropdown mit passenden Kontakten aus der DB
- Bei Auswahl: alle Felder (company, abbr, email) automatisch befuellen

### 3. Ansicht "Projektkontakte" im Drei-Punkte-Menue
- Tabelle aller bekannten Kontakte des aktuellen Projekts
- Spalten: Name | Firma | Kuerzel | E-Mail
- Editierbar (dieser Stand = Master)
- Neuen Kontakt manuell hinzufuegen
- Kontakt loeschen (mit Warnung: "Wird nicht mehr fuer Auto-Fill vorgeschlagen")
- Kein Einfluss auf bestehende Protokolle (retrospektiv kein Ueberschreiben)

---

## Backup / Import

- `exportFullDB` und `exportProject` muessen den `contacts`-Store einschliessen
- `importFullDB` und `importProject` muessen Kontakte per Upsert wiederherstellen
- Format: analog zu `projects` und `protocols` im bestehenden Backup

---

## Implementierungsreihenfolge (Vorschlag)

1. DB-Migration: neuer `contacts`-Store in `db.js`
2. `DB.Contacts` API: `getByProject()`, `save()`, `upsertFromParticipant()`, `delete()`
3. Upsert-Hook in `saveCurrentProtocol()`
4. "Projektkontakte"-Modal in `index.html` + `app.js`
5. Auto-Fill beim Teilnehmer-Hinzufuegen (Typeahead)
6. Auto-Fill beim Jamie-Import
7. Backup/Import erweitern
