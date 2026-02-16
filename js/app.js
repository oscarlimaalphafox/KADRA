/**
 * app.js v1.1 — Protokoll-App
 *
 * Änderungen v1.1:
 *  - Multi-Select für Zuständig
 *  - Kategorie Info/Festlegung → Zuständig deaktiviert
 *  - "Freigabe" → "Freigabe erfordl"
 *  - Termin-Feld als <input type="date">
 *  - UKAP/THEMA löschbar (mit Warnung)
 *  - Collapse-All Button
 *  - Protokolltitel + Nr. gleiche Schriftgröße
 *  - Vertikale Ausrichtung Punktzeilen korrigiert
 *  - Zuständig-Dropdown liest Teilnehmer aktuell beim Öffnen
 *  - Bessere Löschen-Bestätigung
 */

/* ── App-State ─────────────────────────────────────────────── */
const App = {
  currentProjectId:  null,
  currentProtocolId: null,
  projects:  [],
  protocols: [],
  selectedRow:        null,
  collapsedSections:  new Set(),
  allCollapsed:       false,
  _pendingChapter:    null,
  _pendingSubchapter: null,
  // v1.3: Serien & Seitenleiste
  selectedSeriesId:    null,   // Welche Serie ist für Fortführung ausgewählt
  collapsedSeriesIds:  new Set(),
  sidebarAllCollapsed: false,
  _duplicatingProtocolId: null,
  // v1.4: Zwei-Sektionen-Sidebar
  collapsedSeriesSectionAll: false,  // TERMINSERIEN alle zugeklappt
  singleDocSectionCollapsed: false,  // EINZELDOKUMENTE zugeklappt
  // Punkt-Filter
  pointFilters: { hideDone: false, onlyOverdue: false, onlyNew: false },
  // Kapitel-Filter
  hiddenChapters: new Set(),
  // Quick-Save (File System Access API)
  _saveFileHandle: null,   // FileSystemFileHandle (Chrome/Edge) oder null
  _saveFileName:   null,   // Letzter Dateiname
};

/* ============================================================
   INIT
============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  await DB.openDB();
  bindGlobalEvents();
  await loadProjects();

  // Klick außerhalb → offene Zuständig-Panels schließen
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.resp-select')) {
      document.querySelectorAll('.resp-panel:not(.hidden)').forEach(p =>
        p.classList.add('hidden')
      );
      document.querySelectorAll('.resp-trigger.open').forEach(t =>
        t.classList.remove('open')
      );
    }
  });
});

/* ============================================================
   PROJEKTE
============================================================ */
async function loadProjects() {
  App.projects = await DB.Projects.getAll();
  renderProjectSelect();
  const lastId = localStorage.getItem('lastProjectId');
  if (lastId && App.projects.find(p => p.id === lastId)) {
    await selectProject(lastId);
  }
}

function renderProjectSelect() {
  const sel = document.getElementById('projectSelect');
  while (sel.options.length > 1) sel.remove(1);
  App.projects.forEach(p => {
    const opt = document.createElement('option');
    opt.value       = p.id;
    opt.textContent = p.code || p.name || p.id;
    sel.appendChild(opt);
  });
  if (App.currentProjectId) sel.value = App.currentProjectId;
}

async function selectProject(projectId) {
  App.currentProjectId = projectId;
  localStorage.setItem('lastProjectId', projectId);
  const project = App.projects.find(p => p.id === projectId);
  if (project) {
    document.getElementById('projectSelect').value = projectId;
  }
  document.getElementById('btnNewProtocol').disabled = false;
  await loadProtocolList();
  const lastProtId = localStorage.getItem('lastProtocolId');
  if (lastProtId && App.protocols.find(p => p.id === lastProtId)) {
    await openProtocol(lastProtId);
  }
}

async function loadProtocolList() {
  if (!App.currentProjectId) return;
  App.protocols = await DB.Protocols.getActiveByProject(App.currentProjectId);
  renderProtocolList();
}

function renderProtocolList() {
  const container = document.getElementById('protocolList');
  container.innerHTML = '';

  if (!App.currentProjectId) {
    container.innerHTML = '<div class="empty-state-sidebar"><p>Kein Projekt ausgewählt.</p></div>';
    return;
  }
  if (App.protocols.length === 0) {
    container.innerHTML = '<div class="empty-state-sidebar"><p>Noch keine Protokolle vorhanden.</p></div>';
    return;
  }

  // Aufteilen: Aktennotiz → immer Einzeldokument; Rest nach seriesId gruppieren
  const seriesMap = {};
  const singleDocs = [];
  App.protocols.forEach(p => {
    if (p.type === 'Aktennotiz') { singleDocs.push(p); return; }
    const key = p.seriesId || ('type:' + p.type);
    if (!seriesMap[key]) seriesMap[key] = [];
    seriesMap[key].push(p);
  });

  // Gruppen mit >1 Protokoll → TERMINSERIEN; Einzelner → EINZELDOKUMENTE
  const terminMap = {};
  Object.entries(seriesMap).forEach(([key, protos]) => {
    if (protos.length > 1) terminMap[key] = protos;
    else singleDocs.push(protos[0]);
  });

  Object.values(terminMap).forEach(arr => arr.sort((a, b) => b.number - a.number));
  singleDocs.sort((a, b) => (b.date||'') > (a.date||'') ? 1 : -1);
  const terminList = Object.entries(terminMap).sort(([, a], [, b]) =>
    (b[0].date||'') > (a[0].date||'') ? 1 : -1);

  const chevronSvg = `<svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor">
    <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>`;

  /* ── TERMINSERIEN ───────────────────────────────────────── */
  if (terminList.length > 0) {
    const tsSection = document.createElement('div');
    tsSection.className = 'sidebar-section';

    const tsHdr = document.createElement('div');
    tsHdr.className = 'sidebar-section-header';
    const tsColBtn = document.createElement('button');
    tsColBtn.type = 'button';
    tsColBtn.className = 'sidebar-icon-btn' + (App.collapsedSeriesSectionAll ? ' all-series-collapsed' : '');
    tsColBtn.title = 'Alle Serien ein-/ausklappen';
    tsColBtn.innerHTML = chevronSvg;
    tsColBtn.addEventListener('click', () => {
      App.collapsedSeriesSectionAll = !App.collapsedSeriesSectionAll;
      tsColBtn.classList.toggle('all-series-collapsed', App.collapsedSeriesSectionAll);
      tsSection.querySelectorAll('.series-group').forEach(grp => {
        const k = grp.dataset.seriesKey;
        if (App.collapsedSeriesSectionAll) { App.collapsedSeriesIds.add(k); grp.classList.add('is-collapsed'); }
        else { App.collapsedSeriesIds.delete(k); grp.classList.remove('is-collapsed'); }
      });
    });
    tsHdr.innerHTML = `<span class="sidebar-section-label">Terminserien</span>`;
    tsHdr.appendChild(tsColBtn);
    tsSection.appendChild(tsHdr);

    terminList.forEach(([seriesKey, protos]) => {
      const sName = protos[0].seriesName || protos[0].title || protos[0].type;
      const isCollapsed = App.collapsedSeriesIds.has(seriesKey);
      const isSelected  = App.selectedSeriesId === seriesKey;

      const group = document.createElement('div');
      group.className = 'series-group' + (isCollapsed ? ' is-collapsed' : '');
      group.dataset.seriesKey = seriesKey;

      const hdr = document.createElement('div');
      hdr.className = 'series-header' + (isSelected ? ' selected' : '');
      hdr.innerHTML = `
        <button class="series-collapse-btn" title="Ein-/Ausklappen">${chevronSvg}</button>
        <span class="series-label" title="${esc(sName)}">${esc(sName)}</span>`;
      hdr.addEventListener('click', (e) => {
        if (e.target.closest('.series-collapse-btn')) {
          App.collapsedSeriesIds.has(seriesKey)
            ? App.collapsedSeriesIds.delete(seriesKey)
            : App.collapsedSeriesIds.add(seriesKey);
          group.classList.toggle('is-collapsed', App.collapsedSeriesIds.has(seriesKey));
          return;
        }
        App.selectedSeriesId = seriesKey;
        document.querySelectorAll('.series-header').forEach(h => h.classList.remove('selected'));
        hdr.classList.add('selected');
      });
      group.appendChild(hdr);

      const body = document.createElement('div');
      body.className = 'series-body';
      protos.forEach(p => body.appendChild(_buildProtocolItem(p)));
      group.appendChild(body);
      tsSection.appendChild(group);
    });
    container.appendChild(tsSection);
  }

  /* ── EINZELDOKUMENTE ────────────────────────────────────── */
  if (singleDocs.length > 0) {
    const sdSection = document.createElement('div');
    sdSection.className = 'sidebar-section' + (App.singleDocSectionCollapsed ? ' is-collapsed' : '');

    const sdHdr = document.createElement('div');
    sdHdr.className = 'sidebar-section-header';
    const sdColBtn = document.createElement('button');
    sdColBtn.type = 'button';
    sdColBtn.className = 'sidebar-icon-btn' + (App.singleDocSectionCollapsed ? ' all-series-collapsed' : '');
    sdColBtn.title = 'Einzeldokumente ein-/ausklappen';
    sdColBtn.innerHTML = chevronSvg;
    sdColBtn.addEventListener('click', () => {
      App.singleDocSectionCollapsed = !App.singleDocSectionCollapsed;
      sdColBtn.classList.toggle('all-series-collapsed', App.singleDocSectionCollapsed);
      sdSection.classList.toggle('is-collapsed', App.singleDocSectionCollapsed);
    });
    sdHdr.innerHTML = `<span class="sidebar-section-label">Einzeldokumente</span>`;
    sdHdr.appendChild(sdColBtn);
    sdSection.appendChild(sdHdr);

    const sdBody = document.createElement('div');
    sdBody.className = 'sidebar-section-body';
    singleDocs.forEach(p => sdBody.appendChild(_buildProtocolItem(p)));
    sdSection.appendChild(sdBody);
    container.appendChild(sdSection);
  }
}

