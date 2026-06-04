const fs = require('fs');
const src = fs.readFileSync('js/app.js', 'utf8');

const start = src.indexOf('function _buildProtocolItem(proto) {');
const end   = src.indexOf('\n}\n', start) + 3;
const oldFn = src.slice(start, end);

const newFn = `function _buildProtocolItem(proto) {
  const item = document.createElement('div');
  item.className = 'protocol-item' + (proto.id === App.currentProtocolId ? ' active' : '');
  item.dataset.id = proto.id;

  const dateStr = proto.date
    ? new Date(proto.date + 'T12:00:00').toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })
    : '-';
  const hasFiles = (proto.attachments||[]).some(a => a.fileName);
  const clipHtml = hasFiles ? \`<span class="protocol-item-clip" title="Enthält Datei-Anlagen">\${iconPaperclip()}</span>\` : '';

  const sName = esc(proto.seriesName || proto.title || proto.type);
  const label = proto.type === 'Aktennotiz'
    ? \`\${sName}\${clipHtml}\`
    : \`\${sName} Nr. \${String(proto.number || 1).padStart(2,'0')}\${clipHtml}\`;

  const main = document.createElement('div');
  main.className = 'protocol-item-main';
  main.setAttribute('role', 'button');
  main.tabIndex = 0;
  main.setAttribute('aria-label', \`Protokoll \${proto.seriesName || proto.title || proto.type} öffnen\`);
  main.innerHTML = \`
    <div class="protocol-item-title">\${label}</div>
    <div class="protocol-item-date">\${dateStr}</div>\`;
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
  menuPanel.innerHTML = \`
    <button type="button" class="protocol-item-menu-entry" data-action="dup">
      \${iconCopy()} <span>Duplizieren</span>
    </button>
    <button type="button" class="protocol-item-menu-entry danger" data-action="del">
      \${iconTrash()} <span>Löschen</span>
    </button>\`;

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menuWrap.classList.contains('open');
    document.querySelectorAll('.protocol-item-menu-wrap.open').forEach(w => w.classList.remove('open'));
    if (!isOpen) menuWrap.classList.add('open');
  });

  menuPanel.addEventListener('click', async (e) => {
    e.stopPropagation();
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    menuWrap.classList.remove('open');

    if (action === 'dup') {
      App._duplicatingProtocolId = proto.id;
      document.getElementById('duplicateName').value = '';
      openModal('modalDuplicate');
      setTimeout(() => document.getElementById('duplicateName').focus(), 80);
    } else if (action === 'del') {
      const lbl = proto.type === 'Aktennotiz'
        ? (proto.seriesName || proto.title || 'Aktennotiz')
        : \`\${proto.seriesName||proto.title||proto.type} Nr. \${String(proto.number||1).padStart(2,'0')}\`;
      if (!(await appConfirm(\`Obacht!\\n\\n"\${lbl}" in den Papierkorb verschieben?\\n\\nAlle Punkte bleiben gespeichert.\`, {
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
  menuWrap.appendChild(menuPanel);
  item.appendChild(main);
  item.appendChild(menuWrap);
  return item;
}
`;

const result = src.slice(0, start) + newFn + src.slice(end);
fs.writeFileSync('js/app.js', result, 'utf8');
console.log('OK - replaced', oldFn.length, 'chars with', newFn.length, 'chars');
