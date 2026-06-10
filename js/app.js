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

const APP_VERSION = '0.4';

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
  _pendingTopicMove:  null,   // Thema-ID, das nach UKAP-Anlage per Drag dorthin verschoben wird
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
  setLeadingIcon('#btnRecentDb', iconHistory);
  ensureAppendedIcon('.project-submenu-chevron', iconChevronRight());
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
  setLeadingIcon('#btnImportVoctaSidebar', iconFileInput);
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
  setOnlyIcon('#btnExportMenu', iconFileUp);
  setOnlyIcon('#btnDeleteProtocol', iconShredder);
  setLeadingIcon('.toolbar-search-wrap', iconSearch);
  setOnlyIcon('#searchBarPrev', iconChevronUp);
  setOnlyIcon('#searchBarNext', iconChevronDown);

  // Section headers / controls
  setLeadingIcon('#sectionPoints .proto-card-header', iconList);
  setLeadingIcon('#sectionParticipants .proto-card-header', iconUsers);
  setLeadingIcon('#sectionAttachments .proto-card-header', iconPaperclip);
  setLeadingIcon('#sectionAuthor .proto-card-header', iconPenLine);
  setLeadingIcon('#sectionLegend .proto-card-header', iconBookOpen);
  setOnlyIcon('#btnAddParticipant', iconUserPlus);
  setOnlyIcon('#btnAuthorDatePicker', iconCalendar);

  // Modals / dialog controls
  setAllOnlyIcons('.modal-close', iconX);
  setLeadingIcon('#btnExportBeforeDelete', iconDownload);
  setLeadingIcon('#btnExportBeforeClose', iconDownload);
  setLeadingIcon('#voctaFileDrop', iconDownload);
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
  document.getElementById('btnImportVoctaSidebar').disabled = false;
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
  const clipHtml = hasFiles ? `<span class="protocol-item-clip" title="Enthält Datei-Anlagen">${iconPaperclip()}</span>` : '';

  const sName = esc(proto.seriesName || proto.title || proto.type);
  const label = proto.type === 'Aktennotiz'
    ? `${sName}${clipHtml}`
    : `${sName} Nr. ${String(proto.number || 1).padStart(2,'0')}${clipHtml}`;

  const main = document.createElement('div');
  main.className = 'protocol-item-main';
  main.setAttribute('role', 'button');
  main.tabIndex = 0;
  main.setAttribute('aria-label', `Protokoll ${proto.seriesName || proto.title || proto.type} öffnen`);
  main.innerHTML = `
    <div class="protocol-item-title">${label}</div>
    <div class="protocol-item-date">${dateStr}</div>`;
  main.addEventListener('click', (e) => {
    if (e.target.closest('.protocol-item-menu-wrap')) return;
    App.selectedSeriesId = proto.seriesId || ('type:' + proto.type);
    document.querySelectorAll('.series-header').forEach(h => h.classList.remove('selected'));
    openProtocol(proto.id);
  });
  main.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); main.click(); }
  });

  const menuWrap = document.createElement('div');
  menuWrap.className = 'protocol-item-menu-wrap';

  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'protocol-item-menu-btn';
  menuBtn.title = 'Optionen';
  menuBtn.innerHTML = iconEllipsisVertical();

  const menuPanel = document.createElement('div');
  menuPanel.className = 'protocol-item-menu-panel';
  menuPanel.innerHTML = `
    <button type="button" class="protocol-item-menu-entry" data-action="dup">
      ${iconCopy()} <span>Duplizieren</span>
    </button>
    <button type="button" class="protocol-item-menu-entry danger" data-action="del">
      ${iconTrash()} <span>Löschen</span>
    </button>`;

  const closeMenu = () => {
    menuWrap.classList.remove('open');
    menuPanel.classList.remove('open');
    if (menuPanel.parentNode) menuPanel.parentNode.removeChild(menuPanel);
  };

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menuPanel.classList.contains('open');
    closeAllProtocolMenus();
    if (!isOpen) {
      document.body.appendChild(menuPanel);
      // open-Klasse VOR der Positionierung setzen, damit offsetWidth die
      // tatsaechliche Panelbreite liefert (sonst 0 -> falsche Position beim
      // ersten Oeffnen, Klick auf "Loeschen" trifft daneben).
      menuWrap.classList.add('open');
      menuPanel.classList.add('open');
      const rect = menuBtn.getBoundingClientRect();
      menuPanel.style.top  = (rect.bottom + 4) + 'px';
      menuPanel.style.left = (rect.right - menuPanel.offsetWidth) + 'px';
    }
  });

  menuPanel.addEventListener('click', async (e) => {
    e.stopPropagation();
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    closeMenu();

    if (action === 'dup') {
      App._duplicatingProtocolId = proto.id;
      document.getElementById('duplicateName').value = '';
      openModal('modalDuplicate');
      setTimeout(() => document.getElementById('duplicateName').focus(), 80);
    } else if (action === 'del') {
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
    }
  });

  menuWrap.appendChild(menuBtn);
  item.appendChild(main);
  item.appendChild(menuWrap);
  return item;
}

