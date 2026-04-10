/**
 * [cleanup]
 *
 * [cleanup]
 * [cleanup]
 * [cleanup]
 * [cleanup]
 *  - Termin-Feld als <input type="date">
 * [cleanup]
 *  - Collapse-All Button
 * [cleanup]
 *  - Vertikale Ausrichtung Punktzeilen korrigiert
 * [cleanup]
 * [cleanup]
 */

const APP_VERSION = '0.3';

/* [cleanup] */
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
  selectedSeriesId:    null,   // Welche Serie ist fÃ¼r Fortfuehrung ausgewaehlt
  collapsedSeriesIds:  new Set(),
  sidebarAllCollapsed: false,
  _duplicatingProtocolId: null,
  // v1.4: Zwei-Sektionen-Sidebar
  collapsedSeriesSectionAll: false,  // TERMINSERIEN alle zugeklappt
  singleDocSectionCollapsed: false,  // EINZELDOKUMENTE zugeklappt
  // Punkt-Filter
  pointFilters: { hideDone: false, onlyOverdue: false, onlyNew: false, onlyTasks: false, onlyApproval: false },
  // Kapitel-Filter
  hiddenChapters: new Set(),
  // Drag & Drop
  _dragGroup: null,        // Aktive Drag-Gruppe (z.B. "A|A.1")
  _dragType:  null,        // 'point' | 'topic' - was wird gerade gezogen
  // Quick-Save (File System Access API)
  _saveFileHandle: null,   // FileSystemFileHandle (Chrome/Edge) oder null
  _saveFileName:   null,   // Letzter Dateiname
};

/* ============================================================
   INIT
============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  initStaticIcons();
  await DB.openDB();
  bindGlobalEvents();
  await loadProjects();

  // Quick-Save-Dateiname nach Reload wiederherstellen
  const savedFileName = localStorage.getItem('kadra_saveFileName');
  if (savedFileName) _updateQuickSaveLabel(savedFileName);

  // [cleanup]
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.resp-select')) {
      document.querySelectorAll('.resp-panel:not(.hidden)').forEach(panel => {
        const wrap    = panel.closest('.resp-select');
        const trigger = wrap?.querySelector('.resp-trigger');
        const vals    = Array.from(panel.querySelectorAll('input[type="checkbox"]:checked'))
          .map(cb => cb.value);
        const joined  = vals.join('/');
        if (wrap)    wrap.dataset.value = joined;
        if (trigger) trigger.querySelector('.resp-display').textContent = vals.length ? joined : '-';
        panel.classList.add('hidden');
        if (trigger) trigger.classList.remove('open');
      });
      saveCurrentProtocol();
    }
    if (!e.target.closest('.cat-select')) {
      document.querySelectorAll('.cat-panel:not(.hidden)').forEach(panel => {
        panel.classList.add('hidden');
        panel.previousElementSibling?.classList.remove('open');
      });
    }
  });
});

function initStaticIcons() {
  const setLeadingIcon = (selector, iconFn) => {
    const el = document.querySelector(selector);
    if (!el || typeof iconFn !== 'function') return;
    const directSvgs = Array.from(el.children).filter(c => c.tagName === 'svg');
    const html = iconFn();
    if (directSvgs.length) directSvgs[0].outerHTML = html;
    else el.insertAdjacentHTML('afterbegin', html);
  };
  const setOnlyIcon = (selector, iconFn) => {
    const el = document.querySelector(selector);
    if (!el || typeof iconFn !== 'function') return;
    el.innerHTML = iconFn();
  };
  const ensureAppendedIcon = (selector, iconHtml) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.insertAdjacentHTML('beforeend', iconHtml);
  };
  const setAllOnlyIcons = (selector, iconFn) => {
    if (typeof iconFn !== 'function') return;
    document.querySelectorAll(selector).forEach(el => { el.innerHTML = iconFn(); });
  };

  // Sidebar / project menu
  setOnlyIcon('#btnProjectMenu', iconMenu);
  setLeadingIcon('#btnImportFullDB', iconFileInput);
  setLeadingIcon('#btnExportFullDB', iconSave);
  setLeadingIcon('#btnCloseDatabase', iconCircleX);
  setLeadingIcon('#btnNewProjectMenu', iconFolderPlus);
  setLeadingIcon('#btnImportProject', iconFolderOpen);
  setLeadingIcon('#btnExportProject', iconFolderDown);
  setLeadingIcon('#btnDeleteProject', iconTrash);
  setLeadingIcon('#btnQuickSave', iconSave);
  setLeadingIcon('#btnSettings', iconSettings);
  setLeadingIcon('#btnAppInfo', iconInfo);
  setLeadingIcon('#btnLogout', iconLogOut);
  setOnlyIcon('#btnToggleSidebar', iconPanelLeftClose);
  setLeadingIcon('#btnNewProject', iconFolderPlus);
  setLeadingIcon('#btnImportProjectSelector', iconFolderOpen);
  ensureAppendedIcon('#btnProjectSelector', iconChevronDown('selector-chevron'));
  setLeadingIcon('#btnNewProtocol', iconFilePlus2);
  setLeadingIcon('#btnImportJamieSidebar', iconFileInput);
  setLeadingIcon('.sidebar-search', iconFileSearch2);
  setLeadingIcon('#btnSeriesToggle', iconLayers);
  setOnlyIcon('#btnSidebarSearchClear', iconX);
  setOnlyIcon('#btnCloseTrash', iconX);
  setLeadingIcon('#btnTrash', iconTrash);

  // Toolbar
  setLeadingIcon('#btnAddChapter', iconCirclePlus);
  setLeadingIcon('#btnAddSubchapter', iconCirclePlus);
  setLeadingIcon('#btnAddTopic', iconCirclePlus);
  setLeadingIcon('#btnAddPoint', iconListPlus);
  setOnlyIcon('#btnChapterFilter', iconEye);
  setOnlyIcon('#btnPointFilter', iconFilter);
  setOnlyIcon('#btnReload', iconRefreshCw);
  setLeadingIcon('#btnExportPdf', iconFileText);
  setLeadingIcon('#btnExportMd', iconFileText);
  setOnlyIcon('#btnDeleteProtocol', iconShredder);
  setLeadingIcon('.toolbar-search-wrap', iconSearch);
  setOnlyIcon('#searchBarPrev', iconChevronUp);
  setOnlyIcon('#searchBarNext', iconChevronDown);

  // Section headers / controls
  setLeadingIcon('#sectionParticipants .proto-card-header', iconUsers);
  setLeadingIcon('#sectionAttachments .proto-card-header', iconPaperclip);
  setLeadingIcon('#sectionAuthor .proto-card-header', iconPenLine);
  setLeadingIcon('#sectionLegend .proto-card-header', iconBookOpen);
  setOnlyIcon('#btnAddParticipant', iconUserPlus);
  setOnlyIcon('#btnCollapseAll', iconChevronsDown);
  setOnlyIcon('#btnAuthorDatePicker', iconCalendar);

  // Modals / dialog controls
  setAllOnlyIcons('.modal-close', iconX);
  setLeadingIcon('#btnExportBeforeDelete', iconDownload);
  setLeadingIcon('#btnExportBeforeClose', iconDownload);
  setLeadingIcon('#jamieFileDrop', iconDownload);
}

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
  // Neues UI: Projekt-Selector Dropdown mit Buttons
  const list = document.getElementById('projectSelectorList');
  if (!list) return;
  list.innerHTML = '';
  App.projects.forEach(p => {
    const btn = document.createElement('button');
    btn.className   = 'project-selector-item';
    btn.dataset.id  = p.id;
    btn.textContent = (p.code ? p.code + ' - ' : '') + (p.name || p.id);
    if (p.id === App.currentProjectId) btn.style.fontWeight = '700';
    btn.addEventListener('click', async () => {
      document.getElementById('projectSelectorPanel').classList.add('hidden');
      await selectProject(p.id);
    });
    list.appendChild(btn);
  });
}

function _projectCodeLabel(project) {
  const raw = String(project?.code || '').toUpperCase();
  const normalized = raw.replace(/[^A-Z]/g, '').slice(0, 4);
  return normalized || 'Projekt w\u00e4hlen...';
}

async function selectProject(projectId) {
  App.currentProjectId = projectId;
  localStorage.setItem('lastProjectId', projectId);
  const project = App.projects.find(p => p.id === projectId);
  if (project) {
    // Neues UI: Label im Projekt-Selector aktualisieren
    const label = document.getElementById('projectSelectorLabel');
    if (label) label.textContent = _projectCodeLabel(project);
  }
  document.getElementById('btnNewProtocol').disabled = false;
  document.getElementById('btnImportJamieSidebar').disabled = false;
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
    container.innerHTML = '<div class="empty-state-sidebar"><p>Kein Projekt ausgewaehlt.</p></div>';
    _syncSeriesToggleButton(false);
    return;
  }
  if (App.protocols.length === 0) {
    container.innerHTML = '<div class="empty-state-sidebar"><p>Noch keine Protokolle vorhanden.</p></div>';
    _syncSeriesToggleButton(false);
    return;
  }

  // [cleanup]
  const seriesMap = {};
  const singleDocs = [];
  App.protocols.forEach(p => {
    if (p.type === 'Aktennotiz') { singleDocs.push(p); return; }
    const key = p.seriesId || ('type:' + p.type);
    if (!seriesMap[key]) seriesMap[key] = [];
    seriesMap[key].push(p);
  });

  // [cleanup]
  const terminMap = {};
  Object.entries(seriesMap).forEach(([key, protos]) => {
    if (protos.length > 1) terminMap[key] = protos;
    else singleDocs.push(protos[0]);
  });

  Object.values(terminMap).forEach(arr => arr.sort((a, b) => b.number - a.number));
  singleDocs.sort((a, b) => (b.date||'') > (a.date||'') ? 1 : -1);
  const terminList = Object.entries(terminMap).sort(([, a], [, b]) =>
    (b[0].date||'') > (a[0].date||'') ? 1 : -1);

  const chevronSvg = iconChevronDown();

  _syncSeriesToggleButton(terminList.length > 0);

  /* [cleanup] */
  if (terminList.length > 0 && !App.collapsedSeriesSectionAll) {
    const tsSection = document.createElement('div');
    tsSection.className = 'sidebar-section';

    terminList.forEach(([seriesKey, protos]) => {
      const sName = protos[0].seriesName || protos[0].title || protos[0].type;
      const isCollapsed = App.collapsedSeriesIds.has(seriesKey);
      const isSelected  = App.selectedSeriesId === seriesKey;

      const group = document.createElement('div');
      group.className = 'series-group' + (isCollapsed ? ' is-collapsed' : '');
      group.dataset.seriesKey = seriesKey;

      const hdr = document.createElement('div');
      hdr.className = 'series-header' + (isSelected ? ' selected' : '');
      hdr.setAttribute('role', 'button');
      hdr.tabIndex = 0;
      hdr.setAttribute('aria-label', `Serie ${sName} auswÃ¤hlen`);
      hdr.innerHTML = `
        <span class="series-label" title="${esc(sName)}">${esc(sName)}</span>
        <button class="series-collapse-btn" title="Ein-/Ausklappen" aria-label="Serie ein- oder ausklappen" aria-expanded="${!isCollapsed}">${chevronSvg}</button>`;
      const toggleSeriesBody = () => {
        App.collapsedSeriesIds.has(seriesKey)
          ? App.collapsedSeriesIds.delete(seriesKey)
          : App.collapsedSeriesIds.add(seriesKey);
        const collapsed = App.collapsedSeriesIds.has(seriesKey);
        group.classList.toggle('is-collapsed', collapsed);
        const collapseBtn = hdr.querySelector('.series-collapse-btn');
        if (collapseBtn) collapseBtn.setAttribute('aria-expanded', String(!collapsed));
      };
      hdr.addEventListener('click', (e) => {
        e.preventDefault();
        toggleSeriesBody();
        App.selectedSeriesId = seriesKey;
        document.querySelectorAll('.series-header').forEach(h => h.classList.remove('selected'));
        hdr.classList.add('selected');
      });
      hdr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          hdr.click();
        }
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

  /* [cleanup] */
  if (singleDocs.length > 0) {
    const sdSection = document.createElement('div');
    sdSection.className = 'sidebar-section sidebar-single-docs';

    const sdToggle = document.createElement('button');
    sdToggle.type = 'button';
    sdToggle.className = 'btn-sidebar-action btn-series-toggle btn-list-section-toggle';
    sdToggle.setAttribute('aria-expanded', String(!App.singleDocSectionCollapsed));
    sdToggle.innerHTML = `
      ${iconStickyNote()}
      <span class="series-toggle-label">Einzeldokumente</span>
      <span class="series-toggle-chevron-wrap" aria-hidden="true">${iconChevronDown('series-toggle-chevron' + (App.singleDocSectionCollapsed ? ' is-collapsed' : ''))}</span>
    `;
    sdToggle.addEventListener('click', () => {
      App.singleDocSectionCollapsed = !App.singleDocSectionCollapsed;
      renderProtocolList();
    });
    sdSection.appendChild(sdToggle);

    if (!App.singleDocSectionCollapsed) {
      const sdBody = document.createElement('div');
      sdBody.className = 'sidebar-section-body';
      singleDocs.forEach(p => sdBody.appendChild(_buildProtocolItem(p)));
      sdSection.appendChild(sdBody);
    }
    container.appendChild(sdSection);
  }
}

function _syncSeriesToggleButton(hasSeries) {
  const btn = document.getElementById('btnSeriesToggle');
  const chevron = document.getElementById('seriesToggleChevron');
  if (!btn || !chevron) return;

  btn.classList.toggle('hidden', !hasSeries);
  btn.setAttribute('aria-expanded', String(!App.collapsedSeriesSectionAll));
  chevron.innerHTML = iconChevronDown('series-toggle-chevron' + (App.collapsedSeriesSectionAll ? ' is-collapsed' : ''));
}

function _buildProtocolItem(proto) {
  const item = document.createElement('div');
  item.className = 'protocol-item' + (proto.id === App.currentProtocolId ? ' active' : '');
  item.dataset.id = proto.id;

  const dateStr = proto.date
    ? new Date(proto.date + 'T12:00:00').toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })
    : '-';
  const hasFiles = (proto.attachments||[]).some(a => a.fileName);
  const clipHtml = hasFiles ? `<span class="protocol-item-clip" title="Enthaelt Datei-Anlagen">${iconPaperclip()}</span>` : '';

  const sName = esc(proto.seriesName || proto.title || proto.type);
  const label = proto.type === 'Aktennotiz'
    ? `${sName}${clipHtml}`
    : `${sName}\u202FNr.\u202F${String(proto.number || 1).padStart(2,'0')}${clipHtml}`;

  const main = document.createElement('div');
  main.className = 'protocol-item-main';
  main.setAttribute('role', 'button');
  main.tabIndex = 0;
  main.setAttribute('aria-label', `Protokoll ${proto.seriesName || proto.title || proto.type} Ã¶ffnen`);
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
  main.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      main.click();
    }
  });

  const actionsDiv = main.querySelector('.protocol-item-actions');

  const dupBtn = document.createElement('button');
  dupBtn.type = 'button'; dupBtn.className = 'protocol-item-dup-btn'; dupBtn.title = 'Duplizieren';
  dupBtn.innerHTML = iconCopy();
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
    if (!(await appConfirm(`Obacht!\n\n"${lbl}" in den Papierkorb verschieben?\n\nAlle Punkte bleiben gespeichert.`, {
      title: 'In Papierkorb verschieben',
      confirmLabel: 'Verschieben',
      danger: true,
    }))) return;
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
   PROTOKOLL OEFFNEN
============================================================ */
async function openProtocol(protocolId) {
  if (Search.active) closeSearch();
  App.currentProtocolId = protocolId;
  App.selectedRow = null;
  App.collapsedSections = new Set();
  App.allCollapsed = false;
  localStorage.setItem('lastProtocolId', protocolId);
  // [cleanup]
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
  syncCollapseAllButtonState();

}