function _buildProtocolItem(proto) {
  const item = document.createElement('div');
  item.className = 'protocol-item' + (proto.id === App.currentProtocolId ? ' active' : '');
  item.dataset.id = proto.id;

  const dateStr = proto.date
    ? new Date(proto.date + 'T12:00:00').toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })
    : '–';
  const hasFiles = (proto.attachments||[]).some(a => a.fileName);
  const clipHtml = hasFiles ? `<span class="protocol-item-clip" title="Enthält Datei-Anlagen">
    <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0V3z"/>
    </svg></span>` : '';

  const sName = esc(proto.seriesName || proto.title || proto.type);
  const label = proto.type === 'Aktennotiz'
    ? `${sName}${clipHtml}`
    : `${sName}\u202FNr.\u202F${String(proto.number || 1).padStart(2,'0')}${clipHtml}`;

  const main = document.createElement('div');
  main.className = 'protocol-item-main';
  main.innerHTML = `
    <div class="protocol-item-title">${label}</div>
    <div class="protocol-item-date-row">
      <span class="protocol-item-meta">${dateStr}</span>
      <div class="protocol-item-actions"></div>
    </div>`;
  main.addEventListener('click', (e) => {
    if (e.target.closest('.protocol-item-actions')) return;
    App.selectedSeriesId = proto.seriesId || ('type:' + proto.type);
    document.querySelectorAll('.series-header').forEach(h => h.classList.remove('selected'));
    openProtocol(proto.id);
  });

  const actionsDiv = main.querySelector('.protocol-item-actions');

  const dupBtn = document.createElement('button');
  dupBtn.type = 'button'; dupBtn.className = 'protocol-item-dup-btn'; dupBtn.title = 'Duplizieren';
  dupBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/>
  </svg>`;
  dupBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    App._duplicatingProtocolId = proto.id;
    document.getElementById('duplicateName').value = '';
    openModal('modalDuplicate');
    setTimeout(() => document.getElementById('duplicateName').focus(), 80);
  });

  const delBtn = document.createElement('button');
  delBtn.type = 'button'; delBtn.className = 'protocol-item-del-btn'; delBtn.title = 'In Papierkorb';
  delBtn.innerHTML = iconTrash();
  delBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const lbl = proto.type === 'Aktennotiz'
      ? (proto.seriesName || proto.title || 'Aktennotiz')
      : `${proto.seriesName||proto.title||proto.type} Nr. ${String(proto.number||1).padStart(2,'0')}`;
    if (!confirm(`Obacht!\n\n"${lbl}" in den Papierkorb verschieben?\n\nAlle Punkte bleiben gespeichert.`)) return;
    await DB.Protocols.trash(proto.id);
    if (App.currentProtocolId === proto.id) {
      App.currentProtocolId = null;
      document.getElementById('emptyState').classList.remove('hidden');
      document.getElementById('protocolView').classList.add('hidden');
      document.getElementById('workspaceToolbar').classList.add('hidden');
    }
    App.protocols = await DB.Protocols.getActiveByProject(App.currentProjectId);
    renderProtocolList();
    showToast('Protokoll in den Papierkorb verschoben.', '');
  });

  actionsDiv.appendChild(dupBtn);
  actionsDiv.appendChild(delBtn);
  item.appendChild(main);
  return item;
}

/* ============================================================
   PROTOKOLL ÖFFNEN
============================================================ */
async function openProtocol(protocolId) {
  App.currentProtocolId = protocolId;
  App.selectedRow = null;
  App.collapsedSections = new Set();
  App.allCollapsed = false;
  localStorage.setItem('lastProtocolId', protocolId);
  // Ausgewählte Serie synchronisieren
  const proto = App.protocols.find(p => p.id === protocolId);
  if (proto) App.selectedSeriesId = proto.seriesId || ('type:' + proto.type);

  document.querySelectorAll('.protocol-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === protocolId));

  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('protocolView').classList.remove('hidden');
  document.getElementById('workspaceToolbar').classList.remove('hidden');

  const protocol = await DB.Protocols.get(protocolId);
  if (protocol) renderProtocol(protocol);
  updateSelectionHint();

  // Collapse-All Button zurücksetzen
  const cab = document.getElementById('btnCollapseAll');
  if (cab) cab.classList.remove('all-collapsed');
}

function renderProtocol(protocol) {
  const project = App.projects.find(p => p.id === protocol.projectId);
  if (project) {
    document.getElementById('projectBadge').textContent = project.code;
    document.getElementById('fieldProjectName').value   = project.name || '';
  }
  const fieldTitle = document.getElementById('fieldTitle');
  fieldTitle.textContent  = protocol.seriesName || protocol.title || '';
  // Serientitel sperren bei Folgeprotokollen (number > 1)
  const isFollowup = protocol.number > 1;
  fieldTitle.contentEditable = isFollowup ? 'false' : 'true';
  fieldTitle.classList.toggle('field-locked', isFollowup);
  fieldTitle.title = isFollowup ? 'Serienname wird im ersten Protokoll festgelegt' : '';
  document.getElementById('fieldNumber').textContent = protocol.type === 'Aktennotiz'
    ? '–' : String(protocol.number || 1).padStart(2,'0');
  document.getElementById('fieldDate').value         = protocol.date       || '';
  document.getElementById('fieldTime').value         = protocol.time       || '';
  document.getElementById('fieldLocation').value     = protocol.location   || '';
  document.getElementById('fieldTenant').value       = protocol.tenant     || '';
  document.getElementById('fieldLandlord').value     = protocol.landlord   || '';

  // Aufgestellt-Block
  const author = protocol.author || {};
  document.getElementById('fieldAuthorFirstName').value = author.firstName ?? 'Olaf';
  document.getElementById('fieldAuthorLastName').value  = author.lastName  ?? 'Schüler';
  document.getElementById('fieldAuthorCompany').value   = author.company   ?? 'Hopro GmbH & Co. KG';
  document.getElementById('fieldAuthorDate').value      = author.date      ?? '';

  renderParticipants(protocol.participants || []);
  renderPoints(protocol);
  renderAttachments(protocol.attachments || [], protocol.number);
  renderAbbrevList(protocol.participants || [], protocol.customAbbreviations || []);
}

/* ============================================================
   TEILNEHMER
============================================================ */
function renderParticipants(participants) {
  const tbody = document.getElementById('participantsBody');
  tbody.innerHTML = '';
  participants.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.idx = idx;
    tr.innerHTML = `
      <td><input class="table-input" value="${esc(p.name)}"    data-field="name" /></td>
      <td><input class="table-input" value="${esc(p.company)}" data-field="company" /></td>
      <td><input class="table-input" value="${esc(p.abbr)}"    data-field="abbr" maxlength="4" style="text-transform:uppercase"/></td>
      <td><input class="table-input" type="email" value="${esc(p.email)}" data-field="email"/></td>
      <td style="text-align:center"><input type="checkbox" class="table-checkbox" data-field="attended"  ${p.attended  ?'checked':''}/></td>
      <td style="text-align:center"><input type="checkbox" class="table-checkbox" data-field="inDistrib" ${p.inDistrib ?'checked':''}/></td>
      <td><button class="btn-delete-row" data-action="deleteParticipant" data-idx="${idx}" title="Entfernen">${iconTrash()}</button></td>
    `;
    tr.querySelectorAll('input').forEach(el => el.addEventListener('change', saveCurrentProtocol));
    // Soft email validation
    const emailInput = tr.querySelector('[data-field="email"]');
    if (emailInput) {
      const checkEmail = () => {
        const v = emailInput.value.trim();
        emailInput.classList.toggle('email-warn', v.length > 0 && !v.includes('@'));
      };
      emailInput.addEventListener('input', checkEmail);
      checkEmail();
    }
    tbody.appendChild(tr);
  });
}

function getParticipantsFromDOM() {
  return Array.from(document.querySelectorAll('#participantsBody tr')).map(tr => ({
    name:      tr.querySelector('[data-field="name"]')?.value    || '',
    company:   tr.querySelector('[data-field="company"]')?.value || '',
    abbr:      (tr.querySelector('[data-field="abbr"]')?.value   || '').toUpperCase(),
    email:     tr.querySelector('[data-field="email"]')?.value   || '',
    attended:  tr.querySelector('[data-field="attended"]')?.checked  ?? true,
    inDistrib: tr.querySelector('[data-field="inDistrib"]')?.checked ?? true,
  }));
}

/**
 * Aktualisiert die Zuständig-Dropdowns aller Punktzeilen
 * mit den aktuell vorhandenen Teilnehmern.
 * Wird aufgerufen nach dem Hinzufügen/Löschen von Teilnehmern.
 */
function updateResponsibleDropdowns() {
  // Die Multi-Select-Panels lesen Teilnehmer beim Öffnen frisch aus dem DOM —
  // daher ist hier kein explizites Rebuild nötig.
  // Wir aktualisieren nur die Abkürzungs-Legende.
  const p = getParticipantsFromDOM();
  const customs = getCustomAbbreviationsFromDOM();
  renderAbbrevList(p, customs);
}

/* ============================================================
   MULTI-SELECT ZUSTÄNDIG
============================================================ */

/**
 * Erstellt den Multi-Select-DOM für "Zuständig".
 * Die Optionsliste wird beim Öffnen live aus dem Teilnehmer-DOM gelesen,
 * sodass neu hinzugefügte Teilnehmer immer erscheinen.
 */
function createResponsibleSelect(currentValue, disabled) {
  const wrap = document.createElement('div');
  wrap.className = 'resp-select' + (disabled ? ' resp-disabled' : '');
  wrap.dataset.field = 'responsible';
  wrap.dataset.value = currentValue || '';

  const display = currentValue ? currentValue : '—';

  const trigger = document.createElement('button');
  trigger.type      = 'button';
  trigger.className = 'resp-trigger';
  trigger.disabled  = !!disabled;
  trigger.innerHTML = `
    <span class="resp-display">${esc(display)}</span>
    <svg class="resp-chevron" width="8" height="6" viewBox="0 0 10 6" fill="currentColor">
      <path d="M0 0l5 6 5-6z"/>
    </svg>`;

  const panel = document.createElement('div');
  panel.className = 'resp-panel hidden';

  const optsDiv = document.createElement('div');
  optsDiv.className = 'resp-options';

  const footer = document.createElement('div');
  footer.className = 'resp-footer';

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button'; clearBtn.className = 'resp-clear-btn'; clearBtn.textContent = 'Leeren';
  const okBtn   = document.createElement('button');
  okBtn.type = 'button';   okBtn.className = 'resp-ok-btn';   okBtn.textContent = 'OK';
  footer.appendChild(clearBtn);
  footer.appendChild(okBtn);

  panel.appendChild(optsDiv);
  panel.appendChild(footer);
  wrap.appendChild(trigger);
  wrap.appendChild(panel);

  // ── Öffnen / Schließen ────────────────────────────────────
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    // Alle anderen Panels schließen
    document.querySelectorAll('.resp-panel:not(.hidden)').forEach(p => {
      if (p !== panel) { p.classList.add('hidden'); p.previousElementSibling?.classList.remove('open'); }
    });

    const opening = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !opening);
    trigger.classList.toggle('open', opening);

    if (opening) {
      // Teilnehmer-Kürzel live aus DOM lesen
      const abbrevList = [...new Set(
        getParticipantsFromDOM().map(p => p.abbr).filter(Boolean)
      )];
      const selected = (wrap.dataset.value || '').split('/').filter(Boolean);

      optsDiv.innerHTML = '';
      if (abbrevList.length === 0) {
        optsDiv.innerHTML = '<div style="padding:8px 12px;font-size:12px;color:var(--text-tertiary)">Keine Teilnehmer erfasst.</div>';
      } else {
        abbrevList.forEach(abbr => {
          const lbl = document.createElement('label');
          lbl.className = 'resp-option';
          const cb = document.createElement('input');
          cb.type = 'checkbox'; cb.value = abbr; cb.checked = selected.includes(abbr);
          lbl.appendChild(cb);
          lbl.appendChild(document.createTextNode(' ' + abbr));
          optsDiv.appendChild(lbl);
        });
      }

      // Zeilenauswahl synchronisieren
      const tr = wrap.closest('tr');
      if (tr && tr.dataset.pointId) {
        selectRow({
          type:'point', chapterKey:tr.dataset.chapter || '',
          subchapterId:tr.dataset.subchapter || null,
          topicId:tr.dataset.topic || null,
          pointId:tr.dataset.pointId,
          label:`Punkt ${tr.dataset.pointId}`
        }, tr);
      }
    }
  });

  // ── Commit (OK-Button) ────────────────────────────────────
  function commit() {
    const vals = Array.from(panel.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.value);
    const joined = vals.join('/');
    wrap.dataset.value = joined;
    trigger.querySelector('.resp-display').textContent = vals.length ? joined : '—';
    panel.classList.add('hidden');
    trigger.classList.remove('open');
    saveCurrentProtocol();
  }

  okBtn.addEventListener('click',    (e) => { e.stopPropagation(); commit(); });
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    commit();
  });

  return wrap;
}

/* ── Zuständig aktivieren/deaktivieren ────────────────────── */
function setResponsibleDisabled(tr, disabled) {
  const wrap = tr.querySelector('.resp-select');
  if (!wrap) return;
  const trigger = wrap.querySelector('.resp-trigger');
  if (disabled) {
    wrap.classList.add('resp-disabled');
    if (trigger) trigger.disabled = true;
    wrap.dataset.value = '';
    const disp = wrap.querySelector('.resp-display');
    if (disp) disp.textContent = '—';
    // Panel schließen falls offen
    wrap.querySelector('.resp-panel')?.classList.add('hidden');
  } else {
    wrap.classList.remove('resp-disabled');
    if (trigger) trigger.disabled = false;
  }
}

/* ── Termin-Feld sperren/entsperren ───────────────────────── */
function setTerminDisabled(tr, disabled) {
  const terminInput = tr.querySelector('.termin-input');
  const calBtn      = tr.querySelector('.termin-cal-btn');
  if (terminInput) terminInput.disabled = disabled;
  if (calBtn)      calBtn.disabled      = disabled;
}

/* ── Kategorie-Listener (deaktiviert Zuständig + Termin bei Info/Festlegung) */
function setupCategoryDisable(tr) {
  const catSel = tr.querySelector('[data-field="category"]');
  if (!catSel) return;
  const apply = () => {
    const v   = catSel.value;
    const dis = v === 'Info' || v === 'Festlegung';
    setResponsibleDisabled(tr, dis);
    setTerminDisabled(tr, dis);
  };
  apply(); // initial
  catSel.addEventListener('change', () => { apply(); saveCurrentProtocol(); });
}

/* ============================================================
   PROTOKOLLPUNKTE — RENDERING
============================================================ */
function renderPoints(protocol) {
  const tbody = document.getElementById('pointsBody');
  tbody.innerHTML = '';

  const structure  = protocol.structure || DB.getDefaultStructure(protocol.type);
  const points     = protocol.points    || [];

  Object.entries(structure).forEach(([chKey, chapter]) => {
    const chCollId    = 'chapter-' + chKey;
    const chCollapsed = App.collapsedSections.has(chCollId);

    // ── Kapitel-Zeile ─────────────────────────────────────
    const chRow = document.createElement('tr');
    chRow.className = 'row-chapter';
    chRow.dataset.type       = 'chapter';
    chRow.dataset.chapter    = chKey;
    chRow.dataset.collapseId = chCollId;

    const chDelBtn = DEFAULT_CHAPTERS.includes(chKey) ? '' :
      `<button class="btn-delete-structure btn-delete-chapter" data-action="deleteChapter"
        data-chapter="${chKey}" title="Kapitel löschen">${iconTrash()}</button>`;

    chRow.innerHTML = `
      <td>
        <button class="collapse-btn${chCollapsed?' is-collapsed':''}"
                data-collapse-id="${chCollId}" title="Ein-/Ausklappen">
          ${iconChevron()}
        </button>
      </td>
      <td colspan="7">
        <div class="structure-label-cell">
          <span>${chKey} — ${esc(chapter.label)}</span>
          ${chDelBtn}
        </div>
      </td>
    `;
    addRowClick(chRow, { type:'chapter', chapterKey:chKey, label:`Kapitel ${chKey}` });
    tbody.appendChild(chRow);

    // Direkte Punkte ohne Unterkapitel
    points.filter(pt => pt.chapter === chKey && !pt.subchapter).forEach(pt => {
      const row = createPointRow(pt, protocol.number, chKey, null, null);
      if (chCollapsed) row.classList.add('row-hidden');
      tbody.appendChild(row);
    });

    // ── Unterkapitel ──────────────────────────────────────
    (chapter.subchapters || []).forEach(sub => {
      const subCollId   = 'subchapter-' + sub.id;
      const subCollapsed = App.collapsedSections.has(subCollId);
      const hideRow     = chCollapsed;

      const subRow = document.createElement('tr');
      subRow.className = 'row-subchapter';
      subRow.dataset.type       = 'subchapter';
      subRow.dataset.chapter    = chKey;
      subRow.dataset.subchapter = sub.id;
      subRow.dataset.collapseId = subCollId;
      if (hideRow) subRow.classList.add('row-hidden');

      // Lösch-Button für Unterkapitel
      const delBtn = `<button class="btn-delete-structure" data-action="deleteSubchapter"
        data-chapter="${chKey}" data-subchapter="${esc(sub.id)}"
        title="Unterkapitel löschen">${iconTrash()}</button>`;

      subRow.innerHTML = `
        <td>
          <button class="collapse-btn${subCollapsed?' is-collapsed':''}"
                  data-collapse-id="${subCollId}" title="Ein-/Ausklappen">
            ${iconChevron()}
          </button>
        </td>
        <td colspan="7">
          <div class="structure-label-cell">
            <span>${esc(sub.id)} ${esc(sub.label)}</span>
            ${delBtn}
          </div>
        </td>
      `;
      addRowClick(subRow, {
        type:'subchapter', chapterKey:chKey, subchapterId:sub.id,
        label:`${sub.id} ${sub.label}`
      });
      tbody.appendChild(subRow);

      const hideChildren = hideRow || subCollapsed;

      // Themen
      (sub.topics || []).forEach(topic => {
        const topicRow = document.createElement('tr');
        topicRow.className = 'row-topic';
        topicRow.dataset.type       = 'topic';
        topicRow.dataset.chapter    = chKey;
        topicRow.dataset.subchapter = sub.id;
        topicRow.dataset.topic      = topic.id;
        if (hideChildren) topicRow.classList.add('row-hidden');

        const topicDelBtn = `<button class="btn-delete-structure" data-action="deleteTopic"
          data-chapter="${chKey}" data-subchapter="${esc(sub.id)}" data-topic="${esc(topic.id)}"
          data-topic-label="${esc(topic.label)}"
          title="Thema löschen">${iconTrash()}</button>`;

        topicRow.innerHTML = `
          <td></td>
          <td colspan="7">
            <div class="structure-label-cell">
              <span class="topic-label">${esc(topic.label)}</span>
              ${topicDelBtn}
            </div>
          </td>
        `;
        addRowClick(topicRow, {
          type:'topic', chapterKey:chKey, subchapterId:sub.id,
          topicId:topic.id, label:`Thema: ${topic.label}`
        });
        tbody.appendChild(topicRow);

        // Punkte unter Thema
        points
          .filter(pt => pt.chapter===chKey && pt.subchapter===sub.id && pt.topic===topic.id)
          .forEach(pt => {
            const row = createPointRow(pt, protocol.number, chKey, sub.id, topic.id);
            if (hideChildren) row.classList.add('row-hidden');
            tbody.appendChild(row);
          });
      });

      // Punkte ohne Thema im Unterkapitel
      points
        .filter(pt => pt.chapter===chKey && pt.subchapter===sub.id && !pt.topic)
        .forEach(pt => {
          const row = createPointRow(pt, protocol.number, chKey, sub.id, null);
          if (hideChildren) row.classList.add('row-hidden');
          tbody.appendChild(row);
        });
    });
  });

  autoResizeAll();
  applyPointFilters();
  applyChapterFilter();
}

/* ── Einzelne Punkt-Zeile ─────────────────────────────────── */
function createPointRow(point, currentNum, chKey, subId, topicId) {
  const tr = document.createElement('tr');
  tr.className = 'row-point';
  tr.dataset.pointId  = point.id;
  tr.dataset.type     = 'point';
  tr.dataset.chapter  = chKey;
  if (subId)   tr.dataset.subchapter = subId;
  if (topicId) tr.dataset.topic      = topicId;

  if (point.done)  tr.classList.add('point-done');
  if (point.isNew) tr.classList.add('point-new');

  // Kategorie "Freigabe" → rückwärtskompatibel auf "Freigabe erfordl" mappen
  const catVal = point.category === 'Freigabe' ? 'Freigabe erfordl' : (point.category || 'Aufgabe');

  // Zuständig deaktiviert bei Info / Festlegung
  const respDisabled = catVal === 'Info' || catVal === 'Festlegung';
  const respSelect   = createResponsibleSelect(point.responsible || '', respDisabled);

  // Amendments: Inhalt oder Termin im Vgl. zum Snapshot geändert?
  const snap = point.snapshot || null;
  const contentAmended  = snap && (point.content  || '') !== snap.content;
  const deadlineAmended = snap && (point.deadline || '') !== snap.deadline;

  // draggable erst bei Handle-Mousedown aktivieren (sonst blockiert es Textauswahl in Textareas)
  tr.draggable = false;

  tr.innerHTML = `
    <td><span class="drag-handle" title="Punkt verschieben">⠿</span></td>
    <td><span class="point-id">${esc(point.id)}</span></td>
    <td class="content-cell${contentAmended ? ' content-amended' : ''}">
      <textarea class="table-textarea" data-field="content"
        placeholder="Inhalt …">${esc(point.content || '')}</textarea>
    </td>
    <td>
      <select class="table-select" data-field="category">
        <option value="Aufgabe"          ${catVal==='Aufgabe'          ?'selected':''}>Aufgabe</option>
        <option value="Info"             ${catVal==='Info'             ?'selected':''}>Info</option>
        <option value="Festlegung"       ${catVal==='Festlegung'       ?'selected':''}>Festlegung</option>
        <option value="Freigabe erfordl" ${catVal==='Freigabe erfordl'?'selected':''}>Freigabe erfordl</option>
      </select>
    </td>
    <td class="resp-cell"></td>
    <td class="deadline-cell${deadlineAmended ? ' deadline-amended' : ''}">
      <div class="termin-wrap">
        <input type="text" class="table-input termin-input" data-field="deadline"
          value="${esc(point.deadline || '')}" placeholder="—" />
        <button type="button" class="termin-cal-btn" title="Kalender öffnen">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
          </svg>
        </button>
        <input type="date" class="termin-date-hidden" tabindex="-1" aria-hidden="true" />
      </div>
    </td>
    <td style="text-align:center">
      <input type="checkbox" class="table-checkbox" data-field="done"
        ${point.done?'checked':''} />
    </td>
    <td>
      <button class="btn-delete-row" data-action="deletePoint"
        data-point-id="${point.id}" title="Punkt löschen">${iconTrash()}</button>
    </td>
  `;

  // Multi-Select in die Zelle einhängen
  tr.querySelector('.resp-cell').appendChild(respSelect);

  // Zeilenauswahl per Fokus
  const rowCtx = {
    type:'point', chapterKey:chKey, subchapterId:subId,
    topicId, pointId:point.id, label:`Punkt ${point.id}`
  };
  tr.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('focus', () => selectRow(rowCtx, tr));
    el.addEventListener('change', saveCurrentProtocol);
  });

  // Erledigt-Checkbox: sofort ausgrauen
  const doneCheckbox = tr.querySelector('[data-field="done"]');
  if (doneCheckbox) {
    doneCheckbox.addEventListener('change', () => {
      tr.classList.toggle('point-done', doneCheckbox.checked);
    });
  }

  // Kategorie → Zuständig Disable-Logik
  setupCategoryDisable(tr);

  // Textarea Auto-Höhe + Bullet-Point-Formatierung + Amendment-Erkennung (Inhalt)
  const ta = tr.querySelector('textarea');
  const contentCell = tr.querySelector('.content-cell');
  if (ta) {
    ta.addEventListener('input', () => {
      autoResize(ta);
      if (snap) {
        contentCell.classList.toggle('content-amended', ta.value !== snap.content);
      }
    });
    requestAnimationFrame(() => autoResize(ta));
    setupBulletPoints(ta);
  }

  // Termin: Kalender-Button → hidden date input → Text-Input befüllen
  const terminInput = tr.querySelector('.termin-input');
  const calBtn      = tr.querySelector('.termin-cal-btn');
  const hiddenDate  = tr.querySelector('.termin-date-hidden');
  const deadlineCell = tr.querySelector('.deadline-cell');

  function applyOverdue() {
    const iso = toIsoDate(terminInput.value.trim());
    const isOverdue = iso && iso < new Date().toISOString().slice(0, 10);
    terminInput.classList.toggle('deadline-overdue', !!isOverdue);
  }

  if (terminInput && calBtn && hiddenDate) {
    calBtn.addEventListener('click', () => {
      hiddenDate.showPicker?.() || hiddenDate.click();
    });

    hiddenDate.addEventListener('change', () => {
      if (hiddenDate.value) {
        const [y, m, d] = hiddenDate.value.split('-');
        terminInput.value = `${d}.${m}.${y}`;
        applyOverdue();
        if (snap) deadlineCell.classList.toggle('deadline-amended', terminInput.value !== snap.deadline);
        saveCurrentProtocol();
      }
    });

    terminInput.addEventListener('input', () => {
      applyOverdue();
      if (snap) deadlineCell.classList.toggle('deadline-amended', terminInput.value !== snap.deadline);
    });
    terminInput.addEventListener('change', saveCurrentProtocol);

    // Initial: Überfälligkeit prüfen
    requestAnimationFrame(applyOverdue);
  }

  // ── Drag & Drop (nur über Handle starten) ──
  const handle = tr.querySelector('.drag-handle');
  let handleMouseDown = false;

  handle.addEventListener('mousedown',  () => { handleMouseDown = true; tr.draggable = true; });
  handle.addEventListener('touchstart', () => { handleMouseDown = true; tr.draggable = true; }, { passive: true });
  document.addEventListener('mouseup',  () => { handleMouseDown = false; tr.draggable = false; });
  document.addEventListener('touchend', () => { handleMouseDown = false; tr.draggable = false; });

  tr.addEventListener('dragstart', e => {
    if (!handleMouseDown) { e.preventDefault(); return; }
    // Gruppenkennung: chapter|subchapter (Topics beeinflussen Nummerierung nicht)
    const group = [chKey, subId || ''].join('|');
    e.dataTransfer.setData('text/plain', point.id);
    e.dataTransfer.setData('application/x-group', group);
    e.dataTransfer.effectAllowed = 'move';
    tr.classList.add('drag-active');
    App._dragGroup = group;
  });

  tr.addEventListener('dragend', () => {
    tr.classList.remove('drag-active');
    App._dragGroup = null;
    document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
  });

  tr.addEventListener('dragover', e => {
    if (!App._dragGroup) return;
    const myGroup = [tr.dataset.chapter, tr.dataset.subchapter || ''].join('|');
    if (myGroup !== App._dragGroup) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Obere oder untere Hälfte → Indikator
    const rect = tr.getBoundingClientRect();
    const mid  = rect.top + rect.height / 2;
    tr.classList.toggle('drag-over-top',    e.clientY < mid);
    tr.classList.toggle('drag-over-bottom', e.clientY >= mid);
  });

  tr.addEventListener('dragleave', () => {
    tr.classList.remove('drag-over-top', 'drag-over-bottom');
  });

  tr.addEventListener('drop', async e => {
    e.preventDefault();
    tr.classList.remove('drag-over-top', 'drag-over-bottom');

    const draggedId = e.dataTransfer.getData('text/plain');
    const targetId  = point.id;
    if (draggedId === targetId) return;

    await saveCurrentProtocol();  // DOM-Inhalte sichern bevor DB gelesen wird
    const protocol = await DB.Protocols.get(App.currentProtocolId);
    if (!protocol?.points) return;

    const dragAllIdx   = protocol.points.findIndex(p => p.id === draggedId);
    const targetAllIdx = protocol.points.findIndex(p => p.id === targetId);
    if (dragAllIdx === -1 || targetAllIdx === -1) return;

    // Element entfernen
    const [moved] = protocol.points.splice(dragAllIdx, 1);

    // Zielindex im (jetzt verkürzten) Array neu bestimmen
    let insertIdx = protocol.points.findIndex(p => p.id === targetId);
    if (insertIdx === -1) insertIdx = protocol.points.length;

    // Untere Hälfte → nach dem Ziel einfügen
    const rect = tr.getBoundingClientRect();
    if (e.clientY >= rect.top + rect.height / 2) insertIdx++;

    // Topic des Ziel-Punktes übernehmen (Punkt wandert ggf. in anderes Thema)
    moved.topic = point.topic || null;

    protocol.points.splice(insertIdx, 0, moved);

    await DB.Protocols.save(protocol);
    renderPoints(protocol);
    showToast('Punkt verschoben.', 'success');
  });

  return tr;
}

/* ── Hilfsfunktion: Datum-String → ISO (YYYY-MM-DD) ────────── */
function toIsoDate(str) {
  if (!str) return '';
  // Bereits ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // DD.MM.YYYY oder DD.MM.YY
  const m = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  }
  return ''; // KW-Notation etc. → leer (nicht darstellbar als date-Input)
}

/* ── Textarea Auto-Größe ──────────────────────────────────── */
function autoResize(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

function autoResizeAll() {
  document.querySelectorAll('.table-textarea').forEach(autoResize);
}

/* ── Bullet-Point Auto-Formatierung ──────────────────────── */
/**
 * Erkennt Zeilen, die mit "- " oder "• " beginnen (ggf. mit Einrückung).
 * "- " am Zeilenanfang (ohne Einrückung) wird automatisch zu "     - " konvertiert.
 * Enter: nächste Zeile bekommt "     - " (5 Leerzeichen Einrückung).
 * Enter auf einer leeren Bullet-Zeile: beendet den Listen-Modus.
 */
function setupBulletPoints(ta) {
  // Auto-Konvertierung: "- " am Zeilenanfang → "     - "
  ta.addEventListener('input', () => {
    const val   = ta.value;
    const pos   = ta.selectionStart;
    const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
    const line  = val.slice(lineStart, pos);
    if (line === '- ') {
      const insert = '     - ';
      const newVal = val.slice(0, lineStart) + insert + val.slice(pos);
      ta.value = newVal;
      ta.selectionStart = ta.selectionEnd = lineStart + insert.length;
      autoResize(ta);
    }
  });

  ta.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;

    const val   = ta.value;
    const start = ta.selectionStart;

    // Zeilenanfang ermitteln
    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
    const line      = val.slice(lineStart, start);

    // Bullet-Zeichen erkennen: "- " oder "• " (mit beliebiger Einrückung)
    const bulletMatch = line.match(/^(\s*)([-•])\s/);
    if (!bulletMatch) return;

    e.preventDefault();

    const lineContent = line.slice(bulletMatch[0].length);

    if (lineContent.trim() === '') {
      // Leere Bullet-Zeile → Listen-Modus beenden
      const newVal = val.slice(0, lineStart) + val.slice(start);
      ta.value = newVal;
      ta.selectionStart = ta.selectionEnd = lineStart;
    } else {
      // Nächste Zeile: immer 5 Leerzeichen + "- "
      const insert = '\n     - ';
      const newVal = val.slice(0, start) + insert + val.slice(start);
      ta.value = newVal;
      ta.selectionStart = ta.selectionEnd = start + insert.length;
    }

    autoResize(ta);
    saveCurrentProtocol();
  });
}

/* ── Zeile auswählen ──────────────────────────────────────── */
function addRowClick(row, ctx) {
  row.addEventListener('click', (e) => {
    if (e.target.closest('.collapse-btn') || e.target.closest('.btn-delete-structure')) return;
    // Formularelemente nicht abfangen — Cursor/Fokus soll normal funktionieren
    if (e.target.closest('textarea') || e.target.closest('input') || e.target.closest('select')) return;
    selectRow(ctx, row);
  });
}

function selectRow(ctx, rowEl) {
  document.querySelectorAll('.row-selected').forEach(r => r.classList.remove('row-selected'));
  App.selectedRow = ctx;
  if (rowEl) rowEl.classList.add('row-selected');
  updateSelectionHint();
}

function updateSelectionHint() {
  const hint = document.getElementById('selectionHint');
  if (!hint) return;
  hint.textContent = App.selectedRow?.label || '';
}

/* ============================================================
   COLLAPSE / EXPAND
============================================================ */
/* ── Zeilen für eine Section ermitteln ───────────────────── */
function getRowsForSection(sectionId) {
  const rows = [];
  if (sectionId.startsWith('chapter-')) {
    const ch = sectionId.replace('chapter-', '');
    document.querySelectorAll(`#pointsBody tr[data-chapter="${ch}"]`).forEach(tr => {
      if (tr.dataset.type !== 'chapter') rows.push(tr);
    });
  } else if (sectionId.startsWith('subchapter-')) {
    const sub = sectionId.replace('subchapter-', '');
    document.querySelectorAll(`#pointsBody tr[data-subchapter="${sub}"]`).forEach(tr => {
      if (tr.dataset.type !== 'subchapter') rows.push(tr);
    });
  }
  return rows;
}