/** Schließt alle offenen Protokoll-Item-Menüs und entfernt ihre Panels aus dem body. */
function closeAllProtocolMenus() {
  document.querySelectorAll('.protocol-item-menu-wrap.open').forEach(w => w.classList.remove('open'));
  document.querySelectorAll('body > .protocol-item-menu-panel.open').forEach(p => {
    p.classList.remove('open');
    if (p.parentNode) p.parentNode.removeChild(p);
  });
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
  // Scroll-Position des Arbeitsbereichs sichern: Neuaufbau des tbody laesst die Hoehe
  // kurz auf 0 kollabieren, was den Container sonst an eine andere Stelle springen laesst.
  const scrollContainer = document.querySelector('.workspace-content');
  const savedScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
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
    // Nur Nutzer-Kapitel (ab F, keine Aktennotiz) sind per Drag umsortierbar
    const isReorderableChapter = !isAk && !DEFAULT_CHAPTERS.includes(chKey);

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
          <span class="structure-actions">
            ${chDelBtn}
            ${isReorderableChapter ? `<span class="drag-handle chapter-drag-handle" title="Kapitel verschieben">${iconGrip()}</span>` : ''}
          </span>
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

    // Kapitel als Drag-Quelle (nur F+): Reorder zwischen Nutzer-Kapiteln
    if (isReorderableChapter) {
      const chHandle = chRow.querySelector('.chapter-drag-handle');
      let chHandleDown = false;
      chHandle.addEventListener('mousedown',  () => { chHandleDown = true; chRow.draggable = true; });
      chHandle.addEventListener('touchstart', () => { chHandleDown = true; chRow.draggable = true; }, { passive: true });
      document.addEventListener('mouseup',  () => { chHandleDown = false; chRow.draggable = false; }, { signal: ac.signal });
      document.addEventListener('touchend', () => { chHandleDown = false; chRow.draggable = false; }, { signal: ac.signal });

      chRow.addEventListener('dragstart', e => {
        if (!chHandleDown) { e.preventDefault(); return; }
        e.dataTransfer.setData('text/plain', chKey);
        e.dataTransfer.setData('application/x-dragtype', 'chapter');
        e.dataTransfer.effectAllowed = 'move';
        chRow.classList.add('drag-active');
        App._dragType = 'chapter';
        startDragAutoScroll();
      });
      chRow.addEventListener('dragend', () => {
        chRow.classList.remove('drag-active');
        App._dragType = null;
        stopDragAutoScroll();
        document.querySelectorAll('.drag-over-top, .drag-over-bottom, .drag-over-into').forEach(el => {
          el.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-into');
        });
      });
    }

    // Drop-Ziel Kapitel-Zeile: UKAP/Punkt ans Kapitel-Ende; Thema -> neues UKAP anlegen (Modal);
    // anderes Nutzer-Kapitel -> Reorder (davor/danach)
    chRow.addEventListener('dragover', e => {
      // Kapitel-Reorder: nur zwischen Nutzer-Kapiteln (F+), A-E sind keine gueltigen Ziele
      if (App._dragType === 'chapter') {
        if (!isReorderableChapter) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = chRow.getBoundingClientRect();
        const mid  = rect.top + rect.height / 2;
        chRow.classList.toggle('drag-over-top',    e.clientY < mid);
        chRow.classList.toggle('drag-over-bottom', e.clientY >= mid);
        return;
      }
      if (App._dragType !== 'subchapter' && App._dragType !== 'point' && App._dragType !== 'topic') return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      chRow.classList.add('drag-over-into');
    });
    chRow.addEventListener('dragleave', () => {
      chRow.classList.remove('drag-over-into', 'drag-over-top', 'drag-over-bottom');
    });
    chRow.addEventListener('drop', async e => {
      e.preventDefault();
      chRow.classList.remove('drag-over-into', 'drag-over-top', 'drag-over-bottom');
      const draggedId = e.dataTransfer.getData('text/plain');
      if (App._dragType === 'chapter') {
        if (!isReorderableChapter) return;
        const rect = chRow.getBoundingClientRect();
        const after = e.clientY >= rect.top + rect.height / 2;
        await reorderUserChapter(draggedId, chKey, after);
      } else if (App._dragType === 'subchapter') {
        await moveSubchapterTo(draggedId, { chapter: chKey, anchorSubId: null });
      } else if (App._dragType === 'point') {
        await movePointTo(draggedId, { chapter: chKey, subchapter: null, topic: null });
      } else if (App._dragType === 'topic') {
        // Thema braucht ein UKAP als Container -> Anlage-Modal, danach Thema hineinverschieben
        App._pendingTopicMove = draggedId;
        openAddSubchapterModal(chKey);
      }
    });

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
        startDragAutoScroll();
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
        stopDragAutoScroll();
        document.querySelectorAll('.drag-over-top, .drag-over-bottom, .drag-over-into').forEach(el => {
          el.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-into');
        });
        document.querySelectorAll('.drag-child-hidden').forEach(el => {
          el.classList.remove('drag-child-hidden');
        });
      });

      subRow.addEventListener('dragover', e => {
        // Punkt- oder Thema-Drop auf UKAP-Zeile: landet ans Ende dieses UKAP
        if (App._dragType === 'point' || App._dragType === 'topic') {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          subRow.classList.add('drag-over-into');
          return;
        }
        // UKAP-Drop auf UKAP-Zeile: frei ueber alle Kapitel (davor/danach)
        if (App._dragType !== 'subchapter') return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = subRow.getBoundingClientRect();
        const mid  = rect.top + rect.height / 2;
        subRow.classList.toggle('drag-over-top',    e.clientY < mid);
        subRow.classList.toggle('drag-over-bottom', e.clientY >= mid);
      });

      subRow.addEventListener('dragleave', () => {
        subRow.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-into');
      });

      subRow.addEventListener('drop', async e => {
        e.preventDefault();
        subRow.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-into');

        // Punkt-Drop auf UKAP-Zeile -> ans Ende des UKAP (kein Thema)
        if (App._dragType === 'point') {
          const draggedId = e.dataTransfer.getData('text/plain');
          await movePointTo(draggedId, { chapter: chKey, subchapter: sub.id, topic: null });
          return;
        }
        // Thema-Drop auf UKAP-Zeile -> ans Ende dieses UKAP
        if (App._dragType === 'topic') {
          const draggedTopicId = e.dataTransfer.getData('text/plain');
          await moveTopicTo(draggedTopicId, { chapter: chKey, subchapter: sub.id, anchorTopicId: null });
          return;
        }

        if (App._dragType !== 'subchapter') return;

        const draggedSubId = e.dataTransfer.getData('text/plain');
        if (draggedSubId === sub.id) return;

        const rect = subRow.getBoundingClientRect();
        const after = e.clientY >= rect.top + rect.height / 2;
        await moveSubchapterTo(draggedSubId, {
          chapter:     chKey,
          anchorSubId: sub.id,
          after,
        });
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
          startDragAutoScroll();
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
          stopDragAutoScroll();
          document.querySelectorAll('.drag-over-top, .drag-over-bottom, .drag-over-into').forEach(el => {
            el.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-into');
          });
          document.querySelectorAll('.drag-child-hidden').forEach(el => {
            el.classList.remove('drag-child-hidden');
          });
        });

        topicRow.addEventListener('dragover', e => {
          // Punkt-Drop auf Themen-Zeile: Punkt landet unter diesem Thema
          if (App._dragType === 'point') {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            topicRow.classList.add('drag-over-into');
            return;
          }
          // Thema-Drop auf Themen-Zeile: frei ueber alle UKAPs/Kapitel (davor/danach)
          if (App._dragType !== 'topic') return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          const rect = topicRow.getBoundingClientRect();
          const mid  = rect.top + rect.height / 2;
          topicRow.classList.toggle('drag-over-top',    e.clientY < mid);
          topicRow.classList.toggle('drag-over-bottom', e.clientY >= mid);
        });

        topicRow.addEventListener('dragleave', () => {
          topicRow.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-into');
        });

        topicRow.addEventListener('drop', async e => {
          e.preventDefault();
          topicRow.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-into');

          // Punkt-Drop auf Themen-Zeile -> ans Ende dieses Themas
          if (App._dragType === 'point') {
            const draggedId = e.dataTransfer.getData('text/plain');
            await movePointTo(draggedId, { chapter: chKey, subchapter: sub.id, topic: topic.id });
            return;
          }

          if (App._dragType !== 'topic') return;

          const draggedTopicId = e.dataTransfer.getData('text/plain');
          if (draggedTopicId === topic.id) return;

          const rect = topicRow.getBoundingClientRect();
          const after = e.clientY >= rect.top + rect.height / 2;
          await moveTopicTo(draggedTopicId, {
            chapter:       chKey,
            subchapter:    sub.id,
            anchorTopicId: topic.id,
            after,
          });
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
  renderDocStructure(protocol);

  // Scroll-Position wiederherstellen (nach autoResizeAll, da dieses die Hoehe beeinflusst)
  if (scrollContainer) scrollContainer.scrollTop = savedScrollTop;
}

/* ============================================================
   DOKUMENTENSTRUKTUR-LEISTE
   Eigene Spalte links vom Workspace. Spiegelt KAP/UKAP/THEMA,
   navigiert per Klick, hebt beim Scrollen die aktuelle Stelle hervor.
============================================================ */

// Kapitel-Farbpalette (VOCTA tag-1..tag-8, danach zyklisch).
const DOC_STRUCTURE_TAGS = [
  '#E88E5A', '#F4BD48', '#968B79', '#99BDB8',
  '#96B4C9', '#E199AA', '#94AF83', '#CDAD96',
];

// Stabile Kapitel-Farbe anhand der Reihenfolge im Strukturobjekt.
function docStructureChapterColor(index) {
  return DOC_STRUCTURE_TAGS[index % DOC_STRUCTURE_TAGS.length];
}

const DocStructure = {
  _scrollHandler: null,
  _scrollContainer: null,
  _spySuppressUntil: 0,   // unterdrueckt Scrollspy kurz nach Klick-Navigation
  _activeKey: null,
};

function clearDocStructure() {
  const body = document.getElementById('docStructureBody');
  if (body) body.innerHTML = '<div class="doc-structure-empty">Kein Protokoll geöffnet</div>';
  DocStructure._activeKey = null;
}

// Eindeutiger Schluessel pro Struktur-Element fuer Spy/Highlight-Abgleich.
function docStructureKey(type, ids) {
  if (type === 'chapter')    return 'c:' + ids.chapter;
  if (type === 'subchapter') return 's:' + ids.subchapter;
  return 't:' + ids.topic;
}

function renderDocStructure(protocol) {
  const body = document.getElementById('docStructureBody');
  if (!body) return;
  if (!protocol || !protocol.structure) { clearDocStructure(); return; }

  const isAk = protocol.type === 'Aktennotiz';
  const frag = document.createDocumentFragment();
  let akSectionNum = 0;
  let chIndex = -1;

  // Header-Plus an den Protokolltyp anpassen.
  const addChapterBtn = document.getElementById('btnDsAddChapter');
  if (addChapterBtn) {
    const t = isAk ? 'Neuer Abschnitt' : 'Neues Kapitel';
    addChapterBtn.title = t;
    addChapterBtn.setAttribute('aria-label', t);
  }

  // Eintrag bauen: Label-Span + Hover-Aktionen (Plus = Kind anlegen, Grip = Drag-Handle).
  const makeItem = (cls, label, color, addTitle, gripTitle) => {
    const el = document.createElement('div');
    el.className = 'ds-item ' + cls;
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.style.setProperty('--ds-chapter-color', color);
    const lbl = document.createElement('span');
    lbl.className = 'ds-label';
    lbl.textContent = label;
    el.appendChild(lbl);
    if (addTitle || gripTitle) {
      const actions = document.createElement('span');
      actions.className = 'ds-actions';
      actions.innerHTML =
        (addTitle  ? `<button type="button" class="ds-action ds-add" title="${esc(addTitle)}" aria-label="${esc(addTitle)}">${iconPlus()}</button>` : '') +
        (gripTitle ? `<span class="ds-action ds-grip" title="${esc(gripTitle)}">${iconGrip()}</span>` : '');
      el.appendChild(actions);
    }
    return el;
  };

  Object.entries(protocol.structure).forEach(([chKey, chapter]) => {
    chIndex++;
    const color = docStructureChapterColor(chIndex);

    // Kapitel-Label (Aktennotiz nummeriert, sonst "A - Label")
    let chLabel;
    if (isAk) {
      const isFixed = chKey === 'P' || chKey === 'N';
      if (isFixed) {
        chLabel = chapter.label;
      } else {
        akSectionNum++;
        chLabel = akSectionNum + '. ' + chapter.label;
      }
    } else {
      chLabel = chKey + ' – ' + chapter.label;
    }

    // Gleiche Regel wie im Workspace: nur Nutzer-Kapitel (F+, nicht Aktennotiz) sind umsortierbar.
    const reorderable = !isAk && !DEFAULT_CHAPTERS.includes(chKey);
    const chEl = makeItem('ds-chapter', chLabel, color,
      'Neues Unterkapitel',
      reorderable ? 'Kapitel verschieben' : null);
    chEl.dataset.key       = docStructureKey('chapter', { chapter: chKey });
    chEl.dataset.type      = 'chapter';
    chEl.dataset.chapter   = chKey;
    if (reorderable) chEl.dataset.reorderable = '1';
    frag.appendChild(chEl);

    (chapter.subchapters || []).forEach(sub => {
      const subEl = makeItem('ds-subchapter', isAk ? sub.label : (sub.id + ' ' + sub.label), color,
        'Neues Thema', 'Unterkapitel verschieben');
      subEl.dataset.key        = docStructureKey('subchapter', { subchapter: sub.id });
      subEl.dataset.type       = 'subchapter';
      subEl.dataset.chapter    = chKey;
      subEl.dataset.subchapter = sub.id;
      frag.appendChild(subEl);

      (sub.topics || []).forEach(topic => {
        const tEl = makeItem('ds-topic', topic.label, color, null, 'Thema verschieben');
        tEl.dataset.key        = docStructureKey('topic', { topic: topic.id });
        tEl.dataset.type       = 'topic';
        tEl.dataset.chapter    = chKey;
        tEl.dataset.subchapter = sub.id;
        tEl.dataset.topic      = topic.id;
        frag.appendChild(tEl);
      });
    });
  });

  // Scroll-Position erhalten (Re-Render nach Move soll die Leiste nicht zurueckspringen lassen).
  const prevScroll = body.scrollTop;
  body.innerHTML = '';
  body.appendChild(frag);
  body.scrollTop = prevScroll;

  // Aktive Markierung nach Re-Render wiederherstellen (falls bekannt).
  if (DocStructure._activeKey) setDocStructureActive(DocStructure._activeKey, false);

  ensureDocStructureScrollSpy();
}

// Zugehoerige Workspace-Zeile zu einem Struktur-Eintrag finden.
function docStructureFindRow(el) {
  const type = el.dataset.type;
  if (type === 'chapter') {
    return document.querySelector('#pointsBody tr.row-chapter[data-chapter="' + cssEscape(el.dataset.chapter) + '"]');
  }
  if (type === 'subchapter') {
    return document.querySelector('#pointsBody tr.row-subchapter[data-subchapter="' + cssEscape(el.dataset.subchapter) + '"]');
  }
  return document.querySelector('#pointsBody tr.row-topic[data-topic="' + cssEscape(el.dataset.topic) + '"]');
}

// Minimaler CSS-Attribut-Escaper (IDs koennen Punkte/Sonderzeichen enthalten).
function cssEscape(str) {
  if (window.CSS && CSS.escape) return CSS.escape(String(str));
  return String(str).replace(/["\\]/g, '\\$&');
}

// Aktives Struktur-Element markieren und in Sicht scrollen.
// Gibt true zurueck, wenn ein passendes Struktur-Element gefunden wurde.
function setDocStructureActive(key, scrollIntoView) {
  const body = document.getElementById('docStructureBody');
  if (!body) return false;
  let activeEl = null;
  body.querySelectorAll('.ds-item').forEach(el => {
    const on = el.dataset.key === key;
    el.classList.toggle('ds-active', on);
    if (on) activeEl = el;
  });
  DocStructure._activeKey = activeEl ? key : null;
  if (activeEl && scrollIntoView) {
    activeEl.scrollIntoView({ block: 'nearest' });
  }
  return !!activeEl;
}

// Strukturleiste auf die aktuelle Workspace-Auswahl ausrichten.
// PKT -> Thema (falls vorhanden), sonst UKAP, sonst KAP. Mit Fallback,
// falls die bevorzugte Ebene in der Struktur nicht (mehr) existiert.
function highlightStructureForSelection(ctx) {
  if (!ctx) return;
  const candidates = [];
  if (ctx.topicId)      candidates.push('t:' + ctx.topicId);
  if (ctx.subchapterId) candidates.push('s:' + ctx.subchapterId);
  if (ctx.chapterKey)   candidates.push('c:' + ctx.chapterKey);

  for (const key of candidates) {
    if (setDocStructureActive(key, true)) return;
  }
}

// Klick-Navigation: Workspace hinscrollen + Zeile selektieren.
function navigateToStructure(el) {
  // Kapitel ggf. aufklappen, damit das Ziel sichtbar ist.
  if (el.dataset.type !== 'chapter') {
    const chId = 'chapter-' + el.dataset.chapter;
    if (App.collapsedSections.has(chId)) toggleCollapse(chId);
  }
  if (el.dataset.type === 'topic' || el.dataset.type === 'point') {
    const subId = 'subchapter-' + el.dataset.subchapter;
    if (App.collapsedSections.has(subId)) toggleCollapse(subId);
  }

  const row = docStructureFindRow(el);
  if (!row) return;

  // Spy kurz unterdruecken, damit das programmatische Scrollen nicht
  // sofort eine andere Stelle aktiviert.
  DocStructure._spySuppressUntil = Date.now() + 600;

  scrollRowIntoWorkspace(row);
  setDocStructureActive(el.dataset.key, true);

  // Konsistente Auswahl wie beim direkten Klick im Workspace.
  const ctx = buildSelectionCtx(el);
  if (ctx) selectRow(ctx, row);
}

// Zeile in den Workspace scrollen: Ziel landet im oberen Drittel,
// unterhalb der sticky Toolbar (nicht direkt darunter).
function scrollRowIntoWorkspace(row) {
  const container = document.querySelector('.workspace-content');
  if (!container) { row.scrollIntoView({ block: 'start' }); return; }
  const toolbar    = document.getElementById('workspaceToolbar');
  const toolbarH   = (toolbar && !toolbar.classList.contains('hidden')) ? toolbar.offsetHeight : 0;
  const cRect      = container.getBoundingClientRect();
  // Sichtbare Hoehe unterhalb der Toolbar; Ziel ~1/3 davon nach unten einrücken.
  const visibleH   = cRect.height - toolbarH;
  const offset     = toolbarH + Math.round(visibleH / 3);
  const rRect      = row.getBoundingClientRect();
  const delta      = (rRect.top - cRect.top) - offset;
  container.scrollTo({ top: container.scrollTop + delta, behavior: 'smooth' });
}

// Auswahl-Kontext analog zu makeRowSelectable() rekonstruieren.
function buildSelectionCtx(el) {
  const type  = el.dataset.type;
  const label = (el.querySelector('.ds-label') || el).textContent.trim();
  if (type === 'chapter') {
    return { type: 'chapter', chapterKey: el.dataset.chapter, label };
  }
  if (type === 'subchapter') {
    return { type: 'subchapter', subchapterId: el.dataset.subchapter, chapterKey: el.dataset.chapter, label };
  }
  if (type === 'topic') {
    return { type: 'topic', topicId: el.dataset.topic, subchapterId: el.dataset.subchapter, chapterKey: el.dataset.chapter, label };
  }
  return null;
}

// Scrollspy: oberstes sichtbares Struktur-Element ermitteln + spiegeln.
function ensureDocStructureScrollSpy() {
  const container = document.querySelector('.workspace-content');
  if (!container) return;
  if (DocStructure._scrollContainer === container && DocStructure._scrollHandler) return;

  // Alten Listener loesen (Container kann nach Re-Render derselbe sein).
  if (DocStructure._scrollContainer && DocStructure._scrollHandler) {
    DocStructure._scrollContainer.removeEventListener('scroll', DocStructure._scrollHandler);
  }

  let raf = null;
  const handler = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      updateDocStructureSpy();
    });
  };
  container.addEventListener('scroll', handler, { passive: true });
  DocStructure._scrollContainer = container;
  DocStructure._scrollHandler   = handler;
}

function updateDocStructureSpy() {
  if (Date.now() < DocStructure._spySuppressUntil) return;
  const container = document.querySelector('.workspace-content');
  const body = document.getElementById('docStructureBody');
  if (!container || !body) return;

  const toolbar  = document.getElementById('workspaceToolbar');
  const toolbarH = (toolbar && !toolbar.classList.contains('hidden')) ? toolbar.offsetHeight : 0;
  const cRect    = container.getBoundingClientRect();
  // Spy-Linie auf das obere Drittel legen — deckungsgleich mit der Klick-Scrollposition.
  const lineY    = cRect.top + toolbarH + Math.round((cRect.height - toolbarH) / 3);

  // Letzte Struktur-Zeile, die noch oberhalb der Linie beginnt = aktuelle Stelle.
  const rows = container.querySelectorAll('#pointsBody tr.row-chapter, #pointsBody tr.row-subchapter, #pointsBody tr.row-topic');
  let current = null;
  rows.forEach(r => {
    if (r.classList.contains('row-hidden')) return;
    if (r.getBoundingClientRect().top <= lineY) current = r;
  });
  if (!current) {
    // Vor der ersten Struktur-Zeile: erstes Element aktiv lassen.
    current = Array.from(rows).find(r => !r.classList.contains('row-hidden')) || null;
  }
  if (!current) return;

  let key;
  if (current.classList.contains('row-chapter'))         key = 'c:' + current.dataset.chapter;
  else if (current.classList.contains('row-subchapter')) key = 's:' + current.dataset.subchapter;
  else                                                   key = 't:' + current.dataset.topic;

  if (key !== DocStructure._activeKey) setDocStructureActive(key, true);
}

