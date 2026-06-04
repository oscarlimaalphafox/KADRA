# BUGS + FEATURES for later

## Olaf führt diese Liste per Hand.  |   @Claude: Finger weg!

## BUGS

- [ ] verschieben per drag\&drop: wenn in Thema verschoben kann nicht wieder zurückschieben in "nicht Thema" oder "leeres Thema" oder so ähnlich nochmal testen
- [ ] Wenn ein Thema angewählt ist, lassen sich keine neuen Punkte darin erzeugen.Sondern der neue Punkt entsteht immer nur dann, wenn man einen bereits bestehenden Punkt angewählt hat.
- [ ] Ein neues Thema lässt sich nicht erzeugen, wenn ein UKAP angewählt ist.
- [ ] Ein Punkt lässt sich nicht mehr aus einem Thema herausschieben - nur noch in ein anderes Thema innerhalb des UKAP.
- [ ] Ein neuer Punkt soll immer direkt unter dem bereits angewählten Punkt erzeugt werden, nicht am Ende der Liste.
- [ ] Der letzte und vorletzte Punkt von INHALTE hat folgendes Problem: Das Auswahlmenü unter Aufgabe wird nicht vollständig angezeigt, sondern verschwindet hinter dem nächsten Frame. In diesem Fall ANLAGEN.
- [x] Wenn ein PKT als erledigt abgehakt wird, soll auch "zuständig" in grauer Schrift dargestellt werden
- [x] Tooltip bei "Protokoll löschen" fehlt
- [x] Seitenleiste zu -> Button muss sich ändern 
- [ ] Typ Aktennotiz erhält auch checkbox "erledigt", zumindest bei "nächste Schritte" // taucht im PDF bereits auf
- [ ] Typ Aktennotiz, Anlage-ID zeigt #null.01 weil Protokoll Nr. nicht vorhanden -> ändern auf #01
- [ ] Typ Aktennotiz, zeigt keine Büroklammer wenn Anlage dabei ist
- [ ] Der gesamte Typ Aktennotiz muss überarbeitet werden.

## UI Design

- [x] Symbole von 
  - https://lucide.dev/  (preferred) oder
  - https://heroicons.com/
- [ ] Überpürfen mit Skills von https://nervegna.substack.com/p/the-designers-essential-skills-for?r=5k6uti&utm_medium=ios&triedRedirect=true
- [x] grip-vertical verwendet / Büroklammer aus lucide?
- [x] Protokollpunkte anpinnen "ID/Inhalt/Kat./Zuständig/Termin/erledigt" ? sodass Inhalte drunter durchscrollen // NEIN
- [ ] Tabs (mehrere Protokolle gleichzeitig offen)
- [ ] Hamburger Menü: "Zuletzt verwendet" mit Untermenü unter "Datenbank öffnen"

## FEATURES

- [x] Suchfeld direkt sichtbar und bereit zur Eingabe in der Toolbox
- [ ] Dateinname der Anlagen auch im PDF Export sichtbar.
- [ ] Der Kommentar unter "Aufgestellt" soll auch in PDF Export sichtbar sein.
- [ ] Unter Teilnehmer eine zusätzliche Spalte einfügen. Funktion (des Teilnehmers) 
- [ ] Im Datumspicker sollen auch die Kalenderwochen des Jahres angezeigt werden.
- [ ] Anlagen sollen dem Protokoll Beim PDF-Export direkt angehängt wd 
- [ ] "live Mode" mit Notizfeld neben dem Punkt?
- [ ] "Textmarker" Mode, entweder einzelnen Wort (möglich?) oder das ganze Textfeld hinterlegen
- [ ] MERKLISTE: am Ende des Protokolls vor den Anlagen, leicht gelb hinterlegt, reines Textfenster? Auswahlknopf daneben "im PDF drucken Ja/Nein", Aktivierung und Deaktivierung in der Toolbar. // Notizen Bereich / für kommenden JFx bzw. als Merker, Agenda / brainstorm Feld
- [x] Import: MD to Aktennotiz Importer | drag&drop Feld in der Seitenleiste
- [ ] Import: Funktioniert nicht richtig. Teilnehmer werden aus dem Markdown-Dokument nicht übernommen. Die Struktur besteht nur aus Kapiteln und Punkten. Besser wäre es, wenn auch Unterkapitel übernommen werden. 
- [x] Import: WORD/PDF (?) to Aktennotiz Importer | drag&drop Feld in der Seitenleiste // NEIN. Zu aufwendig, wenig Nutzen 
- [ ] **IMPORT: Zeilenweise / schrittweise Übernahme aus einem meeting-transkript.md.** 

  - Import-Button klicken. Auswahl, ob gesamtes MD importiert werden soll oder ob ein schrittweise Import vorgenommen werden soll. 

  - Der schrittweise Import öffnet ein neues Fenster, welches die Inhalte des Protokolls bereits im KADRA-Format zeigt. Der Nutzer kann per Drag & Drop einzelne Punkte ins bestehende Protokoll rüberziehen. Dabei wird die ID automatisch vergeben und die restlichen Inhalte und Daten des Punktes werden übernommen.
  - Im Importfenster wird Der rübergeschobene Punkt ausgegraut.
- [x] **Export to .MD !!! WICHTIG**
- [ ] Export to XLS // NEIN. Wenig Nutzen 
- [ ] AI CHAT (260303 AI-Chat Feature Spec.md)
- [ ] Kontaktverwaltung: je Projekt | automatisch generiert aus den Teilnehmern aller Protokolle | Vorschläge beim Eintippen im Feld "Name" (260306 Kontakte Feature Spec.md)
- [ ] Documentation (zB mit https://www.mintlify.com)