function renderProtocol(protocol) {
  const isAk = protocol.type === 'Aktennotiz';
  document.getElementById('workspace').classList.toggle('is-aktennotiz', isAk);

  const project = App.projects.find(p => p.id === protocol.projectId);
  if (project) {
    document.getElementById('projectBadge').textContent = project.code;
    document.getElementById('fieldProjectName').value   = project.name || '';
  }
  const fieldTitle = document.getElementById('fieldTitle');
  fieldTitle.textContent  = protocol.seriesName || protocol.title || '';
  fieldTitle.dataset.placeholder = isAk ? 'Betreff ...' : 'Protokolltitel ...';
  // Serientitel sperren bei Folgeprotokollen (number > 1)
  const isFollowup = !isAk && protocol.number > 1;
  fieldTitle.contentEditable = isFollowup ? 'false' : 'true';
  fieldTitle.classList.toggle('field-locked', isFollowup);
  fieldTitle.title = isFollowup ? 'Serienname wird im ersten Protokoll festgelegt' : '';
  document.getElementById('fieldNumber').textContent = protocol.type === 'Aktennotiz'
    ? '-' : String(protocol.number || 1).padStart(2,'0');
  document.getElementById('fieldDate').value         = protocol.date       || '';
  document.getElementById('fieldTime').value         = protocol.time       || '';
  document.getElementById('fieldLocation').value     = protocol.location   || '';
  document.getElementById('fieldTenant').value       = protocol.tenant     || '';
  document.getElementById('fieldLandlord').value     = protocol.landlord   || '';

  // Aufgestellt-Block
  const author = protocol.author || {};
  const fallbackName = [author.firstName || 'Olaf', author.lastName || 'Schueler'].join(' ').trim();
  document.getElementById('fieldAuthorName').value      = author.name      ?? fallbackName;
  document.getElementById('fieldAuthorCompany').value   = author.company   ?? 'Hopro GmbH & Co. KG';
  document.getElementById('fieldAuthorDate').value      = author.date      ?? '';
  document.getElementById('fieldAuthorSeen').value      = author.seen      ?? '';

  // [cleanup]
  // Altes UI hatte .section-title, neues UI hat .proto-card-header span
  const pointsTitle = document.querySelector('#sectionPoints .section-title') ||
                      document.querySelector('#sectionPoints .proto-card-header span:last-child');
  if (pointsTitle) pointsTitle.textContent = 'INHALTE';

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

  // Cleanup document-Listener vom vorherigen Render
  if (renderParticipants._ac) renderParticipants._ac.abort();
  const ac = renderParticipants._ac = new AbortController();
  document.addEventListener('mouseup',  () => tbody.querySelectorAll('.pg-row').forEach(r => r.draggable = false), { signal: ac.signal });
  document.addEventListener('touchend', () => tbody.querySelectorAll('.pg-row').forEach(r => r.draggable = false), { signal: ac.signal });

  participants.forEach((p, idx) => {
    const tr = document.createElement('div');
    tr.className = 'pg-row' + (idx % 2 === 0 ? ' pg-row-odd' : '');
    tr.dataset.idx = idx;
    tr.draggable = false;
    tr.innerHTML = `
      <div class="pg-col-drag" title="Verschieben">${iconGrip()}</div>
      <div class="pg-col-name"><input class="table-input" value="${esc(p.name)}" data-field="name" /></div>
      <div class="pg-col-company"><input class="table-input" value="${esc(p.company)}" data-field="company" /></div>
      <div class="pg-col-abbr"><input class="table-input input-uppercase" value="${esc(p.abbr)}"    data-field="abbr" maxlength="4"/></div>
      <div class="pg-col-email"><input class="table-input" type="email" value="${esc(p.email)}" data-field="email"/></div>
      <div class="pg-col-check pg-check-btn" data-field="attended"  data-checked="${p.attended  ?'1':''}">${p.attended  ? iconSquareCheckBig() : iconSquare()}</div>
      <div class="pg-col-check pg-check-btn" data-field="inDistrib" data-checked="${p.inDistrib ?'1':''}">${p.inDistrib ? iconSquareCheckBig() : iconSquare()}</div>
      <div class="pg-col-action"><button class="btn-delete-row" data-action="deleteParticipant" data-idx="${idx}" title="Entfernen">${iconTrash()}</button></div>
    `;
    tr.querySelectorAll('input').forEach(el => el.addEventListener('change', saveCurrentProtocol));
    tr.querySelectorAll('.pg-check-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const checked = btn.dataset.checked === '1';
        btn.dataset.checked = checked ? '' : '1';
        btn.innerHTML = checked ? iconSquare() : iconSquareCheckBig();
        saveCurrentProtocol();
      });
    });
    // Soft email validation
    const emailInput = tr.querySelector('[data-field="email"]');
    if (emailInput) {
      const checkEmail = () => {
        const v = emailInput.value.trim();
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
        emailInput.classList.toggle('email-warn', v.length > 0 && !valid);
      };
      emailInput.addEventListener('input', checkEmail);
      checkEmail();
    }

    // [cleanup]
    const handle = tr.querySelector('.pg-col-drag');
    handle.addEventListener('mousedown',  () => { tr.draggable = true; App._dragType = 'participant'; });
    handle.addEventListener('touchstart', () => { tr.draggable = true; App._dragType = 'participant'; }, { passive: true });

    tr.addEventListener('dragstart', e => {
      if (App._dragType !== 'participant') { e.preventDefault(); return; }
      e.dataTransfer.setData('text/plain', String(idx));
      e.dataTransfer.setData('application/x-participant', '1');
      e.dataTransfer.effectAllowed = 'move';
      tr.classList.add('drag-active');
    });

    tr.addEventListener('dragover', e => {
      if (App._dragType !== 'participant') return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
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
      if (App._dragType !== 'participant') return;
      const draggedIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const targetIdx  = idx;
      if (draggedIdx === targetIdx || isNaN(draggedIdx)) return;

      // [cleanup]
      // [cleanup]
      const currentParticipants = getParticipantsFromDOM();

      const protocol = await DB.Protocols.get(App.currentProtocolId);
      if (!protocol) return;

      // Neue Reihenfolge berechnen
      const reordered = [...currentParticipants];
      const [moved] = reordered.splice(draggedIdx, 1);
      const rect = tr.getBoundingClientRect();
      let insertIdx = targetIdx > draggedIdx ? targetIdx - 1 : targetIdx;
      if (e.clientY >= rect.top + rect.height / 2) insertIdx++;
      reordered.splice(insertIdx, 0, moved);

      protocol.participants = reordered;
      await DB.Protocols.save(protocol);
      renderParticipants(protocol.participants);
      renderAbbrevList(protocol.participants, protocol.customAbbreviations || []);
      showToast('Teilnehmer verschoben.', 'success');
    });

    tr.addEventListener('dragend', () => {
      tr.classList.remove('drag-active');
      App._dragType = null;
      tbody.querySelectorAll('.pg-row').forEach(r => r.classList.remove('drag-over-top', 'drag-over-bottom'));
    });

    tbody.appendChild(tr);
  });
}

function getParticipantsFromDOM() {
  return Array.from(document.querySelectorAll('#participantsBody .pg-row')).map(row => ({
    name:      row.querySelector('[data-field="name"]')?.value    || '',
    company:   row.querySelector('[data-field="company"]')?.value || '',
    abbr:      (row.querySelector('[data-field="abbr"]')?.value   || '').toUpperCase(),
    email:     row.querySelector('[data-field="email"]')?.value   || '',
    attended:  (row.querySelector('[data-field="attended"]')?.dataset.checked  === '1') ?? true,
    inDistrib: (row.querySelector('[data-field="inDistrib"]')?.dataset.checked === '1') ?? true,
  }));
}

/**
 * [cleanup]
 * mit den aktuell vorhandenen Teilnehmern.
 * [cleanup]
 */
function updateResponsibleDropdowns() {
  // [cleanup]
  // [cleanup]
  // [cleanup]
  const p = getParticipantsFromDOM();
  const customs = getCustomAbbreviationsFromDOM();
  renderAbbrevList(p, customs);
}

/* ============================================================
   MULTI-SELECT ZUSTAENDIG
============================================================ */

/**
 * [cleanup]
 * [cleanup]
 * [cleanup]
 */
function createResponsibleSelect(currentValue, disabled) {
  const wrap = document.createElement('div');
  wrap.className = 'resp-select' + (disabled ? ' resp-disabled' : '');
  wrap.dataset.field = 'responsible';
  wrap.dataset.value = currentValue || '';

  const display = currentValue ? currentValue : '-';

  const trigger = document.createElement('button');
  trigger.type      = 'button';
  trigger.className = 'resp-trigger';
  trigger.disabled  = !!disabled;
  trigger.innerHTML = `
    <span class="resp-display">${esc(display)}</span>
    ${iconChevronDown('resp-chevron')}`;

  const panel = document.createElement('div');
  panel.className = 'resp-panel hidden';

  const optsDiv = document.createElement('div');
  optsDiv.className = 'resp-options';

  const footer = document.createElement('div');
  footer.className = 'resp-footer';

  const okBtn   = document.createElement('button');
  okBtn.type = 'button';   okBtn.className = 'resp-ok-btn';   okBtn.textContent = 'OK';
  footer.appendChild(okBtn);

  panel.appendChild(optsDiv);
  panel.appendChild(footer);
  wrap.appendChild(trigger);
  wrap.appendChild(panel);

  // [cleanup]
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    // [cleanup]
    document.querySelectorAll('.resp-panel:not(.hidden)').forEach(p => {
      if (p !== panel) { p.classList.add('hidden'); p.previousElementSibling?.classList.remove('open'); }
    });

    const opening = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !opening);
    trigger.classList.toggle('open', opening);

    if (opening) {
      // [cleanup]
      const isAk = document.getElementById('workspace').classList.contains('is-aktennotiz');
      const abbrevList = [...new Set(
        getParticipantsFromDOM().map(p => isAk ? p.company : p.abbr).filter(Boolean)
      )];
      const selected = (wrap.dataset.value || '').split('/').filter(Boolean);

      optsDiv.innerHTML = '';
      if (abbrevList.length === 0) {
        optsDiv.innerHTML = '<div class="resp-empty-note">Keine Teilnehmer erfasst.</div>';
      } else {
        abbrevList.forEach(abbr => {
          const lbl = document.createElement('label');
          lbl.className = 'resp-option';
          const cb = document.createElement('input');
          cb.type = 'checkbox'; cb.value = abbr; cb.checked = selected.includes(abbr);
          const check = document.createElement('span');
          check.className = 'resp-option-check';
          check.innerHTML = cb.checked ? iconSquareCheckBig() : iconSquare();
          cb.addEventListener('change', () => {
            check.innerHTML = cb.checked ? iconSquareCheckBig() : iconSquare();
          });
          lbl.appendChild(cb);
          lbl.appendChild(check);
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

  // [cleanup]
  function commit() {
    const vals = Array.from(panel.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.value);
    const joined = vals.join('/');
    wrap.dataset.value = joined;
    trigger.querySelector('.resp-display').textContent = vals.length ? joined : '-';
    panel.classList.add('hidden');
    trigger.classList.remove('open');
    saveCurrentProtocol();
  }

  okBtn.addEventListener('click',    (e) => { e.stopPropagation(); commit(); });

  return wrap;
}

function createCategorySelect(currentValue) {
  const wrap = document.createElement('div');
  wrap.className = 'cat-select';

  const hidden = document.createElement('input');
  hidden.type = 'hidden';
  hidden.dataset.field = 'category';
  hidden.value = currentValue || 'Aufgabe';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'cat-trigger';
  trigger.innerHTML = `
    <span class="cat-display">${esc(hidden.value)}</span>
    ${iconChevronDown('cat-chevron')}`;

  const panel = document.createElement('div');
  panel.className = 'cat-panel hidden';
  const options = ['Aufgabe', 'Info', 'Festlegung', 'Freigabe erfordl'];
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cat-option';
    btn.textContent = opt;
    if (opt === hidden.value) btn.classList.add('is-active');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      hidden.value = opt;
      trigger.querySelector('.cat-display').textContent = opt;
      panel.querySelectorAll('.cat-option').forEach(b => b.classList.toggle('is-active', b.textContent === opt));
      panel.classList.add('hidden');
      trigger.classList.remove('open');
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
    });
    panel.appendChild(btn);
  });

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.cat-panel:not(.hidden)').forEach(p => {
      if (p !== panel) {
        p.classList.add('hidden');
        p.previousElementSibling?.classList.remove('open');
      }
    });
    const opening = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !opening);
    trigger.classList.toggle('open', opening);
  });

  wrap.appendChild(hidden);
  wrap.appendChild(trigger);
  wrap.appendChild(panel);
  return wrap;
}

/* [cleanup] */
function setResponsibleDisabled(tr, disabled) {
  const wrap = tr.querySelector('.resp-select');
  if (!wrap) return;
  const trigger = wrap.querySelector('.resp-trigger');
  if (disabled) {
    wrap.classList.add('resp-disabled');
    if (trigger) trigger.disabled = true;
    wrap.dataset.value = '';
    const disp = wrap.querySelector('.resp-display');
    if (disp) disp.textContent = '-';
    // [cleanup]
    wrap.querySelector('.resp-panel')?.classList.add('hidden');
  } else {
    wrap.classList.remove('resp-disabled');
    if (trigger) trigger.disabled = false;
  }
}

/* [cleanup] */
function setTerminDisabled(tr, disabled) {
  const terminInput = tr.querySelector('.termin-input');
  const calBtn      = tr.querySelector('.termin-cal-btn');
  if (terminInput) terminInput.disabled = disabled;
  if (calBtn)      calBtn.disabled      = disabled;
}

/* [cleanup] */
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
   PROTOKOLLPUNKTE - RENDERING