// Prueft, ob die Toolbar mit ihrem aktuellen Inhalt ueberlaeuft. Direkt
// gemessen am realen Layout: scrollWidth (= benoetigte Inhaltsbreite, inkl.
// herausragender Teile) vs. clientWidth (= sichtbarer Innenraum). Dadurch
// unabhaengig davon, ob/wie weit das Suchfeld schon geschrumpft ist.
function toolbarOverflows() {
  const tools = document.querySelector('#workspaceToolbar .toolbar-tools-group');
  if (!tools) return false;
  return tools.scrollWidth > tools.clientWidth + 0.5;
}

// Toggle + Resize der Dokumentenstruktur-Leiste (einmalig binden).
function initDocStructureControls() {
  const panel  = document.getElementById('docStructure');
  const handle = document.getElementById('docStructureResizeHandle');
  const toggle = document.getElementById('btnToggleDocStructure');
  const body   = document.getElementById('docStructureBody');
  if (!panel || !toggle || !body) return;

  // Toggle-Icon (Panel-Open/Close aus dem Icon-System).
  const setToggleIcon = () => {
    toggle.innerHTML = panel.classList.contains('collapsed') ? iconPanelLeftOpen() : iconPanelLeftClose();
  };

  // Persistierten Zustand wiederherstellen.
  if (localStorage.getItem('kadra_docStructureCollapsed') === '1') {
    panel.classList.add('collapsed');
  }
  const savedWidth = parseInt(localStorage.getItem('kadra_docStructureWidth') || '', 10);
  if (savedWidth >= 180 && savedWidth <= 480) {
    panel.style.width = savedWidth + 'px';
    panel.style.minWidth = savedWidth + 'px';
  }
  setToggleIcon();

  toggle.addEventListener('click', () => {
    // Inline-Breite zuruecksetzen, damit die collapsed-Breite aus dem CSS greift
    // (analog zur Sidebar). Sonst ueberschreibt eine gespeicherte Breite das Einklappen.
    panel.style.width = '';
    panel.style.minWidth = '';
    panel.classList.toggle('collapsed');
    localStorage.setItem('kadra_docStructureCollapsed', panel.classList.contains('collapsed') ? '1' : '0');
    setToggleIcon();
  });

  // Header-Plus: neues Kapitel (bzw. Abschnitt bei Aktennotiz).
  const addChapterBtn = document.getElementById('btnDsAddChapter');
  if (addChapterBtn) {
    addChapterBtn.innerHTML = iconPlus();
    addChapterBtn.addEventListener('click', startAddChapter);
  }

  // Klick: Plus-Buttons (Anlage) und Grip abfangen, sonst Navigation (delegiert).
  body.addEventListener('click', (e) => {
    if (e.target.closest('.ds-grip')) return;
    const item = e.target.closest('.ds-item');
    if (!item) return;
    if (e.target.closest('.ds-add')) {
      if (item.dataset.type === 'chapter')         openAddSubchapterModal(item.dataset.chapter);
      else if (item.dataset.type === 'subchapter') openAddTopicModal(item.dataset.subchapter);
      return;
    }
    navigateToStructure(item);
  });

  // Tastatur-Navigation (Eintraege sind Divs mit role="button").
  body.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const item = e.target.closest('.ds-item');
    if (item && e.target === item) { e.preventDefault(); navigateToStructure(item); }
  });

  /* --- Drag & Drop in der Leiste ---------------------------------------
     Gleiche Drag-Typen, dataTransfer-Daten und Restriktionen wie die
     Workspace-Zeilen -> Cross-Drop in beide Richtungen funktioniert ueber
     die vorhandenen Move-Funktionen. Drag nur per Grip (Handle-Mousedown
     setzt draggable, wie im Workspace). */

  body.addEventListener('mousedown', (e) => {
    const grip = e.target.closest('.ds-grip');
    const item = grip && grip.closest('.ds-item');
    if (item) item.draggable = true;
  });
  body.addEventListener('touchstart', (e) => {
    const grip = e.target.closest('.ds-grip');
    const item = grip && grip.closest('.ds-item');
    if (item) item.draggable = true;
  }, { passive: true });
  const dsResetDraggable = () => {
    body.querySelectorAll('.ds-item[draggable="true"]').forEach(el => { el.draggable = false; });
  };
  document.addEventListener('mouseup',  dsResetDraggable);
  document.addEventListener('touchend', dsResetDraggable);

  // Cleanup direkt am Eintrag (nicht delegiert): nach einem Drop re-rendert
  // die Leiste und der Quell-Eintrag haengt nicht mehr im DOM — dragend
  // wuerde den Body-Listener dann nicht mehr erreichen.
  const dsOnDragEnd = (e) => {
    e.currentTarget.classList.remove('drag-active');
    App._dragType  = null;
    App._dragGroup = null;
    stopDragAutoScroll();
    document.querySelectorAll('.drag-over-top, .drag-over-bottom, .drag-over-into').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-into');
    });
    document.querySelectorAll('.drag-child-hidden').forEach(el => {
      el.classList.remove('drag-child-hidden');
    });
  };

  body.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.ds-item');
    if (!item || !item.draggable) { e.preventDefault(); return; }
    const type = item.dataset.type;
    let id;
    if (type === 'chapter') {
      if (item.dataset.reorderable !== '1') { e.preventDefault(); return; }
      id = item.dataset.chapter;
    } else if (type === 'subchapter') {
      id = item.dataset.subchapter;
      App._dragGroup = item.dataset.chapter;
    } else if (type === 'topic') {
      id = item.dataset.topic;
      App._dragGroup = [item.dataset.chapter, item.dataset.subchapter].join('|');
    } else { e.preventDefault(); return; }

    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.setData('application/x-dragtype', type);
    e.dataTransfer.effectAllowed = 'move';
    item.classList.add('drag-active');
    item.addEventListener('dragend', dsOnDragEnd, { once: true });
    App._dragType = type;
    startDragAutoScroll();
  });

  body.addEventListener('dragover', (e) => {
    const item = e.target.closest('.ds-item');
    if (!item || !App._dragType) return;
    const tType = item.dataset.type;
    const dType = App._dragType;

    // Davor/danach-Indikator (Reorder auf gleicher Ebene).
    const markBeforeAfter = () => {
      const rect = item.getBoundingClientRect();
      const mid  = rect.top + rect.height / 2;
      item.classList.toggle('drag-over-top',    e.clientY < mid);
      item.classList.toggle('drag-over-bottom', e.clientY >= mid);
    };
    const accept = () => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

    if (dType === 'chapter') {
      // Kapitel-Reorder nur zwischen Nutzer-Kapiteln (F+), A-E keine gueltigen Ziele.
      if (tType !== 'chapter' || item.dataset.reorderable !== '1') return;
      accept(); markBeforeAfter();
    } else if (dType === 'subchapter') {
      if (tType === 'subchapter')   { accept(); markBeforeAfter(); }
      else if (tType === 'chapter') { accept(); item.classList.add('drag-over-into'); }
    } else if (dType === 'topic') {
      if (tType === 'topic')        { accept(); markBeforeAfter(); }
      else if (tType === 'subchapter' || tType === 'chapter') { accept(); item.classList.add('drag-over-into'); }
    } else if (dType === 'point') {
      // Cross-Drop aus dem Workspace: Punkt ans Ende von Kapitel/UKAP/Thema.
      accept(); item.classList.add('drag-over-into');
    }
  });

  body.addEventListener('dragleave', (e) => {
    const item = e.target.closest('.ds-item');
    if (item) item.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-into');
  });

  body.addEventListener('drop', async (e) => {
    const item = e.target.closest('.ds-item');
    if (!item || !App._dragType) return;
    e.preventDefault();
    item.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-into');

    const draggedId = e.dataTransfer.getData('text/plain');
    const tType  = item.dataset.type;
    const chKey  = item.dataset.chapter;
    const rect   = item.getBoundingClientRect();
    const after  = e.clientY >= rect.top + rect.height / 2;

    if (App._dragType === 'chapter') {
      if (tType !== 'chapter' || item.dataset.reorderable !== '1' || draggedId === chKey) return;
      await reorderUserChapter(draggedId, chKey, after);
    } else if (App._dragType === 'subchapter') {
      if (tType === 'subchapter') {
        if (draggedId === item.dataset.subchapter) return;
        await moveSubchapterTo(draggedId, { chapter: chKey, anchorSubId: item.dataset.subchapter, after });
      } else if (tType === 'chapter') {
        await moveSubchapterTo(draggedId, { chapter: chKey, anchorSubId: null });
      }
    } else if (App._dragType === 'topic') {
      if (tType === 'topic') {
        if (draggedId === item.dataset.topic) return;
        await moveTopicTo(draggedId, { chapter: chKey, subchapter: item.dataset.subchapter, anchorTopicId: item.dataset.topic, after });
      } else if (tType === 'subchapter') {
        await moveTopicTo(draggedId, { chapter: chKey, subchapter: item.dataset.subchapter, anchorTopicId: null });
      } else if (tType === 'chapter') {
        // Thema braucht ein UKAP als Container -> Anlage-Modal, danach Thema hineinverschieben
        App._pendingTopicMove = draggedId;
        openAddSubchapterModal(chKey);
      }
    } else if (App._dragType === 'point') {
      if (tType === 'chapter') {
        await movePointTo(draggedId, { chapter: chKey, subchapter: null, topic: null });
      } else if (tType === 'subchapter') {
        await movePointTo(draggedId, { chapter: chKey, subchapter: item.dataset.subchapter, topic: null });
      } else if (tType === 'topic') {
        await movePointTo(draggedId, { chapter: chKey, subchapter: item.dataset.subchapter, topic: item.dataset.topic });
      }
    }
  });

  // Resize.
  if (handle) {
    let resizing = false;
    handle.addEventListener('mousedown', (e) => {
      if (panel.classList.contains('collapsed')) return;
      e.preventDefault();
      resizing = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const left = panel.getBoundingClientRect().left;
      const newWidth = Math.min(480, Math.max(180, e.clientX - left));
      const prevWidth = panel.getBoundingClientRect().width;

      // Provisorisch setzen ...
      panel.style.width = newWidth + 'px';
      panel.style.minWidth = newWidth + 'px';
      // ... und wieder zuruecknehmen, wenn die Toolbar dadurch ueberlaeuft
      // (nur beim Verbreitern; Verschmaelern ist immer erlaubt).
      if (newWidth > prevWidth && toolbarOverflows()) {
        panel.style.width = prevWidth + 'px';
        panel.style.minWidth = prevWidth + 'px';
      }
    });
    document.addEventListener('mouseup', () => {
      if (!resizing) return;
      resizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('kadra_docStructureWidth', String(parseInt(panel.style.width, 10) || ''));
    });
  }
}

/* Punkt verschieben: ID bleibt fix (Herkunft), nur Position (chapter/subchapter/topic)
   und Reihenfolge im flachen points-Array werden angepasst.
   target = { chapter, subchapter, topic, beforeId|afterId }.
   beforeId/afterId = Anker-Punkt; fehlen beide, wird ans Ende des Ziel-UKAP/-Themas gehaengt. */
async function movePointTo(draggedId, target) {
  await saveCurrentProtocol();  // DOM-Inhalte sichern bevor DB gelesen wird
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol?.points) return;

  const fromIdx = protocol.points.findIndex(p => p.id === draggedId);
  if (fromIdx === -1) return;

  const [moved] = protocol.points.splice(fromIdx, 1);
  moved.chapter    = target.chapter;
  moved.subchapter = target.subchapter || null;
  moved.topic      = target.topic || null;

  let insertIdx;
  if (target.beforeId) {
    insertIdx = protocol.points.findIndex(p => p.id === target.beforeId);
    if (insertIdx === -1) insertIdx = protocol.points.length;
  } else if (target.afterId) {
    insertIdx = protocol.points.findIndex(p => p.id === target.afterId);
    insertIdx = insertIdx === -1 ? protocol.points.length : insertIdx + 1;
  } else {
    // Kein Anker: hinter den letzten Punkt desselben Ziel-UKAP/-Themas einfuegen
    let last = -1;
    protocol.points.forEach((p, i) => {
      if (p.chapter === moved.chapter
          && (p.subchapter || null) === moved.subchapter
          && (p.topic || null) === moved.topic) last = i;
    });
    insertIdx = last === -1 ? protocol.points.length : last + 1;
  }

  protocol.points.splice(insertIdx, 0, moved);

  await DB.Protocols.save(protocol);
  renderPoints(protocol);
  showToast('Punkt verschoben.', 'success');
}

/* Naechste freie UKAP-Nummer in einem Kapitel ermitteln (z.B. "F.3"). */
function nextSubchapterId(chapter, chKey) {
  const subs = chapter.subchapters || [];
  const maxNum = subs.reduce((m, s) => Math.max(m, parseInt(String(s.id || '').split('.')[1], 10) || 0), 0);
  let n = maxNum + 1;
  while (subs.some(s => s.id === `${chKey}.${n}`)) n++;
  return `${chKey}.${n}`;
}

/* UKAP verschieben (auch kapiteluebergreifend).
   target = { chapter, anchorSubId|null, after }.
   anchorSubId fehlt -> ans Ende des Ziel-Kapitels.
   Bei Kapitelwechsel: UKAP wird neu nummeriert (B.1 -> F.3), enthaltene Punkte ziehen mit
   (point.chapter/subchapter aktualisiert), Punkt-IDs bleiben fix (Herkunft). */
