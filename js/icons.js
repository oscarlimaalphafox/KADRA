/* ============================================================
   KADRA · js/icons.js
   Inline-SVG Icon-Bibliothek (Lucide-Geometrie, MIT-Lizenz)
   Globale Steuerung via CSS:
     --icon-size:   16px   (Breite + Höhe aller Icons)
     --icon-stroke: 1.5    (Linienstärke aller Icons)
============================================================ */

const S = 'http://www.w3.org/2000/svg';

/**
 * Erzeugt einen inline-SVG-String für ein Lucide-Icon.
 * w/h und stroke-width werden über CSS-Variablen gesteuert.
 * @param {string} paths  - SVG-Inneres (path, polyline, circle, …)
 * @param {string} [cls]  - optionale zusätzliche CSS-Klasse
 */
function _svg(paths, cls) {
  const c = cls ? ` class="kadra-icon ${cls}"` : ' class="kadra-icon"';
  return `<svg${c} xmlns="${S}" viewBox="0 0 24 24"
    width="var(--icon-size,16px)" height="var(--icon-size,16px)"
    fill="none" stroke="currentColor"
    stroke-width="var(--icon-stroke,1.5)"
    stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

/* ── Navigation / Layout ─────────────────────────────────── */
function iconMenu(cls)            { return _svg('<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>', cls); }
function iconX(cls)               { return _svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', cls); }
function iconCircleX(cls)         { return _svg('<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>', cls); }
function iconChevronUp(cls)       { return _svg('<polyline points="18 15 12 9 6 15"/>', cls); }
function iconChevronDown(cls)     { return _svg('<polyline points="6 9 12 15 18 9"/>', cls); }
function iconChevronRight(cls)    { return _svg('<polyline points="9 18 15 12 9 6"/>', cls); }
function iconChevronsDown(cls)    { return _svg('<polyline points="7 6 12 11 17 6"/><polyline points="7 13 12 18 17 13"/>', cls); }
function iconChevronsRight(cls)   { return _svg('<polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>', cls); }
function iconPanelLeftClose(cls)  { return _svg('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><polyline points="15 8 12 12 15 16"/>', cls); }
function iconPanelLeftOpen(cls)   { return _svg('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><polyline points="12 8 15 12 12 16"/>', cls); }
function iconSettings(cls)        { return _svg('<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>', cls); }
function iconLogOut(cls)          { return _svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>', cls); }
function iconInfo(cls)            { return _svg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>', cls); }

/* ── Dateien / Ordner ────────────────────────────────────── */
function iconFolder(cls)          { return _svg('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>', cls); }
function iconFolderOpen(cls)      { return _svg('<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>', cls); }
function iconFolderPlus(cls)      { return _svg('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>', cls); }
function iconFolderDown(cls)      { return _svg('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><polyline points="8 14 12 18 16 14"/><line x1="12" y1="10" x2="12" y2="18"/>', cls); }
function iconFilePlus2(cls)       { return _svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>', cls); }
function iconFileInput(cls)       { return _svg('<path d="M4 11V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M2 15h10"/><path d="m9 18 3-3-3-3"/>', cls); }
function iconFileText(cls)        { return _svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>', cls); }
function iconFileSearch2(cls)     { return _svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="11.5" cy="14.5" r="2.5"/><polyline points="13.25 16.25 15 18"/>', cls); }
function iconFileSpreadsheet(cls) { return _svg('<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>', cls); }
function iconSave(cls)            { return _svg('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>', cls); }
function iconUpload(cls)          { return _svg('<polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>', cls); }
function iconDownload(cls)        { return _svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>', cls); }
function iconPaperclip(cls)       { return _svg('<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>', cls); }
function iconShredder(cls)        { return _svg('<path d="M4 13V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v5"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 22v-5"/><path d="M14 19v-2"/><path d="M18 20v-3"/><path d="M2 13h20"/><path d="M6 20v-3"/>', cls); }

/* ── Bearbeiten ──────────────────────────────────────────── */
function iconTrash(cls)           { return _svg('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>', cls); }
function iconCopy(cls)            { return _svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>', cls); }
function iconPlus(cls)            { return _svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', cls); }
function iconCirclePlus(cls)      { return _svg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>', cls); }
function iconList(cls)             { return _svg('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>', cls); }
function iconListPlus(cls)        { return _svg('<path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M21 12h-6"/>', cls); }
function iconPenLine(cls)         { return _svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>', cls); }
function iconCalendar(cls)        { return _svg('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>', cls); }
function iconSearch(cls)          { return _svg('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>', cls); }
function iconFilter(cls)          { return _svg('<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>', cls); }
function iconEye(cls)             { return _svg('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>', cls); }
function iconRefreshCw(cls)       { return _svg('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>', cls); }

/* ── Personen ────────────────────────────────────────────── */
function iconUsers(cls)           { return _svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', cls); }
function iconUserPlus(cls)        { return _svg('<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>', cls); }

/* ── Sektions-Icons ──────────────────────────────────────── */
function iconBookOpen(cls)        { return _svg('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>', cls); }
function iconLayers(cls)          { return _svg('<path d="m12.83 2.18 8 3.2a1 1 0 0 1 0 1.86l-8 3.2a2 2 0 0 1-1.48 0l-8-3.2a1 1 0 0 1 0-1.86l8-3.2a2 2 0 0 1 1.48 0Z"/><path d="m2 12 9.11 3.66a2 2 0 0 0 1.48 0L22 12"/><path d="m2 17 9.11 3.66a2 2 0 0 0 1.48 0L22 17"/>', cls); }
function iconStickyNote(cls)      { return _svg('<path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/>', cls); }

/* ── Checkbox-Ersatz ─────────────────────────────────────── */
function iconSquare(cls)          { return _svg('<rect x="3" y="3" width="18" height="18" rx="2"/>', cls); }
function iconSquareCheckBig(cls)  { return _svg('<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>', cls); }

/* ── Drag-Handle (fill, kein stroke) ─────────────────────── */
function iconGrip(cls) {
  const c = cls ? ` class="kadra-icon ${cls}"` : ' class="kadra-icon"';
  return `<svg${c} xmlns="${S}" viewBox="0 0 24 24"
    width="var(--icon-size,16px)" height="var(--icon-size,16px)">
    <circle cx="9"  cy="5"  r="1.8" fill="currentColor"/>
    <circle cx="9"  cy="12" r="1.8" fill="currentColor"/>
    <circle cx="9"  cy="19" r="1.8" fill="currentColor"/>
    <circle cx="15" cy="5"  r="1.8" fill="currentColor"/>
    <circle cx="15" cy="12" r="1.8" fill="currentColor"/>
    <circle cx="15" cy="19" r="1.8" fill="currentColor"/>
  </svg>`;
}