============================================================ */
function renderPoints(protocol) {
  const tbody = document.getElementById('pointsBody');
  tbody.innerHTML = '';
  // Cleanup document-Listener vom vorherigen Render (verhindert Listener-Leaks)
  if (renderPoints._ac) renderPoints._ac.abort();
  const ac = renderPoints._ac = new AbortController();

  const structure  = protocol.structure || DB.getDefaultStructure(protocol.type);
  const points     = protocol.points    || [];

  const isAk = protocol.type === 'Aktennotiz';
  // [cleanup]
  let akSectionNum = 0;

  Object.entries(structure).forEach(([chKey, chapter]) => {
    const chCollId    = 'chapter-' + chKey;
    const chCollapsed = App.collapsedSections.has(chCollId);

    // [cleanup]
    const chRow = document.createElement('tr');
    chRow.className = 'row-chapter';
    chRow.dataset.type       = 'chapter';
    chRow.dataset.chapter    = chKey;
    chRow.dataset.collapseId = chCollId;

    let chLabelHtml, chDelBtn;

    if (isAk) {
      // Aktennotiz: P/N fix, A-Abschnitte nummeriert + editierbar
      const isFixed = chKey === 'P' || chKey === 'N';
      const akSectionKeys = Object.keys(structure).filter(k => k !== 'P' && k !== 'N');
      const canDelete = !isFixed && akSectionKeys.length > 1;

      if (!isFixed) {
        akSectionNum++;
        chLabelHtml = `<span class="ak-section-num">${akSectionNum}.</span>
          <span class="ak-section-label" contenteditable="true"
                data-chapter="${chKey}" data-field="chapterLabel">${esc(chapter.label)}</span>`;
      } else {
        chLabelHtml = `<span>${esc(chapter.label)}</span>`;
      }

      chDelBtn = canDelete
        ? `<button class="btn-delete-row btn-delete-chapter" data-action="deleteChapter"
            data-chapter="${chKey}" title="Abschnitt lÃ¶schen">${iconTrash()}</button>`
        : '';
    } else {
      // [cleanup]
      const isUserChapter = !DEFAULT_CHAPTERS.includes(chKey);
      if (isUserChapter) {
        chLabelHtml = `<span class="structure-label-group"><span>${chKey} - </span><span class="editable-label" contenteditable="true"
          data-chapter="${chKey}" data-field="chapterLabel">${esc(chapter.label)}</span></span>`;
      } else {
        chLabelHtml = `<span>${chKey} - ${esc(chapter.label)}</span>`;
      }
      chDelBtn = isUserChapter
        ? `<button class="btn-delete-row btn-delete-chapter" data-action="deleteChapter"
            data-chapter="${chKey}" title="Kapitel lÃ¶schen">${iconTrash()}</button>`
        : '';
    }

    chRow.innerHTML = `
      <td>
        <button class="collapse-btn${chCollapsed?' is-collapsed':''}"
                data-collapse-id="${chCollId}" title="Ein-/Ausklappen">
          ${iconChevronDown()}
        </button>
      </td>
      <td colspan="7">
        <div class="structure-label-cell">
          ${chLabelHtml}
          ${chDelBtn}
        </div>
      </td>
    `;

    // [cleanup]
    if (isAk) {
      const labelSpan = chRow.querySelector('.ak-section-label');
      if (labelSpan) {
        labelSpan.addEventListener('blur', async () => {
          const newLabel = labelSpan.textContent.trim();
          if (!newLabel) { labelSpan.textContent = chapter.label; return; }
          await saveCurrentProtocol();
          const proto = await DB.Protocols.get(App.currentProtocolId);
          if (proto && proto.structure[chKey]) {
            proto.structure[chKey].label = newLabel;
            await DB.Protocols.save(proto);
          }
        });
        labelSpan.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); labelSpan.blur(); }
        });
      }
    }

    // [cleanup]
    if (!isAk) {
      const editLabel = chRow.querySelector('.editable-label[data-field="chapterLabel"]');
      if (editLabel) {
        editLabel.addEventListener('blur', async () => {
          const newLabel = editLabel.textContent.trim();
          if (!newLabel) { editLabel.textContent = chapter.label; return; }
          await saveCurrentProtocol();
          const proto = await DB.Protocols.get(App.currentProtocolId);
          if (proto && proto.structure[chKey]) {
            proto.structure[chKey].label = newLabel;
            await DB.Protocols.save(proto);
          }
        });
        editLabel.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); editLabel.blur(); }
        });
      }
    }

    addRowClick(chRow, { type:'chapter', chapterKey:chKey, label: isAk ? chapter.label : `Kapitel ${chKey}` });
    tbody.appendChild(chRow);

    // Direkte Punkte ohne Unterkapitel
    let akPointSeq = 0;
    points.filter(pt => pt.chapter === chKey && !pt.subchapter).forEach(pt => {
      const row = createPointRow(pt, protocol.number, chKey, null, null, ac.signal);
      // Aktennotiz: Anzeige-ID dynamisch berechnen
      if (isAk) {
        akPointSeq++;
        const prefix = chKey === 'P' ? 'P' : chKey === 'N' ? 'N' : String(akSectionNum);
        const displayId = `${prefix}.${String(akPointSeq).padStart(2,'0')}`;
        const idSpan = row.querySelector('.point-id');
        if (idSpan) idSpan.textContent = displayId;
      }
      if (chCollapsed) row.classList.add('row-hidden');
      tbody.appendChild(row);
    });

    // [cleanup]
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
      subRow.draggable = false;
      if (hideRow) subRow.classList.add('row-hidden');

      // [cleanup]
      const delBtn = `<button class="btn-delete-row" data-action="deleteSubchapter"
        data-chapter="${chKey}" data-subchapter="${esc(sub.id)}"
        title="Unterkapitel lÃ¶schen">${iconTrash()}</button>`;

      subRow.innerHTML = `
        <td>
          <button class="collapse-btn${subCollapsed?' is-collapsed':''}"
                  data-collapse-id="${subCollId}" title="Ein-/Ausklappen">
            ${iconChevronDown()}
          </button>
        </td>
        <td colspan="7">
          <div class="structure-label-cell">
            <span class="structure-label-group"><span>${esc(sub.id)} </span><span class="editable-label" contenteditable="true"
              data-chapter="${chKey}" data-subchapter="${esc(sub.id)}"
              data-field="subchapterLabel">${esc(sub.label)}</span></span>
            <span class="structure-actions">
              ${delBtn}
              <span class="drag-handle sub-drag-handle" title="Unterkapitel verschieben">${iconGrip()}</span>
            </span>
          </div>
        </td>
      `;
      // [cleanup]
      const subLabel = subRow.querySelector('.editable-label[data-field="subchapterLabel"]');
      if (subLabel) {
        subLabel.addEventListener('blur', async () => {
          const newLabel = subLabel.textContent.trim();
          if (!newLabel) { subLabel.textContent = sub.label; return; }
          await saveCurrentProtocol();
          const proto = await DB.Protocols.get(App.currentProtocolId);
          const ch = proto?.structure[chKey];
          const s = (ch?.subchapters||[]).find(sc => sc.id === sub.id);
          if (s) { s.label = newLabel; await DB.Protocols.save(proto); }
        });
        subLabel.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); subLabel.blur(); }
        });
      }

      // [cleanup]
      const subHandle = subRow.querySelector('.drag-handle');
      let subHandleDown = false;

      subHandle.addEventListener('mousedown',  () => { subHandleDown = true; subRow.draggable = true; });
      subHandle.addEventListener('touchstart', () => { subHandleDown = true; subRow.draggable = true; }, { passive: true });
      document.addEventListener('mouseup',  () => { subHandleDown = false; subRow.draggable = false; }, { signal: ac.signal });
      document.addEventListener('touchend', () => { subHandleDown = false; subRow.draggable = false; }, { signal: ac.signal });

      subRow.addEventListener('dragstart', e => {
        if (!subHandleDown) { e.preventDefault(); return; }
        e.dataTransfer.setData('text/plain', sub.id);
        e.dataTransfer.setData('application/x-dragtype', 'subchapter');
        e.dataTransfer.effectAllowed = 'move';
        subRow.classList.add('drag-active');
        App._dragGroup = chKey;
        App._dragType  = 'subchapter';
        // [cleanup]
        let sib = subRow.nextElementSibling;
        while (sib && sib.dataset.type !== 'subchapter' && sib.dataset.type !== 'chapter') {
          if (sib.dataset.chapter === chKey && sib.dataset.subchapter === sub.id) {
            sib.classList.add('drag-child-hidden');
          }
          sib = sib.nextElementSibling;
        }
      });

      subRow.addEventListener('dragend', () => {
        subRow.classList.remove('drag-active');
        App._dragGroup = null;
        App._dragType  = null;
        document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
          el.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        document.querySelectorAll('.drag-child-hidden').forEach(el => {
          el.classList.remove('drag-child-hidden');
        });
      });

      subRow.addEventListener('dragover', e => {
        if (App._dragType !== 'subchapter' || !App._dragGroup) return;
        if (subRow.dataset.chapter !== App._dragGroup) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = subRow.getBoundingClientRect();
        const mid  = rect.top + rect.height / 2;
        subRow.classList.toggle('drag-over-top',    e.clientY < mid);
        subRow.classList.toggle('drag-over-bottom', e.clientY >= mid);
      });

      subRow.addEventListener('dragleave', () => {
        subRow.classList.remove('drag-over-top', 'drag-over-bottom');
      });

      subRow.addEventListener('drop', async e => {
        e.preventDefault();
        subRow.classList.remove('drag-over-top', 'drag-over-bottom');
        if (App._dragType !== 'subchapter') return;

        const draggedSubId = e.dataTransfer.getData('text/plain');
        if (draggedSubId === sub.id) return;

        await saveCurrentProtocol();
        const proto = await DB.Protocols.get(App.currentProtocolId);
        if (!proto) return;
        const ch = proto.structure[chKey];
        if (!ch?.subchapters) return;

        const fromIdx = ch.subchapters.findIndex(s => s.id === draggedSubId);
        if (fromIdx === -1) return;
        const [movedSub] = ch.subchapters.splice(fromIdx, 1);

        let toIdx = ch.subchapters.findIndex(s => s.id === sub.id);
        if (toIdx === -1) toIdx = ch.subchapters.length;

        const rect = subRow.getBoundingClientRect();
        if (e.clientY >= rect.top + rect.height / 2) toIdx++;

        ch.subchapters.splice(toIdx, 0, movedSub);

        await DB.Protocols.save(proto);
        renderPoints(proto);
        showToast('Unterkapitel verschoben.', 'success');
      });

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
        topicRow.draggable = false;
        if (hideChildren) topicRow.classList.add('row-hidden');

        const topicDelBtn = `<button class="btn-delete-row" data-action="deleteTopic"
          data-chapter="${chKey}" data-subchapter="${esc(sub.id)}" data-topic="${esc(topic.id)}"
          data-topic-label="${esc(topic.label)}"
          title="Thema lÃ¶schen">${iconTrash()}</button>`;

        topicRow.innerHTML = `
          <td><span class="drag-handle" title="Thema verschieben">${iconGrip()}</span></td>
          <td colspan="7">
            <div class="structure-label-cell">
              <span class="topic-label editable-label" contenteditable="true"
                data-chapter="${chKey}" data-subchapter="${esc(sub.id)}"
                data-topic="${esc(topic.id)}" data-field="topicLabel">${esc(topic.label)}</span>
              ${topicDelBtn}
            </div>
          </td>
        `;
        // [cleanup]
        const topicLabel = topicRow.querySelector('.editable-label[data-field="topicLabel"]');
        if (topicLabel) {
          topicLabel.addEventListener('blur', async () => {
            const newLabel = topicLabel.textContent.trim();
            if (!newLabel) { topicLabel.textContent = topic.label; return; }
            await saveCurrentProtocol();
            const proto = await DB.Protocols.get(App.currentProtocolId);
            const ch = proto?.structure[chKey];
            const s = (ch?.subchapters||[]).find(sc => sc.id === sub.id);
            const t = (s?.topics||[]).find(tp => tp.id === topic.id);
            if (t) { t.label = newLabel; await DB.Protocols.save(proto); }
          });
          topicLabel.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); topicLabel.blur(); }
          });
        }

        // [cleanup]
        const topicHandle = topicRow.querySelector('.drag-handle');
        let topicHandleDown = false;

        topicHandle.addEventListener('mousedown',  () => { topicHandleDown = true; topicRow.draggable = true; });
        topicHandle.addEventListener('touchstart', () => { topicHandleDown = true; topicRow.draggable = true; }, { passive: true });
        document.addEventListener('mouseup',  () => { topicHandleDown = false; topicRow.draggable = false; }, { signal: ac.signal });
        document.addEventListener('touchend', () => { topicHandleDown = false; topicRow.draggable = false; }, { signal: ac.signal });

        topicRow.addEventListener('dragstart', e => {
          if (!topicHandleDown) { e.preventDefault(); return; }
          const group = [chKey, sub.id].join('|');
          e.dataTransfer.setData('text/plain', topic.id);
          e.dataTransfer.setData('application/x-group', group);
          e.dataTransfer.setData('application/x-dragtype', 'topic');
          e.dataTransfer.effectAllowed = 'move';
          topicRow.classList.add('drag-active');
          App._dragGroup = group;
          App._dragType  = 'topic';
          // [cleanup]
          let sib = topicRow.nextElementSibling;
          while (sib && sib.dataset.type === 'point' && sib.dataset.topic === topic.id) {
            sib.classList.add('drag-child-hidden');
            sib = sib.nextElementSibling;
          }
        });

        topicRow.addEventListener('dragend', () => {
          topicRow.classList.remove('drag-active');
          App._dragGroup = null;
          App._dragType  = null;
          document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
            el.classList.remove('drag-over-top', 'drag-over-bottom');
          });
          document.querySelectorAll('.drag-child-hidden').forEach(el => {
            el.classList.remove('drag-child-hidden');
          });
        });

        topicRow.addEventListener('dragover', e => {
          if (App._dragType !== 'topic' || !App._dragGroup) return;
          const myGroup = [topicRow.dataset.chapter, topicRow.dataset.subchapter].join('|');
          if (myGroup !== App._dragGroup) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          const rect = topicRow.getBoundingClientRect();
          const mid  = rect.top + rect.height / 2;
          topicRow.classList.toggle('drag-over-top',    e.clientY < mid);
          topicRow.classList.toggle('drag-over-bottom', e.clientY >= mid);
        });

        topicRow.addEventListener('dragleave', () => {
          topicRow.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        topicRow.addEventListener('drop', async e => {
          e.preventDefault();
          topicRow.classList.remove('drag-over-top', 'drag-over-bottom');
          if (App._dragType !== 'topic') return;

          const draggedTopicId = e.dataTransfer.getData('text/plain');
          if (draggedTopicId === topic.id) return;

          await saveCurrentProtocol();
          const proto = await DB.Protocols.get(App.currentProtocolId);
          if (!proto) return;
          const ch = proto.structure[chKey];
          const s = (ch?.subchapters || []).find(sc => sc.id === sub.id);
          if (!s?.topics) return;

          const fromIdx = s.topics.findIndex(t => t.id === draggedTopicId);
          if (fromIdx === -1) return;
          const [movedTopic] = s.topics.splice(fromIdx, 1);

          let toIdx = s.topics.findIndex(t => t.id === topic.id);
          if (toIdx === -1) toIdx = s.topics.length;

          const rect = topicRow.getBoundingClientRect();
          if (e.clientY >= rect.top + rect.height / 2) toIdx++;

          s.topics.splice(toIdx, 0, movedTopic);

          await DB.Protocols.save(proto);
          renderPoints(proto);
          showToast('Thema verschoben.', 'success');
        });

        addRowClick(topicRow, {
          type:'topic', chapterKey:chKey, subchapterId:sub.id,
          topicId:topic.id, label:`Thema: ${topic.label}`
        });
        tbody.appendChild(topicRow);

        // Punkte unter Thema
        points
          .filter(pt => pt.chapter===chKey && pt.subchapter===sub.id && pt.topic===topic.id)
          .forEach(pt => {
            const row = createPointRow(pt, protocol.number, chKey, sub.id, topic.id, ac.signal);
            if (hideChildren) row.classList.add('row-hidden');
            tbody.appendChild(row);
          });
      });

      // Punkte ohne Thema im Unterkapitel
      points
        .filter(pt => pt.chapter===chKey && pt.subchapter===sub.id && !pt.topic)
        .forEach(pt => {
          const row = createPointRow(pt, protocol.number, chKey, sub.id, null, ac.signal);
          if (hideChildren) row.classList.add('row-hidden');
          tbody.appendChild(row);
        });
    });
  });

  autoResizeAll();
  applyPointFilters();
  applyChapterFilter();
  syncSelectionAfterRender();
  syncCollapseAllButtonState();
}

/* [cleanup] */
function createPointRow(point, currentNum, chKey, subId, topicId, renderSignal) {
  const tr = document.createElement('tr');
  tr.className = 'row-point';
  tr.dataset.pointId  = point.id;
  tr.dataset.type     = 'point';
  tr.dataset.chapter  = chKey;
  if (subId)   tr.dataset.subchapter = subId;
  if (topicId) tr.dataset.topic      = topicId;

  if (point.done)  tr.classList.add('point-done');
  if (point.isNew) tr.classList.add('point-new');

  // [cleanup]
  const catVal = point.category === 'Freigabe' ? 'Freigabe erfordl' : (point.category || 'Aufgabe');

  // [cleanup]
  const respDisabled = catVal === 'Info' || catVal === 'Festlegung';
  const respSelect   = createResponsibleSelect(point.responsible || '', respDisabled);

  // [cleanup]
  const snap = point.snapshot || null;
  const contentAmended  = snap && (point.content  || '') !== snap.content;
  const deadlineAmended = snap && (point.deadline || '') !== snap.deadline;

  // draggable erst bei Handle-Mousedown aktivieren (sonst blockiert es Textauswahl in Textareas)
  tr.draggable = false;

  tr.innerHTML = `
    <td><span class="drag-handle" title="Punkt verschieben">${iconGrip()}</span></td>
    <td><span class="point-id">${esc(point.id)}</span></td>
    <td class="content-cell${contentAmended ? ' content-amended' : ''}">
      <textarea class="table-textarea" data-field="content" rows="1"
        placeholder="Inhalt ...">${esc(point.content || '')}</textarea>
    </td>
    <td class="col-category category-cell"></td>
    <td class="resp-cell"></td>
    <td class="deadline-cell${deadlineAmended ? ' deadline-amended' : ''}">
      <div class="termin-wrap">
        <input type="text" class="table-input termin-input" data-field="deadline"
          value="${esc(point.deadline || '')}" placeholder="-" />
        <button type="button" class="termin-cal-btn" title="Kalender Ã¶ffnen">
          ${iconCalendar()}
        </button>
        <input type="date" class="termin-date-hidden" tabindex="-1" aria-hidden="true" />
      </div>
    </td>
    <td class="col-done col-center">
      <div class="point-check-btn" data-field="done" data-checked="${point.done ? '1' : ''}">
        ${point.done ? iconSquareCheckBig() : iconSquare()}
      </div>
    </td>
    <td>
      <button class="btn-delete-row" data-action="deletePoint"
        data-point-id="${point.id}" title="Punkt lÃ¶schen">${iconTrash()}</button>
    </td>
  `;

  tr.querySelector('.category-cell').appendChild(createCategorySelect(catVal));
  // [cleanup]
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
  const doneBtn = tr.querySelector('.point-check-btn[data-field="done"]');
  if (doneBtn) {
    doneBtn.addEventListener('click', () => {
      const checked = doneBtn.dataset.checked === '1';
      doneBtn.dataset.checked = checked ? '' : '1';
      doneBtn.innerHTML = checked ? iconSquare() : iconSquareCheckBig();
      tr.classList.toggle('point-done', !checked);
      selectRow(rowCtx, tr);
      saveCurrentProtocol();
    });
  }

  // [cleanup]
  setupCategoryDisable(tr);

  // [cleanup]
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

  // [cleanup]
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
      const iso = toIsoDate((terminInput.value || '').trim());
      if (iso) hiddenDate.value = iso;
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

    // [cleanup]
    requestAnimationFrame(applyOverdue);
  }

  // [cleanup]
  const handle = tr.querySelector('.drag-handle');
  let handleMouseDown = false;

  handle.addEventListener('mousedown',  () => { handleMouseDown = true; tr.draggable = true; });
  handle.addEventListener('touchstart', () => { handleMouseDown = true; tr.draggable = true; }, { passive: true });
  document.addEventListener('mouseup',  () => { handleMouseDown = false; tr.draggable = false; }, renderSignal ? { signal: renderSignal } : undefined);
  document.addEventListener('touchend', () => { handleMouseDown = false; tr.draggable = false; }, renderSignal ? { signal: renderSignal } : undefined);

  tr.addEventListener('dragstart', e => {
    if (!handleMouseDown) { e.preventDefault(); return; }
    // Gruppenkennung: chapter|subchapter (Topics beeinflussen Nummerierung nicht)
    const group = [chKey, subId || ''].join('|');
    e.dataTransfer.setData('text/plain', point.id);
    e.dataTransfer.setData('application/x-group', group);
    e.dataTransfer.effectAllowed = 'move';
    tr.classList.add('drag-active');
    App._dragGroup = group;
    App._dragType  = 'point';
  });

  tr.addEventListener('dragend', () => {
    tr.classList.remove('drag-active');
    App._dragGroup = null;
    App._dragType  = null;
    document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
  });

  tr.addEventListener('dragover', e => {
    if (App._dragType !== 'point' || !App._dragGroup) return;
    const myGroup = [tr.dataset.chapter, tr.dataset.subchapter || ''].join('|');
    if (myGroup !== App._dragGroup) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // [cleanup]
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
    if (App._dragType !== 'point') return;

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

    // [cleanup]
    let insertIdx = protocol.points.findIndex(p => p.id === targetId);
    if (insertIdx === -1) insertIdx = protocol.points.length;

    // [cleanup]
    const rect = tr.getBoundingClientRect();
    if (e.clientY >= rect.top + rect.height / 2) insertIdx++;

    // [cleanup]
    moved.topic = point.topic || null;

    protocol.points.splice(insertIdx, 0, moved);

    await DB.Protocols.save(protocol);
    renderPoints(protocol);
    showToast('Punkt verschoben.', 'success');
  });

  return tr;
}

/* [cleanup] */
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
  return ''; // KW-Notation etc. -> leer (nicht darstellbar als date-Input)
}

/* [cleanup] */
function autoResize(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

function autoResizeAll() {
  document.querySelectorAll('.table-textarea').forEach(autoResize);
}

/* [cleanup] */
/**
 * [cleanup]
 * [cleanup]
 * [cleanup]
 * Enter auf einer leeren Bullet-Zeile: beendet den Listen-Modus.
 */
function setupBulletPoints(ta) {
  // [cleanup]
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

    // [cleanup]
    const bulletMatch = line.match(/^(\s*)([-*])\s/);
    if (!bulletMatch) return;

    e.preventDefault();

    const lineContent = line.slice(bulletMatch[0].length);

    if (lineContent.trim() === '') {
      // [cleanup]
      const newVal = val.slice(0, lineStart) + val.slice(start);
      ta.value = newVal;
      ta.selectionStart = ta.selectionEnd = lineStart;
    } else {
      // [cleanup]
      const insert = '\n     - ';
      const newVal = val.slice(0, start) + insert + val.slice(start);
      ta.value = newVal;
      ta.selectionStart = ta.selectionEnd = start + insert.length;
    }

    autoResize(ta);
    saveCurrentProtocol();
  });
}