async function moveSubchapterTo(draggedSubId, target) {
  await saveCurrentProtocol();
  const proto = await DB.Protocols.get(App.currentProtocolId);
  if (!proto) return;
  // Quell-Kapitel anhand des UKAP suchen (nicht aus der ID ableiten, robuster)
  const fromChKey = Object.keys(proto.structure).find(
    k => (proto.structure[k].subchapters || []).some(s => s.id === draggedSubId)
  );
  if (!fromChKey) return;
  const fromCh = proto.structure[fromChKey];
  const toCh   = proto.structure[target.chapter];
  if (!fromCh?.subchapters || !toCh) return;

  const fromIdx = fromCh.subchapters.findIndex(s => s.id === draggedSubId);
  if (fromIdx === -1) return;
  const [movedSub] = fromCh.subchapters.splice(fromIdx, 1);

  const sameChapter = fromChKey === target.chapter;
  const oldSubId = movedSub.id;
  let newSubId = oldSubId;

  if (!sameChapter) {
    // Neue UKAP-Nummer im Zielkapitel vergeben und enthaltene Punkte ummappen
    newSubId = nextSubchapterId(toCh, target.chapter);
    movedSub.id = newSubId;
    (proto.points || []).forEach(p => {
      if (p.chapter === fromChKey && p.subchapter === oldSubId) {
        p.chapter    = target.chapter;
        p.subchapter = newSubId;
      }
    });
  }

  if (!toCh.subchapters) toCh.subchapters = [];
  let toIdx;
  if (target.anchorSubId) {
    toIdx = toCh.subchapters.findIndex(s => s.id === target.anchorSubId);
    if (toIdx === -1) toIdx = toCh.subchapters.length;
    else if (target.after) toIdx++;
  } else {
    toIdx = toCh.subchapters.length; // ans Ende
  }
  toCh.subchapters.splice(toIdx, 0, movedSub);

  await DB.Protocols.save(proto);
  renderPoints(proto);
  showToast('Unterkapitel verschoben.', 'success');
}

/* Thema verschieben (auch in anderes UKAP/Kapitel).
   target = { chapter, subchapter, anchorTopicId|null, after }.
   anchorTopicId fehlt -> ans Ende des Ziel-UKAP.
   Themen haben keine sichtbare Nummer; enthaltene Punkte ziehen mit
   (point.chapter/subchapter/topic aktualisiert), Punkt-IDs bleiben fix (Herkunft). */
async function moveTopicTo(draggedTopicId, target) {
  await saveCurrentProtocol();
  const proto = await DB.Protocols.get(App.currentProtocolId);
  if (!proto) return;

  // Quell-UKAP des Themas suchen
  let fromChKey = null, fromSub = null, movedTopic = null;
  for (const [k, ch] of Object.entries(proto.structure)) {
    for (const s of (ch.subchapters || [])) {
      const idx = (s.topics || []).findIndex(t => t.id === draggedTopicId);
      if (idx !== -1) {
        fromChKey = k; fromSub = s;
        [movedTopic] = s.topics.splice(idx, 1);
        break;
      }
    }
    if (movedTopic) break;
  }
  if (!movedTopic) return;

  const toCh  = proto.structure[target.chapter];
  const toSub = (toCh?.subchapters || []).find(s => s.id === target.subchapter);
  if (!toSub) { fromSub.topics.push(movedTopic); return; } // Ziel ungueltig -> zuruecklegen
  if (!toSub.topics) toSub.topics = [];

  const movedAcross = fromChKey !== target.chapter || fromSub.id !== target.subchapter;
  if (movedAcross) {
    // Enthaltene Punkte ummappen (IDs bleiben fix)
    (proto.points || []).forEach(p => {
      if (p.topic === draggedTopicId) {
        p.chapter    = target.chapter;
        p.subchapter = target.subchapter;
      }
    });
  }

  let toIdx;
  if (target.anchorTopicId) {
    toIdx = toSub.topics.findIndex(t => t.id === target.anchorTopicId);
    if (toIdx === -1) toIdx = toSub.topics.length;
    else if (target.after) toIdx++;
  } else {
    toIdx = toSub.topics.length;
  }
  toSub.topics.splice(toIdx, 0, movedTopic);

  await DB.Protocols.save(proto);
  renderPoints(proto);
  showToast('Thema verschoben.', 'success');
}

/* Auto-Scroll des Arbeitsbereichs waehrend eines Punkt-Drags: scrollt .workspace-content,
   wenn der Cursor in der oberen/unteren Randzone steht (Geschwindigkeit randnaehe-proportional).
   Noetig, weil natives HTML5-Drag den inneren Scroll-Container nicht selbst scrollt. */
let _dragScrollRAF = null;
let _dragScrollY   = 0;
let _dragScrollX   = 0;
function _onDragScrollMove(e) { _dragScrollY = e.clientY; _dragScrollX = e.clientX; }
function startDragAutoScroll() {
  if (_dragScrollRAF) return;
  document.addEventListener('dragover', _onDragScrollMove);
  const EDGE = 64;        // Randzone in px
  const MAX_SPEED = 18;   // max. px pro Frame
  // Scrollt einen Container, wenn der Cursor horizontal darueber und vertikal
  // in dessen Randzone steht (Workspace und Strukturleiste unabhaengig).
  const scrollContainer = (container) => {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (_dragScrollX < rect.left || _dragScrollX > rect.right) return;
    const yTop = _dragScrollY - rect.top;
    const yBot = rect.bottom - _dragScrollY;
    if (yTop >= 0 && yTop < EDGE) {
      container.scrollTop -= Math.ceil(MAX_SPEED * (1 - yTop / EDGE));
    } else if (yBot >= 0 && yBot < EDGE) {
      container.scrollTop += Math.ceil(MAX_SPEED * (1 - yBot / EDGE));
    }
  };
  const step = () => {
    scrollContainer(document.querySelector('.workspace-content'));
    scrollContainer(document.getElementById('docStructureBody'));
    _dragScrollRAF = requestAnimationFrame(step);
  };
  _dragScrollRAF = requestAnimationFrame(step);
}
function stopDragAutoScroll() {
  if (_dragScrollRAF) { cancelAnimationFrame(_dragScrollRAF); _dragScrollRAF = null; }
  document.removeEventListener('dragover', _onDragScrollMove);
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
    e.dataTransfer.setData('text/plain', point.id);
    e.dataTransfer.setData('application/x-dragtype', 'point');
    e.dataTransfer.effectAllowed = 'move';
    tr.classList.add('drag-active');
    App._dragType  = 'point';
    startDragAutoScroll();
  });

  tr.addEventListener('dragend', () => {
    tr.classList.remove('drag-active');
    App._dragType  = null;
    stopDragAutoScroll();
    document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
  });

  // Punkte lassen sich frei im gesamten Protokoll ablegen (Kapitel-/UKAP-/Themengrenzen
  // egal). Die ID bleibt fix (Herkunft), nur chapter/subchapter/topic des Ziels werden gesetzt.
  tr.addEventListener('dragover', e => {
    if (App._dragType !== 'point') return;
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
    if (App._dragType !== 'point') return;

    const draggedId = e.dataTransfer.getData('text/plain');
    const targetId  = point.id;
    if (draggedId === targetId) return;

    const rect = tr.getBoundingClientRect();
    const after = e.clientY >= rect.top + rect.height / 2;
    await movePointTo(draggedId, {
      chapter:    chKey,
      subchapter: subId || null,
      topic:      topicId || null,
      beforeId:   after ? null : targetId,
      afterId:    after ? targetId : null,
    });
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
    // Klick ins editierbare Label startet die Bearbeitung (keine volle
    // Zeilenauswahl), markiert aber dennoch die Stelle in der Strukturleiste.
    if (e.target.closest('[contenteditable="true"]')) { highlightStructureForSelection(ctx); return; }
    selectRow(ctx, row);
  });
}

function selectRow(ctx, rowEl) {
  document.querySelectorAll('.row-selected').forEach(r => r.classList.remove('row-selected'));
  App.selectedRow = ctx;
  if (rowEl) rowEl.classList.add('row-selected');
  updateSelectionHint();

  // Strukturleiste an der Auswahl ausrichten (PKT -> Thema/UKAP/KAP).
  // Spy kurz unterdruecken, damit ein nachfolgendes Scroll-Event die
  // gerade gesetzte Markierung nicht sofort ueberschreibt.
  DocStructure._spySuppressUntil = Date.now() + 600;
  highlightStructureForSelection(ctx);
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
  const sectionIds = Array.from(document.querySelectorAll('#pointsBody tr[data-collapse-id]'))
    .map(tr => tr.dataset.collapseId)
    .filter(Boolean);
  App.allCollapsed = sectionIds.length > 0 && sectionIds.every(id => App.collapsedSections.has(id));
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

function setupExportMenu() {
  const btn   = document.getElementById('btnExportMenu');
  const panel = document.getElementById('exportMenuPanel');
  if (!btn || !panel) return;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    panel.classList.toggle('hidden');
  });

  // Klick auf ein Export-Item schliesst das Menue (die Export-Handler haengen
  // separat an den Item-Buttons).
  panel.querySelectorAll('.export-menu-item').forEach(item => {
    item.addEventListener('click', () => panel.classList.add('hidden'));
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

/* Nutzer-Kapitel (ab F) neu anordnen und komplett neu durchbuchstabieren.
   A-E bleiben fix an Ort und Reihenfolge. Beim Verschieben werden Kapitel- und
   UKAP-Nummern der betroffenen Kapitel umgeschrieben (G->F, G.1->F.1 ...).
   Punkt-IDs bleiben fix (Herkunft). UI-State (collapsed/hidden) wird mit-uebersetzt.
   draggedChKey: zu verschiebendes Kapitel; anchorChKey: Ziel-Kapitel; after: dahinter? */
async function reorderUserChapter(draggedChKey, anchorChKey, after) {
  if (DEFAULT_CHAPTERS.includes(draggedChKey)) return;       // A-E nicht verschiebbar
  if (DEFAULT_CHAPTERS.includes(anchorChKey)) return;        // nur Drop zwischen F+ erlaubt
  if (draggedChKey === anchorChKey) return;

  await saveCurrentProtocol();
  const proto = await DB.Protocols.get(App.currentProtocolId);
  if (!proto?.structure) return;

  const keys = Object.keys(proto.structure);
  const fixed = keys.filter(k => DEFAULT_CHAPTERS.includes(k));     // A-E (Reihenfolge unveraendert)
  let user  = keys.filter(k => !DEFAULT_CHAPTERS.includes(k));      // F+ in aktueller Reihenfolge

  const fromIdx = user.indexOf(draggedChKey);
  if (fromIdx === -1) return;
  user.splice(fromIdx, 1);
  let toIdx = user.indexOf(anchorChKey);
  if (toIdx === -1) toIdx = user.length;
  else if (after) toIdx++;
  user.splice(toIdx, 0, draggedChKey);

  // Neue Buchstaben ab F (70) in der neuen Reihenfolge: alte chKey -> neue chKey
  const keyMap = {};
  fixed.forEach(k => { keyMap[k] = k; });
  user.forEach((oldKey, i) => { keyMap[oldKey] = String.fromCharCode(70 + i); });

  // Wenn sich nichts aendert (gleiche Zuordnung), abbrechen
  const changed = Object.entries(keyMap).some(([o, n]) => o !== n);
  if (!changed) return;

  // structure neu aufbauen: A-E zuerst (Originalreihenfolge), dann F+ in neuer Reihenfolge
  const newStructure = {};
  const rebuild = (oldKey) => {
    const newKey = keyMap[oldKey];
    const ch = proto.structure[oldKey];
    const newSubs = (ch.subchapters || []).map(s => {
      const seq = String(s.id || '').split('.')[1] || '';
      return { ...s, id: `${newKey}.${seq}` };
    });
    newStructure[newKey] = { ...ch, subchapters: newSubs };
  };
  fixed.forEach(rebuild);
  user.forEach(rebuild);
  proto.structure = newStructure;

  // Punkte ummappen: chapter + subchapter-Praefix (IDs unveraendert)
  (proto.points || []).forEach(p => {
    const newKey = keyMap[p.chapter];
    if (newKey && newKey !== p.chapter) {
      if (p.subchapter) {
        const seq = String(p.subchapter).split('.')[1] || '';
        p.subchapter = `${newKey}.${seq}`;
      }
      p.chapter = newKey;
    }
  });

  // Transienten UI-State uebersetzen (collapsed/hidden)
  const newCollapsed = new Set();
  App.collapsedSections.forEach(id => {
    if (id.startsWith('chapter-')) {
      const o = id.slice(8); newCollapsed.add('chapter-' + (keyMap[o] || o));
    } else if (id.startsWith('subchapter-')) {
      const o = id.slice(11); const ch = o.split('.')[0]; const seq = o.split('.')[1] || '';
      newCollapsed.add('subchapter-' + ((keyMap[ch] || ch) + '.' + seq));
    } else { newCollapsed.add(id); }
  });
  App.collapsedSections = newCollapsed;

  const newHidden = new Set();
  App.hiddenChapters.forEach(o => newHidden.add(keyMap[o] || o));
  App.hiddenChapters = newHidden;

  if (App.selectedRow?.chapterKey) {
    App.selectedRow.chapterKey = keyMap[App.selectedRow.chapterKey] || App.selectedRow.chapterKey;
  }

  await DB.Protocols.save(proto);
  renderPoints(proto);
  showToast('Kapitel neu angeordnet.', 'success');
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
    const protocolId = App.currentProtocolId;
    // DOM-Inhalte sichern bevor DB gelesen wird — flusht auch den Save-Task,
    // den der globale Click-Handler beim Klick auf "Erstellen" anstoesst
    // (sonst ueberschreibt dessen stale Struktur das neue Kapitel).
    await saveCurrentProtocol();
    if (App.currentProtocolId !== protocolId) return;

    const protocol = await DB.Protocols.get(protocolId);
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
  openAddSubchapterModal(chKey);
}

// UKAP-Anlage-Modal fuer ein konkretes Kapitel oeffnen (Toolbar, Strukturleiste, Thema-Drop).
function openAddSubchapterModal(chKey) {
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

    const newSubId = `${chKey}.${nextNum}`;
    chapter.subchapters = [...(chapter.subchapters || []), { id: newSubId, label, topics: [] }];
    await DB.Protocols.save(protocol);

    // Per Drag angefordert: Thema ins frisch angelegte UKAP verschieben
    // (vor closeModal sichern, da closeModal das Pending-Feld verwirft)
    const pendingTopic = App._pendingTopicMove;
    closeModal('modalSubchapter');
    if (pendingTopic) {
      App._busy = false; // moveTopicTo darf nicht durch _busy blockiert werden
      await moveTopicTo(pendingTopic, { chapter: chKey, subchapter: newSubId, anchorTopicId: null });
      return;
    }

    renderPoints(protocol);
    showToast(`Unterkapitel ${newSubId} angelegt.`, 'success');
  } finally {
    App._busy = false;
  }
}

/* THEMA */
function startAddTopic() {
  const subId = App.selectedRow?.subchapterId;
  if (!subId) { showToast('Bitte zuerst ein Unterkapitel oder eine Zeile darin auswÃ¤hlen.', 'error'); return; }
  openAddTopicModal(subId);
}

// Thema-Anlage-Modal fuer ein konkretes UKAP oeffnen (Toolbar, Strukturleiste).
function openAddTopicModal(subId) {
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

  // Proto-Card Header Collapse
  ['sectionParticipants', 'sectionAttachments', 'sectionAuthor', 'sectionLegend'].forEach(id => {
    document.querySelector(`#${id} .proto-card-header`).addEventListener('click', () => {
      document.getElementById(id).classList.toggle('is-collapsed');
    });
  });

  // Toolbar
  document.getElementById('btnAddChapter').addEventListener('click', startAddChapter);
  document.getElementById('btnAddSubchapter').addEventListener('click', startAddSubchapter);
  document.getElementById('btnAddTopic').addEventListener('click', startAddTopic);
  document.getElementById('btnAddPoint').addEventListener('click', addPoint);
  document.querySelector('#sectionPoints .proto-card-header').addEventListener('click', toggleCollapseAll);
  setupPointFilter();
  setupChapterFilter();
  setupExportMenu();
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
    clearDocStructure();
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

  // Dokumentenstruktur-Leiste (Toggle, Resize, Klick-Navigation)
  initDocStructureControls();

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
    const prevWidth = sidebar.getBoundingClientRect().width;

    // Provisorisch setzen ...
    sidebar.style.width    = newWidth + 'px';
    sidebar.style.minWidth = newWidth + 'px';
    // ... und zuruecknehmen, wenn die Toolbar dadurch ueberlaeuft
    // (nur beim Verbreitern; Verschmaelern ist immer erlaubt).
    if (newWidth > prevWidth && toolbarOverflows()) {
      sidebar.style.width    = prevWidth + 'px';
      sidebar.style.minWidth = prevWidth + 'px';
    }
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
    openDatabaseViaPicker();
  });
  dbFileInput.addEventListener('change', () => {
    if (dbFileInput.files.length > 0) importFullDB(dbFileInput.files[0]);
  });

  // Untermenü "Zuletzt verwendet"
  setupRecentDbMenu(panel);

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

  // VOCTA Import
  const voctaMdInput = document.getElementById('fileImportVoctaMd');
  const voctaBtn = document.getElementById('btnImportVoctaSidebar');
  const isMarkdownFile = (file) => !!file && /\.md$/i.test(file.name || '');
  const handleVoctaSidebarFile = (file) => {
    if (!file) return;
    if (!isMarkdownFile(file)) {
      showToast('Bitte eine .md-Datei importieren.', 'error');
      return;
    }
    // Auswahl-Dialog: Komplett vs. Schrittweise
    openImportModeDialog(file);
  };

  voctaBtn.addEventListener('click', () => {
    if (!App.currentProjectId) { showToast('Bitte zuerst ein Projekt oeffnen.', 'error'); return; }
    voctaMdInput.value = '';
    voctaMdInput.click();
  });
  voctaMdInput.addEventListener('change', () => {
    if (voctaMdInput.files.length > 0) handleVoctaSidebarFile(voctaMdInput.files[0]);
  });

  // Drag & Drop direkt auf den Import-Button
  voctaBtn.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!voctaBtn.disabled) voctaBtn.classList.add('drag-over');
  });
  voctaBtn.addEventListener('dragleave', () => voctaBtn.classList.remove('drag-over'));
  voctaBtn.addEventListener('drop', (e) => {
    e.preventDefault();
    voctaBtn.classList.remove('drag-over');
    if (!App.currentProjectId) { showToast('Bitte zuerst ein Projekt oeffnen.', 'error'); return; }
    const f = e.dataTransfer.files[0];
    handleVoctaSidebarFile(f);
  });

  // VOCTA Modal: Datei-Drop-Zone klickbar machen
  document.getElementById('voctaFileDrop').addEventListener('click', () => {
    document.getElementById('voctaImportFile').value = '';
    document.getElementById('voctaImportFile').click();
  });
  document.getElementById('voctaImportFile').addEventListener('change', (e) => {
    if (e.target.files.length > 0) openVoctaImportModal(e.target.files[0]);
  });

  // VOCTA Modal: Drag & Drop auf Drop-Zone
  const dropZone = document.getElementById('voctaFileDrop');
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f && isMarkdownFile(f)) openVoctaImportModal(f);
    else if (f) showToast('Bitte eine .md-Datei importieren.', 'error');
  });

  // VOCTA Modal: Importieren-Button
  document.getElementById('btnVoctaImportConfirm').addEventListener('click', importVoctaMarkdown);

  // VOCTA Modal: Enter in Titel-/Datumsfeld loest den Import aus
  ['voctaImportTitle', 'voctaImportDate'].forEach((fieldId) => {
    document.getElementById(fieldId).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('btnVoctaImportConfirm').click();
      }
    });
  });
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
  clearDocStructure();
  document.getElementById('btnNewProtocol').disabled = true;
  document.getElementById('btnImportVoctaSidebar').disabled = true;

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
  clearDocStructure();
  document.getElementById('btnNewProtocol').disabled = true;
  document.getElementById('btnImportVoctaSidebar').disabled = true;

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
   VOCTA MARKDOWN IMPORT
   - Importiert KADRA/VOCTA-Tabellen-Markdown als neue Aktennotiz.
   - Format-Vorgabe: Ausgabe von MarkdownExport.exportProtocolMarkdown().
   - Parser: parseVoctaMarkdown() (siehe weiter unten in dieser Datei).
