# Offene Themen — konsolidierter Stand 2026-07-12

> Projektuebergreifende Konvention: Diese Datei heisst in jedem Projekt
> `docs\TODOS_offeneThemen.md` und ist der Einstiegspunkt fuer „was ist offen /
> wo weitermachen" (siehe `AI\CLAUDE.md`). Vorher: `260712_Offene_Themen.md`.
>
> Zusammenfuehrung aller offenen Punkte aus Repo-Review vom 12.07.2026.
> Ersetzt `NEXT_STEPS_UI.md` und `SESSION_HANDOVER.md` (Stand 15.03., grossteils
> durch den Workspace-Karten-Umbau ueberholt — archiviert unter `docs/Archiv_ToDo/`).
>
> Handgefuehrte Nutzerliste bleibt separat: `BUGS + FEATURES for later.md` (dort nichts aendern).
> Die frueher separate Claude-Liste `Kleinigkeiten + offene Punkte.md` ist am 13.07.2026
> hier integriert worden (archiviert unter `Archiv_ToDo\`) — Kleinbugs ab jetzt direkt hier eintragen.
>
> Bewertung je Thema: **Invasivitaet** (isoliert vs. Render-/State-Logik) ·
> **Fehleranfaelligkeit** · **Tokenintensitaet** (Umsetzungskosten).

---

## Am 12.07.2026 erledigt (aus den Altlisten raus)

- [x] Neuer Punkt entsteht direkt unter dem angewaehlten Punkt (kam mit Workspace-Karten-Umbau, `addPoint()` + Einfuege-Linie)
- [x] Suchfeld-Loesch-X (`#searchBarClear` existierte bereits, verifiziert)
- [x] Kategorie-/Zustaendig-Dropdown bei den letzten Punkten abgeschnitten → Panels klappen jetzt nach oben (`applyPanelDirection()`, `.panel-up`)
- [x] Kalenderwochen im Datepicker → eigener Picker `openKadraDatePicker()` mit ISO-KW-Spalte (Termin-Felder + Aufgestellt-Datum)
- [x] PDF: Anlagen-Dateinamen sichtbar (rechtsbuendig grau in der Anlagen-Zeile)
- [x] PDF: Kommentar unter „Aufgestellt" (`author.seen`) wird mitgedruckt
- [x] HTML-Export ist implementiert (`js/html-export.js`) — CLAUDE.md entsprechend aktualisiert

## Gestrichen (Entscheidung Olaf, 12.07.2026)

- ~~Tabs (mehrere Protokolle gleichzeitig offen)~~ — wird nicht benoetigt
- ~~Teilnehmer-Spalte „Funktion"~~ — komplett gestrichen (Datenfeld existiert nicht, kein Bedarf)
- ~~Dokumentation via Mintlify~~ — wird nicht benoetigt
- ~~Export XLSX~~ — bereits frueher verworfen („NEIN, wenig Nutzen")
- ~~Import WORD/PDF~~ — bereits frueher verworfen

---

## A — Wichtig + aufwendig

### [ ] Aktennotiz-Ueberarbeitung (Gesamtpaket)
Von Olaf als „gesamter Typ muss ueberarbeitet werden" markiert. Enthaelt:
- erledigt-Checkbox auch fuer Aktennotiz (zumindest „naechste Schritte"; im PDF taucht sie bereits auf)
- Anlage-ID zeigt `#null.01` (Protokoll-Nr. fehlt) → auf `#01` aendern
- Bueroklammer-Indikator fehlt, wenn Anlage vorhanden
- Phase 7 Schritte 4–7: Sidebar-Darstellung, Fortschreibungslogik
Invasiv (Datenmodell + Render-Logik) · mittel fehleranfaellig · tokenintensiv.

### [ ] Import-Reparatur (VOCTA/Markdown)
- Teilnehmer werden aus dem Markdown nicht uebernommen
- Struktur nur Kapitel + Punkte — Unterkapitel sollen mit uebernommen werden
- JFx-Markdown wird als Aktennotiz angelegt: erzwungene Praeambel `P`, Kapitel teils
  nummeriert (1, 2, 3 …) statt JFx-Buchstaben (A, B, C …) — Aktennotiz-Kapitellogik.
  Der Parser (`parseVoctaMarkdown`) liefert die A/B/C-Struktur bereits korrekt 1:1;
  der Fehler entsteht erst in `importVoctaMarkdown()` (`js/app.js`): Zieltyp ist hart
  `'Aktennotiz'`, und `structure` bekommt fix ein vorangestelltes `P`. (Erfasst 21.05.2026)
- **Grundsatzfrage vorab (Olaf):** Protokolltyp beim Import waehlbar machen oder aus Markdown-Titel ableiten?
  Davon haengt der Loesungsweg ab.
Invasiv (Import-Flow) · mittel · mittel tokenintensiv. **Zentral fuer den VOCTA→KADRA-Workflow.**

## B — Wichtig + ueberschaubar

### [ ] Git-History / private future_features (Datenschutz)
`docs/future_features/` ist in `.gitignore`, alte Inhalte aber weiter in der oeffentlichen
GitHub-History abrufbar. Braucht History-Rewrite oder privates Repo
(siehe `docs/future_features/260611 gitignore und History_private repo umstellen.md`).
Olaf kuemmert sich separat / Entscheidung offen.

### [ ] Loesch-Dialog-Bug (`appConfirm`)
Bestaetigungsdialog beim Protokoll-Loeschen (Sidebar-3-Punkte-Menue) schliesst sich
beim Klick auf „Verschieben" manchmal, ohne dass geloescht wird; erst ein zweiter
Durchlauf funktioniert. Tritt **manchmal** auf, nicht immer. (Erfasst 21.05.2026)
- **Betroffen:** `appConfirm()` in `js/app.js`; Aufruf aus dem Item-Menue
  (`menuPanel`-Click-Handler, `action === 'del'`).
- **Drei Fixversuche gescheitert (Stand 21.05.):** (1) Menue-Positionierung gefixt
  (`offsetWidth` vor `display:block`) — war ein realer, aber anderer Bug;
  (2) Modaloeffnung per `setTimeout(0)` verzoegert — half nur „manchmal";
  (3) Handler von `addEventListener` auf `onclick`-Properties umgestellt
  (Listener-Stacking ausgeschlossen) — Problem besteht weiter.
- **Naechster Ansatz:** Ursache live mit DevTools eingrenzen — Breakpoint in
  `appConfirm`-`settle()`, pruefen mit welchem Wert (`true`/`false`) und von welchem
  Handler aus resolved wird. Verdacht: Event-Handling rund um das wiederverwendete
  `modalConfirm`-Element bzw. Zusammenspiel mit dem Schliessen des Kontextmenues.
Isoliert · hoch fehleranfaellig zu jagen · mittel.

## C — Nuetzlich, moderater Aufwand

### [ ] PDF: Anlagen als Dateien direkt anhaengen
Bilder/PDF-Anlagen beim Export ans Protokoll-PDF anhaengen (jsPDF-Einbettung).
Deutlich aufwendiger als die erledigten PDF-Punkte — separat bewerten.

### [ ] Merkliste / Notizfeld
Gelb hinterlegtes Agenda-/Notizfeld vor den Anlagen, Checkbox „im PDF drucken ja/nein",
Aktivierung ueber Toolbar. **Offene Designfragen (Olaf):** Position im Protokoll?
Fortschreibung (mitnehmen oder leer)? Position im PDF? Auch fuer Aktennotiz?
Verwandt: „Live-Mode" und „Textmarker"-Idee (siehe D).

### [ ] Kontaktverwaltung (Option B)
`contacts`-Tabelle in IndexedDB, gespeist aus Teilnehmern aller Protokolle (Upsert on save),
Auto-Fill beim Teilnehmer-Anlegen + VOCTA-Import, Ansicht im Drei-Punkte-Menue.
Spec: `docs/future_features/260306 Kontakte Feature Spec.md`.
**Offene Frage:** projektspezifisch oder projektuebergreifend?

## D — Nice-to-have / zurueckgestellt

- [ ] **AI-Chat** — Spec: `docs/future_features/260303 AI-Chat Feature Spec.md`. Groesstes offenes Feature; API-Key-Handling im Browser ist der heikle Teil. Tokenintensiv in der Entwicklung.
- [ ] **Live-Mode** — Notizfeld neben dem Punkt (Konzept-Idee, haengt an Merkliste)
- [ ] **Textmarker-Modus** — einzelne Woerter oder ganzes Textfeld hinterlegen (Konzept-Idee)
- [ ] **HTML-Export: KI-Kuerzung der Aufgabentexte** — API-Call zur Kuerzung auf max. Laenge; sinnvoll zusammen mit AI-Chat denken
- [ ] **Skills-Check UI-Design** — Abgleich mit https://nervegna.substack.com/p/the-designers-essential-skills-for

## E — Kleinkram

- [ ] `filterProtocolList()` filtert nur `.protocol-item`-Text, nicht Sektions-Header
  (Sidebar-Suche: Serien-/Sektions-Ueberschriften matchen nicht — z. B. Serienname
  tippen findet die Serie selbst nicht, nur Protokolle mit dem Text im Titel)
- [ ] Kategorie-Pille „Freigabe erfordl" zu schmal → Text wird abgeschnitten
  („FREIGABE ERFO…", nicht lesbar; Screenshot 15.07.2026). Pille an den laengsten
  Kategorienamen anpassen (Mindestbreite/`white-space:nowrap` statt Truncation).
  Betrifft `.cat-trigger.kat-*` in den Punkt-Karten. Isoliert (CSS) · niedrig · gering.

## F — Restpunkte aus den Maerz-Dokumenten (gegen Ist-Stand pruefen)

Aus `NEXT_STEPS_UI.md` / `SESSION_HANDOVER.md` (15.03.). Der Workspace-Karten-Umbau
(Juli) hat Toolbar, INHALTE und Strukturleiste neu gebaut — diese Punkte gelten nur
noch dem Grundsatz nach und brauchen vor Umsetzung einen frischen Abgleich:

- [ ] Endabgleich aller Farben gegen `docs/ui/tokens/260313 KADRA_Color_Tokens.html`
- [ ] Endabgleich Icons (nur 1:1 Lucide) gegen `docs/ui/icon-system.md`
- [ ] Button-Gruppen tokenisieren (Sidebar/Toolbar/Content/Modals — Liste im Archiv-Dokument)
- [ ] Typografie/Textfarben konsolidieren (Variablen + Palette aufraeumen)
- [ ] Cross-Browser Smoke-Test (Chrome/Edge, typische Desktop-Aufloesungen)
- [ ] Design-System-Doku auf Ist-Stand bringen (`docs/ui/260311 KADRA_Design_System_V1.3.1.md` — kennt die Workspace-Karten noch nicht)

Ueberholt/entfallen aus den Maerz-Docs: Toolbar-Pixel-Finetuning gegen Figma,
INHALTE-Reparatur, Frame Protokolltitel/AUFGESTELLT/ANLAGEN-Finetuning
(alles durch Karten-Umbau neu gebaut bzw. erledigt).