/* [cleanup] */
function addRowClick(row, ctx) {
  row.addEventListener('click', (e) => {
    if (e.target.closest('.collapse-btn') || e.target.closest('.btn-delete-row') || e.target.closest('.btn-delete-structure')) return;
    // [cleanup]
    if (e.target.closest('textarea') || e.target.closest('input') || e.target.closest('select')) return;
    if (e.target.closest('[contenteditable="true"]')) return;
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

function syncSelectionAfterRender() {
  document.querySelectorAll('.row-selected').forEach(r => r.classList.remove('row-selected'));
  const sel = App.selectedRow;
  if (!sel) { updateSelectionHint(); return; }

  let row = null;
  if (sel.type === 'point' && sel.pointId) {
    row = document.querySelector('#pointsBody tr.row-point[data-point-id="' + sel.pointId + '"]');
  } else if (sel.type === 'topic' && sel.topicId) {
    row = document.querySelector('#pointsBody tr.row-topic[data-topic="' + sel.topicId + '"]');
  } else if (sel.type === 'subchapter' && sel.subchapterId) {
    row = document.querySelector('#pointsBody tr.row-subchapter[data-subchapter="' + sel.subchapterId + '"]');
  } else if (sel.type === 'chapter' && sel.chapterKey) {
    row = document.querySelector('#pointsBody tr.row-chapter[data-chapter="' + sel.chapterKey + '"]');
  }

  if (row) {
    row.classList.add('row-selected');
  } else {
    App.selectedRow = null;
  }
  updateSelectionHint();
}


function syncCollapseAllButtonState() {
  const cab = document.getElementById('btnCollapseAll');
  if (!cab) return;
  const sectionIds = Array.from(document.querySelectorAll('#pointsBody tr[data-collapse-id]'))
    .map(tr => tr.dataset.collapseId)
    .filter(Boolean);
  const allCollapsed = sectionIds.length > 0 && sectionIds.every(id => App.collapsedSections.has(id));
  App.allCollapsed = allCollapsed;
  cab.classList.toggle('all-collapsed', allCollapsed);
  const cabIcon = cab.querySelector('.kadra-icon');
  if (cabIcon) cabIcon.outerHTML = allCollapsed ? iconChevronsRight() : iconChevronsDown();
}
/* ============================================================
   COLLAPSE / EXPAND
============================================================ */
/* [cleanup] */
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
  if (!rowEl) {
    App.collapsedSections.delete(sectionId);
    syncCollapseAllButtonState();
    return;
  }

  if (App.collapsedSections.has(sectionId)) {
    // [cleanup]
    App.collapsedSections.delete(sectionId);
    btn?.classList.remove('is-collapsed');
    const rows = getRowsForSection(sectionId);
    rows.forEach(tr => {
      // [cleanup]
      const chKey = tr.dataset.chapter;
      if (chKey && App.collapsedSections.has('chapter-' + chKey)) return;
      // Nur anzeigen, wenn nicht durch eingeklapptes UKAP versteckt
      const subKey = tr.dataset.subchapter;
      if (subKey && tr.dataset.type !== 'subchapter' && App.collapsedSections.has('subchapter-' + subKey)) return;
      tr.style.opacity    = '0';
      tr.style.transition = '';
      tr.classList.remove('row-hidden');
      requestAnimationFrame(() => {
        tr.style.transition = 'opacity 150ms ease';
        tr.style.opacity    = '1';
      });
      setTimeout(() => { tr.style.transition = ''; tr.style.opacity = ''; }, 160);
    });
  setTimeout(refreshSearchIfActive, 170);
    syncCollapseAllButtonState();
  } else {
    // [cleanup]
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
      syncCollapseAllButtonState();
      refreshSearchIfActive();
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

  if (allSectionIds.length === 0) {
    App.allCollapsed = false;
    syncCollapseAllButtonState();
    return;
  }

  if (!App.allCollapsed) {
    // [cleanup]
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
      rowsToHide.forEach(tr => {
        tr.classList.add('row-hidden');
        tr.style.transition = ''; tr.style.opacity = '';
      });
      // Pfeile aktualisieren
      document.querySelectorAll('.collapse-btn').forEach(b =>
        b.classList.add('is-collapsed'));
      syncCollapseAllButtonState();
      refreshSearchIfActive();
    }, 150);

  } else {
    // [cleanup]
    App.collapsedSections.clear();
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
    syncCollapseAllButtonState();
    setTimeout(refreshSearchIfActive, 170);
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
    if (f.onlyTasks) {
      const cat = tr.querySelector('[data-field="category"]')?.value || '';
      if (cat !== 'Aufgabe') hide = true;
    }
    if (f.onlyApproval) {
      const cat = tr.querySelector('[data-field="category"]')?.value || '';
      if (cat !== 'Freigabe erfordl') hide = true;
    }
    tr.classList.toggle('filter-hidden', hide);
  });
  // Button-Indikator
  const btn = document.getElementById('btnPointFilter');
  btn.classList.toggle('has-filter', f.hideDone || f.onlyOverdue || f.onlyNew || f.onlyTasks || f.onlyApproval);
  refreshSearchIfActive();
}

function setupPointFilter() {
  const btn   = document.getElementById('btnPointFilter');
  const panel = document.getElementById('pointFilterPanel');
  const cbDone    = document.getElementById('filterHideDone');
  const cbOverdue = document.getElementById('filterOnlyOverdue');
  const cbNew      = document.getElementById('filterOnlyNew');
  const cbTasks    = document.getElementById('filterOnlyTasks');
  const cbApproval = document.getElementById('filterOnlyApproval');
  const allCbs = [cbDone, cbOverdue, cbNew, cbTasks, cbApproval];

  const syncPointFilterIconChecks = () => {
    allCbs.forEach(cb => {
      let icon = cb.nextElementSibling;
      if (!icon || !icon.classList.contains('point-filter-check')) {
        icon = document.createElement('span');
        icon.className = 'point-filter-check';
        cb.insertAdjacentElement('afterend', icon);
      }
      icon.innerHTML = cb.checked ? iconSquareCheckBig() : iconSquare();
    });
  };
  syncPointFilterIconChecks();

  btn.addEventListener('click', e => {
    e.stopPropagation();
    panel.classList.toggle('hidden');
  });

  cbDone.addEventListener('change', () => {
    App.pointFilters.hideDone = cbDone.checked;
    syncPointFilterIconChecks();
    applyPointFilters();
  });

  cbOverdue.addEventListener('change', () => {
    if (cbOverdue.checked) {
      cbNew.checked = false;
      App.pointFilters.onlyNew = false;
    }
    App.pointFilters.onlyOverdue = cbOverdue.checked;
    syncPointFilterIconChecks();
    applyPointFilters();
  });

  cbNew.addEventListener('change', () => {
    if (cbNew.checked) {
      cbOverdue.checked = false;
      App.pointFilters.onlyOverdue = false;
    }
    App.pointFilters.onlyNew = cbNew.checked;
    syncPointFilterIconChecks();
    applyPointFilters();
  });

  cbTasks.addEventListener('change', () => {
    if (cbTasks.checked) {
      cbApproval.checked = false;
      App.pointFilters.onlyApproval = false;
    }
    App.pointFilters.onlyTasks = cbTasks.checked;
    syncPointFilterIconChecks();
    applyPointFilters();
  });

  cbApproval.addEventListener('change', () => {
    if (cbApproval.checked) {
      cbTasks.checked = false;
      App.pointFilters.onlyTasks = false;
    }
    App.pointFilters.onlyApproval = cbApproval.checked;
    syncPointFilterIconChecks();
    applyPointFilters();
  });

  // [cleanup]
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

  const isAk = protocol.type === 'Aktennotiz';
  let akNum = 0;

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

    const checkIcon = document.createElement('span');
    checkIcon.className = 'chapter-filter-check' + (hasContent ? ' is-disabled' : '');
    checkIcon.innerHTML = cb.checked ? iconSquareCheckBig() : iconSquare();

    cb.addEventListener('change', () => {
      if (cb.disabled) return;
      if (cb.checked) {
        App.hiddenChapters.delete(chKey);
      } else {
        App.hiddenChapters.add(chKey);
      }
      checkIcon.innerHTML = cb.checked ? iconSquareCheckBig() : iconSquare();
      applyChapterFilter();
    });

    const span = document.createElement('span');
    if (isAk) {
      const isFixed = chKey === 'P' || chKey === 'N';
      if (!isFixed) akNum++;
      span.textContent = isFixed ? chapter.label : `${akNum}. ${chapter.label}`;
    } else {
      span.textContent = `${chKey} - ${chapter.label}`;
    }

    label.appendChild(cb);
    label.appendChild(checkIcon);
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
  refreshSearchIfActive();
}

function refreshSearchIfActive() {
  if (!Search.active) return;
  const input = document.getElementById('searchBarInput');
  const q = input ? input.value : (Search.query || '');
  executeSearch(q);
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

/* [cleanup] */
function _getAkSectionNum(protocol, chKey) {
  if (chKey === 'P' || chKey === 'N') return undefined; // P/N behalten Buchstaben
  let num = 0;
  for (const k of Object.keys(protocol.structure)) {
    if (k === 'P' || k === 'N') continue;
    num++;
    if (k === chKey) return num;
  }
  return undefined;
}

/* ============================================================
   TOOLBAR-AKTIONEN: KAP / UKAP / THEMA / PKT
============================================================ */

const DEFAULT_CHAPTERS = ['A','B','C','D','E'];

/* [cleanup] */
function getNextChapterKey(protocol) {
  const existing = Object.keys(protocol.structure);
  const isAk = protocol.type === 'Aktennotiz';
  // [cleanup]
  // [cleanup]
  const startCode = isAk ? 66 : 70;   // B=66, F=70
  const endCode   = isAk ? 77 : 90;   // M=77, Z=90
  for (let code = startCode; code <= endCode; code++) {
    const key = String.fromCharCode(code);
    if (!existing.includes(key)) return key;
  }
  return null;
}

/* KAP - Modal Ã¶ffnen */
async function startAddChapter() {
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) { showToast('Kein Protokoll geÃ¶ffnet.', 'error'); return; }

  const isAk = protocol.type === 'Aktennotiz';
  const nextKey = getNextChapterKey(protocol);
  if (!nextKey) {
    showToast(isAk ? 'Maximale Abschnittanzahl erreicht.' : 'Maximale Kapitelanzahl erreicht (A-Z).', 'error');
    return;
  }

  const sectionCount = isAk ? Object.keys(protocol.structure).filter(k => k !== 'P' && k !== 'N').length + 1 : 0;
  document.getElementById('chapterKeyHint').textContent = isAk
    ? `Wird als Abschnitt ${sectionCount} angelegt`
    : `Wird als Kapitel ${nextKey} angelegt`;

  document.getElementById('chapterLabel').value = '';
  openModal('modalChapter');
  setTimeout(() => document.getElementById('chapterLabel').focus(), 80);
}

/* KAP - Speichern */
async function saveChapter() {
  if (App._busy) return;

  const label = document.getElementById('chapterLabel').value.trim();
  if (!label) { showToast('Bitte Bezeichnung eingeben.', 'error'); return; }

  App._busy = true;
  try {
    const protocol = await DB.Protocols.get(App.currentProtocolId);
    if (!protocol) return;

    const isAk = protocol.type === 'Aktennotiz';
    const nextKey = getNextChapterKey(protocol);
    if (!nextKey) { showToast('Maximale Anzahl erreicht.', 'error'); return; }

    if (isAk) {
      // Neuen Abschnitt VOR N einfuegen: structure neu aufbauen
      const newStructure = {};
      for (const [k, v] of Object.entries(protocol.structure)) {
        if (k === 'N') newStructure[nextKey] = { label, subchapters: [] };
        newStructure[k] = v;
      }
      if (!newStructure[nextKey]) newStructure[nextKey] = { label, subchapters: [] };
      protocol.structure = newStructure;
    } else {
      protocol.structure[nextKey] = { label, subchapters: [] };
    }

    await DB.Protocols.save(protocol);
    closeModal('modalChapter');
    renderPoints(protocol);
    showToast(isAk ? `Abschnitt "${label}" angelegt.` : `Kapitel ${nextKey} angelegt.`, 'success');
  } finally {
    App._busy = false;
  }
}

/* KAP - Loeschen */
async function deleteChapter(chKey) {
  await saveCurrentProtocol();
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;

  const chapter = protocol.structure[chKey];
  if (!chapter) { showToast('Kapitel nicht gefunden.', 'error'); return; }

  const isAk = protocol.type === 'Aktennotiz';
  if (isAk) {
    if (chKey === 'P' || chKey === 'N') {
      showToast('Praeambel und Naechste Schritte koennen nicht geloescht werden.', 'error');
      return;
    }
    const sectionKeys = Object.keys(protocol.structure).filter(k => k !== 'P' && k !== 'N');
    if (sectionKeys.length <= 1) {
      showToast('Mindestens ein Abschnitt muss vorhanden sein.', 'error');
      return;
    }
  } else if (DEFAULT_CHAPTERS.includes(chKey)) {
    showToast('Vordefinierte Kapitel (A-E) koennen nicht geloescht werden.', 'error');
    return;
  }

  const hasTopics = (chapter.subchapters || []).some(s => (s.topics || []).length > 0);
  if (hasTopics) {
    showToast('Kapitel enthÃ¤lt Themen - bitte zuerst Themen lÃ¶schen.', 'error');
    return;
  }

  const pointCount = (protocol.points || []).filter(pt => pt.chapter === chKey).length;
  if (pointCount > 0) {
    showToast(`Kapitel enthÃ¤lt ${pointCount} Punkt(e) - bitte zuerst Punkte lÃ¶schen.`, 'error');
    return;
  }

  const displayLabel = isAk ? chapter.label : `${chKey} - ${chapter.label}`;
  if (!(await appConfirm(`"${displayLabel}" löschen?`, {
    title: 'Kapitel löschen',
    confirmLabel: 'Löschen',
    danger: true,
  }))) return;

  delete protocol.structure[chKey];
  App.hiddenChapters.delete(chKey);
  App.collapsedSections.delete('chapter-' + chKey);
  (chapter.subchapters || []).forEach(s => App.collapsedSections.delete('subchapter-' + s.id));

  if (App.selectedRow?.chapterKey === chKey) {
    App.selectedRow = null;
    updateSelectionHint();
  }

  await DB.Protocols.save(protocol);
  renderPoints(protocol);
  showToast(isAk ? `Abschnitt "${chapter.label}" geloescht.` : `Kapitel ${chKey} geloescht.`, '');
}

/* UKAP */
function startAddSubchapter() {
  const chKey = App.selectedRow?.chapterKey;
  if (!chKey) { showToast('Bitte zuerst eine Zeile auswÃ¤hlen.', 'error'); return; }
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
    const protocolId = App.currentProtocolId;
    await saveCurrentProtocol(); // DOM-Inhalte sichern bevor DB gelesen wird
    if (App.currentProtocolId !== protocolId) return;

    const protocol = await DB.Protocols.get(protocolId);
    if (!protocol) return;

    const chKey = App._pendingChapter;
    const chapter = protocol.structure[chKey];
    if (!chapter) { showToast('Kapitel nicht gefunden.', 'error'); return; }

    const normalizedLabel = label.toLowerCase();
    const duplicate = (chapter.subchapters || []).some(s => String(s.label || '').trim().toLowerCase() === normalizedLabel);
    if (duplicate) { showToast('Unterkapitel existiert bereits.', 'error'); return; }

    const maxNum = (chapter.subchapters || []).reduce((m, s) => Math.max(m, parseInt(String(s.id || '').split('.')[1], 10) || 0), 0);
    let nextNum = maxNum + 1;
    while ((chapter.subchapters || []).some(s => s.id === `${chKey}.${nextNum}`)) nextNum++;

    chapter.subchapters = [...(chapter.subchapters || []), { id: `${chKey}.${nextNum}`, label, topics: [] }];
    await DB.Protocols.save(protocol);
    closeModal('modalSubchapter');
    renderPoints(protocol);
    showToast(`Unterkapitel ${chKey}.${nextNum} angelegt.`, 'success');
  } finally {
    App._busy = false;
  }
}