============================================================ */

/**
 * Oeffnet das VOCTA-Import-Modal und befuellt es mit den geparsten
 * Metadaten (Titel, Datum) aus der Markdown-Datei.
 * Datei + Parse-Ergebnis werden am File-Input zwischengespeichert.
 */
async function openVoctaImportModal(file) {
  const name = file.name.replace(/\.[^.]+$/, '');
  const dateMatch = name.match(/^(\d{2})(\d{2})(\d{2})[ _]/);
  let dateVal = new Date().toISOString().slice(0, 10);
  if (dateMatch) dateVal = `20${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;

  let titleVal = name.replace(/^\d{6}[ _]/, '').replace(/_/g, ' ').trim();
  const fileInput = document.getElementById('voctaImportFile');

  try {
    const text = await file.text();
    const parsed = parseVoctaMarkdown(text);
    if (parsed.meta.title) titleVal = parsed.meta.title;
    if (parsed.meta.date) {
      // DD.MM.YYYY -> YYYY-MM-DD fuer das date-Input
      const dm = parsed.meta.date.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      if (dm) dateVal = `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
    }
    fileInput._pendingFile = file;
    fileInput._pendingText = text;
    fileInput._pendingParsed = parsed;
  } catch (e) {
    fileInput._pendingFile = file;
    fileInput._pendingText = null;
    fileInput._pendingParsed = null;
  }

  document.getElementById('voctaImportTitle').value = titleVal;
  document.getElementById('voctaImportDate').value  = dateVal;
  document.getElementById('voctaFileLabel').textContent = file.name;
  document.getElementById('btnVoctaImportConfirm').disabled = false;

  openModal('modalVoctaImport');
}

/**
 * Erstellt aus geparsten VOCTA-Daten eine KADRA-Aktennotiz im aktuellen
 * Projekt. Uebernimmt Kapitelstruktur (1:1), Teilnehmer (inkl. E-Mail)
 * und Protokollpunkte aus dem Markdown.
 */
async function importVoctaMarkdown() {
  if (!App.currentProjectId) {
    showToast('Kein Projekt geoeffnet.', 'error');
    return;
  }

  const fileInput = document.getElementById('voctaImportFile');
  const file = fileInput._pendingFile;
  if (!file) { showToast('Keine Datei ausgewaehlt.', 'error'); return; }

  const title = document.getElementById('voctaImportTitle').value.trim();
  const date  = document.getElementById('voctaImportDate').value;
  if (!title) { showToast('Bitte Titel eingeben.', 'error'); return; }

  let parsed = fileInput._pendingParsed;
  if (!parsed) {
    try {
      const text = fileInput._pendingText || await file.text();
      parsed = parseVoctaMarkdown(text);
    } catch (e) {
      showToast('Datei konnte nicht gelesen werden.', 'error');
      return;
    }
  }

  const { meta, participants: parsedParticipants, structure: parsedStructure,
          chapterOrder, points: parsedPoints } = parsed;

  if (!parsedPoints.length) {
    showToast('Keine Protokollpunkte im Markdown gefunden.', 'error');
    return;
  }

  const project = App.projects.find(p => p.id === App.currentProjectId) || {};

  // ── Struktur 1:1 uebernehmen ──
  // Aktennotiz braucht eine Praeambel P; Kapitel folgen der Markdown-Reihenfolge.
  const structure = { P: { label: 'Praeambel', subchapters: [] } };
  (chapterOrder || []).forEach((key) => {
    if (key === 'P') return;
    const src = parsedStructure[key];
    structure[key] = {
      label: src.label || '',
      subchapters: (src.subchapters || []).map(sub => ({
        id: sub.id,
        label: sub.label || '',
        topics: (sub.topics || []).map(t => ({ id: t.id, label: t.label })),
      })),
    };
  });

  // Punkte uebernehmen: Strukturkeys aus dem Parser direkt verwenden.
  const points = parsedPoints.map((pt, idx) => ({
    id: pt.id || `${idx + 1}`,
    chapter: pt.chapter,
    subchapter: pt.subchapter || null,
    topic: pt.topic || null,
    content: pt.content,
    category: pt.category || 'Info',
    responsible: pt.responsible || '',
    deadline: pt.deadline || '',
    done: !!pt.done,
    isNew: !!pt.isNew,
    doneLastProtocol: false,
    createdInProtocol: null,
  }));

  // ── Teilnehmer uebernehmen (volle Tabelle inkl. E-Mail) ──
  const participants = (parsedParticipants || []).map(p => ({
    id: DB.uuid(),
    name: p.name || '',
    company: p.company || '',
    abbr: p.abbr || '',
    email: p.email || '',
    attended:  p.attended  !== false,
    inDistrib: p.inDistrib !== false,
  }));

  // Abkuerzungen aus Teilnehmer-Kuerzeln ableiten (customAbbreviations bleibt leer;
  // PDF-/MD-Export sammelt Kuerzel ohnehin aus participants).

  const protocol = {
    projectId: App.currentProjectId,
    type: 'Aktennotiz',
    seriesId: DB.uuid(),
    seriesName: title,
    title,
    number: null,
    date: date || new Date().toISOString().slice(0, 10),
    time: meta.time || '',
    location: meta.location || '',
    tenant:   meta.tenant   || project.tenant || '',
    landlord: meta.landlord || project.owner  || '',
    participants,
    structure,
    points,
    attachments: [],
    deletedAt: null,
    author: { name: 'Olaf Schueler', firstName: 'Olaf', lastName: 'Schueler', company: 'Hopro GmbH & Co. KG', date: '', seen: '' },
    customAbbreviations: [],
  };

  closeModal('modalVoctaImport');
  fileInput._pendingFile = null;
  fileInput._pendingText = null;
  fileInput._pendingParsed = null;

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
      try { await DB.Recent.add(handle.name, handle); await renderRecentDbList(); } catch {}
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
      try { await DB.Recent.add(handle.name, handle); await renderRecentDbList(); } catch {}
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
async function importFullDB(file, handle = null) {
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

  // Quick-Save-Handle übernehmen, damit Speichern direkt in dieselbe Datei geht
  if (handle) App._saveFileHandle = handle;

  // In "Zuletzt verwendet" aufnehmen (Handle nur wenn vorhanden -> Direkt-Öffnen möglich)
  try { await DB.Recent.add(file.name, handle); } catch (e) { /* Verlauf ist optional */ }
  await renderRecentDbList();

  showToast(`Import: ${pCount} Projekt(e), ${prCount} Protokoll(e) importiert.`, 'success');
}

/* ============================================================
   ZULETZT VERWENDET (Datenbank-Verlauf)
============================================================ */

/**
 * Öffnet eine Datenbank über den Picker.
 * Chrome/Edge: showOpenFilePicker -> liefert ein persistierbares Handle,
 * sodass die Datei später per "Zuletzt verwendet" direkt geöffnet werden kann.
 * Firefox/Fallback: klassischer Datei-Input (kein Handle, kein Direkt-Öffnen).
 */
async function openDatabaseViaPicker() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
        multiple: false,
      });
      const file = await handle.getFile();
      await importFullDB(file, handle);
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // abgebrochen
      // Sonstiger Fehler -> Fallback auf Datei-Input
    }
  }
  const dbFileInput = document.getElementById('fileImportFullDB');
  dbFileInput.value = '';
  dbFileInput.click();
}