/** Einzelne Section mit Fade-Animation ein-/ausklappen */
function toggleCollapse(sectionId) {
  const rowEl = document.querySelector(`tr[data-collapse-id="${sectionId}"]`);
  const btn   = rowEl?.querySelector('.collapse-btn');

  if (App.collapsedSections.has(sectionId)) {
    // ── Aufklappen ────────────────────────────────────────
    App.collapsedSections.delete(sectionId);
    btn?.classList.remove('is-collapsed');
    const rows = getRowsForSection(sectionId);
    rows.forEach(tr => {
      // Nur anzeigen, wenn nicht durch übergeordnetes Kapitel versteckt
      const chKey = tr.dataset.chapter;
      if (chKey && App.collapsedSections.has('chapter-' + chKey)) return;
      tr.style.opacity    = '0';
      tr.style.transition = '';
      tr.classList.remove('row-hidden');
      requestAnimationFrame(() => {
        tr.style.transition = 'opacity 150ms ease';
        tr.style.opacity    = '1';
      });
      setTimeout(() => { tr.style.transition = ''; tr.style.opacity = ''; }, 160);
    });
  } else {
    // ── Einklappen ────────────────────────────────────────
    const rows = getRowsForSection(sectionId);
    rows.forEach(tr => {
      if (tr.classList.contains('row-hidden')) return; // bereits versteckt
      tr.style.transition = 'opacity 150ms ease';
      tr.style.opacity    = '0';
    });
    setTimeout(() => {
      App.collapsedSections.add(sectionId);
      btn?.classList.add('is-collapsed');
      rows.forEach(tr => {
        tr.classList.add('row-hidden');
        tr.style.transition = '';
        tr.style.opacity    = '';
      });
    }, 150);
  }
}