/* THEMA */
function startAddTopic() {
  const subId = App.selectedRow?.subchapterId;
  if (!subId) { showToast('Bitte zuerst ein Unterkapitel oder eine Zeile darin auswÃ¤hlen.', 'error'); return; }
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
    const protocolId = App.currentProtocolId;
    await saveCurrentProtocol(); // DOM-Inhalte sichern bevor DB gelesen wird
    if (App.currentProtocolId !== protocolId) return;

    const protocol = await DB.Protocols.get(protocolId);
    if (!protocol) return;

    const subId = App._pendingSubchapter;
    if (!subId) { showToast('Unterkapitel nicht gefunden.', 'error'); return; }

    const chKey = subId.split('.')[0];
    const chapter = protocol.structure[chKey];
    const sub = (chapter?.subchapters || []).find(s => s.id === subId);
    if (!sub) { showToast('Unterkapitel nicht gefunden.', 'error'); return; }

    const normalizedLabel = label.toLowerCase();
    const duplicate = (sub.topics || []).some(t => String(t.label || '').trim().toLowerCase() === normalizedLabel);
    if (duplicate) { showToast('Thema existiert bereits.', 'error'); return; }

    const topicId = DB.uuid();
    sub.topics = [...(sub.topics || []), { id: topicId, label }];

    const subNum = subId.split('.')[1] || null;
    const seq = getNextPointSeq(protocol, chKey, subId);
    const akNum = protocol.type === 'Aktennotiz' ? _getAkSectionNum(protocol, chKey) : undefined;

    const newPoint = {
      id: DB.generatePointId(protocol.number, chKey, subNum, seq, akNum),
      chapter: chKey,
      subchapter: subId,
      topic: topicId,
      content: '',
      category: 'Aufgabe',
      responsible: '',
      deadline: '',
      done: false,
      isNew: true,
      doneLastProtocol: false,
      createdInProtocol: protocol.number,
    };

    protocol.points = [...(protocol.points || []), newPoint];
    await DB.Protocols.save(protocol);
    closeModal('modalTopic');
    renderPoints(protocol);

    setTimeout(() => {
      const row = document.querySelector(`tr[data-point-id="${newPoint.id}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        row.querySelector('textarea')?.focus();
      }
    }, 60);

    showToast(`Thema "${label}" + erster Punkt angelegt.`, 'success');
  } finally {
    App._busy = false;
  }
}

/* PKT */
async function addPoint() {
  if (App._busy) return;
  if (!App.currentProtocolId) return;

  const sel = App.selectedRow;
  if (!sel) { showToast('Bitte zuerst eine Zeile auswÃ¤hlen.', 'error'); return; }

  App._busy = true;
  try {
    await saveCurrentProtocol(); // DOM-Inhalte sichern bevor DB gelesen wird
    const protocol = await DB.Protocols.get(App.currentProtocolId);
    if (!protocol) return;

    const chKey = sel.chapterKey;
    const subId = sel.subchapterId || null;
    const topId = sel.topicId || null;

    const chapter = protocol.structure[chKey];
    if (!chapter) {
      App.selectedRow = null;
      updateSelectionHint();
      showToast('Kapitel nicht gefunden. Bitte Zeile neu auswÃ¤hlen.', 'error');
      return;
    }

    let sub = null;
    if (subId) {
      sub = (chapter.subchapters || []).find(s => s.id === subId);
      if (!sub) {
        App.selectedRow = null;
        updateSelectionHint();
        showToast('Unterkapitel nicht gefunden. Bitte Zeile neu auswÃ¤hlen.', 'error');
        return;
      }
    }

    if (!subId && (chapter.subchapters || []).length > 0) {
      showToast('Bitte Unterkapitel auswÃ¤hlen.', 'error');
      return;
    }

    if (topId) {
      const topic = (sub?.topics || []).find(t => t.id === topId);
      if (!topic) {
        App.selectedRow = null;
        updateSelectionHint();
        showToast('Thema nicht gefunden. Bitte Zeile neu auswÃ¤hlen.', 'error');
        return;
      }
    }

    const subNum = subId ? subId.split('.')[1] : null;
    const seq = getNextPointSeq(protocol, chKey, subId);
    const akNum = protocol.type === 'Aktennotiz' ? _getAkSectionNum(protocol, chKey) : undefined;

    const newPoint = {
      id: DB.generatePointId(protocol.number, chKey, subNum, seq, akNum),
      chapter: chKey,
      subchapter: subId,
      topic: topId,
      content: '',
      category: 'Aufgabe',
      responsible: '',
      deadline: '',
      done: false,
      isNew: true,
      doneLastProtocol: false,
      createdInProtocol: protocol.number,
    };

    protocol.points = [...(protocol.points || []), newPoint];
    await DB.Protocols.save(protocol);
    renderPoints(protocol);

    setTimeout(() => {
      const row = document.querySelector(`tr[data-point-id="${newPoint.id}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        row.querySelector('textarea')?.focus();
      }
    }, 60);
  } finally {
    App._busy = false;
  }
}

function getNextPointSeq(protocol, chKey, subId) {
  const subchapter = subId || null;
  const isAk = protocol.type === 'Aktennotiz';
  const numStr = String(protocol.number ?? '').padStart(2, '0');
  const expectedPrefix = `#${numStr}|`;

  let maxSeq = 0;
  (protocol.points || []).forEach(pt => {
    if (pt.chapter !== chKey) return;
    if ((pt.subchapter || null) !== subchapter) return;

    // Bei nummerierten Protokollen nur Punkte dieser Protokollnummer betrachten.
    if (!isAk) {
      const id = String(pt.id || '');
      if (!id.startsWith(expectedPrefix)) return;
    }

    const m = String(pt.id || '').match(/.([0-9]+)$/);
    const seq = m ? parseInt(m[1], 10) : 0;
    if (Number.isFinite(seq)) maxSeq = Math.max(maxSeq, seq);
  });

  return maxSeq + 1;
}

/* ============================================================
   STRUKTUR LOESCHEN (UKAP / THEMA)
============================================================ */
async function deleteSubchapter(chKey, subId) {
  await saveCurrentProtocol(); // DOM-Inhalte sichern bevor DB gelesen wird
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;

  const chapter = protocol.structure[chKey];
  const sub = (chapter?.subchapters || []).find(s => s.id === subId);
  if (!sub) { showToast('Unterkapitel nicht gefunden.', 'error'); return; }

  const pointCount = (protocol.points || []).filter(
    pt => pt.chapter === chKey && pt.subchapter === subId
  ).length;

  const msg = `Obacht! Unterkapitel "${subId} ${sub.label}" und alle ${pointCount ? pointCount + ' darin enthaltenen Punkte' : 'zugehörigen Punkte'} werden unwiderruflich gelöscht. Bist du sicher?`;
  if (!(await appConfirm(msg, {
    title: 'Unterkapitel löschen',
    confirmLabel: 'Löschen',
    danger: true,
  }))) return;

  chapter.subchapters = (chapter.subchapters || []).filter(s => s.id !== subId);
  protocol.points = (protocol.points || []).filter(
    pt => !(pt.chapter === chKey && pt.subchapter === subId)
  );

  if (App.selectedRow?.subchapterId === subId) {
    App.selectedRow = null;
    updateSelectionHint();
  }

  App.collapsedSections.delete('subchapter-' + subId);
  await DB.Protocols.save(protocol);
  renderPoints(protocol);
  showToast(`Unterkapitel ${subId} geloescht.`, '');
}

async function deleteTopic(chKey, subId, topicId, topicLabel) {
  await saveCurrentProtocol(); // DOM-Inhalte sichern bevor DB gelesen wird
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;

  const chapter = protocol.structure[chKey];
  const sub = (chapter?.subchapters || []).find(s => s.id === subId);
  if (!sub) { showToast('Unterkapitel nicht gefunden.', 'error'); return; }

  const pointCount = (protocol.points || []).filter(
    pt => pt.chapter === chKey && pt.subchapter === subId && pt.topic === topicId
  ).length;

  const msg = `Obacht! Thema "${topicLabel}" und alle ${pointCount ? pointCount + ' darin enthaltenen Punkte' : 'zugehörigen Punkte'} werden unwiderruflich gelöscht. Bist du sicher?`;
  if (!(await appConfirm(msg, {
    title: 'Thema löschen',
    confirmLabel: 'Löschen',
    danger: true,
  }))) return;

  sub.topics = (sub.topics || []).filter(t => t.id !== topicId);
  protocol.points = (protocol.points || []).filter(
    pt => !(pt.chapter === chKey && pt.subchapter === subId && pt.topic === topicId)
  );

  if (App.selectedRow?.topicId === topicId) {
    App.selectedRow = null;
    updateSelectionHint();
  }

  await DB.Protocols.save(protocol);
  renderPoints(protocol);
  showToast(`Thema "${topicLabel}" geloescht.`, '');
}

/* ============================================================
   SPEICHERN
============================================================ */
async function saveCurrentProtocol() {
  const protocolId = App.currentProtocolId;
  if (!protocolId) return;

  // B-002 Stabilisierung: Saves serialisieren, damit schnelle UI-Events
  // keine konkurrierenden DOM->DB Schreibvorgaenge ausloesen.
  if (!App._saveQueue) App._saveQueue = Promise.resolve();

  const task = async () => {
    // Wenn zwischenzeitlich auf ein anderes Protokoll gewechselt wurde,
    // diesen Save-Durchlauf verwerfen.
    if (App.currentProtocolId !== protocolId) return;

    const protocol = await DB.Protocols.get(protocolId);
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

    // Robuste Zuordnung: IDs koennen historisch doppelt vorkommen.
    // Deshalb pro ID eine Queue bilden statt immer nur den ersten Treffer zu nehmen.
    const pointBuckets = new Map();
    (protocol.points || []).forEach(pt => {
      const key = String(pt.id);
      if (!pointBuckets.has(key)) pointBuckets.set(key, []);
      pointBuckets.get(key).push(pt);
    });

    document.querySelectorAll('#pointsBody tr[data-point-id]').forEach(tr => {
      const id = tr.dataset.pointId;
      const bucket = pointBuckets.get(String(id));
      const pt = bucket?.shift();
      if (!pt) return;
      pt.content     = tr.querySelector('[data-field="content"]')?.value     || '';
      pt.category    = tr.querySelector('[data-field="category"]')?.value    || 'Aufgabe';
      pt.responsible = tr.querySelector('.resp-select')?.dataset.value       || '';
      // Termin: Freitext-Feld (nicht mehr type="date")
      pt.deadline    = tr.querySelector('.termin-input')?.value              ||
                       tr.querySelector('[data-field="deadline"]')?.value    || '';
      const doneEl   = tr.querySelector('[data-field="done"]');
      pt.done        = doneEl
        ? ((doneEl.dataset?.checked === '1') || (doneEl.checked === true))
        : false;
      // snapshot bleibt unberuehrt (nicht Ã¼berschreiben)
    });

    document.querySelectorAll('#attachmentsBody tr[data-idx]').forEach((tr, i) => {
      if (protocol.attachments?.[i]) {
        protocol.attachments[i].content = tr.querySelector('[data-field="content"]')?.value || '';
        // fileData, fileName, fileType werden separat gespeichert (via handleFileSelected)
        // -> hier nicht Ã¼berschreiben
      }
    });

    // Aufgestellt-Block
    const fullName = document.getElementById('fieldAuthorName').value.trim();
    const nameParts = fullName ? fullName.split(/\s+/) : [];
    const firstName = nameParts.length ? nameParts[0] : '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    protocol.author = {
      name:      fullName,
      firstName,
      lastName,
      company:   document.getElementById('fieldAuthorCompany').value,
      date:      document.getElementById('fieldAuthorDate').value,
      seen:      document.getElementById('fieldAuthorSeen').value,
    };

    // Manuelle Abkuerzungen aus DOM lesen
    protocol.customAbbreviations = getCustomAbbreviationsFromDOM();

    await DB.Protocols.save(protocol);
    renderProtocolList();
    const isEditingAbbrev = !!document.activeElement?.closest('#abbrevList .abbrev-custom');
    if (!isEditingAbbrev) {
      renderAbbrevList(protocol.participants, protocol.customAbbreviations || []);
    }
  };

  // Fehler nicht schlucken: await-Aufrufer koennen reagieren.
  App._saveQueue = App._saveQueue.then(task, task);
  return App._saveQueue;
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
  let seriesId     = DB.uuid(); // neue, eigenstaendige Serie

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
      type = prevProto.type; // gleicher Typ wie Vorgaenger
    }
  }

  const isAktennotiz = type === 'Aktennotiz';

  // [cleanup]
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
      : 1;
  }

  // [cleanup]
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
    title: resolvedSeriesName || (isAktennotiz ? '' : type),
    date:     new Date().toISOString().slice(0,10),
    time:'', location:'',
    tenant:   project.tenant || '',
    landlord: project.owner  || '',
    participants, structure, points, attachments:[], deletedAt:null,
    author: { name:'Olaf Schueler', firstName:'Olaf', lastName:'Schueler', company:'Hopro GmbH & Co. KG', date:'', seen:'' },
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
  if (renderAttachments._ac) renderAttachments._ac.abort();
  const ac = renderAttachments._ac = new AbortController();
  document.addEventListener('mouseup',  () => tbody.querySelectorAll('.attach-row').forEach(r => r.draggable = false), { signal: ac.signal });
  document.addEventListener('touchend', () => tbody.querySelectorAll('.attach-row').forEach(r => r.draggable = false), { signal: ac.signal });
  // Leerhinweis
  const emptyMsg = document.getElementById('attachmentsEmpty');
  if (emptyMsg) emptyMsg.style.display = attachments.length ? 'none' : '';
  attachments.forEach((att, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'attach-row' + (idx % 2 === 0 ? ' attach-row-odd' : '');
    tr.dataset.idx = idx;
    tr.draggable = false;
    tr.innerHTML = `
      <td><span class="attach-row-grip" title="Verschieben">${iconGrip()}</span><span class="point-id">${esc(att.id)}</span></td>
      <td><input class="table-input" value="${esc(att.content)}" data-field="content" /></td>
      <td class="attach-file-cell"></td>
      <td class="attach-file-actions-cell"></td>
      <td><button class="btn-delete-row" data-action="deleteAttachment" data-idx="${idx}" title="Anlage entfernen">${iconTrash()}</button></td>
    `;
    tr.querySelector('input').addEventListener('change', saveCurrentProtocol);
    // Datei-Zelle aufbauen
    const fileCell = tr.querySelector('.attach-file-cell');
    fileCell.appendChild(buildFileCellContent(att, idx));
    const fileActionsCell = tr.querySelector('.attach-file-actions-cell');
    fileActionsCell.appendChild(buildAttachmentFileActions(att, idx));

    const handle = tr.querySelector('.attach-row-grip');
    handle.addEventListener('mousedown',  () => { tr.draggable = true; App._dragType = 'attachment'; });
    handle.addEventListener('touchstart', () => { tr.draggable = true; App._dragType = 'attachment'; }, { passive: true });

    tr.addEventListener('dragstart', e => {
      if (App._dragType !== 'attachment') { e.preventDefault(); return; }
      e.dataTransfer.setData('text/plain', String(idx));
      e.dataTransfer.setData('application/x-attachment', '1');
      e.dataTransfer.effectAllowed = 'move';
      tr.classList.add('drag-active');
    });

    tr.addEventListener('dragover', e => {
      if (App._dragType !== 'attachment') return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = tr.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      tr.classList.toggle('drag-over-top', e.clientY < mid);
      tr.classList.toggle('drag-over-bottom', e.clientY >= mid);
    });

    tr.addEventListener('dragleave', () => {
      tr.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    tr.addEventListener('drop', async e => {
      e.preventDefault();
      tr.classList.remove('drag-over-top', 'drag-over-bottom');
      if (App._dragType !== 'attachment') return;
      const draggedIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const targetIdx = idx;
      if (draggedIdx === targetIdx || isNaN(draggedIdx)) return;

      const protocol = await DB.Protocols.get(App.currentProtocolId);
      if (!protocol) return;
      const currentAttachments = getAttachmentsFromDOM(protocol.attachments || []);
      if (!currentAttachments.length) return;

      const reordered = [...currentAttachments];
      const [moved] = reordered.splice(draggedIdx, 1);
      const rect = tr.getBoundingClientRect();
      let insertIdx = targetIdx > draggedIdx ? targetIdx - 1 : targetIdx;
      if (e.clientY >= rect.top + rect.height / 2) insertIdx++;
      reordered.splice(insertIdx, 0, moved);

      protocol.attachments = reordered.map((item, i) => ({
        ...item,
        id: DB.generateAttachmentId(protocol.number, i + 1),
      }));
      await DB.Protocols.save(protocol);
      renderAttachments(protocol.attachments, protocol.number);
      renderProtocolList();
      showToast('Anlage verschoben.', 'success');
    });

    tr.addEventListener('dragend', () => {
      tr.classList.remove('drag-active');
      App._dragType = null;
      tbody.querySelectorAll('.attach-row').forEach(r => r.classList.remove('drag-over-top', 'drag-over-bottom'));
    });

    tbody.appendChild(tr);
  });
}

function getAttachmentsFromDOM(baseAttachments) {
  const rows = Array.from(document.querySelectorAll('#attachmentsBody tr.attach-row'));
  return rows.map(row => {
    const sourceIdx = parseInt(row.dataset.idx || '-1', 10);
    const original = Number.isInteger(sourceIdx) && sourceIdx >= 0 ? (baseAttachments[sourceIdx] || {}) : {};
    return {
      ...original,
      content: row.querySelector('[data-field="content"]')?.value || '',
    };
  });
}

/* [cleanup] */
function buildFileCellContent(att, idx) {
  const wrap = document.createElement('div');
  wrap.className = 'file-cell-wrap';

  if (att.fileName) {
    const label = document.createElement('span');
    label.className = 'file-name-label';
    label.title     = att.fileName;
    label.textContent = att.fileName;
    wrap.appendChild(label);
  } else {
    const noFile = document.createElement('span');
    noFile.className = 'file-name-label no-file';
    noFile.textContent = '';
    wrap.appendChild(noFile);
  }
  return wrap;
}

function buildAttachmentFileActions(att, idx) {
  const wrap = document.createElement('div');
  wrap.className = 'attach-file-actions-wrap';

  if (att.fileName) {
    const dlBtn = document.createElement('button');
    dlBtn.type = 'button';
    dlBtn.className = 'btn-file-action';
    dlBtn.title = 'Datei herunterladen';
    dlBtn.innerHTML = iconDownload();
    dlBtn.addEventListener('click', () => downloadAttachmentFile(idx));

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-file-action';
    removeBtn.title = 'Datei entfernen';
    removeBtn.innerHTML = iconX();
    removeBtn.addEventListener('click', () => removeAttachmentFile(idx));

    wrap.appendChild(dlBtn);
    wrap.appendChild(removeBtn);
  } else {
    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'btn-file-action btn-file-action-upload';
    uploadBtn.title = 'Datei wÃ¤hlen';
    uploadBtn.innerHTML = iconPaperclip();
    uploadBtn.addEventListener('click', () => openFilePicker(idx));
    wrap.appendChild(uploadBtn);
  }

  return wrap;
}

async function addNewAttachment(fileName, fileType, fileData) {
  if (!App.currentProtocolId) return;
  await saveCurrentProtocol();
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;
  const seq = (protocol.attachments||[]).length + 1;
  const newAtt = {
    id:       DB.generateAttachmentId(protocol.number, seq),
    content:  fileName || '',
    fileName: fileName || null,
    fileType: fileType || null,
    fileData: fileData || null,   // ArrayBuffer - IndexedDB speichert Binaerdaten nativ
  };
  protocol.attachments = [...(protocol.attachments||[]), newAtt];
  await DB.Protocols.save(protocol);
  renderAttachments(protocol.attachments, protocol.number);
  renderProtocolList(); // Bueroklammer-Icon aktualisieren
}

/* [cleanup] */
let _pendingFileIdx = null;          // Index der bestehenden Anlage, fÃ¼r die gerade eine Datei gewaehlt wird
let _pendingNewAttachment = false;   // true: Picker stammt aus 'Datei auswÃ¤hlen' (neue Anlage)

function openFilePicker(attachIdx) {
  _pendingNewAttachment = false;
  _pendingFileIdx = attachIdx;
  const input = document.getElementById('filePickerInput');
  input.value = '';
  input.click();
}

function openNewAttachmentFilePicker() {
  _pendingNewAttachment = true;
  _pendingFileIdx = null;
  const input = document.getElementById('filePickerInput');
  input.value = '';
  input.click();
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

async function handleFileSelected(file, attachIdx) {
  if (!file) return;
  if (file.size > MAX_FILE_SIZE) {
    showToast('Datei zu gross (' + (file.size/1024/1024).toFixed(1) + ' MB). Maximum: 5 MB.', 'error');
    return;
  }
  await saveCurrentProtocol();
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;
  const att = protocol.attachments?.[attachIdx];
  if (!att) return;

  const buffer = await file.arrayBuffer();
  att.fileName = file.name;
  att.fileType = file.type;
  att.fileData = buffer;
  if (!att.content) att.content = file.name; // Beschriftung vorausfuellen

  await DB.Protocols.save(protocol);
  renderAttachments(protocol.attachments, protocol.number);
  renderProtocolList();
}

async function removeAttachmentFile(attachIdx) {
  await saveCurrentProtocol();
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

  // [cleanup]
  const seen = new Map();
  participants.forEach(p => { if (p.abbr && !seen.has(p.abbr)) seen.set(p.abbr, p.company||''); });

  const customGrid = document.createElement('div');
  customGrid.className = 'abbrev-custom-grid';

  // Automatisch aus Teilnehmern erzeugte Abkuerzungen
  seen.forEach((company, abbr) => {
    const div = document.createElement('div');
    div.className = 'abbrev-custom abbrev-custom-auto';
    div.innerHTML = `
      <span class="abbrev-pill abbrev-pill-code">${esc(abbr)}</span>
      <span class="abbrev-pill abbrev-pill-name">${esc(company)}</span>`;
    customGrid.appendChild(div);
  });

  // Manuelle Abkuerzungen
  customs.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'abbrev-custom';
    div.dataset.idx = idx;
    div.innerHTML = `
      <input class="abbrev-input abbrev-input-code" value="${esc(item.abbr)}" data-field="abbr" placeholder="Kuerzel" maxlength="6" />
      <input class="abbrev-input abbrev-input-name" value="${esc(item.name)}" data-field="name" placeholder="Bezeichnung" />
      <button type="button" class="btn-delete-abbrev" data-action="deleteCustomAbbrev" data-idx="${idx}" title="Entfernen">${iconTrash()}</button>`;
    div.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('change', saveCurrentProtocol);
      inp.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        e.stopPropagation();
        inp.blur(); // bestaetigen + Pille verlassen
      });
    });
    div.querySelector('.btn-delete-abbrev').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const protocol = await DB.Protocols.get(App.currentProtocolId);
      if (!protocol) return;
      protocol.customAbbreviations = (protocol.customAbbreviations||[]).filter((_,i) => i !== idx);
      await DB.Protocols.save(protocol);
      renderAbbrevList(protocol.participants, protocol.customAbbreviations);
    });
    customGrid.appendChild(div);
  });
  container.appendChild(customGrid);

  // [cleanup]
  const addRow = document.createElement('div');
  addRow.className = 'abbrev-add-row';

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-add-abbrev';
  addBtn.innerHTML = `${iconPlus()} Abkuerzung hinzufuegen`;
  addBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!App.currentProtocolId) return;
    const protocol = await DB.Protocols.get(App.currentProtocolId);
    if (!protocol) return;
    const currentCustoms = getCustomAbbreviationsFromDOM();
    protocol.customAbbreviations = [...currentCustoms, { abbr:'', name:'' }];
    await DB.Protocols.save(protocol);
    renderAbbrevList(protocol.participants || [], protocol.customAbbreviations || []);
    // [cleanup]
    setTimeout(() => {
      const lastInput = container.querySelector('.abbrev-custom:last-child .abbrev-input-code');
      if (lastInput) lastInput.focus();
    }, 50);
  });
  addRow.appendChild(addBtn);
  container.appendChild(addRow);

  if (seen.size === 0 && customs.length === 0) {
    const hint = document.createElement('span');
    hint.style.cssText = 'color:var(--text-tertiary);font-size:12px';
    hint.textContent = 'Keine Abkuerzungen erfasst.';
    container.insertBefore(hint, addRow);
  }
}