/** Untermenü "Zuletzt verwendet" verdrahten (Hover + Klick). */
function setupRecentDbMenu(menuPanel) {
  const wrap    = document.getElementById('recentDbWrap');
  const trigger = document.getElementById('btnRecentDb');
  const sub     = document.getElementById('recentDbPanel');
  if (!wrap || !trigger || !sub) return;

  const open = async () => {
    await renderRecentDbList();
    sub.classList.remove('hidden');
    wrap.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
  };
  const close = () => {
    sub.classList.add('hidden');
    wrap.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  };

  // Klick auf Trigger togglet (für Touch / Tastatur)
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (sub.classList.contains('hidden')) open(); else close();
  });

  // Hover öffnet/schließt (Desktop)
  let hoverTimer = null;
  wrap.addEventListener('mouseenter', () => { clearTimeout(hoverTimer); open(); });
  wrap.addEventListener('mouseleave', () => {
    hoverTimer = setTimeout(close, 180);
  });

  // Schließt mit, wenn das Hauptmenü zugeht
  const mo = new MutationObserver(() => {
    if (menuPanel.classList.contains('hidden')) close();
  });
  mo.observe(menuPanel, { attributes: true, attributeFilter: ['class'] });
}

/** Rendert die Liste der zuletzt verwendeten Datenbanken. */
async function renderRecentDbList() {
  const sub = document.getElementById('recentDbPanel');
  if (!sub) return;

  let items = [];
  try { items = await DB.Recent.list(); } catch { items = []; }

  sub.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'recent-db-empty';
    empty.textContent = 'Noch keine Datenbank geöffnet.';
    sub.appendChild(empty);
    return;
  }

  for (const it of items) {
    const row = document.createElement('div');
    row.className = 'recent-db-item';
    row.title = it.fileName + (it.handle ? '' : '  ·  (nur Merker – öffnet Datei-Dialog)');

    // Icon
    row.insertAdjacentHTML('afterbegin', iconFileText());

    // Name (Anfang abgeschnitten, Dateiname sichtbar dank direction:rtl)
    const name = document.createElement('span');
    name.className = 'recent-db-name';
    const bdi = document.createElement('bdi');
    bdi.textContent = it.fileName;
    name.appendChild(bdi);
    row.appendChild(name);

    // Klick auf Zeile -> öffnen
    row.addEventListener('click', (e) => {
      if (e.target.closest('.recent-db-remove')) return;
      openRecentDb(it);
    });

    // Entfernen-Button
    const rm = document.createElement('button');
    rm.className = 'recent-db-remove';
    rm.title = 'Aus Liste entfernen';
    rm.insertAdjacentHTML('afterbegin', iconX());
    rm.addEventListener('click', async (e) => {
      e.stopPropagation();
      await DB.Recent.remove(it.key);
      await renderRecentDbList();
    });
    row.appendChild(rm);

    sub.appendChild(row);
  }

  // Fußzeile: Liste leeren
  const footer = document.createElement('div');
  footer.className = 'recent-db-footer';
  const clear = document.createElement('button');
  clear.className = 'recent-db-clear';
  clear.textContent = 'Liste leeren';
  clear.addEventListener('click', async (e) => {
    e.stopPropagation();
    await DB.Recent.clear();
    await renderRecentDbList();
  });
  footer.appendChild(clear);
  sub.appendChild(footer);
}