/** Initiale Collapse-State ohne Animation anwenden (beim Rendern) */
function applyCollapsedState() {
  document.querySelectorAll('#pointsBody tr').forEach(tr => {
    tr.classList.remove('row-hidden');
    const colId = tr.dataset.collapseId;
    if (colId) {
      const b = tr.querySelector('.collapse-btn');
      if (b) b.classList.toggle('is-collapsed', App.collapsedSections.has(colId));
    }
  });
  App.collapsedSections.forEach(sid => {
    if (sid.startsWith('chapter-')) {
      const ch = sid.replace('chapter-', '');
      document.querySelectorAll(`#pointsBody tr[data-chapter="${ch}"]`).forEach(tr => {
        if (tr.dataset.type !== 'chapter') tr.classList.add('row-hidden');
      });
    } else if (sid.startsWith('subchapter-')) {
      const sub = sid.replace('subchapter-', '');
      document.querySelectorAll(`#pointsBody tr[data-subchapter="${sub}"]`).forEach(tr => {
        if (tr.dataset.type !== 'subchapter') tr.classList.add('row-hidden');
      });
    }
  });
}

/** Alle Kapitel + Unterkapitel einklappen oder aufklappen (mit Fade) */
function toggleCollapseAll() {
  const allSectionIds = [];
  document.querySelectorAll('#pointsBody tr[data-collapse-id]').forEach(tr => {
    allSectionIds.push(tr.dataset.collapseId);
  });

  if (!App.allCollapsed) {
    // ── Alle einklappen ───────────────────────────────────
    const rowsToHide = [];
    allSectionIds.forEach(sid => {
      getRowsForSection(sid).forEach(tr => {
        if (!tr.classList.contains('row-hidden') && !rowsToHide.includes(tr)) {
          rowsToHide.push(tr);
        }
      });
    });
    rowsToHide.forEach(tr => {
      tr.style.transition = 'opacity 150ms ease';
      tr.style.opacity    = '0';
    });
    setTimeout(() => {
      allSectionIds.forEach(s => App.collapsedSections.add(s));
      App.allCollapsed = true;
      document.getElementById('btnCollapseAll')?.classList.add('all-collapsed');
      rowsToHide.forEach(tr => {
        tr.classList.add('row-hidden');
        tr.style.transition = ''; tr.style.opacity = '';
      });
      // Pfeile aktualisieren
      document.querySelectorAll('.collapse-btn').forEach(b =>
        b.classList.add('is-collapsed'));
    }, 150);

  } else {
    // ── Alle aufklappen ───────────────────────────────────
    App.collapsedSections.clear();
    App.allCollapsed = false;
    document.getElementById('btnCollapseAll')?.classList.remove('all-collapsed');
    document.querySelectorAll('.collapse-btn').forEach(b => b.classList.remove('is-collapsed'));

    const rowsToShow = document.querySelectorAll('#pointsBody tr.row-hidden');
    rowsToShow.forEach(tr => {
      tr.style.opacity    = '0';
      tr.style.transition = '';
      tr.classList.remove('row-hidden');
      requestAnimationFrame(() => {
        tr.style.transition = 'opacity 150ms ease';
        tr.style.opacity    = '1';
      });
      setTimeout(() => { tr.style.transition = ''; tr.style.opacity = ''; }, 160);
    });
  }
}

/* ============================================================
   PUNKT-FILTER
============================================================ */
function applyPointFilters() {
  const f = App.pointFilters;
  document.querySelectorAll('#pointsBody .row-point').forEach(tr => {
    let hide = false;
    if (f.hideDone && tr.classList.contains('point-done')) hide = true;
    if (f.onlyOverdue) {
      const hasOverdue = tr.querySelector('.deadline-overdue');
      if (!hasOverdue) hide = true;
    }
    if (f.onlyNew) {
      if (!tr.classList.contains('point-new')) hide = true;
    }
    tr.classList.toggle('filter-hidden', hide);
  });
  // Button-Indikator
  const btn = document.getElementById('btnPointFilter');
  btn.classList.toggle('has-filter', f.hideDone || f.onlyOverdue || f.onlyNew);
}

function setupPointFilter() {
  const btn   = document.getElementById('btnPointFilter');
  const panel = document.getElementById('pointFilterPanel');
  const cbDone    = document.getElementById('filterHideDone');
  const cbOverdue = document.getElementById('filterOnlyOverdue');
  const cbNew     = document.getElementById('filterOnlyNew');

  btn.addEventListener('click', e => {
    e.stopPropagation();
    panel.classList.toggle('hidden');
  });

  cbDone.addEventListener('change', () => {
    App.pointFilters.hideDone = cbDone.checked;
    applyPointFilters();
  });

  cbOverdue.addEventListener('change', () => {
    if (cbOverdue.checked) {
      cbNew.checked = false;
      App.pointFilters.onlyNew = false;
    }
    App.pointFilters.onlyOverdue = cbOverdue.checked;
    applyPointFilters();
  });

  cbNew.addEventListener('change', () => {
    if (cbNew.checked) {
      cbOverdue.checked = false;
      App.pointFilters.onlyOverdue = false;
    }
    App.pointFilters.onlyNew = cbNew.checked;
    applyPointFilters();
  });

  // Klick außerhalb → Panel schließen
  document.addEventListener('click', e => {
    if (!panel.classList.contains('hidden') && !panel.contains(e.target) && e.target !== btn) {
      panel.classList.add('hidden');
    }
  });
}

/* ============================================================
   KAPITEL-FILTER
============================================================ */
async function populateChapterFilter() {
  const list = document.getElementById('chapterFilterList');
  list.innerHTML = '';
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;

  const structure = protocol.structure || {};
  const points    = protocol.points    || [];

  Object.entries(structure).forEach(([chKey, chapter]) => {
    const hasTopics = (chapter.subchapters || []).some(s => (s.topics || []).length > 0);
    const hasPoints = points.some(pt => pt.chapter === chKey);
    const hasContent = hasTopics || hasPoints;

    const label = document.createElement('label');
    label.className = 'filter-option' + (hasContent ? ' is-disabled' : '');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !App.hiddenChapters.has(chKey);
    cb.disabled = hasContent;
    cb.dataset.chapter = chKey;

    cb.addEventListener('change', () => {
      if (cb.checked) {
        App.hiddenChapters.delete(chKey);
      } else {
        App.hiddenChapters.add(chKey);
      }
      applyChapterFilter();
    });

    const span = document.createElement('span');
    span.textContent = `${chKey} — ${chapter.label}`;

    label.appendChild(cb);
    label.appendChild(span);
    list.appendChild(label);
  });
}

function applyChapterFilter() {
  document.querySelectorAll('#pointsBody tr[data-chapter]').forEach(tr => {
    const ch = tr.dataset.chapter;
    tr.classList.toggle('chapter-filtered', App.hiddenChapters.has(ch));
  });
  const btn = document.getElementById('btnChapterFilter');
  btn.classList.toggle('has-filter', App.hiddenChapters.size > 0);
}

function setupChapterFilter() {
  const btn   = document.getElementById('btnChapterFilter');
  const panel = document.getElementById('chapterFilterPanel');

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const wasHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    if (wasHidden) populateChapterFilter();
  });

  document.addEventListener('click', e => {
    if (!panel.classList.contains('hidden') && !panel.contains(e.target) && !btn.contains(e.target)) {
      panel.classList.add('hidden');
    }
  });
}

/* ============================================================
   TOOLBAR-AKTIONEN: KAP / UKAP / THEMA / PKT
============================================================ */

const DEFAULT_CHAPTERS = ['A','B','C','D','E'];

/* Nächsten freien Buchstaben ab F ermitteln (Lücken füllen) */
function getNextChapterKey(protocol) {
  const existing = Object.keys(protocol.structure);
  for (let code = 70; code <= 90; code++) {            // F=70 … Z=90
    const key = String.fromCharCode(code);
    if (!existing.includes(key)) return key;
  }
  return null;                                          // alle 21 Slots belegt (unwahrscheinlich)
}

/* KAP – Modal öffnen */
async function startAddChapter() {
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) { showToast('Kein Protokoll geöffnet.', 'error'); return; }
  const nextKey = getNextChapterKey(protocol);
  if (!nextKey) { showToast('Maximale Kapitelanzahl erreicht (A–Z).', 'error'); return; }
  document.getElementById('chapterKeyHint').textContent = `Wird als Kapitel ${nextKey} angelegt`;
  document.getElementById('chapterLabel').value = '';
  openModal('modalChapter');
  setTimeout(() => document.getElementById('chapterLabel').focus(), 80);
}

/* KAP – Speichern */
async function saveChapter() {
  if (App._busy) return;
  const label = document.getElementById('chapterLabel').value.trim();
  if (!label) { showToast('Bitte Bezeichnung eingeben.', 'error'); return; }
  App._busy = true;
  try {
    const protocol = await DB.Protocols.get(App.currentProtocolId);
    if (!protocol) return;
    const nextKey = getNextChapterKey(protocol);
    if (!nextKey) { showToast('Maximale Kapitelanzahl erreicht.', 'error'); return; }
    protocol.structure[nextKey] = { label, subchapters: [] };
    await DB.Protocols.save(protocol);
    closeModal('modalChapter');
    renderPoints(protocol);
    showToast(`Kapitel ${nextKey} angelegt.`, 'success');
  } finally { App._busy = false; }
}

/* KAP – Löschen (nur Nutzer-Kapitel F+) */
async function deleteChapter(chKey) {
  if (DEFAULT_CHAPTERS.includes(chKey)) {
    showToast('Vordefinierte Kapitel (A–E) können nicht gelöscht werden.', 'error');
    return;
  }
  await saveCurrentProtocol();  // DOM-Inhalte sichern bevor DB gelesen wird
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;
  const chapter = protocol.structure[chKey];
  if (!chapter) return;

  // Prüfe ob Themen in Unterkapiteln existieren
  const hasTopics = (chapter.subchapters || []).some(s => (s.topics || []).length > 0);
  if (hasTopics) {
    showToast('Kapitel enthält Themen — bitte zuerst Themen löschen.', 'error');
    return;
  }

  // Prüfe ob Punkte existieren
  const pointCount = (protocol.points || []).filter(pt => pt.chapter === chKey).length;
  if (pointCount > 0) {
    showToast(`Kapitel enthält ${pointCount} Punkt(e) — bitte zuerst Punkte löschen.`, 'error');
    return;
  }

  const msg = `Kapitel "${chKey} — ${chapter.label}" löschen?`;
  if (!confirm(msg)) return;

  delete protocol.structure[chKey];
  await DB.Protocols.save(protocol);
  renderPoints(protocol);
  showToast(`Kapitel ${chKey} gelöscht.`, '');
}

/* UKAP */
function startAddSubchapter() {
  const chKey = App.selectedRow?.chapterKey;
  if (!chKey) { showToast('Bitte zuerst eine Zeile auswählen.', 'error'); return; }
  App._pendingChapter = chKey;
  document.getElementById('modalSubchapterTitle').textContent = `Neues Unterkapitel in Kapitel ${chKey}`;
  document.getElementById('subchapterLabel').value = '';
  openModal('modalSubchapter');
  setTimeout(() => document.getElementById('subchapterLabel').focus(), 80);
}

async function saveSubchapter() {
  if (App._busy) return;
  const label = document.getElementById('subchapterLabel').value.trim();
  if (!label) { showToast('Bitte Bezeichnung eingeben.', 'error'); return; }
  App._busy = true;
  try {
    await saveCurrentProtocol();  // DOM-Inhalte sichern bevor DB gelesen wird
    const protocol = await DB.Protocols.get(App.currentProtocolId);
    if (!protocol) return;
    const chKey   = App._pendingChapter;
    const chapter = protocol.structure[chKey];
    if (!chapter) return;
    const maxNum = (chapter.subchapters || []).reduce((m, s) => Math.max(m, parseInt(s.id.split('.')[1])||0), 0);
    chapter.subchapters = [...(chapter.subchapters||[]), { id:`${chKey}.${maxNum+1}`, label, topics:[] }];
    await DB.Protocols.save(protocol);
    closeModal('modalSubchapter');
    renderPoints(protocol);
    showToast(`Unterkapitel ${chKey}.${maxNum+1} angelegt.`, 'success');
  } finally { App._busy = false; }
}

/* THEMA */
function startAddTopic() {
  const subId = App.selectedRow?.subchapterId;
  if (!subId) { showToast('Bitte zuerst ein Unterkapitel oder eine Zeile darin auswählen.', 'error'); return; }
  App._pendingSubchapter = subId;
  document.getElementById('topicLabel').value = '';
  openModal('modalTopic');
  setTimeout(() => document.getElementById('topicLabel').focus(), 80);
}