function getCustomAbbreviationsFromDOM() {
  return Array.from(document.querySelectorAll('#abbrevList .abbrev-custom:not(.abbrev-custom-auto)')).map(div => ({
    abbr: div.querySelector('[data-field="abbr"]')?.value || '',
    name: div.querySelector('[data-field="name"]')?.value || '',
  }));
}

/* ============================================================
   LOESCHEN
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
  await saveCurrentProtocol();
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;
  protocol.attachments.splice(idx, 1);
  protocol.attachments.forEach((att, i) => { att.id = DB.generateAttachmentId(protocol.number, i+1); });
  await DB.Protocols.save(protocol);
  renderAttachments(protocol.attachments, protocol.number);
  renderProtocolList(); // Bueroklammer-Icon aktualisieren
}

/* ============================================================
   EVENT-BINDING
============================================================ */
function bindGlobalEvents() {

  // SVG-Checkboxen in der Eingabe-Zeile initialisieren
  function syncNewParticipantCheckbox(el) {
    if (!el) return;
    const checked = el.dataset.checked === '1';
    el.innerHTML = checked ? iconSquareCheckBig() : iconSquare();
  }

  ['newParticipantAttended','newParticipantDistrib'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    syncNewParticipantCheckbox(el);
    el.addEventListener('click', () => {
      el.dataset.checked = el.dataset.checked === '1' ? '' : '1';
      syncNewParticipantCheckbox(el);
    });
  });

  const btnReload = document.getElementById('btnReload');
  if (btnReload) btnReload.addEventListener('click', () => { forceFreshReload(); });
  // Neues Projekt
  document.getElementById('btnNewProject').addEventListener('click', () => openModal('modalNewProject'));
  document.getElementById('btnSaveNewProject').addEventListener('click', async () => {
    const code    = document.getElementById('newProjectCode').value.trim().toUpperCase();
    const name    = document.getElementById('newProjectName').value.trim();
    const address = document.getElementById('newProjectAddress').value.trim();
    const owner   = document.getElementById('newProjectOwner').value.trim();
    const tenant  = document.getElementById('newProjectTenant').value.trim();
    if (!code || !name)              { showToast('ProjektkÃ¼rzel und Projektname sind Pflichtfelder.', 'error'); return; }
    if (!/^[A-Z]{2,4}$/.test(code)) { showToast('ProjektkÃ¼rzel: 2-4 Grossbuchstaben.', 'error'); return; }
    const saved = await DB.Projects.save({ code, name, address, owner, tenant });
    App.projects.push(saved);
    renderProjectSelect();
    closeModal('modalNewProject');
    await selectProject(saved.id);
    clearForm('modalNewProject');
    showToast(`Projekt "${code}" angelegt.`, 'success');
  });

  // [cleanup]
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
          `${sName} - Nr. ${String(latest.number).padStart(2,'0')}`;
        continueFromGroup.classList.remove('hidden');
        seriesGroup.classList.add('hidden');
        // [cleanup]
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
      // [cleanup]
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

  // [cleanup]
  // [cleanup]
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
  setupFulltextSearch();

  // KAP / UKAP / THEMA Modals
  document.getElementById('btnSaveChapter').addEventListener('click', saveChapter);
  document.getElementById('chapterLabel').addEventListener('keydown', (e) => { if (e.key==='Enter') saveChapter(); });
  document.getElementById('btnSaveSubchapter').addEventListener('click', saveSubchapter);
  document.getElementById('subchapterLabel').addEventListener('keydown', (e) => { if (e.key==='Enter') saveSubchapter(); });
  document.getElementById('btnSaveTopic').addEventListener('click', saveTopic);
  document.getElementById('topicLabel').addEventListener('keydown', (e) => { if (e.key==='Enter') saveTopic(); });

  // [cleanup]
  const newEmailInput = document.getElementById('newParticipantEmail');
  if (newEmailInput) {
    newEmailInput.addEventListener('input', () => {
      const v = newEmailInput.value.trim();
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      newEmailInput.classList.toggle('email-warn', v.length > 0 && !valid);
    });
  }

  // [cleanup]
  document.getElementById('btnAddParticipant').addEventListener('click', async () => {
    const name     = document.getElementById('newParticipantName').value.trim();
    const company  = document.getElementById('newParticipantCompany').value.trim();
    const abbr     = document.getElementById('newParticipantAbbr').value.trim().toUpperCase();
    const email    = document.getElementById('newParticipantEmail').value.trim();
    const attended = document.getElementById('newParticipantAttended').dataset.checked === '1';
    const inDistrib= document.getElementById('newParticipantDistrib').dataset.checked === '1';
    if (!name) { showToast('Bitte Name eintragen.', 'warning'); return; }
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
    // [cleanup]
    ['newParticipantAttended','newParticipantDistrib'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.dataset.checked = '1'; el.innerHTML = iconSquareCheckBig(); }
    });
  });
  document.getElementById('newParticipantEmail').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btnAddParticipant').click();
  });

  // Anlage: Leere Zeile
  const btnAddAttachment = document.getElementById('btnAddAttachment');
  if (btnAddAttachment) btnAddAttachment.addEventListener('click', () => addNewAttachment());

  // Anlage: Datei-Picker
  document.getElementById('btnPickFile').addEventListener('click', async () => {
    // [cleanup]
    if (!App.currentProtocolId) return;
    const protocol = await DB.Protocols.get(App.currentProtocolId);
    if (!protocol) return;
    openNewAttachmentFilePicker();
  });

  document.getElementById('filePickerInput').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (_pendingNewAttachment) {
      if (file.size > MAX_FILE_SIZE) {
        showToast('Datei zu gross (' + (file.size/1024/1024).toFixed(1) + ' MB). Maximum: 5 MB.', 'error');
      } else {
        const buffer = await file.arrayBuffer();
        await addNewAttachment(file.name, file.type, buffer);
      }
      _pendingNewAttachment = false;
      _pendingFileIdx = null;
      return;
    }

    if (_pendingFileIdx !== null) {
      await handleFileSelected(file, _pendingFileIdx);
    }
    _pendingFileIdx = null;
    _pendingNewAttachment = false;
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
      showToast('Datei zu gross (' + (file.size/1024/1024).toFixed(1) + ' MB). Maximum: 5 MB.', 'error');
      return;
    }
    // Neue Anlage mit Datei anlegen
    const buffer = await file.arrayBuffer();
    await addNewAttachment(file.name, file.type, buffer);
  });

  // [cleanup]
  document.getElementById('btnDeleteProtocol').addEventListener('click', async () => {
    if (!App.currentProtocolId) return;
    const ok = await appConfirm(
      'Obacht!\n\nDas Protokoll wird in den Papierkorb verschoben.\n' +
      'Alle Protokollpunkte bleiben gespeichert und koennen ueber den Papierkorb wiederhergestellt werden.\n\n' +
      'Bist du sicher?',
      { title: 'Protokoll verschieben', confirmLabel: 'Verschieben', danger: true }
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
    if (!name) { showToast('Bitte einen Namen fÃ¼r das Duplikat eingeben.', 'error'); return; }
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
    const sb = document.getElementById('sidebar');
    sb.style.width = '';
    sb.style.minWidth = '';
    sb.classList.toggle('collapsed');
    const icon = document.querySelector('#btnToggleSidebar .kadra-icon');
    if (icon) {
      icon.outerHTML = sb.classList.contains('collapsed') ? iconPanelLeftOpen() : iconPanelLeftClose();
    }
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
      if (await appConfirm('Teilnehmer entfernen?', { title: 'Teilnehmer', confirmLabel: 'Entfernen', danger: true })) {
        await deleteParticipant(parseInt(btn.dataset.idx, 10));
      }
    } else if (action === 'deletePoint') {
      if (await appConfirm('Protokollpunkt unwiderruflich löschen?', { title: 'Protokollpunkt', confirmLabel: 'Löschen', danger: true })) {
        await deletePoint(btn.dataset.pointId);
      }
    } else if (action === 'deleteAttachment') {
      if (await appConfirm('Anlage entfernen?', { title: 'Anlage', confirmLabel: 'Entfernen', danger: true })) {
        await deleteAttachment(parseInt(btn.dataset.idx, 10));
      }
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
   'fieldAuthorName','fieldAuthorCompany','fieldAuthorDate','fieldAuthorSeen'].forEach(id => {
    document.getElementById(id).addEventListener('change', saveCurrentProtocol);
  });
  document.getElementById('fieldTitle').addEventListener('input', saveCurrentProtocol);

  // [cleanup]
  const authorDateInput  = document.getElementById('fieldAuthorDate');
  const authorCalBtn     = document.getElementById('btnAuthorDatePicker');
  const authorDateHidden = document.getElementById('authorDateHidden');
  if (authorCalBtn && authorDateHidden && authorDateInput) {
    authorCalBtn.addEventListener('click', () => {
      authorDateHidden.showPicker?.() || authorDateHidden.click();
    });
    authorDateHidden.addEventListener('change', () => {
      if (authorDateHidden.value) {
        const [y, m, d] = authorDateHidden.value.split('-');
        authorDateInput.value = `${d}.${m}.${y}`;
        saveCurrentProtocol();
      }
    });
  }

  // Modals
  document.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', () => closeModal(btn.dataset.close)));
  document.querySelectorAll('.modal-overlay').forEach(overlay =>
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(overlay.id); }));

  // Suche
  const sidebarSearchInput = document.getElementById('searchInput');
  const sidebarSearchClear = document.getElementById('btnSidebarSearchClear');
  const updateSidebarSearchClear = () => {
    if (!sidebarSearchInput || !sidebarSearchClear) return;
    const hasValue = sidebarSearchInput.value.trim().length > 0;
    sidebarSearchClear.classList.toggle('hidden', !hasValue);
  };
  sidebarSearchInput.addEventListener('input', (e) => {
    filterProtocolList(e.target.value.trim().toLowerCase());
    updateSidebarSearchClear();
  });
  if (sidebarSearchClear) {
    sidebarSearchClear.addEventListener('click', () => {
      sidebarSearchInput.value = '';
      filterProtocolList('');
      updateSidebarSearchClear();
      sidebarSearchInput.focus();
    });
  }
  updateSidebarSearchClear();

  // Quick-Save
  document.getElementById('btnQuickSave').addEventListener('click', () => quickSaveDB());
  _setupQuickSaveLabelEdit();
  const btnSeriesToggle = document.getElementById('btnSeriesToggle');
  if (btnSeriesToggle) {
    btnSeriesToggle.addEventListener('click', () => {
      App.collapsedSeriesSectionAll = !App.collapsedSeriesSectionAll;
      renderProtocolList();
    });
  }

  // Projekt-Selector Dropdown (neues UI)
  setupProjectSelector();

  // [cleanup]
  setupProjectMenu();
  document.getElementById('btnConfirmDeleteProject').addEventListener('click', () => confirmDeleteProject());
  document.getElementById('btnExportBeforeDelete').addEventListener('click', () => exportProject());
  document.getElementById('btnConfirmCloseDatabase').addEventListener('click', () => confirmCloseDatabase());
  document.getElementById('btnExportBeforeClose').addEventListener('click', () => exportFullDB());

  // Papierkorb
  document.getElementById('btnTrash').addEventListener('click', () => openTrash());
  document.getElementById('btnCloseTrash').addEventListener('click', () => closeTrash());
  document.getElementById('btnExportPdf').addEventListener('click', async () => {
    if (!App.currentProtocolId) {
      showToast('Bitte zuerst ein Protokoll Ã¶ffnen.', 'error');
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
  document.getElementById('btnExportMd').addEventListener('click', async () => {
    if (!App.currentProtocolId) {
      showToast('Bitte zuerst ein Protokoll oeffnen.', 'error');
      return;
    }
    try {
      await saveCurrentProtocol();
      const fileName = await MarkdownExport.exportProtocolMarkdown(App.currentProtocolId, App.hiddenChapters);
      showToast(`Markdown exportiert: ${fileName}`, 'success');
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('Markdown-Export Fehler:', e);
      showToast('Markdown-Export fehlgeschlagen: ' + e.message, 'error');
    }
  });

  // [cleanup]
  const fileInput = document.getElementById('fileImportJson');
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) importProject(fileInput.files[0]);
  });
}

/* ============================================================
   DUPLIKAT
============================================================ */
/**
 * [cleanup]
 * [cleanup]
 * - neuer Name und Nummer 1
 * - Snapshots werden entfernt (keine Amendments im Duplikat)
 */
async function duplicateProtocol(protocolId, newName) {
  const source = await DB.Protocols.get(protocolId);
  if (!source) return;

  const newSeriesId = DB.uuid();
  // [cleanup]
  const copy = JSON.parse(JSON.stringify(source));
  delete copy.id;           // DB.Protocols.save erzeugt neue ID
  copy.seriesId   = newSeriesId;
  copy.seriesName = newName;
  copy.title      = newName;
  copy.number     = 1;
  copy.deletedAt  = null;
  copy.date       = new Date().toISOString().slice(0, 10);
  // [cleanup]
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

/* [cleanup] */
function setupProjectSelector() {
  const btn   = document.getElementById('btnProjectSelector');
  const panel = document.getElementById('projectSelectorPanel');
  if (!btn || !panel) return;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    panel.classList.toggle('hidden');
  });

  document.addEventListener('click', e => {
    if (!panel.classList.contains('hidden') && !panel.contains(e.target) && !btn.contains(e.target)) {
      panel.classList.add('hidden');
    }
  });
}

