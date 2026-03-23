# BUGS + FEATURES for later

## BUGS

- [ ] verschieben per drag\&drop: wenn in Thema verschoben kann nicht wieder zurückschieben in "nicht Thema" oder "leeres Thema" oder so ähnlich nochmal testen
- [x] Wenn ein PKT als erledigt abgehakt wird, soll auch "zuständig" in grauer Schrift dargestellt werden
- [x] Tooltip bei "Protokoll löschen" fehlt
- [x] Seitenleiste zu -> Button muss sich ändern 
- [ ] Typ Aktennotiz erhält auch checkbox "erledigt", zumindest bei "nächste Schritte" // taucht im PDF bereits auf
- [ ] Typ Aktennotiz, Anlage-ID zeigt #null.01 weil Protokoll Nr. nicht vorhanden -> ändern auf #01
- [ ] Typ Aktennotiz, zeigt keine Büroklammer wenn Anlage dabei ist

## UI Design

- [x] Symbole von 
  - https://lucide.dev/  (preferred) oder
  - https://heroicons.com/
- [ ] Überpürfen mit Skills von https://nervegna.substack.com/p/the-designers-essential-skills-for?r=5k6uti&utm_medium=ios&triedRedirect=true
- [x] grip-vertical verwendet / Büroklammer aus lucide?
- [x] Protokollpunkte anpinnen "ID/Inhalt/Kat./Zuständig/Termin/erledigt" ? sodass Inhalte drunter durchscrollen // NEIN
- [ ] Tabs (mehrere Protokolle gleichzeitig offen)

## FEATURES

- [x] Suchfeld direkt sichtbar und bereit zur Eingabe in der Toolbox
- [ ] Anlagen sollen dem Protokoll Beim PDF-Export direkt angehängt wd 
- [ ] "live Mode" mit Notizfeld neben dem Punkt?
- [ ] "Textmarker" Mode, entweder einzelnen Wort (möglich?) oder das ganze Textfeld hinterlegen
- [ ] MERKLISTE: am Ende des Protokolls vor den Anlagen, leicht gelb hinterlegt, reines Textfenster? Auswahlknopf daneben "im PDF drucken Ja/Nein", Aktivierung und Deaktivierung in der Toolbar. // Notizen Bereich / für kommenden JFx bzw. als Merker, Agenda / brainstorm Feld
- [x] Import: MD to Aktennotiz Importer | drag&drop Feld in der Seitenleiste
- [ ] Import: WORD/PDF (?) to Aktennotiz Importer | drag&drop Feld in der Seitenleiste
- [ ] Export to .MD, alternativ zum PDF?
- [ ] Export to XLS
- [ ] AI CHAT (260303 AI-Chat Feature Spec.md)
- [ ] Kontaktverwaltung: je Projekt | automatisch generiert aus den Teilnehmern aller Protokolle | Vorschläge beim Eintippen im Feld "Name" (260306 Kontakte Feature Spec.md)