async function saveTopic() {
  if (App._busy) return;
  const label = document.getElementById('topicLabel').value.trim();
  if (!label) { showToast('Bitte Thema-Bezeichnung eingeben.', 'error'); return; }
  App._busy = true;
  try {
    await saveCurrentProtocol();  // DOM-Inhalte sichern bevor DB gelesen wird
    const protocol   = await DB.Protocols.get(App.currentProtocolId);
    if (!protocol) return;
    const subId   = App._pendingSubchapter;
    const chKey   = subId.split('.')[0];
    const chapter = protocol.structure[chKey];
    const sub     = (chapter?.subchapters||[]).find(s => s.id === subId);
    if (!sub) { showToast('Unterkapitel nicht gefunden.', 'error'); return; }
    const topicId = DB.uuid();
    sub.topics    = [...(sub.topics||[]), { id:topicId, label }];
    const subNum  = subId.split('.')[1] || null;
    const seq     = getNextPointSeq(protocol, chKey, subId);
    const newPoint = {
      id: DB.generatePointId(protocol.number, chKey, subNum, seq),
      chapter:chKey, subchapter:subId, topic:topicId,
      content:'', category:'Aufgabe', responsible:'', deadline:'',
      done:false, isNew:true, doneLastProtocol:false, createdInProtocol:protocol.number,
    };
    protocol.points = [...(protocol.points||[]), newPoint];
    await DB.Protocols.save(protocol);
    closeModal('modalTopic');
    renderPoints(protocol);
    setTimeout(() => {
      const row = document.querySelector(`tr[data-point-id="${newPoint.id}"]`);
      if (row) { row.scrollIntoView({behavior:'smooth',block:'nearest'}); row.querySelector('textarea')?.focus(); }
    }, 60);
    showToast(`Thema "${label}" + erster Punkt angelegt.`, 'success');
  } finally { App._busy = false; }
}

/* PKT */
async function addPoint() {
  if (App._busy) return;
  if (!App.currentProtocolId) return;
  const sel = App.selectedRow;
  if (!sel) { showToast('Bitte zuerst eine Zeile auswählen.', 'error'); return; }
  App._busy = true;
  try {
    await saveCurrentProtocol();  // DOM-Inhalte sichern bevor DB gelesen wird
    const protocol = await DB.Protocols.get(App.currentProtocolId);
    if (!protocol) return;
    const chKey  = sel.chapterKey;
    const subId  = sel.subchapterId || null;
    const topId  = sel.topicId      || null;
    const chapter = protocol.structure[chKey];
    if (!subId && chapter && (chapter.subchapters||[]).length > 0) {
      showToast('Bitte Unterkapitel auswählen.', 'error'); return;
    }
    const subNum   = subId ? subId.split('.')[1] : null;
    const seq      = getNextPointSeq(protocol, chKey, subId);
    const newPoint = {
      id: DB.generatePointId(protocol.number, chKey, subNum, seq),
      chapter:chKey, subchapter:subId, topic:topId,
      content:'', category:'Aufgabe', responsible:'', deadline:'',
      done:false, isNew:true, doneLastProtocol:false, createdInProtocol:protocol.number,
    };
    protocol.points = [...(protocol.points||[]), newPoint];
    await DB.Protocols.save(protocol);
    renderPoints(protocol);
    setTimeout(() => {
      const row = document.querySelector(`tr[data-point-id="${newPoint.id}"]`);
      if (row) { row.scrollIntoView({behavior:'smooth',block:'nearest'}); row.querySelector('textarea')?.focus(); }
    }, 60);
  } finally { App._busy = false; }
}

function getNextPointSeq(protocol, chKey, subId) {
  return (protocol.points||[]).filter(
    pt => pt.createdInProtocol === protocol.number &&
          pt.chapter           === chKey &&
          pt.subchapter        === (subId||null)
  ).length + 1;
}

/* ============================================================
   STRUKTUR LÖSCHEN (UKAP / THEMA)
============================================================ */
async function deleteSubchapter(chKey, subId) {
  await saveCurrentProtocol();  // DOM-Inhalte sichern bevor DB gelesen wird
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;
  const chapter = protocol.structure[chKey];
  const sub     = (chapter?.subchapters||[]).find(s => s.id === subId);
  if (!sub) return;

  const pointCount = (protocol.points||[]).filter(
    pt => pt.chapter === chKey && pt.subchapter === subId
  ).length;

  const msg = `Obacht! Unterkapitel "${subId} ${sub.label}" und alle ${pointCount ? pointCount + ' darin enthaltenen Punkte' : 'zugehörigen Punkte'} werden unwiderruflich gelöscht. Bist du sicher?`;
  if (!confirm(msg)) return;

  chapter.subchapters = (chapter.subchapters||[]).filter(s => s.id !== subId);
  protocol.points     = (protocol.points||[]).filter(
    pt => !(pt.chapter === chKey && pt.subchapter === subId)
  );
  await DB.Protocols.save(protocol);
  renderPoints(protocol);
  showToast(`Unterkapitel ${subId} gelöscht.`, '');
}

async function deleteTopic(chKey, subId, topicId, topicLabel) {
  await saveCurrentProtocol();  // DOM-Inhalte sichern bevor DB gelesen wird
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;
  const chapter = protocol.structure[chKey];
  const sub     = (chapter?.subchapters||[]).find(s => s.id === subId);
  if (!sub) return;

  const pointCount = (protocol.points||[]).filter(
    pt => pt.chapter === chKey && pt.subchapter === subId && pt.topic === topicId
  ).length;

  const msg = `Obacht! Thema "${topicLabel}" und alle ${pointCount ? pointCount + ' darin enthaltenen Punkte' : 'zugehörigen Punkte'} werden unwiderruflich gelöscht. Bist du sicher?`;
  if (!confirm(msg)) return;

  sub.topics      = (sub.topics||[]).filter(t => t.id !== topicId);
  protocol.points = (protocol.points||[]).filter(
    pt => !(pt.chapter === chKey && pt.subchapter === subId && pt.topic === topicId)
  );
  await DB.Protocols.save(protocol);
  renderPoints(protocol);
  showToast(`Thema "${topicLabel}" gelöscht.`, '');
}

/* ============================================================
   SPEICHERN
============================================================ */
async function saveCurrentProtocol() {
  if (!App.currentProtocolId) return;
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;

  const titleText = document.getElementById('fieldTitle').textContent.trim();
  protocol.title      = titleText;
  protocol.seriesName = titleText; // Titelfeld gilt als Serienname
  protocol.date     = document.getElementById('fieldDate').value;
  protocol.time     = document.getElementById('fieldTime').value;
  protocol.location = document.getElementById('fieldLocation').value;
  protocol.tenant   = document.getElementById('fieldTenant').value;
  protocol.landlord = document.getElementById('fieldLandlord').value;
  protocol.participants = getParticipantsFromDOM();

  document.querySelectorAll('#pointsBody tr[data-point-id]').forEach(tr => {
    const id = tr.dataset.pointId;
    const pt = (protocol.points||[]).find(p => p.id === id);
    if (!pt) return;
    pt.content     = tr.querySelector('[data-field="content"]')?.value     || '';
    pt.category    = tr.querySelector('[data-field="category"]')?.value    || 'Aufgabe';
    pt.responsible = tr.querySelector('.resp-select')?.dataset.value       || '';
    // Termin: Freitext-Feld (nicht mehr type="date")
    pt.deadline    = tr.querySelector('.termin-input')?.value              ||
                     tr.querySelector('[data-field="deadline"]')?.value    || '';
    pt.done        = tr.querySelector('[data-field="done"]')?.checked      ?? false;
    // snapshot bleibt unberührt (nicht überschreiben)
  });

  document.querySelectorAll('#attachmentsBody tr[data-idx]').forEach((tr, i) => {
    if (protocol.attachments?.[i]) {
      protocol.attachments[i].content = tr.querySelector('[data-field="content"]')?.value || '';
      // fileData, fileName, fileType werden separat gespeichert (via handleFileSelected)
      // → hier nicht überschreiben
    }
  });

  // Aufgestellt-Block
  protocol.author = {
    firstName: document.getElementById('fieldAuthorFirstName').value,
    lastName:  document.getElementById('fieldAuthorLastName').value,
    company:   document.getElementById('fieldAuthorCompany').value,
    date:      document.getElementById('fieldAuthorDate').value,
  };

  // Manuelle Abkürzungen aus DOM lesen
  protocol.customAbbreviations = getCustomAbbreviationsFromDOM();

  await DB.Protocols.save(protocol);
  renderProtocolList();
  renderAbbrevList(protocol.participants, protocol.customAbbreviations || []);
}

/* ============================================================
   NEUES PROTOKOLL
============================================================ */
async function createProtocol(type, continueFromPrevious, seriesName, sourceSeriesKey) {
  const projectId = App.currentProjectId;
  if (!projectId) return;
  const project = App.projects.find(p => p.id === projectId) || {};

  let participants = [];
  let points       = [];
  let structure    = DB.getDefaultStructure(type);
  let resolvedSeriesName = seriesName || '';
  let seriesId     = DB.uuid(); // neue, eigenständige Serie

  if (continueFromPrevious && sourceSeriesKey) {
    // Protokolle dieser Serie, nach Nummer sortiert
    const allOfSeries = App.protocols
      .filter(p => (p.seriesId || ('type:' + p.type)) === sourceSeriesKey)
      .sort((a, b) => a.number - b.number);
    const prev = allOfSeries[allOfSeries.length - 1];
    if (prev) {
      const prevProto = await DB.Protocols.get(prev.id);
      seriesId   = prevProto.seriesId || seriesId;
      if (!resolvedSeriesName) resolvedSeriesName = prevProto.seriesName || '';
      participants = (prevProto.participants||[]).map(p => ({...p}));
      structure    = prevProto.structure ? JSON.parse(JSON.stringify(prevProto.structure)) : structure;
      points = (prevProto.points||[])
        .filter(pt => !(pt.doneLastProtocol && pt.done))
        .map(pt => ({
          ...pt, isNew: false, doneLastProtocol: pt.done,
          snapshot: { content: pt.content || '', deadline: pt.deadline || '' },
        }));
      type = prevProto.type; // gleicher Typ wie Vorgänger
    }
  }

  const isAktennotiz = type === 'Aktennotiz';

  // Nächste Nummer: immer max+1 in der Serie; Aktennotiz erhält keine Nummer
  let number = null;
  if (!isAktennotiz) {
    const allOfSeries = App.protocols.filter(p =>
      continueFromPrevious && sourceSeriesKey
        ? (p.seriesId || ('type:' + p.type)) === sourceSeriesKey
        : false
    );
    const maxNum = allOfSeries.reduce((m, p) => Math.max(m, p.number), 0);
    number = continueFromPrevious && maxNum > 0
      ? maxNum + 1
      : await DB.Protocols.nextNumber(projectId, type);
  }

  // customAbbreviations bei Fortschreibung übernehmen
  let customAbbreviations = [];
  if (continueFromPrevious && sourceSeriesKey) {
    const allOfSer = App.protocols
      .filter(p => (p.seriesId || ('type:' + p.type)) === sourceSeriesKey)
      .sort((a, b) => a.number - b.number);
    const prevP = allOfSer[allOfSer.length - 1];
    if (prevP) {
      const prevFull = await DB.Protocols.get(prevP.id);
      if (prevFull?.customAbbreviations) customAbbreviations = JSON.parse(JSON.stringify(prevFull.customAbbreviations));
    }
  }

  const protocol = {
    projectId, type, seriesId, seriesName: resolvedSeriesName, number,
    title: resolvedSeriesName || type,
    date:     new Date().toISOString().slice(0,10),
    time:'', location:'',
    tenant:   project.tenant || '',
    landlord: project.owner  || '',
    participants, structure, points, attachments:[], deletedAt:null,
    author: { firstName:'Olaf', lastName:'Schüler', company:'Hopro GmbH & Co. KG', date:'' },
    customAbbreviations,
  };

  const saved = await DB.Protocols.save(protocol);
  App.protocols = await DB.Protocols.getActiveByProject(projectId);
  renderProtocolList();
  await openProtocol(saved.id);
  showToast(
    isAktennotiz
      ? `Aktennotiz "${resolvedSeriesName || 'Aktennotiz'}" angelegt.`
      : `Protokoll Nr. ${String(number).padStart(2,'0')} erstellt.`,
    'success'
  );
}

/* ============================================================
   ANLAGEN
============================================================ */
function renderAttachments(attachments, protocolNumber) {
  const tbody = document.getElementById('attachmentsBody');
  tbody.innerHTML = '';
  attachments.forEach((att, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.idx = idx;
    tr.innerHTML = `
      <td><span class="point-id">${esc(att.id)}</span></td>
      <td><input class="table-input" value="${esc(att.content)}" data-field="content" /></td>
      <td class="attach-file-cell"></td>
      <td><button class="btn-delete-row" data-action="deleteAttachment" data-idx="${idx}" title="Anlage entfernen">${iconTrash()}</button></td>
    `;
    tr.querySelector('input').addEventListener('change', saveCurrentProtocol);
    // Datei-Zelle aufbauen
    const fileCell = tr.querySelector('.attach-file-cell');
    fileCell.appendChild(buildFileCellContent(att, idx));
    tbody.appendChild(tr);
  });
}

/** Datei-Zellen-Inhalt für eine Anlage */
function buildFileCellContent(att, idx) {
  const wrap = document.createElement('div');
  wrap.className = 'file-cell-wrap';

  if (att.fileName) {
    const label = document.createElement('span');
    label.className = 'file-name-label';
    label.title     = att.fileName;
    label.textContent = att.fileName;
    // Download-Button
    const dlBtn = document.createElement('button');
    dlBtn.type = 'button';
    dlBtn.className = 'btn-download-file';
    dlBtn.title = 'Datei herunterladen';
    dlBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
      <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
      <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
    </svg>`;
    dlBtn.addEventListener('click', () => downloadAttachmentFile(idx));
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-file';
    removeBtn.title = 'Datei entfernen';
    removeBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
    </svg>`;
    removeBtn.addEventListener('click', () => removeAttachmentFile(idx));
    wrap.appendChild(label);
    wrap.appendChild(dlBtn);
    wrap.appendChild(removeBtn);
  } else {
    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'btn-upload-file';
    uploadBtn.innerHTML = `<svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0V3z"/>
    </svg> Datei wählen`;
    uploadBtn.addEventListener('click', () => openFilePicker(idx));
    const noFile = document.createElement('span');
    noFile.className = 'file-name-label no-file';
    noFile.textContent = 'Keine Datei';
    wrap.appendChild(noFile);
    wrap.appendChild(uploadBtn);
  }
  return wrap;
}