/** Öffnet einen Eintrag aus "Zuletzt verwendet". */
async function openRecentDb(entry) {
  // Hauptmenü schließen
  const menuPanel = document.getElementById('projectMenuPanel');
  if (menuPanel) menuPanel.classList.add('hidden');

  // Ohne Handle (z. B. Firefox-Eintrag) -> nur Datei-Dialog öffnen
  if (!entry.handle) {
    showToast('Diese Datei muss erneut ausgewählt werden.', 'info');
    openDatabaseViaPicker();
    return;
  }

  // Leseberechtigung prüfen/anfordern (Browser kann Nachfrage zeigen)
  try {
    if (entry.handle.queryPermission) {
      let perm = await entry.handle.queryPermission({ mode: 'read' });
      if (perm !== 'granted' && entry.handle.requestPermission) {
        perm = await entry.handle.requestPermission({ mode: 'read' });
      }
      if (perm !== 'granted') {
        showToast('Keine Leseberechtigung für die Datei.', 'error');
        return;
      }
    }
    const file = await entry.handle.getFile();
    await importFullDB(file, entry.handle);
  } catch (err) {
    // Datei verschoben/gelöscht o. Ä.
    showToast('Datei nicht mehr verfügbar. Bitte erneut öffnen.', 'error');
    await DB.Recent.remove(entry.key);
    await renderRecentDbList();
    openDatabaseViaPicker();
  }
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
function closeModal(id) {
  // Abbruch des UKAP-Modals verwirft einen vorgemerkten Thema-Verschiebe-Auftrag
  if (id === 'modalSubchapter') App._pendingTopicMove = null;
  document.getElementById(id).classList.add('hidden');
}

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

  return await new Promise((resolve) => {
    let settled = false;
    const settle = (val) => {
      if (settled) return;
      settled = true;
      cleanup();
      closeModal('modalConfirm');
      resolve(val);
    };

    // Handler werden als onclick-/onkeydown-PROPERTIES gesetzt, nicht via
    // addEventListener. modalConfirm ist ein wiederverwendetes Singleton —
    // eine Property-Zuweisung ersetzt den vorigen Handler, statt ihn zu
    // stapeln. So koennen keine toten Handler eines frueheren Dialog-
    // Aufrufs zurueckbleiben, die den aktuellen Dialog wegklicken
    // ("Dialog schliesst sich, nichts geloescht").
    const cleanup = () => {
      btnOk.onclick = null;
      btnCancel.onclick = null;
      btnClose.onclick = null;
      modal.onclick = null;
      document.removeEventListener('keydown', onEsc);
    };

    const onEsc = (e) => { if (e.key === 'Escape') settle(false); };

    btnOk.onclick     = () => settle(true);
    btnCancel.onclick = () => settle(false);
    btnClose.onclick  = () => settle(false);
    modal.onclick     = (e) => { if (e.target === modal) settle(false); };
    document.addEventListener('keydown', onEsc);

    openModal('modalConfirm');
    // Fokus erst nach dem Sichtbarmachen setzen.
    requestAnimationFrame(() => { if (!settled) btnOk.focus(); });
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

/* ============================================================
   SCHRITTWEISER MARKDOWN-IMPORT
   - Auswahl-Modal (Komplett vs. Schrittweise)
   - Parser fuer KADRA-Tabellen-Markdown
   - Verschiebbares Panel mit Drag & Drop in das offene Protokoll
============================================================ */

const ImportStepper = {
  items: [],          // geparste Items aus dem Markdown
  fileName: '',
  imported: new Set(),// origIds bereits importierter Items
  draggedItemId: null,
  _panelDragOff: null,// {dx, dy} fuer Header-Drag
};

/**
 * Parst KADRA/VOCTA-Tabellen-Markdown (von MarkdownExport erzeugtes Format).
 *
 * Liefert ein Dokument-Objekt:
 *   {
 *     meta:        { title, date, time, location, tenant, landlord,
 *                    project, projectCode, authorRaw },
 *     participants:[ { name, company, abbr, email, attended, inDistrib } ],
 *     structure:   { A: { label, subchapters:[ { id, label, topics:[ { id, label } ] } ] } },
 *     points:      [ { id, chapter, subchapter, topic, content, category,
 *                      responsible, deadline, done, isNew } ],
 *     items:       [ ...wie points, zusaetzlich origId/source* fuer den Stepper ],
 *   }
 *
 * - Metadaten-Block:  **Label:** Wert  (vor erster ##-Ueberschrift)
 * - Teilnehmer:       ## Teilnehmer  + Tabelle (Name|Firma|Kuerzel|E-Mail|Teilgenommen|Verteiler)
 * - Struktur 1:1:     ## A - Label / ### A.1 - Label / #### Thema: Label  (auch leere)
 * - Marker (neu)/(Update) am Inhaltsende werden entfernt; *(neu)* an der ID setzt isNew.
 */
function parseVoctaMarkdown(text) {
  const lines = text.split(/\r?\n/);
  const items = [];

  const meta = {
    title: '', date: '', time: '', location: '',
    tenant: '', landlord: '', project: '', projectCode: '', authorRaw: '',
  };
  const participants = [];
  const structure = {};       // { key: { label, subchapters: [...] } }
  const chapterOrder = [];     // Reihenfolge der Kapitel-Keys

  let curChapter = null;     // { key, label }
  let curSubchapter = null;  // { id, label }
  let curTopic = null;       // { id, label }
  // Sektionsmodus: 'meta' | 'participants' | 'attachments' | 'abbrev' | 'content' | 'ignored'
  let mode = 'meta';

  // Tabellen-Tracker
  let tableHeader = null;    // map: feldname -> spaltenindex
  let tableActive = false;

  const ignoredHeadings = /^(Aufgaben(ü|ue)bersicht|Hinweise? zur Verarbeitung|Hinweis)\b/i;

  function resetTable() { tableHeader = null; tableActive = false; }

  let topicSeq = 0;
  function ensureChapter(key, label) {
    if (!structure[key]) {
      structure[key] = { label: label || '', subchapters: [] };
      chapterOrder.push(key);
    } else if (label) {
      structure[key].label = label;
    }
    return structure[key];
  }
  function ensureSubchapter(chapterKey, id, label) {
    const ch = ensureChapter(chapterKey);
    let sub = ch.subchapters.find(s => s.id === id);
    if (!sub) { sub = { id, label: label || '', topics: [] }; ch.subchapters.push(sub); }
    else if (label) sub.label = label;
    return sub;
  }
  function ensureTopic(sub, label) {
    let topic = sub.topics.find(t => t.label === label);
    if (!topic) { topic = { id: `t${++topicSeq}`, label }; sub.topics.push(topic); }
    return topic;
  }

  // ── Metadaten-Header normalisieren ──
  function applyMetaLine(label, value) {
    const l = label.toLowerCase().replace(/\s+/g, '');
    if (l === 'projekt') meta.project = value;
    else if (l.startsWith('projektk'))  meta.projectCode = value;   // Projektkuerzel
    else if (l.startsWith('mieter'))    meta.tenant = value;
    else if (l.startsWith('vermieter')) meta.landlord = value;
    else if (l === 'datum')             meta.date = value;
    else if (l === 'zeit' || l === 'uhrzeit') meta.time = value;
    else if (l === 'ort')               meta.location = value;
    else if (l.startsWith('aufgestellt')) meta.authorRaw = value;
  }

  function parseTableRow(line) {
    // pipe-getrennt; fuehrendes/abschliessendes pipe entfernen.
    // Escaped pipes \| innerhalb einer Zelle (z.B. in IDs wie #21\|B.1.01) bleiben erhalten.
    const inner = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '');
    const cells = [];
    let buf = '';
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (ch === '\\' && inner[i + 1] === '|') { buf += '|'; i++; continue; }
      if (ch === '|') { cells.push(buf.trim()); buf = ''; continue; }
      buf += ch;
    }
    cells.push(buf.trim());
    return cells;
  }

  function isSeparatorRow(cells) {
    return cells.length > 0 && cells.every(c => /^:?-{2,}:?$/.test(c) || c === '');
  }

  function normalizeHeader(h) {
    const s = h.toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
    if (s === 'id') return 'id';
    if (s === 'inhalt' || s === 'beschreibung' || s === 'text') return 'content';
    if (s === 'kategorie' || s === 'kat') return 'category';
    if (s.startsWith('verantw') || s === 'wer') return 'responsible';
    if (s === 'frist' || s === 'termin' || s === 'deadline') return 'deadline';
    if (s === 'erledigt' || s === 'done' || s === 'fertig') return 'done';
    return null;
  }

  // Header der Teilnehmer-Tabelle (eigenes Schema)
  function normalizeParticipantHeader(h) {
    const s = h.toLowerCase().replace(/\s+/g, '').replace(/[.\-]/g, '');
    if (s === 'name') return 'name';
    if (s === 'firma' || s === 'unternehmen') return 'company';
    if (s.startsWith('kuerz') || s.startsWith('kürz') || s === 'abbr') return 'abbr';
    if (s === 'email' || s === 'emailadresse' || s === 'mail') return 'email';
    if (s.startsWith('teilgenommen') || s.startsWith('anwesend')) return 'attended';
    if (s.startsWith('verteiler') || s === 'verteilung') return 'inDistrib';
    return null;
  }

  function mapBool(raw) {
    return /[xX✓✔☑]/.test(String(raw || '').trim());
  }

  function mapCategory(raw) {
    const v = (raw || '').toLowerCase().trim();
    if (v.startsWith('aufgab')) return 'Aufgabe';
    if (v.startsWith('info'))   return 'Info';
    if (v.startsWith('festleg'))return 'Festlegung';
    if (v.startsWith('freigabe'))return 'Freigabe erfordl';
    return 'Info';
  }

  function mapDeadline(raw) {
    if (!raw) return '';
    const s = String(raw).trim();
    if (!s || /^[—–\-]+$/.test(s)) return '';
    if (/fortlaufend|offen/i.test(s)) return '';
    // DD.MM.YYYY behalten (KADRA-Format), ISO -> umwandeln
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(s)) return s;
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`;
    return s;
  }

  function mapDone(raw) {
    if (!raw) return false;
    const s = String(raw).trim();
    return /[xX✓✔☑]/.test(s);
  }

  function stripBoldAndMarkers(content) {
    let s = String(content || '');
    // **fett** entfernen
    s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
    // *kursiv* entfernen (aber nur, wenn Stern paarweise)
    s = s.replace(/\*([^*]+)\*/g, '$1');
    // (neu) und (Update)/(Updated) am Ende entfernen
    s = s.replace(/\s*\((neu|Update|Updated|aktualisiert)\)\s*$/i, '').trim();
    return s;
  }

  // ID kann "#19\|B.1.01 *(neu)*" lauten -> Marker abtrennen, isNew erkennen
  function parsePointId(idRaw) {
    let s = String(idRaw || '').trim();
    // Marker steht am Ende, optional von Sternchen umschlossen: *(neu)*, (neu), _(neu)_
    const isNew = /[*_]*\(neu\)[*_]*\s*$/i.test(s);
    s = s.replace(/\s*[*_]*\((neu|Update|Updated|aktualisiert)\)[*_]*\s*$/i, '').trim();
    s = s.replace(/[*_]/g, '').trim();
    return { id: s, isNew };
  }

  function pushIfDataRow(cells) {
    if (!tableHeader) return;
    // Falls wir noch keinen Kontext haben, ueberspringen wir
    if (!curChapter) return;

    const get = (name) => {
      const idx = tableHeader[name];
      return idx !== undefined ? (cells[idx] || '') : '';
    };

    const idRaw = get('id').trim();
    const contentRaw = get('content').trim();
    if (!idRaw && !contentRaw) return; // leere Zeile

    let respRaw = (get('responsible') || '').trim();
    // Leere Marker / Platzhalter ausfiltern
    if (/^[—–\-]+$/.test(respRaw)) respRaw = '';

    const { id: cleanId, isNew } = parsePointId(idRaw);

    items.push({
      origId: cleanId || `__noid__${items.length}`,
      isNew,
      content: stripBoldAndMarkers(contentRaw),
      category: mapCategory(get('category')),
      responsible: respRaw,
      deadline: mapDeadline(get('deadline')),
      done: mapDone(get('done')),
      // Strukturkontext (Keys, fuer den Strukturaufbau in importVoctaMarkdown)
      chapter: curChapter.key,
      subchapter: curSubchapter ? curSubchapter.id : null,
      topic: curTopic ? curTopic.id : null,
      // Original-Kontextobjekte (vom Stepper genutzt; sourceTopic ist das Label-String)
      sourceChapter: curChapter,
      sourceSubchapter: curSubchapter,
      sourceTopic: curTopic ? curTopic.label : '',
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // H1 (#) -> Dokumenttitel (erstes Vorkommen gewinnt)
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      resetTable();
      if (!meta.title) meta.title = h1[1].trim();
      continue;
    }

    // ## Abschnittsueberschrift
    const ch2 = line.match(/^##\s+(.+)$/);
    if (ch2) {
      resetTable();
      const title = ch2[1].trim();

      if (/^Teilnehmer\b/i.test(title)) {
        mode = 'participants';
        curChapter = null; curSubchapter = null; curTopic = null;
        continue;
      }
      if (/^Anlagen\b/i.test(title)) {
        mode = 'attachments';
        curChapter = null; curSubchapter = null; curTopic = null;
        continue;
      }
      if (/^Abk(ü|ue)rzungsverzeichnis|^Abk(ü|ue)rzungen/i.test(title)) {
        mode = 'abbrev';
        curChapter = null; curSubchapter = null; curTopic = null;
        continue;
      }
      if (ignoredHeadings.test(title)) {
        mode = 'ignored';
        curChapter = null; curSubchapter = null; curTopic = null;
        continue;
      }

      // Kapitel-Header: "A - Organisation | Information"
      mode = 'content';
      const m = title.match(/^([A-Z])\s*[—–\-]\s*(.+)$/);
      if (m) {
        ensureChapter(m[1], m[2].trim());
        curChapter = { key: m[1], label: m[2].trim() };
      } else {
        ensureChapter('?', title);
        curChapter = { key: '?', label: title };
      }
      curSubchapter = null;
      curTopic = null;
      continue;
    }

    // ### UKAP-Header (z.B. "B.1 - Objektplanung")
    const ch3 = line.match(/^###\s+(.+)$/);
    if (ch3 && mode === 'content' && curChapter) {
      resetTable();
      const title = ch3[1].trim();
      const m = title.match(/^([A-Z])\.(\d+)\s*[—–\-]?\s*(.*)$/);
      if (m) {
        const subId = `${m[1]}.${m[2]}`;
        ensureSubchapter(curChapter.key, subId, (m[3] || '').trim());
        curSubchapter = { id: subId, label: (m[3] || '').trim() };
      } else {
        curSubchapter = { id: null, label: title };
      }
      curTopic = null;
      continue;
    }

    // #### Thema-Header
    const ch4 = line.match(/^####\s+(.+)$/);
    if (ch4 && mode === 'content' && curChapter && curSubchapter && curSubchapter.id) {
      resetTable();
      const t = ch4[1].trim().replace(/^Thema:\s*/i, '');
      const topic = ensureTopic(
        ensureSubchapter(curChapter.key, curSubchapter.id, curSubchapter.label), t);
      curTopic = { id: topic.id, label: t };
      continue;
    }

    // Metadaten-Zeile: **Label:** Wert
    if (mode === 'meta') {
      const metaMatch = line.match(/^\*\*([^:*]+):\*\*\s*(.*)$/);
      if (metaMatch) { applyMetaLine(metaMatch[1].trim(), metaMatch[2].trim()); continue; }
    }

    // Tabellenzeile?
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const cells = parseTableRow(line);

      // ── Teilnehmer-Tabelle ──
      if (mode === 'participants') {
        if (!tableHeader) {
          const map = {};
          cells.forEach((c, idx) => {
            const key = normalizeParticipantHeader(c);
            if (key) map[key] = idx;
          });
          if (map.name !== undefined) { tableHeader = map; tableActive = true; }
          continue;
        }
        if (isSeparatorRow(cells)) continue;
        const get = (name) => {
          const idx = tableHeader[name];
          return idx !== undefined ? (cells[idx] || '').trim() : '';
        };
        const pName = get('name');
        if (!pName) continue;
        participants.push({
          name: pName,
          company: get('company'),
          abbr: get('abbr'),
          email: get('email'),
          attended:  tableHeader.attended  !== undefined ? mapBool(get('attended'))  : true,
          inDistrib: tableHeader.inDistrib !== undefined ? mapBool(get('inDistrib')) : true,
        });
        continue;
      }

      // ── Punkte-Tabelle (nur im Content-Modus) ──
      if (mode === 'content') {
        if (!tableHeader) {
          const map = {};
          cells.forEach((c, idx) => {
            const key = normalizeHeader(c);
            if (key) map[key] = idx;
          });
          if (map.content !== undefined) { tableHeader = map; tableActive = true; }
          continue;
        }
        if (isSeparatorRow(cells)) continue;
        pushIfDataRow(cells);
        continue;
      }

      // Tabellen in ignorierten Sektionen (Anlagen, Abkuerzungen) ueberspringen
      continue;
    }

    // Nicht-Tabellenzeile: ggf. Tabelle beenden
    if (tableActive && line === '') resetTable();
  }

  // Punkte aus items ableiten (ohne Stepper-Felder)
  const points = items.map(it => ({
    id: it.origId,
    isNew: it.isNew,
    content: it.content,
    category: it.category,
    responsible: it.responsible,
    deadline: it.deadline,
    done: it.done,
    chapter: it.chapter,
    subchapter: it.subchapter,
    topic: it.topic,
  }));

  return { meta, participants, structure, chapterOrder, points, items };
}

/**
 * Stepper-kompatibler Wrapper: liefert nur das Item-Array (wie frueher
 * parseKadraMarkdown), das vom schrittweisen Drag-Import erwartet wird.
 */
function parseKadraMarkdown(text) {
  return parseVoctaMarkdown(text).items;
}

/* ── Auswahl-Dialog (Komplett vs. Schrittweise) ─────────────── */
function openImportModeDialog(file) {
  const stepBtn = document.getElementById('btnImportModeStepwise');
  const hint    = document.getElementById('importModeStepwiseHint');
  const protocolOpen = !!App.currentProtocolId;
  if (stepBtn) {
    stepBtn.disabled = !protocolOpen;
    if (hint) hint.style.display = protocolOpen ? 'none' : '';
  }
  document.getElementById('btnImportModeFull').onclick = () => {
    closeModal('modalImportMode');
    openVoctaImportModal(file);
  };
  if (stepBtn) {
    stepBtn.onclick = () => {
      if (stepBtn.disabled) return;
      closeModal('modalImportMode');
      openImportStepperPanel(file);
    };
  }
  openModal('modalImportMode');
}

/* ── Verschiebbares Panel ──────────────────────────────────── */
async function openImportStepperPanel(file) {
  let text;
  try { text = await file.text(); }
  catch (e) { showToast('Datei konnte nicht gelesen werden.', 'error'); return; }

  const items = parseKadraMarkdown(text);
  if (!items.length) {
    showToast('Keine Punkte im Markdown gefunden.', 'error');
    return;
  }

  ImportStepper.items = items;
  ImportStepper.fileName = file.name || '';
  ImportStepper.imported = new Set();

  const panel = document.getElementById('importStepperPanel');
  document.getElementById('importStepperFilename').textContent = file.name || '';
  renderImportStepperPanel();

  // Initialposition (rechts, ca. 60px vom Rand)
  panel.style.right = '24px';
  panel.style.top = '88px';
  panel.style.left = '';
  panel.classList.remove('hidden');

  setupImportStepperPanelDrag();
}

function closeImportStepperPanel() {
  const panel = document.getElementById('importStepperPanel');
  const fab   = document.getElementById('importStepperFab');
  if (panel) panel.classList.add('hidden');
  if (fab)   fab.classList.add('hidden');
  ImportStepper.items = [];
  ImportStepper.imported.clear();
  ImportStepper.draggedItemId = null;
}

function getCurrentParticipantAbbrs() {
  // Aus aktuell geoeffnetem Protokoll: alle Teilnehmer-Kuerzel sammeln
  const rows = document.querySelectorAll('#participantsBody tr');
  const set = new Set();
  rows.forEach(tr => {
    const abbrInput = tr.querySelector('input[data-field="abbr"]');
    const abbr = abbrInput?.value?.trim();
    if (abbr) set.add(abbr.toLowerCase());
  });
  return set;
}

function splitResponsibleTokens(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/\s*(?:\/|,| und )\s*/i)
    .map(s => s.trim())
    .filter(Boolean);
}

function checkResponsible(rawResponsible, abbrSet) {
  const tokens = splitResponsibleTokens(rawResponsible);
  const matched = [];
  const unknown = [];
  for (const t of tokens) {
    if (abbrSet.has(t.toLowerCase())) matched.push(t);
    else unknown.push(t);
  }
  return { tokens, matched, unknown };
}

function renderImportStepperPanel() {
  const body = document.getElementById('importStepperBody');
  body.innerHTML = '';

  const abbrSet = getCurrentParticipantAbbrs();
  const total = ImportStepper.items.length;
  const done  = ImportStepper.imported.size;

  // Header-Counter
  const counter = document.getElementById('importStepperCounter');
  let unknownItemCount = 0;
  ImportStepper.items.forEach(it => {
    const { unknown } = checkResponsible(it.responsible, abbrSet);
    if (unknown.length) unknownItemCount++;
  });
  counter.innerHTML = `${done} / ${total} importiert` +
    (unknownItemCount ? `<span class="import-stepper-warn-count" title="Punkte mit unbekannten K&uuml;rzeln">&#9888; ${unknownItemCount}</span>` : '');

  // Gruppierung nach Kapitel/UKAP/Thema (nur als Orientierung)
  const groups = new Map();
  ImportStepper.items.forEach((it, idx) => {
    const ch  = it.sourceChapter ? `${it.sourceChapter.key} - ${it.sourceChapter.label}` : '(ohne Kapitel)';
    const sub = it.sourceSubchapter ? `${it.sourceSubchapter.id || ''} ${it.sourceSubchapter.label || ''}`.trim() : '';
    const top = it.sourceTopic || '';
    const key = [ch, sub, top].join('||');
    if (!groups.has(key)) groups.set(key, { ch, sub, top, items: [] });
    groups.get(key).items.push({ it, idx });
  });

  groups.forEach(g => {
    const groupEl = document.createElement('div');
    groupEl.className = 'import-stepper-group';

    let header = `<div class="import-stepper-group-ch">${esc(g.ch)}</div>`;
    if (g.sub) header += `<div class="import-stepper-group-sub">${esc(g.sub)}</div>`;
    if (g.top) header += `<div class="import-stepper-group-topic">${esc(g.top)}</div>`;
    groupEl.innerHTML = header;

    g.items.forEach(({ it, idx }) => {
      const card = document.createElement('div');
      card.className = 'import-stepper-item';
      card.dataset.itemIdx = String(idx);
      const isImported = ImportStepper.imported.has(idx);
      card.draggable = !isImported;
      if (isImported) card.classList.add('imported');

      const { unknown } = checkResponsible(it.responsible, abbrSet);
      const respHtml = it.responsible
        ? `<span class="isi-resp${unknown.length ? ' isi-resp-warn' : ''}" title="${unknown.length ? 'Unbekannte K&uuml;rzel: ' + esc(unknown.join(', ')) : ''}">${esc(it.responsible)}${unknown.length ? ' &#9888;' : ''}</span>`
        : '';
      const deadlineHtml = it.deadline ? `<span class="isi-deadline">${esc(it.deadline)}</span>` : '';
      const doneHtml = it.done ? `<span class="isi-done">erledigt</span>` : '';
      const catClass = 'isi-cat-' + it.category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z\-]/g, '');

      card.innerHTML = `
        <div class="isi-row1">
          <span class="isi-id">${esc(it.origId)}</span>
          <span class="isi-cat ${catClass}">${esc(it.category)}</span>
        </div>
        <div class="isi-content">${esc(it.content)}</div>
        <div class="isi-row2">
          ${respHtml}
          ${deadlineHtml}
          ${doneHtml}
        </div>
      `;

      // Drag-Source — Schluessel ist der Item-Index, nicht die origId
      card.addEventListener('dragstart', e => {
        if (ImportStepper.imported.has(idx)) { e.preventDefault(); return; }
        ImportStepper.draggedItemId = idx;
        e.dataTransfer.effectAllowed = 'copy';
        const payload = { ...it, _itemIdx: idx };
        try {
          e.dataTransfer.setData('application/x-kadra-import', JSON.stringify(payload));
        } catch (_) {}
        e.dataTransfer.setData('text/plain', String(idx));
        card.classList.add('dragging');
        App._dragType = 'importItem';
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        ImportStepper.draggedItemId = null;
        if (App._dragType === 'importItem') App._dragType = null;
        document.querySelectorAll('.drag-over-top, .drag-over-bottom, .import-drop-target').forEach(el => {
          el.classList.remove('drag-over-top', 'drag-over-bottom', 'import-drop-target');
        });
      });

      groupEl.appendChild(card);
    });

    body.appendChild(groupEl);
  });
}

