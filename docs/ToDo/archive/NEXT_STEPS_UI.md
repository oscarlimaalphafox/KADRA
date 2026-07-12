# NEXT STEPS UI

Stand: 2026-03-15

## Status-Update (heute)

- [x] Frame `INHALTE` auf Ziel-Design/Funktion weitgehend gebracht und fuer Nutzungstest eingefroren
- [x] Frame `LEGENDE` finalisiert (UI + Funktion)
- [x] Sidebar-/Hamburger-Papierkorb nachgezogen (Menue-Eintrag + Trash-Panel-Action-Buttons)
- [x] Abkuerzungsverzeichnis in `LEGENDE` auf Pill-Layout vereinheitlicht (auto + manuell)
- [x] Interaktions-Fixes `LEGENDE`: Add, Delete, Enter/Blur, stabile Cursor-Fuehrung in Klarname-Feld
- [x] Modal-Buttons auf tokenisierte Pill-Logik umgestellt (32px Hoehe/Radius, 12px Typo, Primary/Secondary/Danger per Tokens)
- [x] Login-Gate visuell nachgezogen (32px Rundungen) + Passwort-Sichtbarkeit per Auge-Icon (toggle)
- [x] Sidebar-Button `Import Protokoll`: Drag&Drop fuer `.md` aktiviert, mit blauem Drag-over-Status
- [x] Import-Dialog (`meetjamie`): Markdown-Dropzone-Icon auf aktuelles Download-Icon umgestellt
- [x] Meta-Feld `Ort`: Browser-Autofill-Faerbung ueberschrieben, Feld bleibt dauerhaft grau

Umgesetzt in `INHALTE` (weiterhin stabiler Stand):
- Breiten-/Spaltenlayout auf volle Frame-Breite und bessere Lesbarkeit angepasst.
- KAP/UKAP als Pillen (Spacing/Radius/Einrueckung) an Zielbild angenaehert.
- Grip-Handling/Optik auf Teilnehmer-Logik angenaehert (Sichtbarkeit/Positionierung).
- Icon-System konsolidiert (Lucide-basiert ueber `icons.js`, inkl. Checkmarks/Checkbox-Render).
- Erledigt-Zelle visuell und technisch an Teilnehmer-Pattern angeglichen.
- Kategorie-/Zustaendig-Popups ueberarbeitet (Styling, Verhalten, Breite, Footer-Logik).
- Drag&Drop-Einfuegeindikator (blaue Linie) fuer Punkte/Themen ergaenzt.
- Header-Ausrichtungssystem vereinheitlicht (Icon/Text-Achsen).
- KAP/UKAP-Chevrons: Richtungswechsel beim Collapse gefixt; KAP-Chevron in weiss gesetzt.

Umgesetzt in `LEGENDE` + Papierkorb:
- Abkuerzungsverzeichnis von Listenansicht auf kompaktes 3-Spalten-Pill-Layout umgebaut.
- Auto-generierte Abkuerzungen (aus Teilnehmern) und manuelle Abkuerzungen haben nun gleiches Format.
- Add-Button `Abkuerzung hinzufuegen` als Pill-Button (32px-Hoehe, 32px-Rundung).
- Editierbarkeit stabilisiert (Klarname verliert Fokus nicht mehr beim Feldwechsel).
- Enter auf Abkuerzungsfeldern bestaetigt und verlaesst die Pille.
- Loesch-Button bei manuellen Abkuerzungen gehaertet (nur gezieltes Loeschen, kein Neben-Trigger).
- `Papierkorb anzeigen` aus Sidebar-Footer in Hamburger-Menue verschoben (unter `Einstellungen`).
- Trash-Panel-Eintraege erhielten kompaktes Layout mit zwei getrennten Action-Buttons:
  `Wiederherstellen` und `Endgueltig loeschen`.

## Prioritaet A

- [x] Frame `INHALTE` reparieren: UI + Funktion (inkl. Collapse/Expand, Filter, Scroll-Verhalten) - Status: umgesetzt, jetzt Nutzungstest
- [x] Frame `LEGENDE` auf Ziel-Design bringen und funktional pruefen
- [ ] Sidebar-Funktionen endgueltig verifizieren (Serien, Einzeldokumente, Aktionen, Suche, Trash-Flow Endtest)
- [ ] Sidebar visuell finalisieren (nur Rest-Finetuning, keine Struktur-Aenderung)

## Prioritaet B

- [ ] Toolbar Pixel-Finetuning gegen Figma (Spacing, Alignment, States)
- [ ] Finetuning Frame `Protokolltitel` (Spacing, Alignment, responsive Verhalten)
- [ ] Finetuning Hamburger-Menue Funktionen (Spacing/Abstaende, States, Kleinigkeiten)
- [ ] Abschnitt `AUFGESTELLT` final nachziehen (inkl. Datepicker-Positionierung/UX)
- [ ] `ANLAGEN`: Upload/Drop final stabilisieren und Endcheck auf Row-Interaction

## Prioritaet C (Qualitaet)

- [ ] Endabgleich aller Farben gegen `docs/ui/tokens/260313 KADRA_Color_Tokens.html`
- [ ] Endabgleich Icons (nur 1:1 Lucide) gegen `docs/ui/icon-system.md`
- [ ] Cross-Browser Smoke-Test (Chrome/Edge, typische Desktop-Aufloesungen)
- [ ] Abschlussrunde "Test + Feedback" und Defect-Liste fuer Wave C

## Niedrige Prio (Button-Tokenisierung, spaeter)

- [ ] Button-Gruppen tokenisieren (derzeit bewusst zurueckgestellt, keine hohe Prio):
  Sidebar (`sidebar-icon-btn`, `btn-project-selector`, `btn-sidebar-action`, `sidebar-search-clear`, `series-collapse-btn`)
  Hamburger-Menue (`project-menu-item`)
  Toolbar (`toolbar-btn`, `toolbar-btn-icon`, `toolbar-btn-primary`, `toolbar-btn-icon-danger`)
  Content-Aktionen (`btn-add-row`, `btn-add-bottom`, `btn-add-participant`, `btn-delete-row`/`btn-delete-*`, `point-check-btn`, `pg-check-btn`)
  Anlagen/Datum (`attach-pick-btn`, `termin-cal-btn`, `btn-file-action`)
  Legende/Papierkorb (`btn-add-abbrev`, `btn-delete-abbrev`, `trash-action-btn`)
  Modal-Nebenbuttons (`modal-close`, `btn-sm`)
  Login/Footer (`login-btn`, `footer-btn`)
- [ ] Typografie/Textfarben aufraeumen:
  Schrift-Variablen (Groesse/Gewicht) und Textfarben-Palette systematisch konsolidieren,
  kombinierbare Regeln dokumentieren und redundante Stufen/Farbzuweisungen reduzieren.

## Dokumentation

- [ ] Design-System auf finalen Ist-Stand bringen (`docs/ui/260311 KADRA_Design_System_V1.3.1.md`)
- [ ] `DEV_LOG.md` nach jedem groesseren UI-Block mit Datum fortschreiben