async function addNewAttachment(fileName, fileType, fileData) {
  if (!App.currentProtocolId) return;
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;
  const seq = (protocol.attachments||[]).length + 1;
  const newAtt = {
    id:       DB.generateAttachmentId(protocol.number, seq),
    content:  fileName || '',
    fileName: fileName || null,
    fileType: fileType || null,
    fileData: fileData || null,   // ArrayBuffer — IndexedDB speichert Binärdaten nativ
  };
  protocol.attachments = [...(protocol.attachments||[]), newAtt];
  await DB.Protocols.save(protocol);
  renderAttachments(protocol.attachments, protocol.number);
  renderProtocolList(); // Büroklammer-Icon aktualisieren
}

/* Datei per Picker anhängen */
let _pendingFileIdx = null; // Index der Anlage, für die gerade eine Datei gewählt wird

function openFilePicker(attachIdx) {
  _pendingFileIdx = attachIdx;
  const input = document.getElementById('filePickerInput');
  input.value = '';
  input.click();
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

async function handleFileSelected(file, attachIdx) {
  if (!file) return;
  if (file.size > MAX_FILE_SIZE) {
    showToast(`Datei zu groß (${(file.size/1024/1024).toFixed(1)} MB). Maximum: 2 MB.`, 'error');
    return;
  }
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;
  const att = protocol.attachments?.[attachIdx];
  if (!att) return;

  const buffer = await file.arrayBuffer();
  att.fileName = file.name;
  att.fileType = file.type;
  att.fileData = buffer;
  if (!att.content) att.content = file.name; // Beschriftung vorausfüllen

  await DB.Protocols.save(protocol);
  renderAttachments(protocol.attachments, protocol.number);
  renderProtocolList();
}

async function removeAttachmentFile(attachIdx) {
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;
  const att = protocol.attachments?.[attachIdx];
  if (!att) return;
  att.fileName = null; att.fileType = null; att.fileData = null;
  await DB.Protocols.save(protocol);
  renderAttachments(protocol.attachments, protocol.number);
  renderProtocolList();
}

async function downloadAttachmentFile(attachIdx) {
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;
  const att = protocol.attachments?.[attachIdx];
  if (!att?.fileData || !att.fileName) return;
  const blob = new Blob([att.fileData], { type: att.fileType || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = att.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderAbbrevList(participants, customAbbrevs) {
  const container = document.getElementById('abbrevList');
  container.innerHTML = '';
  const customs = customAbbrevs || [];

  // Teilnehmer-Abkürzungen (read-only) — 3-spaltig
  const seen = new Map();
  participants.forEach(p => { if (p.abbr && !seen.has(p.abbr)) seen.set(p.abbr, p.company||''); });
  if (seen.size) {
    const grid = document.createElement('div');
    grid.className = 'abbrev-grid';
    seen.forEach((company, abbr) => {
      const div = document.createElement('div');
      div.className = 'abbrev-item';
      div.innerHTML = `<span class="abbrev-code">${esc(abbr)}</span><span class="abbrev-name">${esc(company)}</span>`;
      grid.appendChild(div);
    });
    container.appendChild(grid);
  }

  // Manuelle Abkürzungen (editierbar) — 3-spaltig
  const customGrid = document.createElement('div');
  customGrid.className = 'abbrev-custom-grid';
  customs.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'abbrev-custom';
    div.dataset.idx = idx;
    div.innerHTML = `
      <input class="abbrev-input abbrev-input-code" value="${esc(item.abbr)}" data-field="abbr" placeholder="Kürzel" maxlength="6" />
      <input class="abbrev-input abbrev-input-name" value="${esc(item.name)}" data-field="name" placeholder="Bezeichnung" />
      <button class="btn-delete-abbrev" data-action="deleteCustomAbbrev" data-idx="${idx}" title="Entfernen">${iconTrash()}</button>`;
    div.querySelectorAll('input').forEach(inp => inp.addEventListener('change', saveCurrentProtocol));
    div.querySelector('.btn-delete-abbrev').addEventListener('click', async () => {
      const protocol = await DB.Protocols.get(App.currentProtocolId);
      if (!protocol) return;
      protocol.customAbbreviations = (protocol.customAbbreviations||[]).filter((_,i) => i !== idx);
      await DB.Protocols.save(protocol);
      renderAbbrevList(protocol.participants, protocol.customAbbreviations);
    });
    customGrid.appendChild(div);
  });
  container.appendChild(customGrid);

  // "+"-Button zum Hinzufügen
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-add-abbrev';
  addBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z"/>
  </svg> Abkürzung hinzufügen`;
  addBtn.addEventListener('click', async () => {
    const protocol = await DB.Protocols.get(App.currentProtocolId);
    if (!protocol) return;
    protocol.customAbbreviations = [...(protocol.customAbbreviations||[]), { abbr:'', name:'' }];
    await DB.Protocols.save(protocol);
    renderAbbrevList(protocol.participants, protocol.customAbbreviations);
    // Fokus auf das neue Kürzel-Feld
    setTimeout(() => {
      const lastInput = container.querySelector('.abbrev-custom:last-child .abbrev-input-code');
      if (lastInput) lastInput.focus();
    }, 50);
  });
  container.appendChild(addBtn);

  if (seen.size === 0 && customs.length === 0) {
    const hint = document.createElement('span');
    hint.style.cssText = 'color:var(--text-tertiary);font-size:12px';
    hint.textContent = 'Keine Abkürzungen erfasst.';
    container.insertBefore(hint, addBtn);
  }
}

function getCustomAbbreviationsFromDOM() {
  return Array.from(document.querySelectorAll('#abbrevList .abbrev-custom')).map(div => ({
    abbr: div.querySelector('[data-field="abbr"]')?.value || '',
    name: div.querySelector('[data-field="name"]')?.value || '',
  }));
}

/* ============================================================
   LÖSCHEN
============================================================ */
async function deleteParticipant(idx) {
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;
  protocol.participants.splice(idx, 1);
  await DB.Protocols.save(protocol);
  renderParticipants(protocol.participants);
  renderAbbrevList(protocol.participants, protocol.customAbbreviations || []);
}

async function deletePoint(pointId) {
  await saveCurrentProtocol();  // DOM-Inhalte sichern bevor DB gelesen wird
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;
  protocol.points = (protocol.points||[]).filter(p => p.id !== pointId);
  await DB.Protocols.save(protocol);
  renderPoints(protocol);
}

async function deleteAttachment(idx) {
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;
  protocol.attachments.splice(idx, 1);
  protocol.attachments.forEach((att, i) => { att.id = DB.generateAttachmentId(protocol.number, i+1); });
  await DB.Protocols.save(protocol);
  renderAttachments(protocol.attachments, protocol.number);
  renderProtocolList(); // Büroklammer-Icon aktualisieren
}

/* ============================================================
   EVENT-BINDING
============================================================ */
function bindGlobalEvents() {

  document.getElementById('projectSelect').addEventListener('change', async (e) => {
    if (e.target.value) await selectProject(e.target.value);
  });

  // Neues Projekt
  document.getElementById('btnNewProject').addEventListener('click', () => openModal('modalNewProject'));
  document.getElementById('btnSaveNewProject').addEventListener('click', async () => {
    const code    = document.getElementById('newProjectCode').value.trim().toUpperCase();
    const name    = document.getElementById('newProjectName').value.trim();
    const address = document.getElementById('newProjectAddress').value.trim();
    const owner   = document.getElementById('newProjectOwner').value.trim();
    const tenant  = document.getElementById('newProjectTenant').value.trim();
    if (!code || !name)              { showToast('Projektkürzel und Projektname sind Pflichtfelder.', 'error'); return; }
    if (!/^[A-Z]{2,4}$/.test(code)) { showToast('Projektkürzel: 2–4 Großbuchstaben.', 'error'); return; }
    const saved = await DB.Projects.save({ code, name, address, owner, tenant });
    App.projects.push(saved);
    renderProjectSelect();
    closeModal('modalNewProject');
    await selectProject(saved.id);
    clearForm('modalNewProject');
    showToast(`Projekt "${code}" angelegt.`, 'success');
  });

  // Neues Protokoll — Modal kontextabhängig befüllen
  document.getElementById('btnNewProtocol').addEventListener('click', () => {
    const seriesGroup      = document.getElementById('seriesNameGroup');
    const continueFromGroup = document.getElementById('continueFromGroup');
    const continueChk      = document.getElementById('newProtocolContinue');
    const typeSelect       = document.getElementById('newProtocolType');
    document.getElementById('newProtocolSeriesName').value = '';
    typeSelect.disabled = false; // Reset
    if (App.selectedSeriesId) {
      const seriesProtos = App.protocols
        .filter(p => (p.seriesId || ('type:' + p.type)) === App.selectedSeriesId)
        .sort((a, b) => b.number - a.number);
      const latest = seriesProtos[0];
      if (latest) {
        continueChk.checked = true;
        const sName = latest.seriesName || latest.title || latest.type;
        document.getElementById('continueFromDisplay').textContent =
          `${sName} – Nr. ${String(latest.number).padStart(2,'0')}`;
        continueFromGroup.classList.remove('hidden');
        seriesGroup.classList.add('hidden');
        // Typ aus Serie übernehmen und sperren
        typeSelect.value = latest.type;
        typeSelect.disabled = true;
      } else {
        continueChk.checked = false;
        continueFromGroup.classList.add('hidden');
        seriesGroup.classList.remove('hidden');
      }
    } else {
      continueChk.checked = false;
      continueFromGroup.classList.add('hidden');
      seriesGroup.classList.remove('hidden');
    }
    openModal('modalNewProtocol');
  });

  document.getElementById('newProtocolContinue').addEventListener('change', (e) => {
    const seriesGroup       = document.getElementById('seriesNameGroup');
    const continueFromGroup = document.getElementById('continueFromGroup');
    const typeSelect        = document.getElementById('newProtocolType');
    if (e.target.checked && App.selectedSeriesId) {
      seriesGroup.classList.add('hidden');
      continueFromGroup.classList.remove('hidden');
      // Typ aus Serie übernehmen und sperren
      const seriesProtos = App.protocols
        .filter(p => (p.seriesId || ('type:' + p.type)) === App.selectedSeriesId)
        .sort((a, b) => b.number - a.number);
      if (seriesProtos[0]) {
        typeSelect.value = seriesProtos[0].type;
        typeSelect.disabled = true;
      }
    } else {
      seriesGroup.classList.remove('hidden');
      continueFromGroup.classList.add('hidden');
      typeSelect.disabled = false;
    }
  });

  document.getElementById('btnSaveNewProtocol').addEventListener('click', async () => {
    const type       = document.getElementById('newProtocolType').value;
    const cont       = type !== 'Aktennotiz' && document.getElementById('newProtocolContinue').checked;
    const seriesName = document.getElementById('newProtocolSeriesName').value.trim();
    const sourceKey  = cont ? App.selectedSeriesId : null;
    closeModal('modalNewProtocol');
    document.getElementById('newProtocolSeriesName').value = '';
    await createProtocol(type, cont, seriesName, sourceKey);
  });

  // Typ-Wechsel: Serienname leeren + Aktennotiz → Fortführen sperren
  // (Nur aktiv wenn Typ-Select nicht gesperrt ist — bei Serienfortführung ist er disabled)
  document.getElementById('newProtocolType').addEventListener('change', () => {
    document.getElementById('newProtocolSeriesName').value = '';
    const type = document.getElementById('newProtocolType').value;
    const continueChk       = document.getElementById('newProtocolContinue');
    const seriesGroup       = document.getElementById('seriesNameGroup');
    const continueFromGroup = document.getElementById('continueFromGroup');
    if (type === 'Aktennotiz') {
      continueChk.checked  = false;
      continueChk.disabled = true;
      continueFromGroup.classList.add('hidden');
      seriesGroup.classList.remove('hidden');
    } else {
      continueChk.disabled = false;
    }
  });

  // Toolbar
  document.getElementById('btnAddChapter').addEventListener('click', startAddChapter);
  document.getElementById('btnAddSubchapter').addEventListener('click', startAddSubchapter);
  document.getElementById('btnAddTopic').addEventListener('click', startAddTopic);
  document.getElementById('btnAddPoint').addEventListener('click', addPoint);
  document.getElementById('btnCollapseAll').addEventListener('click', toggleCollapseAll);
  setupPointFilter();
  setupChapterFilter();

  // KAP / UKAP / THEMA Modals
  document.getElementById('btnSaveChapter').addEventListener('click', saveChapter);
  document.getElementById('chapterLabel').addEventListener('keydown', (e) => { if (e.key==='Enter') saveChapter(); });
  document.getElementById('btnSaveSubchapter').addEventListener('click', saveSubchapter);
  document.getElementById('subchapterLabel').addEventListener('keydown', (e) => { if (e.key==='Enter') saveSubchapter(); });
  document.getElementById('btnSaveTopic').addEventListener('click', saveTopic);
  document.getElementById('topicLabel').addEventListener('keydown', (e) => { if (e.key==='Enter') saveTopic(); });

  // Soft email validation für "Neuer Teilnehmer"-Feld
  const newEmailInput = document.getElementById('newParticipantEmail');
  if (newEmailInput) {
    newEmailInput.addEventListener('input', () => {
      const v = newEmailInput.value.trim();
      newEmailInput.classList.toggle('email-warn', v.length > 0 && !v.includes('@'));
    });
  }

  // Teilnehmer hinzufügen
  document.getElementById('btnAddParticipant').addEventListener('click', async () => {
    const name     = document.getElementById('newParticipantName').value.trim();
    const company  = document.getElementById('newParticipantCompany').value.trim();
    const abbr     = document.getElementById('newParticipantAbbr').value.trim().toUpperCase();
    const email    = document.getElementById('newParticipantEmail').value.trim();
    const attended = document.getElementById('newParticipantAttended').checked;
    const inDistrib= document.getElementById('newParticipantDistrib').checked;
    if (!name) { showToast('Bitte Name eintragen.', 'error'); return; }
    const protocol = await DB.Protocols.get(App.currentProtocolId);
    if (!protocol) return;
    protocol.participants = [...(protocol.participants||[]),
      { name, company, abbr, email, attended, inDistrib }];
    await DB.Protocols.save(protocol);
    renderParticipants(protocol.participants);
    renderAbbrevList(protocol.participants, protocol.customAbbreviations || []);
    updateResponsibleDropdowns();
    ['newParticipantName','newParticipantCompany','newParticipantAbbr','newParticipantEmail']
      .forEach(id => { document.getElementById(id).value = ''; });
  });
  document.getElementById('newParticipantEmail').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btnAddParticipant').click();
  });

  // Anlage: Leere Zeile
  document.getElementById('btnAddAttachment').addEventListener('click', () => addNewAttachment());

  // Anlage: Datei-Picker
  document.getElementById('btnPickFile').addEventListener('click', async () => {
    // Neue leere Anlage anlegen, dann Picker für diese öffnen
    if (!App.currentProtocolId) return;
    const protocol = await DB.Protocols.get(App.currentProtocolId);
    if (!protocol) return;
    const seq = (protocol.attachments||[]).length;
    // Erst addNewAttachment aufrufen, dann Picker öffnen
    await addNewAttachment();
    const newIdx = seq; // Index der neu angelegten Anlage
    openFilePicker(newIdx);
  });

  document.getElementById('filePickerInput').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (file && _pendingFileIdx !== null) {
      await handleFileSelected(file, _pendingFileIdx);
      _pendingFileIdx = null;
    }
  });

  // Drag & Drop auf die Drop-Zone
  const dropZone = document.getElementById('attachDropZone');
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (!file || !App.currentProtocolId) return;
    if (file.size > MAX_FILE_SIZE) {
      showToast(`Datei zu groß (${(file.size/1024/1024).toFixed(1)} MB). Maximum: 2 MB.`, 'error');
      return;
    }
    // Neue Anlage mit Datei anlegen
    const buffer = await file.arrayBuffer();
    await addNewAttachment(file.name, file.type, buffer);
  });

  // Protokoll löschen — mit klarem Hinweis
  document.getElementById('btnDeleteProtocol').addEventListener('click', async () => {
    if (!App.currentProtocolId) return;
    const ok = confirm(
      'Obacht!\n\nDas Protokoll wird in den Papierkorb verschoben.\n' +
      'Alle Protokollpunkte bleiben gespeichert und können über den Papierkorb wiederhergestellt werden.\n\n' +
      'Bist du sicher?'
    );
    if (!ok) return;
    await DB.Protocols.trash(App.currentProtocolId);
    App.currentProtocolId = null;
    document.getElementById('emptyState').classList.remove('hidden');
    document.getElementById('protocolView').classList.add('hidden');
    document.getElementById('workspaceToolbar').classList.add('hidden');
    App.protocols = await DB.Protocols.getActiveByProject(App.currentProjectId);
    renderProtocolList();
    showToast('Protokoll in den Papierkorb verschoben.', '');
  });

  // Duplikat speichern
  document.getElementById('btnSaveDuplicate').addEventListener('click', async () => {
    const name = document.getElementById('duplicateName').value.trim();
    if (!name) { showToast('Bitte einen Namen für das Duplikat eingeben.', 'error'); return; }
    if (!App._duplicatingProtocolId) return;
    closeModal('modalDuplicate');
    await duplicateProtocol(App._duplicatingProtocolId, name);
    App._duplicatingProtocolId = null;
  });
  document.getElementById('duplicateName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btnSaveDuplicate').click();
  });

  // Sidebar Toggle
  document.getElementById('btnToggleSidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  // Sidebar Resize (Drag am rechten Rand)
  const resizeHandle = document.getElementById('sidebarResizeHandle');
  const sidebar      = document.getElementById('sidebar');
  let _resizing = false;
  resizeHandle.addEventListener('mousedown', (e) => {
    if (sidebar.classList.contains('collapsed')) return;
    e.preventDefault();
    _resizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', (e) => {
    if (!_resizing) return;
    const newWidth = Math.min(500, Math.max(200, e.clientX));
    sidebar.style.width    = newWidth + 'px';
    sidebar.style.minWidth = newWidth + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (!_resizing) return;
    _resizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  // Delegiertes Klicken
  document.addEventListener('click', async (e) => {
    // Collapse-Pfeile
    const colBtn = e.target.closest('.collapse-btn');
    if (colBtn) { toggleCollapse(colBtn.dataset.collapseId); return; }

    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'deleteParticipant') {
      if (confirm('Teilnehmer entfernen?')) await deleteParticipant(parseInt(btn.dataset.idx, 10));
    } else if (action === 'deletePoint') {
      if (confirm('Protokollpunkt unwiderruflich löschen?')) await deletePoint(btn.dataset.pointId);
    } else if (action === 'deleteAttachment') {
      if (confirm('Anlage entfernen?')) await deleteAttachment(parseInt(btn.dataset.idx, 10));
    } else if (action === 'deleteChapter') {
      await deleteChapter(btn.dataset.chapter);
    } else if (action === 'deleteSubchapter') {
      await deleteSubchapter(btn.dataset.chapter, btn.dataset.subchapter);
    } else if (action === 'deleteTopic') {
      await deleteTopic(btn.dataset.chapter, btn.dataset.subchapter, btn.dataset.topic, btn.dataset.topicLabel);
    }
  });

  // Auto-Save Titelblock + Aufgestellt
  ['fieldDate','fieldTime','fieldLocation','fieldTenant','fieldLandlord',
   'fieldAuthorFirstName','fieldAuthorLastName','fieldAuthorCompany','fieldAuthorDate'].forEach(id => {
    document.getElementById(id).addEventListener('change', saveCurrentProtocol);
  });
  document.getElementById('fieldTitle').addEventListener('input', saveCurrentProtocol);

  // Modals
  document.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', () => closeModal(btn.dataset.close)));
  document.querySelectorAll('.modal-overlay').forEach(overlay =>
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(overlay.id); }));

  // Suche
  document.getElementById('searchInput').addEventListener('input', (e) =>
    filterProtocolList(e.target.value.trim().toLowerCase()));

  // Quick-Save
  document.getElementById('btnQuickSave').addEventListener('click', () => quickSaveDB());
  _setupQuickSaveLabelEdit();

  // Projekt-Menü + Löschen
  setupProjectMenu();
  document.getElementById('btnConfirmDeleteProject').addEventListener('click', () => confirmDeleteProject());
  document.getElementById('btnExportBeforeDelete').addEventListener('click', () => exportProject());

  // Papierkorb
  document.getElementById('btnTrash').addEventListener('click', () => openTrash());
  document.getElementById('btnCloseTrash').addEventListener('click', () => closeTrash());
  document.getElementById('btnExportPdf').addEventListener('click', async () => {
    if (!App.currentProtocolId) {
      showToast('Bitte zuerst ein Protokoll öffnen.', 'error');
      return;
    }
    try {
      await saveCurrentProtocol();
      const fileName = await PDFExport.exportProtocolPDF(App.currentProtocolId, App.hiddenChapters);
      showToast(`PDF exportiert: ${fileName}`, 'success');
    } catch (e) {
      console.error('PDF-Export Fehler:', e);
      showToast('PDF-Export fehlgeschlagen: ' + e.message, 'error');
    }
  });

  // JSON Export / Import (jetzt im ⋮-Menü)
  const fileInput = document.getElementById('fileImportJson');
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) importProject(fileInput.files[0]);
  });
}

/* ============================================================
   DUPLIKAT
============================================================ */
/**
 * Erstellt ein vollständiges Duplikat eines Protokolls:
 * - Neue seriesId (eigenständige Serie)
 * - neuer Name und Nummer 1
 * - Snapshots werden entfernt (keine Amendments im Duplikat)
 */
async function duplicateProtocol(protocolId, newName) {
  const source = await DB.Protocols.get(protocolId);
  if (!source) return;

  const newSeriesId = DB.uuid();
  // Deep-copy über JSON
  const copy = JSON.parse(JSON.stringify(source));
  delete copy.id;           // DB.Protocols.save erzeugt neue ID
  copy.seriesId   = newSeriesId;
  copy.seriesName = newName;
  copy.title      = newName;
  copy.number     = 1;
  copy.deletedAt  = null;
  copy.date       = new Date().toISOString().slice(0, 10);
  // Snapshots entfernen — Duplikat gilt als Ausgangsdokument
  copy.points = (copy.points || []).map(pt => {
    const { snapshot, ...rest } = pt;  // eslint-disable-line no-unused-vars
    return { ...rest, isNew: false, doneLastProtocol: false };
  });

  const saved = await DB.Protocols.save(copy);
  App.protocols = await DB.Protocols.getActiveByProject(App.currentProjectId);
  renderProtocolList();
  await openProtocol(saved.id);
  showToast(`Duplikat "${newName}" erstellt.`, 'success');
}

/* ============================================================
   PAPIERKORB
============================================================ */

/* ── Drei-Punkte-Menü (Projekt-Aktionen) ───────────────────── */
function setupProjectMenu() {
  const btn   = document.getElementById('btnProjectMenu');
  const panel = document.getElementById('projectMenuPanel');

  btn.addEventListener('click', e => {
    e.stopPropagation();
    panel.classList.toggle('hidden');
  });

  document.addEventListener('click', e => {
    if (!panel.classList.contains('hidden') && !panel.contains(e.target) && !btn.contains(e.target)) {
      panel.classList.add('hidden');
    }
  });

  document.getElementById('btnDeleteProject').addEventListener('click', () => {
    panel.classList.add('hidden');
    openDeleteProjectModal();
  });

  // Datenbank exportieren
  document.getElementById('btnExportFullDB').addEventListener('click', () => {
    panel.classList.add('hidden');
    exportFullDB();
  });

  // Datenbank importieren
  const dbFileInput = document.getElementById('fileImportFullDB');
  document.getElementById('btnImportFullDB').addEventListener('click', () => {
    panel.classList.add('hidden');
    dbFileInput.value = '';
    dbFileInput.click();
  });
  dbFileInput.addEventListener('change', () => {
    if (dbFileInput.files.length > 0) importFullDB(dbFileInput.files[0]);
  });

  // Projekt exportieren
  document.getElementById('btnExportProject').addEventListener('click', () => {
    panel.classList.add('hidden');
    exportProject();
  });

  // Projekt importieren
  const projFileInput = document.getElementById('fileImportJson');
  document.getElementById('btnImportProject').addEventListener('click', () => {
    panel.classList.add('hidden');
    projFileInput.value = '';
    projFileInput.click();
  });
}

function openDeleteProjectModal() {
  if (!App.currentProjectId) {
    showToast('Bitte zuerst ein Projekt auswählen.', 'error');
    return;
  }
  const project = App.projects.find(p => p.id === App.currentProjectId);
  if (!project) return;
  document.getElementById('deleteProjectLabel').textContent =
    `${project.code}${project.name ? ' — ' + project.name : ''}`;
  openModal('modalDeleteProject');
}

async function confirmDeleteProject() {
  if (!App.currentProjectId) return;
  const project = App.projects.find(p => p.id === App.currentProjectId);
  if (!project) return;
  const label = project.code + (project.name ? ' — ' + project.name : '');

  // Alle Protokolle des Projekts soft-deleten
  const allProtocols = await DB.Protocols.getByProject(App.currentProjectId);
  for (const proto of allProtocols) {
    if (!proto.deletedAt) await DB.Protocols.trash(proto.id);
  }

  // Projekt soft-deleten
  await DB.Projects.trash(App.currentProjectId);

  // UI aktualisieren
  App.currentProjectId  = null;
  App.currentProtocolId = null;
  localStorage.removeItem('lastProjectId');
  localStorage.removeItem('lastProtocolId');
  App.projects = await DB.Projects.getAll();
  renderProjectSelect();
  document.getElementById('projectSelect').value = '';
  document.getElementById('protocolList').innerHTML =
    '<div class="empty-state-sidebar"><p>Kein Projekt ausgewählt.</p></div>';
  document.getElementById('emptyState').classList.remove('hidden');
  document.getElementById('protocolView').classList.add('hidden');
  document.getElementById('workspaceToolbar').classList.add('hidden');
  document.getElementById('btnNewProtocol').disabled = true;

  closeModal('modalDeleteProject');
  showToast(`Projekt "${label}" in den Papierkorb verschoben.`, 'success');
}

async function openTrash() {
  await renderTrash();
  document.getElementById('trashPanel').classList.remove('hidden');
}

function closeTrash() {
  document.getElementById('trashPanel').classList.add('hidden');
}

async function renderTrash() {
  // ── Gelöschte Projekte ──
  const projContainer = document.getElementById('trashProjectList');
  const divider       = document.getElementById('trashDivider');
  projContainer.innerHTML = '';

  const trashedProjects = await DB.Projects.getTrashed();
  if (trashedProjects.length > 0) {
    trashedProjects.sort((a, b) => b.deletedAt - a.deletedAt).forEach(proj => {
      const item = document.createElement('div');
      item.className = 'trash-item';
      const label = proj.code + (proj.name ? ' — ' + proj.name : '');
      const deletedDate = new Date(proj.deletedAt).toLocaleDateString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      item.innerHTML = `
        <div class="trash-item-title">${esc(label)}</div>
        <div class="trash-item-meta">Projekt · Gelöscht: ${deletedDate}</div>
        <div class="trash-item-actions"></div>`;
      const actions = item.querySelector('.trash-item-actions');

      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'trash-action-btn restore';
      restoreBtn.textContent = 'Wiederherstellen';
      restoreBtn.addEventListener('click', async () => {
        await DB.Projects.restore(proj.id);
        // Alle zugehörigen Protokolle wiederherstellen
        const allProto = await DB.Protocols.getByProject(proj.id);
        for (const p of allProto) {
          if (p.deletedAt) await DB.Protocols.restore(p.id);
        }
        App.projects = await DB.Projects.getAll();
        renderProjectSelect();
        await renderTrash();
        showToast(`Projekt "${label}" wiederhergestellt.`, 'success');
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'trash-action-btn delete-permanent';
      deleteBtn.textContent = 'Endgültig löschen';
      deleteBtn.addEventListener('click', async () => {
        if (!confirm(`Projekt "${label}" mit allen Protokollen endgültig löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden.`)) return;
        // Alle Protokolle des Projekts endgültig löschen
        const allProto = await DB.Protocols.getByProject(proj.id);
        for (const p of allProto) await DB.Protocols.delete(p.id);
        await DB.Projects.delete(proj.id);
        await renderTrash();
        showToast(`Projekt "${label}" endgültig gelöscht.`, '');
      });

      actions.appendChild(restoreBtn);
      actions.appendChild(deleteBtn);
      projContainer.appendChild(item);
    });
    divider.classList.remove('hidden');
  } else {
    divider.classList.add('hidden');
  }

  // ── Gelöschte Protokolle (aktuelles Projekt) ──
  const container = document.getElementById('trashList');
  container.innerHTML = '';

  // Protokolle aus aktuellem Projekt UND aus gelöschten Projekten anzeigen
  let trashed = [];
  if (App.currentProjectId) {
    const all = await DB.Protocols.getByProject(App.currentProjectId);
    trashed = all.filter(p => p.deletedAt).sort((a, b) => b.deletedAt - a.deletedAt);
  }

  if (trashed.length === 0 && trashedProjects.length === 0) {
    container.innerHTML = '<div class="trash-empty">Papierkorb ist leer.</div>';
    return;
  } else if (trashed.length === 0) {
    return; // Nur Projekte im Papierkorb, keine Protokolle
  }

  trashed.forEach(proto => {
    const item = document.createElement('div');
    item.className = 'trash-item';

    const label = proto.type === 'Aktennotiz'
      ? (proto.seriesName || proto.title || 'Aktennotiz')
      : `${proto.seriesName || proto.title || proto.type} Nr. ${String(proto.number || 1).padStart(2, '0')}`;

    const deletedDate = new Date(proto.deletedAt).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    item.innerHTML = `
      <div class="trash-item-title">${esc(label)}</div>
      <div class="trash-item-meta">Gelöscht: ${deletedDate}</div>
      <div class="trash-item-actions"></div>`;

    const actions = item.querySelector('.trash-item-actions');

    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'trash-action-btn restore';
    restoreBtn.textContent = 'Wiederherstellen';
    restoreBtn.addEventListener('click', async () => {
      await DB.Protocols.restore(proto.id);
      App.protocols = await DB.Protocols.getActiveByProject(App.currentProjectId);
      renderProtocolList();
      await renderTrash();
      showToast(`"${label}" wiederhergestellt.`, 'success');
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'trash-action-btn delete-permanent';
    deleteBtn.textContent = 'Endgültig löschen';
    deleteBtn.addEventListener('click', async () => {
      if (!confirm(`"${label}" endgültig löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden.`)) return;
      await DB.Protocols.delete(proto.id);
      await renderTrash();
      showToast(`"${label}" endgültig gelöscht.`, '');
    });

    actions.appendChild(restoreBtn);
    actions.appendChild(deleteBtn);
    container.appendChild(item);
  });
}

/* ============================================================
   JSON EXPORT / IMPORT
============================================================ */

/**
 * Exportiert das aktuelle Projekt + alle Protokolle als JSON-Datei.
 */
async function exportProject() {
  if (!App.currentProjectId) {
    showToast('Bitte zuerst ein Projekt auswählen.', 'error');
    return;
  }
  const project = await DB.Projects.get(App.currentProjectId);
  if (!project) { showToast('Projekt nicht gefunden.', 'error'); return; }

  // Alle Protokolle laden (aktive + Papierkorb)
  const allProtocols = await DB.Protocols.getByProject(App.currentProjectId);

  const backup = {
    _format: 'ProtokollApp-Backup',
    _version: 2,
    exportedAt: new Date().toISOString(),
    project,
    protocols: prepareProtocolsForExport(allProtocols),
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href     = url;
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  a.download = `${yy}${mm}${dd} ${project.code}_backup Protokolle.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Export: ${project.code} — ${allProtocols.length} Protokoll(e).`, 'success');
}

/**
 * Importiert ein Projekt + Protokolle aus einer JSON-Backup-Datei.
 * Bestehende Daten mit gleicher ID werden überschrieben.
 */
async function importProject(file) {
  let data;
  try {
    const text = await file.text();
    data = JSON.parse(text);
  } catch {
    showToast('Datei konnte nicht gelesen werden. Ungültiges JSON.', 'error');
    return;
  }

  // Validierung
  if (!data._format || data._format !== 'ProtokollApp-Backup' || !data.project || !data.protocols) {
    showToast('Ungültiges Backup-Format.', 'error');
    return;
  }

  const proj = data.project;
  if (!proj.id || !proj.code) {
    showToast('Projekt-Daten unvollständig.', 'error');
    return;
  }

  // Prüfen ob Projekt mit gleicher ID bereits existiert
  const existing = await DB.Projects.get(proj.id);
  if (existing) {
    const ok = confirm(
      `Projekt „${existing.code}" existiert bereits.\n` +
      `Überschreiben mit Import-Daten (${data.protocols.length} Protokolle)?`
    );
    if (!ok) return;
  }

  // Projekt speichern
  await DB.Projects.save(proj);

  // Datei-Anlagen wiederherstellen (Base64 → ArrayBuffer)
  restoreProtocolFiles(data.protocols);

  // Protokolle speichern
  let count = 0;
  for (const protocol of data.protocols) {
    if (protocol.projectId === proj.id) {
      await DB.Protocols.save(protocol);
      count++;
    }
  }

  // App-State aktualisieren
  App.projects = await DB.Projects.getAll();
  renderProjectSelect();
  await selectProject(proj.id);

  showToast(`Import: ${proj.code} — ${count} Protokoll(e) importiert.`, 'success');
}