function setupImportStepperPanelDrag() {
  const panel = document.getElementById('importStepperPanel');
  const header = document.getElementById('importStepperHeader');
  if (!panel || !header || header._dragWired) return;
  header._dragWired = true;

  let dragging = false;
  let offX = 0, offY = 0;

  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.import-stepper-close')) return;
    if (e.target.closest('.import-stepper-min'))   return;
    dragging = true;
    const rect = panel.getBoundingClientRect();
    offX = e.clientX - rect.left;
    offY = e.clientY - rect.top;
    panel.classList.add('dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const x = Math.max(0, Math.min(window.innerWidth - 40,  e.clientX - offX));
    const y = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - offY));
    panel.style.left = x + 'px';
    panel.style.top  = y + 'px';
    panel.style.right = '';
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    panel.classList.remove('dragging');
  });

  // Close-Button
  const closeBtn = document.getElementById('importStepperClose');
  if (closeBtn && !closeBtn._wired) {
    closeBtn._wired = true;
    closeBtn.addEventListener('click', closeImportStepperPanel);
  }

  // Minimieren-Button
  const minBtn = document.getElementById('importStepperMin');
  if (minBtn && !minBtn._wired) {
    minBtn._wired = true;
    minBtn.addEventListener('click', minimizeImportStepperPanel);
  }
}

function minimizeImportStepperPanel() {
  const panel = document.getElementById('importStepperPanel');
  const fab   = document.getElementById('importStepperFab');
  if (panel) panel.classList.add('hidden');
  if (fab) {
    fab.classList.remove('hidden');
    setupImportStepperFab();
  }
}

function maximizeImportStepperPanel() {
  const panel = document.getElementById('importStepperPanel');
  const fab   = document.getElementById('importStepperFab');
  if (fab) fab.classList.add('hidden');
  if (panel) panel.classList.remove('hidden');
}

function setupImportStepperFab() {
  const fab = document.getElementById('importStepperFab');
  if (!fab || fab._wired) {
    // Initialposition: links unten, falls noch nicht gesetzt
    if (fab && !fab.style.left && !fab.style.right) {
      fab.style.left = '24px';
      fab.style.bottom = '24px';
    }
    return;
  }
  fab._wired = true;

  // Initialposition
  if (!fab.style.left && !fab.style.right) {
    fab.style.left = '24px';
    fab.style.bottom = '24px';
  }

  let dragging = false;
  let moved = false;
  let offX = 0, offY = 0;
  let downX = 0, downY = 0;

  fab.addEventListener('mousedown', (e) => {
    dragging = true;
    moved = false;
    const rect = fab.getBoundingClientRect();
    offX = e.clientX - rect.left;
    offY = e.clientY - rect.top;
    downX = e.clientX;
    downY = e.clientY;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    if (Math.abs(e.clientX - downX) > 3 || Math.abs(e.clientY - downY) > 3) {
      moved = true;
    }
    if (!moved) return;
    const w = fab.offsetWidth;
    const h = fab.offsetHeight;
    const x = Math.max(0, Math.min(window.innerWidth  - w, e.clientX - offX));
    const y = Math.max(0, Math.min(window.innerHeight - h, e.clientY - offY));
    fab.style.left   = x + 'px';
    fab.style.top    = y + 'px';
    fab.style.right  = '';
    fab.style.bottom = '';
    fab.classList.add('dragging');
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    fab.classList.remove('dragging');
  });

  fab.addEventListener('click', (e) => {
    // Klick nur auswerten, wenn nicht gerade gezogen wurde
    if (moved) { moved = false; return; }
    maximizeImportStepperPanel();
  });
}

/* ── Drop-Zonen im Hauptprotokoll ──────────────────────────── */
/**
 * Wird einmal beim DOMContentLoaded aufgerufen. Haengt am pointsBody einen
 * delegierten Drop-Listener fuer Items aus dem Import-Stepper an. Die blauen
 * Linien drag-over-top/-bottom werden auf der Zielzeile gesetzt; Drop fuegt
 * den Punkt an der entsprechenden Position ein.
 */
function setupImportDropZones() {
  const tbody = document.getElementById('pointsBody');
  if (!tbody || tbody._importDropWired) return;
  tbody._importDropWired = true;

  const isImportDrag = (e) => {
    return App._dragType === 'importItem' || (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('application/x-kadra-import'));
  };

  function findTargetRow(node) {
    while (node && node !== tbody) {
      if (node.dataset && (node.dataset.type === 'point' || node.dataset.type === 'topic' || node.dataset.type === 'subchapter' || node.dataset.type === 'chapter')) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  tbody.addEventListener('dragover', (e) => {
    if (!isImportDrag(e)) return;
    const tr = findTargetRow(e.target);
    if (!tr) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    // Vorher alle anderen Highlights entfernen
    tbody.querySelectorAll('.drag-over-top, .drag-over-bottom, .import-drop-target').forEach(el => {
      if (el !== tr) el.classList.remove('drag-over-top', 'drag-over-bottom', 'import-drop-target');
    });

    if (tr.dataset.type === 'point') {
      const rect = tr.getBoundingClientRect();
      const mid  = rect.top + rect.height / 2;
      tr.classList.toggle('drag-over-top',    e.clientY < mid);
      tr.classList.toggle('drag-over-bottom', e.clientY >= mid);
      tr.classList.remove('import-drop-target');
    } else {
      // Struktur-Zeile (Kapitel/UKAP/Thema): blaue Linie unten + Bereichsmarkierung
      tr.classList.add('drag-over-bottom', 'import-drop-target');
      tr.classList.remove('drag-over-top');
    }
  });

  tbody.addEventListener('dragleave', (e) => {
    const tr = findTargetRow(e.target);
    if (!tr) return;
    // Nur entfernen, wenn Maus die Zeile wirklich verlaesst
    const rect = tr.getBoundingClientRect();
    if (e.clientY < rect.top || e.clientY > rect.bottom || e.clientX < rect.left || e.clientX > rect.right) {
      tr.classList.remove('drag-over-top', 'drag-over-bottom', 'import-drop-target');
    }
  });

  tbody.addEventListener('drop', async (e) => {
    if (!isImportDrag(e)) return;
    const tr = findTargetRow(e.target);
    if (!tr) return;
    e.preventDefault();

    // Zieldaten lesen
    let item = null;
    let itemIdx = -1;
    try {
      const raw = e.dataTransfer.getData('application/x-kadra-import');
      if (raw) {
        item = JSON.parse(raw);
        if (typeof item._itemIdx === 'number') itemIdx = item._itemIdx;
      }
    } catch (_) {}
    if (itemIdx < 0) {
      // Fallback: numerischer Index in text/plain
      const tp = e.dataTransfer.getData('text/plain');
      const n = parseInt(tp, 10);
      if (!Number.isNaN(n)) itemIdx = n;
    }
    if (!item && itemIdx >= 0) item = ImportStepper.items[itemIdx];

    // Aufraeumen
    tbody.querySelectorAll('.drag-over-top, .drag-over-bottom, .import-drop-target').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom', 'import-drop-target');
    });

    if (!item) return;
    await dropImportItemOnRow(item, tr, e.clientY, itemIdx);
  });
}

async function dropImportItemOnRow(item, tr, clientY, itemIdx) {
  if (!App.currentProtocolId) {
    showToast('Kein Protokoll geöffnet.', 'error');
    return;
  }

  // Scrollposition merken (Hauptdokument + scrollender Container)
  const scrollContainer = document.querySelector('.workspace-content');
  const savedScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
  const savedWindowY = window.scrollY || 0;

  await saveCurrentProtocol();
  const protocol = await DB.Protocols.get(App.currentProtocolId);
  if (!protocol) return;

  // Ziel-Kontext aus der Drop-Zeile
  const targetType = tr.dataset.type;
  const chKey = tr.dataset.chapter || null;
  let subId = tr.dataset.subchapter || null;
  let topicId = tr.dataset.topic || null;

  if (!chKey) { showToast('Drop-Ziel ohne Kapitelkontext.', 'error'); return; }

  // Bei Drop auf Kapitel: subchapter/topic null
  if (targetType === 'chapter') { subId = null; topicId = null; }
  // Bei Drop auf UKAP: topic null
  if (targetType === 'subchapter') { topicId = null; }
  // Bei Drop auf Thema: chapter/sub aus tr.dataset uebernommen
  // Bei Drop auf Punkt: chapter/sub/topic der Zielzeile uebernehmen

  // Validierung der Zielstruktur
  const chapter = protocol.structure?.[chKey];
  if (!chapter) { showToast('Zielkapitel nicht gefunden.', 'error'); return; }
  if (subId) {
    const sub = (chapter.subchapters || []).find(s => s.id === subId);
    if (!sub) { showToast('Ziel-Unterkapitel nicht gefunden.', 'error'); return; }
    if (topicId) {
      const top = (sub.topics || []).find(t => t.id === topicId);
      if (!top) topicId = null;
    }
  } else {
    topicId = null;
  }

  // Kuerzel filtern: nur bekannte uebernehmen
  const abbrSet = getCurrentParticipantAbbrs();
  const { matched, unknown } = checkResponsible(item.responsible, abbrSet);
  const responsible = matched.join('/');

  // Kategorie validieren
  const validCats = new Set(['Aufgabe', 'Info', 'Festlegung', 'Freigabe erfordl']);
  const category = validCats.has(item.category) ? item.category : 'Info';

  // ID-Vergabe
  const subNum = subId ? subId.split('.')[1] : null;
  const seq = getNextPointSeq(protocol, chKey, subId);
  const akNum = protocol.type === 'Aktennotiz' ? _getAkSectionNum(protocol, chKey) : undefined;
  const newId = DB.generatePointId(protocol.number, chKey, subNum, seq, akNum);

  const newPoint = {
    id: newId,
    chapter: chKey,
    subchapter: subId,
    topic: topicId,
    content: item.content || '',
    category,
    responsible,
    deadline: item.deadline || '',
    done: !!item.done,
    isNew: true,
    doneLastProtocol: false,
    createdInProtocol: protocol.number,
  };

  // Einfuegeposition: bei Drop auf Punkt-Zeile vor/nach Zielpunkt; sonst ans Ende der Zielgruppe
  const points = protocol.points || (protocol.points = []);
  let insertIdx = points.length;

  if (targetType === 'point') {
    const targetPointId = tr.dataset.pointId;
    const targetIdx = points.findIndex(p => p.id === targetPointId);
    if (targetIdx >= 0) {
      const rect = tr.getBoundingClientRect();
      const insertAfter = clientY >= rect.top + rect.height / 2;
      insertIdx = insertAfter ? targetIdx + 1 : targetIdx;
    }
  } else {
    // Struktur-Zeile: hinter dem letzten Punkt der gleichen Gruppe einfuegen
    let lastIdx = -1;
    points.forEach((p, idx) => {
      if (p.chapter !== chKey) return;
      if ((p.subchapter || null) !== (subId || null)) return;
      if (topicId && p.topic !== topicId) return;
      if (!topicId && targetType === 'subchapter' && p.topic) {
        // Drop auf UKAP: nur Punkte ohne Thema beruecksichtigen, sonst ans Ende der UKAP-Gruppe
      }
      lastIdx = idx;
    });
    insertIdx = lastIdx >= 0 ? lastIdx + 1 : points.length;
  }

  points.splice(insertIdx, 0, newPoint);
  await DB.Protocols.save(protocol);
  renderPoints(protocol);

  // Scrollposition wiederherstellen — nach renderPoints, im naechsten Frame
  requestAnimationFrame(() => {
    if (scrollContainer) scrollContainer.scrollTop = savedScrollTop;
    if (savedWindowY) window.scrollTo(window.scrollX || 0, savedWindowY);
  });

  // Stepper updaten — Schluessel ist der Item-Index, nicht die origId
  if (typeof itemIdx === 'number' && itemIdx >= 0) {
    ImportStepper.imported.add(itemIdx);
  }
  renderImportStepperPanel();

  // Toast
  if (unknown.length) {
    showToast(`Punkt übernommen. Fehlende Kürzel: ${unknown.join(', ')} — bitte Teilnehmer manuell ergänzen.`, 'warning');
  } else {
    showToast('Punkt aus Import übernommen.', 'success');
  }
}

// Bei DOMContentLoaded: Drop-Zonen-Listener am pointsBody anhaengen
document.addEventListener('DOMContentLoaded', () => {
  setupImportDropZones();
});

// Protokoll-Item-Menü bei Klick außerhalb schließen
document.addEventListener('click', (e) => {
  if (!e.target.closest('.protocol-item-menu-wrap') &&
      !e.target.closest('.protocol-item-menu-panel')) {
    closeAllProtocolMenus();
  }
});

