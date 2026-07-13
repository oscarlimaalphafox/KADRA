# Kleinigkeiten + offene Punkte

> Sammelliste fuer kleinere Bugs und offene Aufgaben, die zwischendurch
> auffallen — gepflegt von Claude.
>
> `BUGS + FEATURES for later.md` (gleicher Ordner) ist die handgefuehrte
> Liste des Nutzers — dort nichts aendern.
>
> Status: `[ ]` offen · `[~]` in Arbeit / teilweise · `[x]` erledigt
>
> Datum des Ersteintrags je Punkt/Thema vermerken

## Bugs

### [~] Loesch-Dialog reagiert nicht zuverlaessig beim ersten Klick, 

> 21.05.2026

- **Symptom:** Beim Loeschen eines Protokolls ueber das Sidebar-3-Punkte-Menue
  schliesst sich der Bestaetigungsdialog beim Klick auf „Verschieben",
  ohne dass geloescht wird. Erst ein erneuter Durchlauf (Menue → Loeschen →
  Dialog → Verschieben) funktioniert. Tritt **manchmal** auf, nicht immer.
- **Betroffen:** `appConfirm()` in `js/app.js`; Aufruf aus dem Item-Menue
  (`menuPanel`-Click-Handler, `action === 'del'`).
- **Bereits versucht (Stand 2026-05-21), Problem NICHT geloest:**
  1. Menue-Positionierung gefixt (`offsetWidth` vor `display:block`) — war
     ein realer, aber anderer Bug.
  2. `appConfirm`: Modaloeffnung per `setTimeout(0)` verzoegert — half nur
     „manchmal", keine echte Ursache.
  3. `appConfirm`: Handler von `addEventListener` auf `onclick`-Properties
     umgestellt (Singleton-Modal, Listener-Stacking ausgeschlossen) —
     Problem besteht laut Test weiterhin.
- **Naechster Ansatz:** Ursache live mit DevTools eingrenzen — Breakpoint in
  `appConfirm`-`settle()`, pruefen mit welchem Wert (`true`/`false`) und von
  welchem Handler aus resolved wird. Verdacht weiterhin im Event-Handling
  rund um das wiederverwendete `modalConfirm`-Element bzw. dessen Zusammen-
  spiel mit dem Schliessen des Kontextmenues.

## Offene Aufgaben

### [ ] Import: Jour-Fixe-Struktur statt Aktennotiz-Schema uebernehmen,

> 21.05.2026

- **Symptom:** Beim VOCTA-/Markdown-Import eines Jour-Fixe-Protokolls wird
  ein Protokoll vom Typ **Aktennotiz** erzeugt. Dadurch:
  - Es wird ein (leeres) Kapitel **P „Praeambel"** vorangestellt, das es
    im JFx-Protokoll gar nicht gibt.
  - Kapitel erscheinen teils **nummeriert (1, 2, 3 …)** statt mit den
    JFx-Buchstaben (A, B, C …) — Aktennotiz-Kapitellogik.
- **Erwartet:** Importiert man ein Markdown, das der Struktur einer
  Terminserie (JFx) folgt, sollen dessen Kapitel-/Unterkapitelvorgaben
  1:1 uebernommen werden — ohne erzwungene Praeambel, ohne Umnummerierung.
- **Betroffen:** `importVoctaMarkdown()` in `js/app.js` — Zieltyp ist hart
  `'Aktennotiz'`, und `structure` bekommt fix ein vorangestelltes `P`.
  Der Parser (`parseVoctaMarkdown`) liefert die A/B/C-Struktur bereits
  korrekt 1:1; das Problem entsteht erst beim Aufbau des Protokoll-Objekts.
- **Grundsatzfrage vorab klaeren:** Soll ein importiertes JFx-Markdown als
  echtes JFx-Protokoll (Planer/Mieter) angelegt werden statt als
  Aktennotiz? Davon haengt der Loesungsweg ab — evtl. Protokolltyp im
  Import-Modal waehlbar machen, oder Typ aus dem Markdown-Titel ableiten.

<!-- Neue Kleinigkeiten hier eintragen -->