/* ============================================================
   DATENBANK-BACKUP (Full Export / Import)
============================================================ */

/**
 * Exportiert die gesamte Datenbank (alle Projekte + alle Protokolle)
 * als eine JSON-Datei. Dateiname: YYMMDD_HHmm_KADRA-Backup.json
 */
/** Erzeugt Backup-Blob + Metadaten. */
async function _buildBackup() {
  if (App.currentProtocolId) {
    try { await saveCurrentProtocol(); } catch { /* ignore */ }
  }
  const projects  = await DB.Projects.getAllIncludingDeleted();
  const protocols = await DB.Protocols.getAll();
  const backup = {
    _format:     'KADRA-FullBackup',
    _version:    2,
    _exportedAt: new Date().toISOString(),
    projects,
    protocols:   prepareProtocolsForExport(protocols),
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  return { blob, projectCount: projects.length, protocolCount: protocols.length };
}

/** Generiert einen Dateinamen mit aktuellem Zeitstempel. */
function _backupFileName() {
  const now = new Date();
  const yy  = String(now.getFullYear()).slice(2);
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const dd  = String(now.getDate()).padStart(2, '0');
  const hh  = String(now.getHours()).padStart(2, '0');
  const mi  = String(now.getMinutes()).padStart(2, '0');
  return `${yy}${mm}${dd}_${hh}${mi}_KADRA-Backup.json`;
}

/** Aktualisiert die Dateiname-Anzeige in der Sidebar. */
function _updateQuickSaveLabel(fileName) {
  App._saveFileName = fileName;
  const label = document.getElementById('quickSaveLabel');
  if (label) {
    label.textContent = fileName;
    label.title       = 'Dateinamen der letzten Speicherung eingeben';
  }
}

/** Label klickbar machen → Inline-Edit für Dateinamen. */
function _setupQuickSaveLabelEdit() {
  const label = document.getElementById('quickSaveLabel');
  if (!label) return;

  label.addEventListener('click', () => {
    if (!App._saveFileName || App._saveFileName === '—') return;

    const input = document.createElement('input');
    input.type  = 'text';
    input.value = App._saveFileName;
    input.className = 'quicksave-label-input';

    const finish = () => {
      const val = input.value.trim();
      if (val && val !== App._saveFileName) {
        App._saveFileName = val;
        App._saveFileHandle = null; // Handle passt nicht mehr → Reset
      }
      label.textContent = App._saveFileName;
      label.title       = 'Dateinamen der letzten Speicherung eingeben';
      label.style.display = '';
      input.remove();
    };

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); finish(); }
      if (e.key === 'Escape') { input.value = App._saveFileName; finish(); }
    });
    input.addEventListener('blur', finish);

    label.style.display = 'none';
    label.parentNode.insertBefore(input, label.nextSibling);
    input.focus();
    input.select();
  });
}