/* [cleanup] */
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

  const btnNewProjectMenu = document.getElementById('btnNewProjectMenu');
  if (btnNewProjectMenu) {
    btnNewProjectMenu.addEventListener('click', () => {
      panel.classList.add('hidden');
      openModal('modalNewProject');
    });
  }

  document.getElementById('btnAppInfo').addEventListener('click', () => {
    panel.classList.add('hidden');
    document.getElementById('appInfoVersion').textContent = 'Version ' + APP_VERSION;
    openModal('modalAppInfo');
  });

  const btnSettings = document.getElementById('btnSettings');
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      panel.classList.add('hidden');
      // Platzhalter: Einstellungen folgen spaeter.
    });
  }

  // [cleanup]
  const _logoEl = document.querySelector('.sidebar-logo-img');
  if (_logoEl) {
    _logoEl.style.cursor = 'pointer';
    _logoEl.addEventListener('click', () => {
      document.getElementById('appInfoVersion').textContent = 'Version ' + APP_VERSION;
      openModal('modalAppInfo');
    });
  }

  document.getElementById('btnLogout').addEventListener('click', () => {
    panel.classList.add('hidden');
    sessionStorage.removeItem('kadra_auth');
    location.reload();
  });

  // [cleanup]
  document.getElementById('btnCloseDatabase').addEventListener('click', () => {
    panel.classList.add('hidden');
    openModal('modalCloseDatabase');
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
  const _btnImportProj = document.getElementById('btnImportProjectSelector') || document.getElementById('btnImportProject');
  if (_btnImportProj) {
    _btnImportProj.addEventListener('click', () => {
      panel.classList.add('hidden');
      projFileInput.value = '';
      projFileInput.click();
    });
  }

  // meetjamie Import
  const jamieMdInput = document.getElementById('fileImportJamieMd');
  const jamieBtn = document.getElementById('btnImportJamieSidebar');
  const isMarkdownFile = (file) => !!file && /\.md$/i.test(file.name || '');
  const handleJamieSidebarFile = (file) => {
    if (!file) return;
    if (!isMarkdownFile(file)) {
      showToast('Bitte eine .md-Datei importieren.', 'error');
      return;
    }
    openJamieImportModal(file);
  };

  jamieBtn.addEventListener('click', () => {
    if (!App.currentProjectId) { showToast('Bitte zuerst ein Projekt Ã¶ffnen.', 'error'); return; }
    jamieMdInput.value = '';
    jamieMdInput.click();
  });
  jamieMdInput.addEventListener('change', () => {
    if (jamieMdInput.files.length > 0) handleJamieSidebarFile(jamieMdInput.files[0]);
  });

  // Drag & Drop direkt auf den Import-Button
  jamieBtn.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!jamieBtn.disabled) jamieBtn.classList.add('drag-over');
  });
  jamieBtn.addEventListener('dragleave', () => jamieBtn.classList.remove('drag-over'));
  jamieBtn.addEventListener('drop', (e) => {
    e.preventDefault();
    jamieBtn.classList.remove('drag-over');
    if (!App.currentProjectId) { showToast('Bitte zuerst ein Projekt Ã¶ffnen.', 'error'); return; }
    const f = e.dataTransfer.files[0];
    handleJamieSidebarFile(f);
  });

  // Jamie Modal: Datei-Drop-Zone klickbar machen
  document.getElementById('jamieFileDrop').addEventListener('click', () => {
    document.getElementById('jamieImportFile').value = '';
    document.getElementById('jamieImportFile').click();
  });
  document.getElementById('jamieImportFile').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      const f = e.target.files[0];
      document.getElementById('jamieFileLabel').textContent = f.name;
      document.getElementById('btnJamieImportConfirm').disabled = false;
      e.target._pendingFile = f;
    }
  });

  // Jamie Modal: Drag & Drop auf Drop-Zone
  const dropZone = document.getElementById('jamieFileDrop');
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) {
      document.getElementById('jamieFileLabel').textContent = f.name;
      document.getElementById('btnJamieImportConfirm').disabled = false;
      document.getElementById('jamieImportFile')._pendingFile = f;
    }
  });

  // Jamie Modal: Importieren-Button
  document.getElementById('btnJamieImportConfirm').addEventListener('click', importJamieMarkdown);
}

function openDeleteProjectModal() {
  if (!App.currentProjectId) {
    showToast('Bitte zuerst ein Projekt auswÃ¤hlen.', 'error');
    return;
  }
  const project = App.projects.find(p => p.id === App.currentProjectId);
  if (!project) return;
  document.getElementById('deleteProjectLabel').textContent =
    `${project.code}${project.name ? ' - ' + project.name : ''}`;
  openModal('modalDeleteProject');
}

async function confirmDeleteProject() {
  if (!App.currentProjectId) return;
  const project = App.projects.find(p => p.id === App.currentProjectId);
  if (!project) return;
  const label = project.code + (project.name ? ' - ' + project.name : '');

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
  const _lbl = document.getElementById('projectSelectorLabel'); if (_lbl) _lbl.textContent = 'Projekt w\u00e4hlen...';
  document.getElementById('protocolList').innerHTML =
    '<div class="empty-state-sidebar"><p>Kein Projekt ausgewaehlt.</p></div>';
  document.getElementById('emptyState').classList.remove('hidden');
  document.getElementById('protocolView').classList.add('hidden');
  document.getElementById('workspaceToolbar').classList.add('hidden');
  document.getElementById('btnNewProtocol').disabled = true;
  document.getElementById('btnImportJamieSidebar').disabled = true;

  closeModal('modalDeleteProject');
  showToast(`Projekt "${label}" in den Papierkorb verschoben.`, 'success');
}

async function confirmCloseDatabase() {
  if (Search.active) closeSearch();
  if (App.currentProtocolId) await saveCurrentProtocol();
  await DB.deleteDatabase();
  await DB.openDB();

  // [cleanup]
  App.currentProjectId  = null;
  App.currentProtocolId = null;
  App.projects  = [];
  App.protocols = [];
  App.selectedRow       = null;
  App.collapsedSections = new Set();
  App.allCollapsed      = false;
  App.selectedSeriesId  = null;
  App.collapsedSeriesIds = new Set();
  App.collapsedSeriesSectionAll = false;
  App.singleDocSectionCollapsed = false;
  App.pointFilters = { hideDone: false, onlyOverdue: false, onlyNew: false, onlyTasks: false, onlyApproval: false };
  App.hiddenChapters = new Set();
  App._saveFileHandle = null;
  App._saveFileName   = null;

  // localStorage leeren
  localStorage.removeItem('lastProjectId');
  localStorage.removeItem('lastProtocolId');

  // [cleanup]
  _updateQuickSaveLabel('-');

  // UI: sauberer Zustand
  renderProjectSelect();
  const _lbl = document.getElementById('projectSelectorLabel'); if (_lbl) _lbl.textContent = 'Projekt w\u00e4hlen...';
  document.getElementById('protocolList').innerHTML =
    '<div class="empty-state-sidebar"><p>Kein Projekt ausgewaehlt.</p></div>';
  document.getElementById('emptyState').classList.remove('hidden');
  document.getElementById('protocolView').classList.add('hidden');
  document.getElementById('workspaceToolbar').classList.add('hidden');
  document.getElementById('btnNewProtocol').disabled = true;
  document.getElementById('btnImportJamieSidebar').disabled = true;

  closeModal('modalCloseDatabase');
  showToast('Datenbank geschlossen - alle Daten geloescht.', 'success');
}

async function openTrash() {
  await renderTrash();
  document.getElementById('trashPanel').classList.remove('hidden');
}

function closeTrash() {
  document.getElementById('trashPanel').classList.add('hidden');
}

async function renderTrash() {
  // [cleanup]
  const projContainer = document.getElementById('trashProjectList');
  const divider       = document.getElementById('trashDivider');
  projContainer.innerHTML = '';

  const trashedProjects = await DB.Projects.getTrashed();
  if (trashedProjects.length > 0) {
    trashedProjects.sort((a, b) => b.deletedAt - a.deletedAt).forEach(proj => {
      const item = document.createElement('div');
      item.className = 'trash-item';
      const label = proj.code + (proj.name ? ' - ' + proj.name : '');
      const deletedDate = new Date(proj.deletedAt).toLocaleDateString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      item.innerHTML = `
        <div class="trash-item-title">${esc(label)}</div>
        <div class="trash-item-meta">Projekt - Geloescht: ${deletedDate}</div>
        <div class="trash-item-actions"></div>`;
      const actions = item.querySelector('.trash-item-actions');

      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'trash-action-btn restore';
      restoreBtn.textContent = 'Wiederherstellen';
      restoreBtn.addEventListener('click', async () => {
        await DB.Projects.restore(proj.id);
        // [cleanup]
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
      deleteBtn.textContent = 'Final löschen';
      deleteBtn.addEventListener('click', async () => {
        if (!(await appConfirm(`Projekt "${label}" mit allen Protokollen final löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden.`, {
          title: 'Final löschen',
          confirmLabel: 'Final löschen',
          danger: true,
        }))) return;
        // [cleanup]
        const allProto = await DB.Protocols.getByProject(proj.id);
        for (const p of allProto) await DB.Protocols.delete(p.id);
        await DB.Projects.delete(proj.id);
        await renderTrash();
        showToast('Projekt "' + label + '" endgültig gelöscht.', '');
      });

      actions.appendChild(restoreBtn);
      actions.appendChild(deleteBtn);
      projContainer.appendChild(item);
    });
    divider.classList.remove('hidden');
  } else {
    divider.classList.add('hidden');
  }

  // [cleanup]
  const container = document.getElementById('trashList');
  container.innerHTML = '';

  // [cleanup]
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
      <div class="trash-item-meta">Geloescht: ${deletedDate}</div>
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
      deleteBtn.textContent = 'Final löschen';
      deleteBtn.addEventListener('click', async () => {
      if (!(await appConfirm(`"${label}" final löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden.`, {
        title: 'Final löschen',
        confirmLabel: 'Final löschen',
        danger: true,
      }))) return;
      await DB.Protocols.delete(proto.id);
      await renderTrash();
      showToast('"' + label + '" endgültig gelöscht.', '');
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
    showToast('Bitte zuerst ein Projekt auswÃ¤hlen.', 'error');
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

  showToast('Export: ' + project.code + ' - ' + allProtocols.length + ' Protokoll(e).', 'success');
}

/* ============================================================
   MEETJAMIE MARKDOWN IMPORT
============================================================ */

/**
 * Parst eine meetjamie-Markdown-Datei und erstellt daraus eine KADRA-Aktennotiz.
 *
 * Regeln:
 * [cleanup]
 * [cleanup]
 *   Ignoriert:       ## Executive Summary, ## Full Summary (nur als Wrapper-Marker)
 * [cleanup]
 * [cleanup]
 * [cleanup]
 * [cleanup]
 * [cleanup]
 */
function parseJamieMarkdown(text) {
  const lines = text.split('\n');
  const sections = [];
  const tasks = [];
  let docTitle = '';
  let docDate = '';
  let docTime = '';
  const docParticipants = [];

  // Metadaten-Block parsen (Zeilen vor ## Executive Summary / ## Full Summary)
  let inParticipantList = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    if (/^##\s+/.test(line)) break; // Ende Metadaten-Block
    const titleMatch = line.match(/^Titel:\s*(.+)/i);
    if (titleMatch) { docTitle = titleMatch[1].trim(); inParticipantList = false; continue; }
    const dateMatch = line.match(/^Datum:\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/i);
    if (dateMatch) { docDate = `${dateMatch[3]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[1].padStart(2,'0')}`; inParticipantList = false; continue; }
    const timeMatch = line.match(/^Uhrzeit:\s*(\d{1,2}:\d{2})/i);
    if (timeMatch) { docTime = timeMatch[1]; inParticipantList = false; continue; }
    if (/^Teilnehmer/i.test(line)) { inParticipantList = true; continue; }
    if (inParticipantList) {
      const bullet = line.match(/^-\s+(.+)/);
      if (bullet) docParticipants.push(bullet[1].trim());
    }
  }

  const hasFullSummary = /^##\s+Full Summary/im.test(text);
  let inContent = !hasFullSummary;
  let inTasks = false;
  let currentSection = null;
  let lastMainBullet = null;
  let pendingFliesstext = ''; // sammelt aufeinanderfolgende Fliesstextzeilen eines Absatzes

  function stripBold(s) { return s.replace(/\*\*([^*]+)\*\*/g, '$1'); }

  function flushFliesstext() {
    const t = pendingFliesstext.trim();
    pendingFliesstext = '';
    if (!t || !currentSection) return;
    currentSection.points.push({ content: t, category: 'Info', responsible: '' });
    lastMainBullet = currentSection.points.length - 1;
  }

  function parseTask(line) {
    const m = line.match(/^-\s+\[\s*\]\s+(.+)/);
    if (!m) return null;
    const full = m[1].trim();
    const respMatch = full.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (respMatch) return { content: respMatch[1].trim(), responsible: respMatch[2].trim() };
    return { content: full, responsible: '' };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    // [cleanup]
    const task = parseTask(line);
    if (task) { flushFliesstext(); tasks.push(task); continue; }

    // [cleanup]
    if (/^##\s+(Tasks?|Aufgaben|Als N(a|ae)chstes?|N(a|ae)chste Schritte)\b/i.test(line)) {
      flushFliesstext();
      inTasks = true; inContent = false; currentSection = null; lastMainBullet = null;
      continue;
    }

    // [cleanup]
    if (/^#\s+/.test(line)) {
      docTitle = line.replace(/^#\s+/, '').trim();
      continue;
    }

    // [cleanup]
    if (/^##\s+Full Summary/i.test(line)) {
      flushFliesstext();
      inContent = true; inTasks = false; currentSection = null; lastMainBullet = null;
      continue;
    }

    // Ignorierte Sektionen
    if (/^##\s+(Executive Summary)\b/i.test(line)) {
      flushFliesstext();
      inContent = false; inTasks = false; currentSection = null;
      continue;
    }

    // [cleanup]
    if (/^#{2,3}\s+/.test(line)) {
      flushFliesstext();
      if (!inTasks) {
        inContent = true;
        const title = line.replace(/^#{2,3}\s+/, '').trim();
        currentSection = { title, points: [] };
        sections.push(currentSection);
        lastMainBullet = null;
      }
      continue;
    }

    if (!inContent || !currentSection) continue;

    // [cleanup]
    if (line === '') {
      flushFliesstext();
      lastMainBullet = null;
      continue;
    }

    // [cleanup]
    const subBullet = line.match(/^[ \t]{2,}-\s+(.*)/);
    if (subBullet && lastMainBullet !== null) {
      flushFliesstext();
      const subContent = stripBold(subBullet[1]).trim();
      if (subContent) currentSection.points[lastMainBullet].content += '\n- ' + subContent;
      continue;
    }

    // [cleanup]
    const mainBullet = line.match(/^-\s+(.*)/);
    if (mainBullet) {
      flushFliesstext();
      const content = stripBold(mainBullet[1]).trim();
      if (content) {
        currentSection.points.push({ content, category: 'Info', responsible: '' });
        lastMainBullet = currentSection.points.length - 1;
      }
      continue;
    }

    // [cleanup]
    const trimmed = stripBold(line).trim();
    if (trimmed) {
      pendingFliesstext += (pendingFliesstext ? ' ' : '') + trimmed;
    }
  }

  flushFliesstext(); // letzten Absatz sichern

  return { sections, tasks, docTitle, docDate, docTime, docParticipants };
}

/**
 * [cleanup]
 * Liest die Datei vor und extrahiert # H1-Titel (Vorrang) oder Dateinamen als Titel-Vorschlag.
 */
async function openJamieImportModal(file) {
  const name = file.name.replace(/\.[^.]+$/, '');
  const dateMatch = name.match(/^(\d{2})(\d{2})(\d{2})_/);
  let dateVal = new Date().toISOString().slice(0, 10);
  if (dateMatch) dateVal = `20${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;

  // Dateiinhalt vorab lesen um Metadaten zu extrahieren
  let titleVal = name.replace(/^\d{6}_/, '').replace(/_/g, ' ').trim();
  try {
    const text = await file.text();
    const { docTitle, docDate, docParticipants } = parseJamieMarkdown(text);
    if (docTitle) titleVal = docTitle;
    if (docDate) dateVal = docDate;
    // [cleanup]
    document.getElementById('jamieImportFile')._pendingFile = file;
    document.getElementById('jamieImportFile')._pendingText = text;
    document.getElementById('jamieImportFile')._pendingParticipants = docParticipants;
  } catch (e) {
    document.getElementById('jamieImportFile')._pendingFile = file;
    document.getElementById('jamieImportFile')._pendingText = null;
    document.getElementById('jamieImportFile')._pendingParticipants = [];
  }

  document.getElementById('jamieImportTitle').value = titleVal;
  document.getElementById('jamieImportDate').value  = dateVal;
  document.getElementById('jamieImportParticipants').value = '';
  document.getElementById('jamieFileLabel').textContent = file.name;
  document.getElementById('btnJamieImportConfirm').disabled = false;

  openModal('modalJamieImport');
}

/**
 * Erstellt aus geparsten Jamie-Daten eine KADRA-Aktennotiz im aktuellen Projekt.
 */
async function importJamieMarkdown() {
  if (!App.currentProjectId) {
    showToast('Kein Projekt geÃ¶ffnet.', 'error');
    return;
  }

  const fileInput = document.getElementById('jamieImportFile');
  const file = fileInput._pendingFile;
  if (!file) { showToast('Keine Datei ausgewaehlt.', 'error'); return; }

  const title        = document.getElementById('jamieImportTitle').value.trim();
  const date         = document.getElementById('jamieImportDate').value;
  const participantRaw = document.getElementById('jamieImportParticipants').value.trim();

  if (!title) { showToast('Bitte Titel eingeben.', 'error'); return; }

  let text = fileInput._pendingText;
  if (!text) {
    try {
      text = await file.text();
    } catch (e) {
      showToast('Datei konnte nicht gelesen werden.', 'error');
      return;
    }
  }

  const { sections, tasks, docTime, docParticipants: parsedParticipants } = parseJamieMarkdown(text);

  const project = App.projects.find(p => p.id === App.currentProjectId) || {};

  // Struktur aufbauen: P + A-Abschnitte aus Full Summary + N
  const structure = { P: { label: 'Praeambel', subchapters: [] } };
  const chKeys = [];
  let charCode = 65; // A
  for (const sec of sections) {
    // [cleanup]
    while (charCode === 78 || charCode === 80) charCode++; // N=78, P=80
    if (charCode > 90) break;
    const key = String.fromCharCode(charCode);
    structure[key] = { label: sec.title, subchapters: [] };
    chKeys.push(key);
    charCode++;
  }
  structure['N'] = { label: 'Naechste Schritte', subchapters: [] };

  // Punkte erzeugen
  const points = [];
  let akSectionNum = 0;

  for (let si = 0; si < sections.length; si++) {
    const chKey = chKeys[si];
    akSectionNum++;
    const sec = sections[si];
    sec.points.forEach((pt, idx) => {
      points.push({
        id: `${akSectionNum}.${String(idx + 1).padStart(2, '0')}`,
        chapter: chKey, subchapter: null, topic: null,
        content: pt.content,
        category: 'Info', responsible: '', deadline: '',
        done: false, isNew: false, doneLastProtocol: false,
        createdInProtocol: null,
      });
    });
  }

  // [cleanup]
  tasks.forEach((t, idx) => {
    points.push({
      id: `N.${String(idx + 1).padStart(2, '0')}`,
      chapter: 'N', subchapter: null, topic: null,
      content: t.content,
      category: 'Aufgabe', responsible: t.responsible, deadline: '',
      done: false, isNew: false, doneLastProtocol: false,
      createdInProtocol: null,
    });
  });

  // Teilnehmer: aus Metadaten-Block der MD-Datei (gecacht), sonst aus manuellem Eingabefeld
  const cachedParticipants = fileInput._pendingParticipants;
  const participantNames = (cachedParticipants && cachedParticipants.length)
    ? cachedParticipants
    : (participantRaw ? participantRaw.split(',').map(s => s.trim()).filter(Boolean) : []);
  const participants = participantNames.map(name => ({
    id: DB.uuid(),
    name, company: '', abbr: '', email: '',
    attended: true, inDistrib: true,
  }));

  const protocol = {
    projectId: App.currentProjectId,
    type: 'Aktennotiz',
    seriesId: DB.uuid(),
    seriesName: title,
    title,
    number: null,
    date: date || new Date().toISOString().slice(0, 10),
    time: docTime || '', location: '',
    tenant:   project.tenant || '',
    landlord: project.owner  || '',
    participants,
    structure,
    points,
    attachments: [],
    deletedAt: null,
    author: { name: 'Olaf Schueler', firstName: 'Olaf', lastName: 'Schueler', company: 'Hopro GmbH & Co. KG', date: '', seen: '' },
    customAbbreviations: [],
  };

  closeModal('modalJamieImport');
  fileInput._pendingFile = null;
  fileInput._pendingText = null;

  const saved = await DB.Protocols.save(protocol);
  App.protocols = await DB.Protocols.getActiveByProject(App.currentProjectId);
  renderProtocolList();
  await openProtocol(saved.id);
  showToast(`Aktennotiz "${title}" importiert (${points.length} Punkte).`, 'success');
}

/**
 * Importiert ein Projekt + Protokolle aus einer JSON-Backup-Datei.
 * [cleanup]
 */
async function importProject(file) {
  let data;
  try {
    const text = await file.text();
    data = JSON.parse(text);
  } catch {
    showToast('Datei konnte nicht gelesen werden. Ungueltiges JSON.', 'error');
    return;
  }

  // Validierung
  if (!data._format || data._format !== 'ProtokollApp-Backup' || !data.project || !data.protocols) {
    showToast('Ungueltiges Backup-Format.', 'error');
    return;
  }

  const proj = data.project;
  if (!proj.id || !proj.code) {
    showToast('Projekt-Daten unvollstaendig.', 'error');
    return;
  }

  // [cleanup]
  const existing = await DB.Projects.get(proj.id);
  if (existing) {
    const ok = await appConfirm(
      `Projekt "${existing.code}" existiert bereits.\n` +
      `Ueberschreiben mit Import-Daten (${data.protocols.length} Protokolle)?`,
      { title: 'Import bestaetigen', confirmLabel: 'Ueberschreiben', danger: true }
    );
    if (!ok) return;
  }

  // Projekt speichern
  await DB.Projects.save(proj);

  // [cleanup]
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

  showToast('Import: ' + proj.code + ' - ' + count + ' Protokoll(e) importiert.', 'success');
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
  App._saveFileName = fileName || '-';
  const label = document.getElementById('quickSaveLabel');
  if (label) {
    label.textContent = (fileName && fileName !== '-') ? fileName : 'Dateiname.json';
    label.title       = 'Dateinamen der letzten Speicherung eingeben';
  }
  // [cleanup]
  if (fileName && fileName !== '-') {
    localStorage.setItem('kadra_saveFileName', fileName);
  } else {
    localStorage.removeItem('kadra_saveFileName');
  }
}

/* [cleanup] */
function _setupQuickSaveLabelEdit() {
  const label = document.getElementById('quickSaveLabel');
  if (!label) return;

  label.addEventListener('click', () => {
    if (!App._saveFileName || App._saveFileName === '-') return;

    const input = document.createElement('input');
    input.type  = 'text';
    input.value = App._saveFileName;
    input.className = 'quicksave-label-input';

    const finish = () => {
      const val = input.value.trim();
      if (val && val !== App._saveFileName) {
        App._saveFileName = val;
        App._saveFileHandle = null; // Handle passt nicht mehr -> Reset
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
 * [cleanup]
 * Erzeugt IMMER einen neuen Dateinamen und Download-Dialog.
 */
async function exportFullDB() {
  const { blob, projectCount, protocolCount } = await _buildBackup();
  const fileName = _backupFileName();

  // [cleanup]
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      // [cleanup]
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
 * [cleanup]
 */
async function quickSaveDB() {
  const { blob, projectCount, protocolCount } = await _buildBackup();

  // [cleanup]
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
      // [cleanup]
      App._saveFileHandle = null;
    }
  }

  // [cleanup]
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
    showToast('Datei konnte nicht gelesen werden. Ungueltiges JSON.', 'error');
    return;
  }

  // Validierung
  if (!data._format || data._format !== 'KADRA-FullBackup') {
    showToast('Ungueltiges Backup-Format. Erwartet: KADRA-FullBackup.', 'error');
    return;
  }
  if (!Array.isArray(data.projects) || !Array.isArray(data.protocols)) {
    showToast('Backup-Daten unvollstaendig (projects/protocols fehlen).', 'error');
    return;
  }

  const ok = await appConfirm(
    `Datenbank-Import:\n` +
    `${data.projects.length} Projekt(e) und ${data.protocols.length} Protokoll(e).\n\n` +
    `Bestehende Daten mit gleicher ID werden ueberschrieben.\nFortfahren?`
    ,
    { title: 'Datenbank-Import', confirmLabel: 'Fortfahren', danger: true }
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

  // [cleanup]
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

  // [cleanup]
  if (App.currentProjectId) {
    App.protocols = await DB.Protocols.getActiveByProject(App.currentProjectId);
    renderProtocolList();
  }

  // [cleanup]
  _updateQuickSaveLabel(file.name);

  showToast(`Import: ${pCount} Projekt(e), ${prCount} Protokoll(e) importiert.`, 'success');
}

/* ============================================================
   UTILS
============================================================ */

/* [cleanup] */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/* [cleanup] */
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/* [cleanup] */
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

/* [cleanup] */
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

async function appConfirm(message, opts = {}) {
  const {
    title = 'Bestätigen',
    confirmLabel = 'OK',
    cancelLabel = 'Abbrechen',
    danger = false,
  } = opts;

  const modal = document.getElementById('modalConfirm');
  const titleEl = document.getElementById('confirmModalTitle');
  const msgEl = document.getElementById('confirmModalMessage');
  const btnOk = document.getElementById('btnConfirmDialogOk');
  const btnCancel = document.getElementById('btnConfirmDialogCancel');
  const btnClose = document.getElementById('btnConfirmDialogClose');

  if (!modal || !titleEl || !msgEl || !btnOk || !btnCancel || !btnClose) {
    return confirm(message);
  }

  titleEl.textContent = title;
  msgEl.textContent = message;
  btnOk.textContent = confirmLabel;
  btnCancel.textContent = cancelLabel;
  btnOk.classList.remove('btn-primary', 'btn-danger');
  btnOk.classList.add(danger ? 'btn-danger' : 'btn-primary');

  openModal('modalConfirm');

  return await new Promise((resolve) => {
    let settled = false;
    const settle = (val) => {
      if (settled) return;
      settled = true;
      cleanup();
      closeModal('modalConfirm');
      resolve(val);
    };

    const onOk = () => settle(true);
    const onCancel = () => settle(false);
    const onOverlay = (e) => { if (e.target === modal) settle(false); };
    const onEsc = (e) => { if (e.key === 'Escape') settle(false); };

    const cleanup = () => {
      btnOk.removeEventListener('click', onOk);
      btnCancel.removeEventListener('click', onCancel);
      btnClose.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onOverlay);
      document.removeEventListener('keydown', onEsc);
    };

    btnOk.addEventListener('click', onOk);
    btnCancel.addEventListener('click', onCancel);
    btnClose.addEventListener('click', onCancel);
    modal.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onEsc);

    setTimeout(() => btnOk.focus(), 0);
  });
}

function clearForm(modalId) {
  document.querySelectorAll(`#${modalId} input, #${modalId} select`).forEach(el => {
    if (el.type === 'checkbox') el.checked = false; else el.value = '';
  });
}

function showToast(message, type = '') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ` ${type} toast-${type}` : '');
  t.textContent = message;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/* ============================================================
   VOLLTEXTSUCHE
============================================================ */
const Search = {
  active: false,
  query: '',
  matches: [],       // Array of matched .row-point <tr> elements
  currentIndex: -1,  // Active match index
  _debounceTimer: null,
};

function setupFulltextSearch() {
  const input   = document.getElementById('searchBarInput');
  if (!input) return;
  const btnPrev = document.getElementById('searchBarPrev');
  const btnNext = document.getElementById('searchBarNext');
  if (btnPrev) btnPrev.addEventListener('click', () => jumpToMatch(-1));
  if (btnNext) btnNext.addEventListener('click', () => jumpToMatch(1));

  input.addEventListener('input', () => {
    clearTimeout(Search._debounceTimer);
    Search._debounceTimer = setTimeout(() => executeSearch(input.value), 150);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      jumpToMatch(e.shiftKey ? -1 : 1);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSearch();
    }
  });

  // [cleanup]
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      // Nur abfangen wenn Protokoll offen
      if (!document.getElementById('protocolView').classList.contains('hidden')) {
        e.preventDefault();
        openSearch();
      }
    }
  });
}

function openSearch() {
  Search.active = true;
  const input = document.getElementById('searchBarInput');
  if (input) {
    input.focus();
    input.select();
    if (input.value) executeSearch(input.value);
  }
}

function closeSearch() {
  Search.active = false;
  Search.query = '';
  Search.matches = [];
  Search.currentIndex = -1;

  const input = document.getElementById('searchBarInput');
  const count = document.getElementById('searchBarCount');
  const prev = document.getElementById('searchBarPrev');
  const next = document.getElementById('searchBarNext');

  if (input) input.value = '';
  if (count) { count.textContent = ''; count.classList.add('hidden'); }
  if (prev) prev.classList.add('hidden');
  if (next) next.classList.add('hidden');

  document.querySelectorAll('#pointsBody .search-hidden').forEach(tr => tr.classList.remove('search-hidden'));
  document.querySelectorAll('#pointsBody .search-match').forEach(tr => tr.classList.remove('search-match'));
  document.querySelectorAll('#pointsBody .search-match-active').forEach(tr => tr.classList.remove('search-match-active'));

  document.querySelectorAll('#pointsBody .search-struct-hidden').forEach(tr => {
    tr.classList.remove('search-struct-hidden');
    tr.style.removeProperty('display');
  });
}

function executeSearch(rawQuery) {
  const query = rawQuery.trim().toLowerCase();
  Search.query = query;
  Search.matches = [];
  Search.currentIndex = -1;

  const countEl = document.getElementById('searchBarCount');

  // Clear previous highlights
  document.querySelectorAll('#pointsBody .search-hidden').forEach(tr => tr.classList.remove('search-hidden'));
  document.querySelectorAll('#pointsBody .search-match').forEach(tr => tr.classList.remove('search-match'));
  document.querySelectorAll('#pointsBody .search-match-active').forEach(tr => tr.classList.remove('search-match-active'));
  document.querySelectorAll('#pointsBody .search-struct-hidden').forEach(tr => {
    tr.classList.remove('search-struct-hidden');
    tr.style.removeProperty('display');
  });

  if (!query) {
    const prevBtn = document.getElementById('searchBarPrev');
    const nextBtn = document.getElementById('searchBarNext');
    if (countEl) { countEl.textContent = ''; countEl.classList.add('hidden'); }
    if (prevBtn) prevBtn.classList.add('hidden');
    if (nextBtn) nextBtn.classList.add('hidden');
    return;
  }

  const pointRows = document.querySelectorAll('#pointsBody .row-point');
  const structRows = document.querySelectorAll('#pointsBody .row-chapter, #pointsBody .row-subchapter, #pointsBody .row-topic');

  // Track which structure keys have at least one matching point
  const matchedChapters    = new Set();
  const matchedSubchapters = new Set();
  const matchedTopics      = new Set();

  pointRows.forEach(tr => {
    // Skip rows already hidden by other filters
    if (tr.classList.contains('filter-hidden') || tr.classList.contains('chapter-filtered') || tr.classList.contains('row-hidden')) return;

    const content    = (tr.querySelector('[data-field="content"]')?.value || '').toLowerCase();
    const pointId    = (tr.querySelector('.point-id')?.textContent || '').toLowerCase();
    const responsible= (tr.querySelector('.resp-display')?.textContent || '').toLowerCase();

    const isMatch = content.includes(query) || pointId.includes(query) || responsible.includes(query);

    if (isMatch) {
      tr.classList.add('search-match');
      Search.matches.push(tr);
      // Track parent structure
      if (tr.dataset.chapter)    matchedChapters.add(tr.dataset.chapter);
      if (tr.dataset.subchapter) matchedSubchapters.add(tr.dataset.subchapter);
      if (tr.dataset.topic)      matchedTopics.add(tr.dataset.topic);
    } else {
      tr.classList.add('search-hidden');
    }
  });

  // Hide structure rows that have no matching children
  structRows.forEach(tr => {
    let keep = false;
    if (tr.classList.contains('row-chapter')) {
      keep = matchedChapters.has(tr.dataset.chapter);
    } else if (tr.classList.contains('row-subchapter')) {
      keep = matchedSubchapters.has(tr.dataset.subchapter);
    } else if (tr.classList.contains('row-topic')) {
      keep = matchedTopics.has(tr.dataset.topic);
    }
    if (!keep) {
      tr.classList.add('search-struct-hidden');
      tr.style.display = 'none';
    }
  });

  // Update counter + show/hide nav arrows
  const total = Search.matches.length;
  const prevBtn = document.getElementById('searchBarPrev');
  const nextBtn = document.getElementById('searchBarNext');
  if (total > 0) {
    Search.currentIndex = 0;
    Search.matches[0].classList.add('search-match-active');
    if (countEl) { countEl.textContent = `1 von ${total}`; countEl.classList.remove('hidden'); }
    if (prevBtn) prevBtn.classList.remove('hidden');
    if (nextBtn) nextBtn.classList.remove('hidden');
    scrollToMatch(Search.matches[0]);
  } else if (query.length > 0) {
    if (countEl) { countEl.textContent = 'Keine Treffer'; countEl.classList.remove('hidden'); }
    if (prevBtn) prevBtn.classList.add('hidden');
    if (nextBtn) nextBtn.classList.add('hidden');
  } else {
    if (countEl) { countEl.textContent = ''; countEl.classList.add('hidden'); }
    if (prevBtn) prevBtn.classList.add('hidden');
    if (nextBtn) nextBtn.classList.add('hidden');
  }
}

function jumpToMatch(direction) {
  if (Search.matches.length === 0) return;

  // Remove active from current
  if (Search.currentIndex >= 0) {
    Search.matches[Search.currentIndex].classList.remove('search-match-active');
  }

  Search.currentIndex += direction;
  if (Search.currentIndex >= Search.matches.length) Search.currentIndex = 0;
  if (Search.currentIndex < 0) Search.currentIndex = Search.matches.length - 1;

  const tr = Search.matches[Search.currentIndex];
  tr.classList.add('search-match-active');
  const _cnt = document.getElementById('searchBarCount');
  if (_cnt) _cnt.textContent = `${Search.currentIndex + 1} von ${Search.matches.length}`;
  scrollToMatch(tr);
}

function scrollToMatch(tr) {
  tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Icon-Funktionen jetzt in js/icons.js definiert

function isLocalDevHost() {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

async function forceFreshReload() {
  try {
    if ('serviceWorker' in navigator && isLocalDevHost()) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    }
  } catch (_) {}

  const url = new URL(window.location.href);
  url.searchParams.set('_reload', String(Date.now()));
  window.location.replace(url.toString());
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    if (isLocalDevHost()) {
      // Live-Server/localhost: kein SW-Caching, um stale CSS/JS zu vermeiden.
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      } catch (_) {}
      return;
    }
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  });
}