/**
 * Datenbank exportieren (Drei-Punkte-Menü).
 * Erzeugt IMMER einen neuen Dateinamen und Download-Dialog.
 */
async function exportFullDB() {
  const { blob, projectCount, protocolCount } = await _buildBackup();
  const fileName = _backupFileName();

  // File System Access API verfügbar? → Speicherdialog
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      // Handle für Quick-Save merken
      App._saveFileHandle = handle;
      _updateQuickSaveLabel(handle.name);
      showToast(`Exportiert: ${projectCount} Projekt(e), ${protocolCount} Protokoll(e).`, 'success');
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // User hat abgebrochen
    }
  }

  // Fallback: klassischer Download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href     = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  _updateQuickSaveLabel(fileName);
  showToast(`Exportiert: ${projectCount} Projekt(e), ${protocolCount} Protokoll(e).`, 'success');
}

/**
 * Quick-Save (Speicher-Button in der Sidebar).
 * - Erster Klick: wie exportFullDB() (Dialog / Download)
 * - Weitere Klicks: still in dieselbe Datei schreiben (wenn File System Access API verfügbar)
 */
async function quickSaveDB() {
  const { blob, projectCount, protocolCount } = await _buildBackup();

  // Wenn wir schon ein File-Handle haben → still überschreiben
  if (App._saveFileHandle) {
    try {
      const writable = await App._saveFileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      // Kurzes visuelles Feedback
      const btn = document.getElementById('btnQuickSave');
      btn.classList.add('saved');
      setTimeout(() => btn.classList.remove('saved'), 1500);
      showToast(`Gespeichert: ${projectCount} Projekt(e), ${protocolCount} Protokoll(e).`, 'success');
      return;
    } catch (err) {
      // Handle ungültig geworden (Datei gelöscht etc.) → zurücksetzen
      App._saveFileHandle = null;
    }
  }

  // Kein Handle → File System Access API verfügbar?
  if (window.showSaveFilePicker) {
    try {
      const fileName = App._saveFileName || _backupFileName();
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      App._saveFileHandle = handle;
      _updateQuickSaveLabel(handle.name);
      showToast(`Gespeichert: ${projectCount} Projekt(e), ${protocolCount} Protokoll(e).`, 'success');
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  // Fallback (Firefox): klassischer Download mit festem Namen
  const fileName = App._saveFileName || _backupFileName();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href     = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  _updateQuickSaveLabel(fileName);

  const btn = document.getElementById('btnQuickSave');
  btn.classList.add('saved');
  setTimeout(() => btn.classList.remove('saved'), 1500);
  showToast(`Exportiert: ${projectCount} Projekt(e), ${protocolCount} Protokoll(e).`, 'success');
}

/**
 * Importiert eine KADRA-FullBackup JSON-Datei.
 * Alle Projekte + Protokolle werden in IndexedDB geschrieben (Upsert).
 */
async function importFullDB(file) {
  let data;
  try {
    const text = await file.text();
    data = JSON.parse(text);
  } catch {
    showToast('Datei konnte nicht gelesen werden. Ungültiges JSON.', 'error');
    return;
  }

  // Validierung
  if (!data._format || data._format !== 'KADRA-FullBackup') {
    showToast('Ungültiges Backup-Format. Erwartet: KADRA-FullBackup.', 'error');
    return;
  }
  if (!Array.isArray(data.projects) || !Array.isArray(data.protocols)) {
    showToast('Backup-Daten unvollständig (projects/protocols fehlen).', 'error');
    return;
  }

  const ok = confirm(
    `Datenbank-Import:\n` +
    `${data.projects.length} Projekt(e) und ${data.protocols.length} Protokoll(e).\n\n` +
    `Bestehende Daten mit gleicher ID werden überschrieben.\nFortfahren?`
  );
  if (!ok) return;

  // Projekte importieren
  let pCount = 0;
  for (const proj of data.projects) {
    if (proj.id) {
      await DB.Projects.save(proj);
      pCount++;
    }
  }

  // Datei-Anlagen wiederherstellen (Base64 → ArrayBuffer)
  restoreProtocolFiles(data.protocols);

  // Protokolle importieren
  let prCount = 0;
  for (const proto of data.protocols) {
    if (proto.id) {
      await DB.Protocols.save(proto);
      prCount++;
    }
  }

  // App-State aktualisieren
  App.projects = await DB.Projects.getAll();
  renderProjectSelect();

  // Falls ein Projekt ausgewählt war, Sidebar aktualisieren
  if (App.currentProjectId) {
    App.protocols = await DB.Protocols.getActiveByProject(App.currentProjectId);
    renderProtocolList();
  }

  showToast(`Import: ${pCount} Projekt(e), ${prCount} Protokoll(e) importiert.`, 'success');
}

/* ============================================================
   UTILS
============================================================ */

/** ArrayBuffer → Base64-String (für JSON-Export von Datei-Anlagen) */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** Base64-String → ArrayBuffer (für JSON-Import von Datei-Anlagen) */
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Bereitet Protokoll-Array für JSON-Export vor (fileData → Base64) */
function prepareProtocolsForExport(protocols) {
  return protocols.map(proto => {
    if (!proto.attachments?.length) return proto;
    const copy = { ...proto, attachments: proto.attachments.map(att => {
      if (!att.fileData || !(att.fileData instanceof ArrayBuffer || att.fileData.byteLength !== undefined)) return att;
      return { ...att, fileData: arrayBufferToBase64(att.fileData), _fileDataBase64: true };
    })};
    return copy;
  });
}

/** Stellt Datei-Anlagen nach JSON-Import wieder her (Base64 → ArrayBuffer) */
function restoreProtocolFiles(protocols) {
  for (const proto of protocols) {
    if (!proto.attachments?.length) continue;
    for (const att of proto.attachments) {
      if (att._fileDataBase64 && typeof att.fileData === 'string') {
        att.fileData = base64ToArrayBuffer(att.fileData);
        delete att._fileDataBase64;
      }
    }
  }
}

function filterProtocolList(query) {
  document.querySelectorAll('.protocol-item').forEach(el => {
    el.style.display = (!query || el.textContent.toLowerCase().includes(query)) ? '' : 'none';
  });
}

function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function clearForm(modalId) {
  document.querySelectorAll(`#${modalId} input, #${modalId} select`).forEach(el => {
    if (el.type === 'checkbox') el.checked = false; else el.value = '';
  });
}

function showToast(message, type = '') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.textContent = message;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function iconTrash() {
  return `<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
  </svg>`;
}

function iconChevron() {
  return `<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
    <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
  </svg>`;
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(()=>{}); });
}
