/**
 * html-export.js - HTML-Export fuer die Protokoll-App (KADRA)
 *
 * Einstiegspunkt: HtmlExport.exportProtocolHtml(protocolId, hiddenChapters)
 *
 * Erzeugt eine selbsttragende, interaktive Einzeldatei (CSS + JS inline,
 * Anlagen als Base64-Data-URIs eingebettet). Reproduziert die abgenommene
 * Designvorlage: docs/ui/review/260610_KADRA_HTML-Export_Preview.html
 *
 * Struktur/Helfer bewusst analog js/markdown-export.js gehalten.
 */

/* global DB, getDefaultStructure, showToast */

const HtmlExport = (() => {
  'use strict';

  const DISCLAIMER =
    'Der in obenstehendem Text beschriebene Besprechungsinhalt gibt das Verständnis des Verfassers wieder. ' +
    'Die Empfänger des Protokolls werden gebeten eventuell gewünschte Ergänzungen und/oder Korrekturen ' +
    'möglichst innerhalb von drei Tagen nach Zustellung beim Verfasser schriftlich anzumelden. ' +
    'Diese werden dann in der nächsten Besprechung dokumentiert. Ohne Einwände wird von einer ordnungsgemäßen ' +
    'Besprechungswiedergabe ausgegangen. Das Protokoll wird regelmässig durch Entfall älterer und ' +
    'nur dokumentierender Einträge bewusst gekürzt.';

  // Kapitel-/Kuerzel-Farbpalette (VOCTA tag-1..tag-8, danach zyklisch) — wie DOC_STRUCTURE_TAGS in app.js.
  const TAG_COUNT = 8;

  // Gesamtbudget fuer eingebettete Anlagen (Base64-Roh, vor Inflation).
  const ATTACHMENT_BUDGET = 10 * 1024 * 1024; // 10 MB

  const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  /* ── Helfer (groesstenteils aus markdown-export.js) ─────────── */

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function formatDate(value) {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-');
      return `${day}.${month}.${year}`;
    }
    return value;
  }

  function buildFileDate(now) {
    return `${String(now.getFullYear()).slice(2)}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
  }

  function buildFileDateFromAuthor(authorDate) {
    if (!authorDate) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(authorDate)) {
      const [year, month, day] = authorDate.split('-');
      return `${year.slice(2)}${month}${day}`;
    }
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(authorDate)) {
      const [day, month, year] = authorDate.split('.');
      return `${year.slice(2)}${month}${day}`;
    }
    return '';
  }

  function sanitizeFilePart(value) {
    return String(value || '')
      .trim()
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildProtocolFileName(protocol, project) {
    const fileDate = buildFileDateFromAuthor(protocol.author?.date) || buildFileDate(new Date());
    const typeName = sanitizeFilePart(protocol.seriesName || protocol.title || protocol.type || 'Protokoll');
    const numStr = protocol.type === 'Aktennotiz' ? '' : ` Nr.${pad2(protocol.number || 1)}`;
    const projectCode = sanitizeFilePart(project.code || 'Projekt');
    return `${fileDate} ${projectCode}_${typeName}${numStr}.html`;
  }

  function triggerDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function saveBlob(blob, fileName) {
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'HTML',
            accept: { 'text/html': ['.html'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err) {
        if (err.name === 'AbortError') throw err;
      }
    }
    triggerDownload(blob, fileName);
  }

  // HTML-Escaping fuer Text-Inhalte (Attribute via escapeAttr).
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escAttr(value) {
    return esc(value).replace(/"/g, '&quot;');
  }

  // Kategorie normalisieren (App speichert teils 'Freigabe').
  function normalizeCategory(category) {
    return category === 'Freigabe' ? 'Freigabe erfordl' : (category || 'Aufgabe');
  }

  const CAT_CLASS = {
    'Info': 'kat-info',
    'Aufgabe': 'kat-aufgabe',
    'Festlegung': 'kat-festlegung',
    'Freigabe erfordl': 'kat-freigabe',
  };

  function isTaskCategory(category) {
    return category === 'Aufgabe' || category === 'Freigabe erfordl';
  }

  // Verantwortliche in einzelne Kuerzel splitten — exakt wie splitResponsibleTokens() in app.js.
  function splitResponsibleTokens(raw) {
    if (!raw) return [];
    return String(raw)
      .split(/\s*(?:\/|,| und )\s*/i)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  // Abkuerzungen aus Teilnehmern + manuellen Eintraegen (wie markdown-export.js).
  function collectAbbreviations(participants, customAbbrevs) {
    const result = [];
    const seen = new Set();
    (participants || []).forEach((participant) => {
      const abbr = String(participant.abbr || '').trim();
      if (!abbr || seen.has(abbr)) return;
      seen.add(abbr);
      result.push({ abbr, name: String(participant.company || participant.name || '').trim() });
    });
    (customAbbrevs || []).forEach((item) => {
      const abbr = String(item.abbr || '').trim();
      if (!abbr || seen.has(abbr)) return;
      seen.add(abbr);
      result.push({ abbr, name: String(item.name || '').trim() });
    });
    return result;
  }

  // Reihenfolge/Verschachtelung exakt wie collectPointRows() in markdown-export.js.
  function collectPointRows(protocol, hiddenChapters) {
    const structure = protocol.structure || getDefaultStructure(protocol.type);
    const points = protocol.points || [];
    const rows = [];

    Object.keys(structure).sort().forEach((chapterKey) => {
      if (hiddenChapters && hiddenChapters.has(chapterKey)) return;

      const chapter = structure[chapterKey];
      rows.push({ type: 'chapter', chapterKey, label: chapter.label || '' });

      const subchapters = chapter.subchapters || [];
      if (subchapters.length === 0) {
        points
          .filter((point) => point.chapter === chapterKey)
          .forEach((point) => rows.push({ type: 'point', point }));
        return;
      }

      subchapters.forEach((subchapter) => {
        rows.push({ type: 'subchapter', id: subchapter.id, label: subchapter.label || '' });

        (subchapter.topics || []).forEach((topic) => {
          rows.push({ type: 'topic', id: topic.id, label: topic.label || '' });
          points
            .filter((point) =>
              point.chapter === chapterKey &&
              point.subchapter === subchapter.id &&
              point.topic === topic.id)
            .forEach((point) => rows.push({ type: 'point', point }));
        });

        points
          .filter((point) =>
            point.chapter === chapterKey &&
            point.subchapter === subchapter.id &&
            !point.topic)
          .forEach((point) => rows.push({ type: 'point', point }));
      });
    });

    return rows;
  }

  /* ── Stabile Farb-Zuordnung ─────────────────────────────────
     Kapitel: nach Reihenfolge im Strukturobjekt (A=tag-1, B=tag-2 …).
     Kuerzel: nach erstem Auftreten (Teilnehmer-Reihenfolge zuerst),
     danach in der Reihenfolge des Auftretens bei den Punkten. */

  function buildChapterColorMap(protocol, hiddenChapters) {
    const structure = protocol.structure || getDefaultStructure(protocol.type);
    const map = {};
    Object.keys(structure).sort().forEach((chapterKey, index) => {
      map[chapterKey] = `var(--tag-${(index % TAG_COUNT) + 1})`;
    });
    return map;
  }

  function buildTagColorMap(protocol) {
    const map = {};
    let next = 0;
    const assign = (abbr) => {
      const key = String(abbr || '').trim();
      if (!key || map[key]) return;
      map[key] = `var(--tag-${(next % TAG_COUNT) + 1})`;
      next += 1;
    };
    (protocol.participants || []).forEach((p) => assign(p.abbr));
    (protocol.points || []).forEach((pt) => {
      splitResponsibleTokens(pt.responsible).forEach(assign);
    });
    return map;
  }

  function ktag(abbr, tagMap) {
    const key = String(abbr || '').trim();
    if (!key) return '';
    const color = tagMap[key] || 'var(--text-tertiary)';
    return `<span class="ktag" style="--tc:${color}">${esc(key)}</span>`;
  }

  /* ── Bausteine: Kopf / Teilnehmer ───────────────────────────── */

  function renderHeader(protocol, project, tagMap) {
    const typeLabels = {
      'JFx Planung': 'Planer Jour Fixe',
      'JFx Mieter': 'Mieter Jour Fixe',
      'Aktennotiz': 'Aktennotiz',
    };
    const typeLabel = typeLabels[protocol.type] || protocol.type || 'Protokoll';
    const code = project.code || '';
    const eyebrow = code ? `${typeLabel} · ${esc(code)}` : esc(typeLabel);

    const title = protocol.seriesName || protocol.title || typeLabel;
    const numbered = protocol.type === 'Aktennotiz'
      ? esc(title)
      : `${esc(title)} Nr. ${esc(protocol.number || 1)}`;

    const gridItems = [
      ['Projekt', project.name || ''],
      ['Mieterin', protocol.tenant || ''],
      ['Vermieterin', protocol.landlord || ''],
      ['Datum', formatDate(protocol.date)],
      ['Zeit', protocol.time || ''],
      ['Ort', protocol.location || ''],
    ].filter(([, v]) => v)
      .map(([label, value]) =>
        `<div class="dh-item"><span class="dh-lbl">${esc(label)}</span><span class="dh-val">${esc(value)}</span></div>`)
      .join('\n');

    const author = protocol.author || {};
    const authorName = String(author.name || [author.firstName, author.lastName].filter(Boolean).join(' ')).trim();
    const authorParts = [authorName, author.company || '', formatDate(author.date)].filter(Boolean);
    const aufgestellt = authorParts.length
      ? `<div class="dh-aufgestellt">Aufgestellt: ${esc(authorParts.join(', '))}</div>`
      : '';

    return `<header class="doc-header">
<div class="dh-card">
<div class="dh-eyebrow">${eyebrow}</div>
<h1 class="dh-title">${numbered}</h1>
<div class="dh-grid">
${gridItems}
</div>
${aufgestellt}
</div>

<div class="pt-card" id="teilnehmer" style="scroll-margin-top:18px;">
<div class="pt-label">Teilnehmer</div>
${renderParticipants(protocol, tagMap)}
</div>
</header>`;
  }

  function chkCell(value) {
    return value
      ? `<div class="pt-cell pt-c"><span class="chk chk-done">${CHECK_SVG}</span></div>`
      : '<div class="pt-cell pt-c"></div>';
  }

  function renderParticipants(protocol, tagMap) {
    const head = `  <div class="pt-h">Name</div>
  <div class="pt-h">Firma / Organisation</div>
  <div class="pt-h">Kürzel</div>
  <div class="pt-h pt-email">Email-Adresse</div>
  <div class="pt-h pt-c">Teilnehmer</div>
  <div class="pt-h pt-c">Verteiler</div>`;

    const rows = (protocol.participants || []).map((p) => {
      const email = p.email ? esc(p.email) : '—';
      const emailClass = p.email ? 'pt-cell pt-email' : 'pt-cell pt-muted pt-email';
      return `
  <div class="pt-cell pt-name">${esc(p.name || '')}</div>
  <div class="pt-cell">${esc(p.company || '')}</div>
  <div class="pt-cell">${ktag(p.abbr, tagMap)}</div>
  <div class="${emailClass}">${email}</div>
  ${chkCell(!!p.attended)}
  ${chkCell(!!p.inDistrib)}`;
    }).join('\n');

    return `<div class="pt-grid">
${head}
${rows}
</div>`;
  }

  /* ── Bausteine: Kapitel / Punkte ────────────────────────────── */

  // Stabiler, HTML-id-tauglicher Anker aus der Punkt-ID (#7|A.1.01 -> entry-7-A-1-01).
  function entryAnchor(pointId) {
    return 'entry-' + String(pointId || '').replace(/[^0-9A-Za-z]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function renderEntry(point, tagMap, attachmentLinkMap) {
    const category = normalizeCategory(point.category);
    const catClass = CAT_CLASS[category] || 'kat-aufgabe';
    const tokens = splitResponsibleTokens(point.responsible);
    const tagsHtml = tokens.length
      ? `<span class="row-tags">${tokens.map((t) => ktag(t, tagMap)).join('')}</span>`
      : '';
    const fristHtml = point.deadline
      ? `<span class="entry-frist">${esc(point.deadline)}</span>`
      : '';

    let statusInner;
    if (isTaskCategory(category)) {
      statusInner = point.done
        ? `<span class="chk chk-done" title="erledigt">${CHECK_SVG}</span>`
        : '<span class="chk" title="offen"></span>';
    } else {
      statusInner = '<span class="erl-none">–</span>';
    }

    const doneClass = point.done ? ' entry-done' : '';
    // Neue Punkte (im aktuellen Protokoll eingetragen): nur die ID fett.
    const idClass = point.isNew ? 'entry-id entry-id-new' : 'entry-id';

    return `<div class="entry${doneClass}" id="${escAttr(entryAnchor(point.id))}" style="scroll-margin-top:18px;">
  <div class="${idClass}">${esc(point.id || '')}</div>
  <div class="entry-main">
    <div class="entry-meta">
      <span class="kat ${catClass}">${esc(category)}</span>
      ${tagsHtml}
      ${fristHtml}
      <span class="entry-status">${statusInner}</span>
    </div>
    <div class="entry-text">${linkifyAttachments(esc(point.content || ''), attachmentLinkMap || {})}</div>
  </div>
</div>`;
  }

  // Baut die UKAP-Box. Leere UKAP (keine Punkte) starten eingeklappt.
  function wrapSubchapter(sub, bodyHtml, empty) {
    const headCollapsed = empty ? ' collapsed' : '';
    const bodyCollapsed = empty ? ' collapsed' : '';
    return `<div class="ukap" id="ukap-${escAttr(sub.id)}">
<div class="ukap-head${headCollapsed}" data-toggle="ukap" data-target="ukapbody-${escAttr(sub.id)}">
  <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
  <h3 class="ukap-title">${esc(sub.id)} – ${esc(sub.label)}</h3>
</div>
<div class="ukap-body${bodyCollapsed}" id="ukapbody-${escAttr(sub.id)}">
${bodyHtml}
</div></div>`;
  }

  function wrapChapter(chapter, bodyHtml) {
    return `<section class="kap" id="kap-${escAttr(chapter.key)}" style="--kc:${chapter.color}">
<div class="kap-head" data-toggle="kap" data-target="kapbody-${escAttr(chapter.key)}">
  <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
  <span class="kap-bar"></span>
  <h2 class="kap-title">${esc(chapter.key)} – ${esc(chapter.label)}</h2>
</div>
<div class="kap-body" id="kapbody-${escAttr(chapter.key)}">
${bodyHtml}
</div></section>`;
  }

  function entriesBlock(htmlList) {
    return `<div class="entries">\n${htmlList.join('\n')}\n</div>`;
  }

  // Entries-Block fuer Punkte direkt im Kapitel (ohne UKAP): eigene Klasse,
  // damit die Punkte eine durchgaengige helle Umrandung erhalten.
  function looseChapterBlock(htmlList) {
    return `<div class="entries entries-loose">\n${htmlList.join('\n')}\n</div>`;
  }

  // Baut Kapitel-Sektionen aus collectPointRows. Themen gruppieren ihre Punkte;
  // Punkte ohne UKAP/Thema (z.B. Aktennotiz) landen direkt im jeweiligen Eltern-Block.
  function renderChapters(protocol, hiddenChapters, chapterColors, tagMap, attachmentLinkMap) {
    const rows = collectPointRows(protocol, hiddenChapters);
    const out = [];

    let curChapter = null;
    let chapterBody = [];   // Strings: UKAP-Boxen oder Entries-Bloecke (Punkte direkt im Kapitel)
    let curSub = null;
    let subBody = [];       // Strings: Thema-Ueberschriften + Entries-Bloecke
    let topicEntries = null;   // offenes Thema (Array) oder null
    let looseSub = null;       // Punkte direkt im UKAP, vor/ohne Thema
    let looseChapter = null;   // Punkte direkt im Kapitel (keine UKAP, z.B. Aktennotiz)
    let subPointCount = 0;     // Punkte im aktuellen UKAP (fuer "leer -> eingeklappt")
    let subDoneCount = 0;      // davon erledigte Punkte (fuer "alle erledigt -> eingeklappt")

    function flushTopic() {
      if (topicEntries) { subBody.push(entriesBlock(topicEntries)); topicEntries = null; }
    }
    function flushLooseSub() {
      if (looseSub && looseSub.length) subBody.push(entriesBlock(looseSub));
      looseSub = null;
    }
    function flushLooseChapter() {
      if (looseChapter && looseChapter.length) chapterBody.push(looseChapterBlock(looseChapter));
      looseChapter = null;
    }
    function flushSub() {
      flushTopic();
      flushLooseSub();
      if (curSub) {
        const startCollapsed = subPointCount === 0 || subDoneCount === subPointCount;
        chapterBody.push(wrapSubchapter(curSub, subBody.join('\n'), startCollapsed));
        curSub = null; subBody = []; subPointCount = 0; subDoneCount = 0;
      }
    }
    function flushChapter() {
      flushSub();
      flushLooseChapter();
      if (curChapter) { out.push(wrapChapter(curChapter, chapterBody.join('\n'))); curChapter = null; chapterBody = []; }
    }

    rows.forEach((row) => {
      if (row.type === 'chapter') {
        flushChapter();
        curChapter = { key: row.chapterKey, label: row.label, color: chapterColors[row.chapterKey] || 'var(--text-tertiary)' };
      } else if (row.type === 'subchapter') {
        flushSub();
        curSub = { id: row.id, label: row.label };
      } else if (row.type === 'topic') {
        flushTopic();
        flushLooseSub();
        subBody.push(`<h4 class="thema" id="thema-${escAttr(row.id)}">${esc(row.label)}</h4>`);
        topicEntries = [];
      } else if (row.type === 'point') {
        const html = renderEntry(row.point, tagMap, attachmentLinkMap);
        if (topicEntries) { topicEntries.push(html); subPointCount += 1; if (row.point.done) subDoneCount += 1; }
        else if (curSub) { if (!looseSub) looseSub = []; looseSub.push(html); subPointCount += 1; if (row.point.done) subDoneCount += 1; }
        else { if (!looseChapter) looseChapter = []; looseChapter.push(html); }
      }
    });

    flushChapter();
    return out.join('\n');
  }

  /* ── Bausteine: Doku-Struktur-Seitenleiste ──────────────────── */

  // UKAP setzt --kc explizit (Kapitelfarbe) fuer den farbigen Strich.
  function renderSidebar(protocol, hiddenChapters, chapterColors) {
    const rows = collectPointRows(protocol, hiddenChapters);
    const parts = [];
    parts.push('  <a class="ds-item ds-chapter" style="--kc:var(--text-tertiary)" href="#teilnehmer"><span class="ds-label">Teilnehmer</span></a>');
    parts.push('  <div class="ds-divider"></div>');

    let openGroup = false;
    let curColor = 'var(--text-tertiary)';
    const closeGroup = () => { if (openGroup) { parts.push('  </div>'); openGroup = false; } };

    rows.forEach((row) => {
      if (row.type === 'chapter') {
        closeGroup();
        curColor = chapterColors[row.chapterKey] || 'var(--text-tertiary)';
        parts.push(`  <div class="ds-group" style="--kc:${curColor}">`);
        openGroup = true;
        parts.push(`    <a class="ds-item ds-chapter" style="--kc:${curColor}" href="#kap-${escAttr(row.chapterKey)}"><span class="ds-label">${esc(row.chapterKey)} – ${esc(row.label)}</span></a>`);
      } else if (row.type === 'subchapter') {
        parts.push(`    <a class="ds-item ds-subchapter" style="--kc:${curColor}" href="#ukap-${escAttr(row.id)}"><span class="ds-label">${esc(row.id)} – ${esc(row.label)}</span></a>`);
      } else if (row.type === 'topic') {
        parts.push(`    <a class="ds-item ds-topic" href="#thema-${escAttr(row.id)}"><span class="ds-label">${esc(row.label)}</span></a>`);
      }
    });
    closeGroup();

    parts.push('  <div class="ds-divider"></div>');
    parts.push('  <a class="ds-item ds-chapter" style="--kc:var(--tertiary)" href="#aufgaben"><span class="ds-label">Aufgabenübersicht</span></a>');
    parts.push('  <a class="ds-item ds-chapter" style="--kc:var(--tag-7)" href="#anlagen"><span class="ds-label">Anlagen</span></a>');
    parts.push('  <a class="ds-item ds-chapter" style="--kc:var(--text-tertiary)" href="#legende"><span class="ds-label">Legende</span></a>');

    return parts.join('\n');
  }

  /* ── Bausteine: Aufgabenuebersicht ──────────────────────────── */

  // Alle Punkte der Kategorie Aufgabe + Freigabe erfordl, in Dokumentreihenfolge.
  // Liefert { point, contextLabel } — contextLabel = Thema > UKAP > Kapitel-Label.
  function collectTasks(protocol, hiddenChapters) {
    const rows = collectPointRows(protocol, hiddenChapters);
    let chapterLabel = '';
    let subLabel = '';
    let topicLabel = '';
    const result = [];
    rows.forEach((r) => {
      if (r.type === 'chapter') { chapterLabel = r.label; subLabel = ''; topicLabel = ''; }
      else if (r.type === 'subchapter') { subLabel = r.label; topicLabel = ''; }
      else if (r.type === 'topic') { topicLabel = r.label; }
      else if (r.type === 'point' && isTaskCategory(normalizeCategory(r.point.category))) {
        result.push({ point: r.point, contextLabel: topicLabel || subLabel || chapterLabel });
      }
    });
    return result;
  }

  function renderTaskFilterPills(tasks, tagMap) {
    const seen = [];
    tasks.forEach(({ point }) => {
      splitResponsibleTokens(point.responsible).forEach((t) => {
        if (!seen.includes(t)) seen.push(t);
      });
    });
    const pills = seen.map((t) =>
      `<button class="pill" data-tag="${escAttr(t)}" style="--tc:${tagMap[t] || 'var(--text-tertiary)'}"><span class="pill-dot"></span>${esc(t)}</button>`
    ).join('\n');
    return `<button class="pill pill-all" data-tag="__all__">Alle</button>\n${pills}`;
  }

  function renderTaskCards(tasks, tagMap) {
    if (!tasks.length) return '';
    return tasks.map(({ point: pt, contextLabel }, i) => {
      const tokens = splitResponsibleTokens(pt.responsible);
      const tagsAttr = tokens.join(',');
      const tagsHtml = tokens.map((t) => ktag(t, tagMap)).join('');
      const contextHtml = contextLabel
        ? `<span class="todo-context">${esc(contextLabel)}</span>`
        : '';
      const frist = pt.deadline
        ? `<span class="todo-frist">${esc(pt.deadline)}</span>`
        : '<span class="todo-frist todo-frist-none">ohne Frist</span>';
      const doneClass = pt.done ? ' done' : '';
      const checkedAttr = pt.done ? ' checked' : '';
      return `<article class="todo-card${doneClass}" draggable="true" data-id="${escAttr(pt.id || '')}" data-tags="${escAttr(tagsAttr)}" data-order="${i}" data-anchor="${escAttr(entryAnchor(pt.id))}">
  <div class="todo-top"><span class="todo-handle">⠿</span><input type="checkbox" class="todo-check" aria-label="erledigt"${checkedAttr}><span class="todo-ref">${esc(pt.id || '')}</span></div>
  <div class="todo-tags">${tagsHtml}${contextHtml}</div>
  <div class="todo-text">${esc(pt.content || '')}</div>
  <div class="todo-foot">${frist}</div>
</article>`;
    }).join('\n');
  }

  function renderTasksSection(protocol, hiddenChapters, tagMap) {
    const tasks = collectTasks(protocol, hiddenChapters);
    const SORT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5h10"/><path d="M11 9h7"/><path d="M11 13h4"/><path d="m3 17 3 3 3-3"/><path d="M6 18V4"/></svg>';
    const SAVE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>';

    return `<section class="kap" id="aufgaben" style="--kc:var(--tertiary)">
<div class="kap-head" data-toggle="kap" data-target="kapbody-aufgaben">
  <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
  <span class="kap-bar"></span>
  <h2 class="kap-title">Aufgabenübersicht</h2>
</div>
<div class="kap-body" id="kapbody-aufgaben">
<div class="filterbar">
${renderTaskFilterPills(tasks, tagMap)}
<div class="sort-wrap">
  <button class="sort-btn" id="sortBtn" aria-haspopup="true" aria-expanded="false">
    ${SORT_SVG}
    <span id="sortBtnLabel">Sortieren</span>
  </button>
  <div class="sort-menu" id="sortMenu" hidden>
    <button class="sort-item" data-sort="frist" type="button">nach Frist</button>
    <button class="sort-item" data-sort="id" type="button">nach ID</button>
  </div>
</div>
<label class="show-done"><input type="checkbox" id="toggleDone"> Erledigte ausblenden</label>
<button class="save-btn tip" id="saveBtn" data-tip="Aktuellen Bearbeitungsstand der Aufgaben als neue Datei speichern">
  ${SAVE_SVG}
  Stand sichern
</button>
</div>
<div class="todo-grid" id="todoGrid">
${renderTaskCards(tasks, tagMap)}
</div>
<div class="todo-empty" id="todoEmpty" hidden>Keine Aufgaben für die aktive Filterauswahl.</div>
</div></section>`;
  }

  /* ── Bausteine: Anlagen ─────────────────────────────────────── */

  const DL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>';

  // Baut eine Map { '<id>': { href, fileName } } fuer alle Anlagen.
  // href ist der Data-URI-Link (eingebettet) oder '#anlagen' (nicht eingebettet/keine Daten).
  // Wird vor dem Rendern der Punkte aufgebaut, damit linkifyAttachments darauf zugreifen kann.
  function buildAttachmentLinkMap(protocol) {
    const map = {};
    const attachments = protocol.attachments || [];
    if (!attachments.length) return map;

    let used = 0;
    attachments.forEach((att) => {
      if (!att.id) return;
      const buffer = att.fileData;
      const byteLen = buffer && (buffer.byteLength != null ? buffer.byteLength : 0);
      let href = '#anlagen';
      if (buffer && byteLen) {
        const projected = used + Math.ceil(byteLen * 4 / 3);
        if (projected <= ATTACHMENT_BUDGET) {
          try {
            const b64 = arrayBufferToBase64(buffer);
            used += b64.length;
            const mime = att.fileType || 'application/octet-stream';
            href = `data:${mime};base64,${b64}`;
          } catch (e) { /* Fallback auf #anlagen */ }
        }
      }
      map[att.id] = { href, fileName: att.fileName || att.id };
    });
    return map;
  }

  // Ersetzt bekannte Anlagen-IDs im bereits HTML-escapten Text durch klickbare Links.
  // Sucht nur nach den tatsaechlich vorhandenen IDs — kein generischer Regex.
  function linkifyAttachments(escapedText, attachmentLinkMap) {
    if (!escapedText || !Object.keys(attachmentLinkMap).length) return escapedText;
    let result = escapedText;
    Object.entries(attachmentLinkMap).forEach(([id, { href, fileName }]) => {
      // ID ist z.B. '#12.01' — im HTML-escapten Text ist '#' unveraendert.
      // Literal-Suche via split/join (kein Regex-Escaping noetig).
      const parts = result.split(id);
      if (parts.length < 2) return;
      const isData = href.startsWith('data:');
      const linkAttr = isData
        ? `href="${escAttr(href)}" download="${escAttr(fileName)}" title="${escAttr(fileName)}"`
        : `href="${escAttr(href)}" title="Anlage nicht eingebettet — zur Anlagenliste springen"`;
      const linkClass = isData ? 'an-ref' : 'an-ref an-ref-missing';
      result = parts.join(`<a class="${linkClass}" ${linkAttr}>${esc(id)}</a>`);
    });
    return result;
  }

  // Liefert { html, skipped: [fileName...] }. Eingebettete Dateien per Base64-Data-URI,
  // Budget ATTACHMENT_BUDGET; danach nur Listeneintrag ohne Download.
  // attachmentLinkMap wird von buildAttachmentLinkMap() geliefert (bereits berechnet).
  function renderAttachments(protocol, attachmentLinkMap) {
    const attachments = protocol.attachments || [];
    const skipped = [];

    const head = `  <div class="an-h">Nummer</div>
  <div class="an-h">Inhalt</div>
  <div class="an-h">Dateiname</div>
  <div class="an-h"></div>`;

    if (!attachments.length) {
      return {
        skipped,
        html: `<div class="an-grid">
${head}
  <div class="an-cell an-num">—</div>
  <div class="an-cell">Keine Anlagen.</div>
  <div class="an-cell an-file">—</div>
  <div class="an-cell an-dl"></div>
</div>`,
      };
    }

    const rows = attachments.map((att) => {
      const num = esc(att.id || '');
      const content = esc(att.content || att.fileName || '');
      const fileName = esc(att.fileName || '');
      const entry = att.id ? attachmentLinkMap[att.id] : null;
      const embedded = entry && entry.href.startsWith('data:');
      let dlCell = '<div class="an-cell an-dl"></div>';

      if (embedded) {
        dlCell = `<div class="an-cell an-dl">
    <a class="an-download" href="${escAttr(entry.href)}" download="${escAttr(att.fileName || 'anlage')}" title="Herunterladen">
      ${DL_SVG}
    </a>
  </div>`;
      } else if (att.fileData) {
        skipped.push(att.fileName || att.id || 'Anlage');
      }

      const fileLabel = embedded
        ? fileName
        : (fileName ? `${fileName} <span class="pt-muted">(nicht eingebettet)</span>` : '—');

      return `
  <div class="an-cell an-num">${num}</div>
  <div class="an-cell">${content}</div>
  <div class="an-cell an-file">${fileLabel}</div>
  ${dlCell}`;
    }).join('\n');

    return {
      skipped,
      html: `<div class="an-grid">
${head}
${rows}
</div>`,
    };
  }

  /* ── Bausteine: Legende ─────────────────────────────────────── */

  function renderLegende(protocol) {
    const abbreviations = collectAbbreviations(protocol.participants, protocol.customAbbreviations);
    const abkItems = abbreviations.length
      ? abbreviations.map((item) =>
          `<div class="abk-item"><span class="abk-k">${esc(item.abbr)}</span><span class="abk-v">${esc(item.name)}</span></div>`
        ).join('\n')
      : '<div class="abk-item"><span class="abk-v">Keine Abkürzungen.</span></div>';

    return `<section class="kap kap-legende" id="legende" style="--kc:var(--text-tertiary)">
<div class="kap-head" data-toggle="kap" data-target="kapbody-legende">
  <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
  <span class="kap-bar"></span>
  <h2 class="kap-title">Legende</h2>
</div>
<div class="kap-body" id="kapbody-legende">
<div class="lg-label">Abkürzungen</div>
<div class="abk-grid">
${abkItems}
</div>
<div class="lg-label lg-hinweis-label">Hinweis</div>
<p class="lg-hinweis">${esc(DISCLAIMER)}</p>
</div></section>`;
  }

  /* ── Statische Bloecke (1:1 aus der Vorlage) ────────────────── */

  function styleBlock() {
    return STYLE;
  }

  function scriptBlock(lsKey) {
    // LS_KEY dynamisch je Protokoll, damit zwei Exporte ihren Zustand nicht teilen.
    return SCRIPT.replace('__LS_KEY__', lsKey);
  }

  /* ── Zusammenbau ────────────────────────────────────────────── */

  function buildHtml(protocol, project) {
    const hiddenChapters = buildHtml._hiddenChapters || null;
    const chapterColors = buildChapterColorMap(protocol, hiddenChapters);
    const tagMap = buildTagColorMap(protocol);

    const typeLabels = {
      'JFx Planung': 'Planer JFx',
      'JFx Mieter': 'Mieter JFx',
      'Aktennotiz': 'Aktennotiz',
    };
    const shortType = typeLabels[protocol.type] || protocol.type || 'Protokoll';
    const numPart = protocol.type === 'Aktennotiz' ? '' : ` ${protocol.number || 1}`;
    const docTitle = `${project.code || project.name || 'Protokoll'} · ${shortType}${numPart} · ${formatDate(protocol.date)}`;

    const lsKey = `kadraHtmlExport_${protocol.id || DB.uuid()}`;

    const attachmentLinkMap = buildAttachmentLinkMap(protocol);

    const header = renderHeader(protocol, project, tagMap);
    const chapters = renderChapters(protocol, hiddenChapters, chapterColors, tagMap, attachmentLinkMap);
    const tasks = renderTasksSection(protocol, hiddenChapters, tagMap);
    const attachments = renderAttachments(protocol, attachmentLinkMap);
    const legende = renderLegende(protocol);
    const sidebar = renderSidebar(protocol, hiddenChapters, chapterColors);

    const footer = `<footer class="doc-footer">${esc(docTitle)} — interaktive Fassung</footer>`;

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(docTitle)}</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
${styleBlock()}
</style>
</head>
<body>
<div class="app">

<nav class="doc-structure" id="docStructure">
<div class="ds-header">
  <span class="ds-title">Dokumentenstruktur</span>
  <button class="ds-toggle" id="dsToggle" title="Leiste ein-/ausklappen" aria-label="Leiste ein-/ausklappen">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/></svg>
  </button>
</div>
<div class="ds-body">
${sidebar}
</div>
</nav>
<div class="ds-resize" id="dsResize" title="Breite ziehen"></div>

<main class="content" id="content">
${header}
${chapters}
${tasks}

<section class="kap" id="anlagen" style="--kc:var(--tag-7)">
<div class="kap-head" data-toggle="kap" data-target="kapbody-anlagen">
  <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
  <span class="kap-bar"></span>
  <h2 class="kap-title">Anlagen</h2>
</div>
<div class="kap-body" id="kapbody-anlagen">
${attachments.html}
</div></section>

${legende}
${footer}
</main>
</div>
<script>
${scriptBlock(lsKey)}
</script>
</body>
</html>`;

    return { html, skipped: attachments.skipped };
  }

  async function exportProtocolHtml(protocolId, hiddenChapters) {
    const protocol = await DB.Protocols.get(protocolId);
    if (!protocol) throw new Error('Protokoll nicht gefunden');

    const project = await DB.Projects.get(protocol.projectId);
    if (!project) throw new Error('Projekt nicht gefunden');

    buildHtml._hiddenChapters = hiddenChapters || null;
    const { html, skipped } = buildHtml(protocol, project);
    buildHtml._hiddenChapters = null;

    const fileName = buildProtocolFileName(protocol, project);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });

    await saveBlob(blob, fileName);

    if (skipped && skipped.length && typeof showToast === 'function') {
      showToast(
        `Hinweis: ${skipped.length} Anlage(n) wegen 10-MB-Budget nicht eingebettet: ${skipped.join(', ')}`,
        'warning'
      );
    }

    return fileName;
  }

  /* ── Statisches CSS (aus der Vorlage, <style>-Block) ────────── */
  const STYLE = `:root{
  /* KADRA Tokens (themes/kadra.css) */
  --primary:#0E2D58; --secondary:#154384; --tertiary:#CC4933;
  --accent-blue:#154384; --accent-blue-dark:#0E2D58; --accent-blue-10:#EDF1F7; --accent-blue-20:#DCE6F1;
  --bg-app:#F5F4F0; --bg-surface:#FFFFFF; --bg-hover:#F5F5F5; --bg-input:#F2F2F2;
  --text-primary:#000000; --text-secondary:#6E6E6E; --text-tertiary:#AEAEAE; --text-inverted:#FFFFFF;
  --border:#D2D2D2; --border-light:#E5E5E5;
  --success:#94AF83; --warning:#E88E5A; --danger:#CC4933;
  --tag-1:#E88E5A; --tag-2:#F4BD48; --tag-3:#968B79; --tag-4:#99BDB8;
  --tag-5:#96B4C9; --tag-6:#E199AA; --tag-7:#94AF83; --tag-8:#CDAD96;
  --kat-info:#968B79; --kat-aufgabe:#154384; --kat-festlegung:#94AF83; --kat-freigabe:#E88E5A;
  --font-ui:'Nunito Sans',-apple-system,'Segoe UI',Roboto,sans-serif;
  --font-mono:'JetBrains Mono',ui-monospace,'SF Mono',Menlo,monospace;
  --radius-sm:4px; --radius-md:8px; --radius-lg:12px;
}
*{box-sizing:border-box;}
html{scroll-behavior:smooth;}
body{margin:0;background:#E9ECF2;font-family:var(--font-ui);color:var(--text-primary);font-size:15px;line-height:1.5;}
a{color:inherit;text-decoration:none;}
.app{display:flex;min-height:100vh;max-width:1500px;margin:0 auto;background:var(--bg-surface);
  box-shadow:0 30px 80px rgba(14,45,88,.16);}
.doc-structure{--ds-width:307px;width:var(--ds-width);flex-shrink:0;background:#909090;
  position:sticky;top:0;align-self:flex-start;height:100vh;display:flex;flex-direction:column;overflow:hidden;
  transition:background .25s;}
.doc-structure.collapsed{width:44px;background:var(--bg-app);}
.ds-resize{width:1px;flex-shrink:0;cursor:col-resize;background:rgba(255,255,255,.25);position:sticky;top:0;height:100vh;
  align-self:flex-start;transition:background .15s;}
.ds-resize:hover,.ds-resize.dragging{background:rgba(255,255,255,.5);width:4px;}
.doc-structure.collapsed + .ds-resize{pointer-events:none;}
.doc-structure.collapsed .ds-title,
.doc-structure.collapsed .ds-body{display:none;}
.doc-structure.collapsed .ds-header{justify-content:center;padding:0;}
.doc-structure.collapsed .ds-header::after{display:none;}
.ds-header{display:flex;align-items:center;justify-content:space-between;gap:8px;height:60px;
  flex-shrink:0;padding:0 8px 0 24px;position:relative;}
.ds-header::after{content:'';position:absolute;left:24px;right:24px;bottom:0;height:1px;background:rgba(255,255,255,.2);}
.ds-title{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
  color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ds-toggle{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;flex-shrink:0;
  border:none;background:transparent;border-radius:6px;cursor:pointer;color:rgba(255,255,255,.7);}
.ds-toggle:hover{background:rgba(255,255,255,.15);}
.ds-toggle svg{width:18px;height:18px;}
.ds-body{flex:1;overflow-y:auto;overflow-x:hidden;padding:8px 8px 24px;scrollbar-width:none;-ms-overflow-style:none;}
.ds-body::-webkit-scrollbar{display:none;}
.ds-item{--kc:var(--text-tertiary);display:flex;align-items:center;gap:8px;width:100%;
  line-height:1.3;color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;user-select:none;
  transition:background .15s,color .15s;}
.ds-label{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;}
.ds-chapter{gap:9px;margin-top:6px;padding:9px 12px 9px 16px;font-weight:700;font-size:13.5px;color:#FFFFFF;}
.ds-chapter:first-child{margin-top:0;}
.ds-chapter::before{content:'';width:9px;height:9px;border-radius:50%;background:var(--kc);flex-shrink:0;
  box-shadow:0 0 0 3px rgba(255,255,255,.12);}
.ds-chapter:hover{background:rgba(255,255,255,.12);}
.ds-subchapter{padding:5px 12px 5px 38px;margin-left:24px;font-size:12.5px;color:rgba(255,255,255,.8);
  border-left:2px solid var(--kc);}
.ds-subchapter:hover{color:#FFFFFF;background:rgba(255,255,255,.1);}
.ds-topic{padding:3px 12px 3px 50px;margin-left:24px;font-size:11.5px;color:rgba(255,255,255,.55);
  border-left:2px solid rgba(255,255,255,.25);}
.ds-topic:hover{color:rgba(255,255,255,.85);background:rgba(255,255,255,.1);}
.ds-chapter.ds-active{background:color-mix(in srgb, var(--kc) 20%, transparent);color:#FFFFFF;}
.ds-subchapter.ds-active,.ds-topic.ds-active{background:rgba(0,0,0,.18);color:#FFFFFF;}
.ds-divider{margin:10px 16px 4px;height:1px;background:rgba(255,255,255,.2);}
.content{flex:1;min-width:0;padding:0 0 60px;background:var(--bg-app);}
.doc-header{padding:22px 54px 28px;}
.dh-card{background:var(--bg-app);border:1px solid var(--border-light);border-radius:var(--radius-md);
  box-shadow:0 1px 3px rgba(14,45,88,.05);padding:22px 20px 22px 24px;margin-bottom:18px;
  border-left:4px solid var(--primary);}
.dh-eyebrow{font-family:var(--font-mono);font-size:12px;letter-spacing:.18em;text-transform:uppercase;
  color:var(--tertiary);margin-bottom:10px;}
.dh-title{font-size:30px;font-weight:800;line-height:1.15;margin:0 0 22px;color:var(--primary);}
.dh-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px 28px;margin-bottom:14px;}
.dh-item{display:flex;flex-direction:column;gap:2px;}
.dh-lbl{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--text-tertiary);}
.dh-val{font-size:14px;font-weight:600;}
.dh-aufgestellt{font-size:12px;color:var(--text-secondary);margin-bottom:0;}
.pt-card{background:var(--bg-surface);border:1px solid var(--border-light);border-radius:var(--radius-md);
  box-shadow:0 1px 3px rgba(14,45,88,.05);padding:0 0 4px;border-left:4px solid var(--text-tertiary);}
.pt-label{font-family:var(--font-mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--text-secondary);margin:18px 20px 10px;}
.pt-grid{display:grid;grid-template-columns:1.1fr 1.6fr 100px 1.4fr 96px 96px;
  background:var(--bg-surface);padding:0 12px;}
.pt-h{font-size:11px;color:var(--text-tertiary);padding:10px 14px 7px;background:var(--bg-app);}
.pt-h:first-child{border-radius:var(--radius-sm) 0 0 var(--radius-sm);}
.pt-h:last-child{border-radius:0 var(--radius-sm) var(--radius-sm) 0;}
.pt-h.pt-c{text-align:center;}
.pt-cell{padding:9px 14px;font-size:13.5px;border-top:1px solid var(--border-light);display:flex;align-items:center;}
.pt-cell.pt-c{justify-content:center;}
.pt-name{font-weight:600;}
.pt-muted{color:var(--text-tertiary);}
.ktag{font-family:var(--font-mono);font-size:10.5px;font-weight:600;letter-spacing:.02em;
  color:var(--tc);background:color-mix(in srgb, var(--tc) 25%, transparent);
  padding:3px 10px;border-radius:32px;white-space:nowrap;}
.kat{font-family:var(--font-mono);font-size:10.5px;font-weight:600;padding:3px 9px;border-radius:var(--radius-sm);
  text-transform:uppercase;letter-spacing:.04em;color:var(--text-inverted);}
.kat-info{background:var(--kat-info);}
.kat-aufgabe{background:var(--kat-aufgabe);}
.kat-festlegung{background:var(--kat-festlegung);}
.kat-freigabe{background:var(--kat-freigabe);}
.kap{margin:0 54px;border-bottom:1px solid var(--border-light);}
.kap-head{display:flex;align-items:center;gap:14px;padding:26px 0 22px;cursor:pointer;user-select:none;}
.kap-bar{width:5px;height:26px;border-radius:3px;background:var(--kc);}
.kap-title{font-size:21px;font-weight:800;margin:0;color:var(--primary);}
.chev{width:14px;height:14px;flex-shrink:0;color:var(--text-secondary);transition:transform .2s;}
.kap-head.collapsed .chev,.ukap-head.collapsed .chev{transform:rotate(-90deg);}
.kap-body.collapsed,.ukap-body.collapsed{display:none;}
.kap-hinweis{background:var(--bg-app);border-left:3px solid var(--kc);border-radius:0 var(--radius-sm) var(--radius-sm) 0;
  padding:12px 16px;font-size:13px;color:var(--text-secondary);margin:0 0 20px;}
.ukap{margin:0 0 14px;border:1px solid var(--border-light);border-radius:var(--radius-lg);overflow:hidden;
  background:var(--bg-surface);box-shadow:0 1px 3px rgba(14,45,88,.05);}
.ukap-head{display:flex;align-items:center;gap:10px;padding:13px 18px;cursor:pointer;user-select:none;
  background:var(--bg-app);border-left:4px solid var(--kc);}
.ukap-title{font-size:15px;font-weight:700;margin:0;color:var(--secondary);}
.ukap-body{padding:8px 18px 16px;}
.thema{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--text-primary);
  margin:18px 0 8px;font-family:var(--font-mono);letter-spacing:.01em;}
.thema::before{content:'';width:7px;height:7px;border-radius:2px;background:var(--kc);flex-shrink:0;}
.entries{display:flex;flex-direction:column;gap:8px;}
.entry{display:grid;grid-template-columns:88px 1fr;gap:14px;padding:12px 14px;border-radius:var(--radius-md);
  background:var(--bg-app);border:1px solid transparent;transition:border .15s;}
.entry:hover{border-color:var(--border);}
/* Punkte direkt im Kapitel (ohne UKAP): durchgaengige helle Umrandung,
   damit sie als separate Punkte erkennbar sind. */
.entries-loose .entry{border-color:var(--border-light);}
.entries-loose .entry:hover{border-color:var(--border);}
.entry-done{opacity:.42;filter:grayscale(.55);}
.entry-done .entry-text{color:var(--text-secondary);}
.entry-id{font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);padding-top:3px;word-break:break-all;}
/* Neuer Punkt (im aktuellen Protokoll eingetragen): nur die ID fett. */
.entry-id-new{font-weight:700;color:var(--text-primary);}
.entry-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px;}
.row-tags{display:inline-flex;gap:5px;flex-wrap:wrap;}
.entry-frist{font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);}
.entry-status{margin-left:auto;display:inline-flex;align-items:center;}
.entry-text{font-size:13.5px;line-height:1.55;white-space:pre-wrap;}
.chk{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;
  border:1.5px solid var(--text-tertiary);border-radius:3px;background:var(--bg-surface);}
.chk svg{width:11px;height:11px;color:var(--text-inverted);}
.chk-done{background:var(--success);border-color:var(--success);}
.erl-none{color:var(--text-tertiary);font-family:var(--font-mono);font-size:12px;}
.filterbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0 22px;}
.pill{font-family:var(--font-mono);font-size:11.5px;font-weight:600;border:1px solid var(--border);
  background:var(--bg-surface);color:var(--text-secondary);padding:6px 13px;border-radius:32px;cursor:pointer;
  display:inline-flex;align-items:center;gap:7px;transition:all .15s;}
.pill .pill-dot{width:9px;height:9px;border-radius:50%;background:var(--tc);}
.pill:hover{border-color:var(--tc,var(--secondary));}
.pill.active{background:color-mix(in srgb, var(--tc) 25%, transparent);color:var(--tc);border-color:transparent;}
.pill.active .pill-dot{background:var(--tc);}
.pill-all.active{background:var(--primary);color:var(--text-inverted);border-color:var(--primary);}
.show-done{font-size:12.5px;color:var(--text-secondary);display:inline-flex;align-items:center;gap:6px;cursor:pointer;margin-left:4px;}
.show-done input{accent-color:var(--success);}
.sort-wrap{position:relative;}
.sort-btn{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-ui);font-size:12px;font-weight:600;
  border:1px solid var(--border);background:var(--bg-surface);color:var(--text-secondary);
  padding:6px 13px;border-radius:32px;cursor:pointer;transition:all .15s;}
.sort-btn svg{width:14px;height:14px;}
.sort-btn:hover,.sort-btn[aria-expanded="true"]{border-color:var(--secondary);color:var(--secondary);}
.sort-menu{position:absolute;top:calc(100% + 6px);left:0;min-width:150px;z-index:300;
  background:var(--bg-surface);border:1px solid var(--border-light);border-radius:var(--radius-md);
  box-shadow:0 8px 24px rgba(14,45,88,.14);padding:4px;}
.sort-menu[hidden]{display:none;}
.sort-item{display:block;width:100%;text-align:left;font-family:var(--font-ui);font-size:13px;color:var(--text-primary);
  background:transparent;border:none;border-radius:6px;padding:8px 10px;cursor:pointer;}
.sort-item:hover{background:var(--bg-hover);}
.sort-item.active{color:var(--secondary);font-weight:700;background:var(--accent-blue-10);}
.save-btn{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-ui);font-size:12px;font-weight:600;
  border:1px solid var(--border);background:var(--bg-surface);color:var(--secondary);
  padding:6px 13px;border-radius:32px;cursor:pointer;margin-left:auto;transition:all .15s;}
.save-btn svg{width:14px;height:14px;}
.save-btn:hover{background:var(--bg-hover);border-color:var(--secondary);color:var(--secondary);}
.save-btn.saved{background:var(--success);border-color:var(--success);color:var(--text-inverted);}
.tip{position:relative;}
.tip::after{content:attr(data-tip);position:absolute;top:calc(100% + 8px);right:0;
  max-width:240px;width:max-content;background:#1a1a1a;color:#fff;font-family:var(--font-ui);
  font-size:12px;font-weight:400;line-height:1.4;text-align:left;padding:8px 11px;border-radius:8px;
  box-shadow:0 6px 20px rgba(0,0,0,.25);white-space:normal;
  opacity:0;visibility:hidden;transform:translateY(-3px);transition:opacity .15s,transform .15s,visibility .15s;
  pointer-events:none;z-index:400;}
.tip:hover::after{opacity:1;visibility:visible;transform:translateY(0);}
.todo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;}
.todo-card{background:var(--bg-surface);border:1px solid var(--border-light);border-radius:var(--radius-lg);
  padding:14px;display:flex;flex-direction:column;gap:9px;cursor:grab;position:relative;
  box-shadow:0 1px 3px rgba(14,45,88,.05);transition:box-shadow .15s,opacity .15s;}
.todo-card:hover{box-shadow:0 6px 18px rgba(14,45,88,.12);}
.todo-card.dragging{opacity:.4;cursor:grabbing;}
.todo-card.drop-target{outline:2px dashed var(--secondary);outline-offset:2px;}
.todo-card.done{opacity:.42;filter:grayscale(.55);background:var(--bg-app);}
.todo-card.done .todo-text{text-decoration:line-through;}
.todo-card.settling{opacity:1;filter:none;outline:2px solid var(--success);outline-offset:1px;
  transition:outline-color .3s;}
.todo-top{display:flex;align-items:center;gap:9px;}
.todo-handle{color:var(--text-tertiary);font-size:14px;cursor:grab;}
.todo-check{width:16px;height:16px;accent-color:var(--success);cursor:pointer;}
.todo-ref{font-family:var(--font-mono);font-size:10.5px;color:var(--text-tertiary);margin-left:auto;}
.todo-tags{display:flex;align-items:center;gap:5px;flex-wrap:nowrap;overflow:hidden;}
.todo-context{font-family:var(--font-ui);font-size:11px;font-weight:700;color:var(--text-primary);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1 1 0;}
.todo-text{font-size:11px;line-height:1.5;flex:1;white-space:pre-wrap;}
/* Gekuerzte Karte: max. 8 Zeilen, Rest abgeschnitten (JS ergaenzt " [...]"). */
.todo-text.clamped{display:-webkit-box;-webkit-line-clamp:8;-webkit-box-orient:vertical;overflow:hidden;white-space:normal;}
.todo-card.has-more{cursor:pointer;}
.todo-card.has-more .todo-handle{cursor:grab;}
.todo-more{font-family:var(--font-mono);font-size:10px;color:var(--secondary);margin-top:-2px;}
.todo-foot{display:flex;align-items:center;}
.todo-frist{font-family:var(--font-mono);font-size:11px;color:var(--secondary);background:var(--bg-app);
  padding:2px 8px;border-radius:var(--radius-sm);}
.todo-frist-none{color:var(--text-tertiary);background:transparent;padding-left:0;}
.todo-empty{padding:30px;text-align:center;color:var(--text-secondary);font-size:14px;}
#aufgaben .kap-body{padding-bottom:30px;}
.an-grid{display:grid;grid-template-columns:110px 1.4fr 1.4fr 44px;
  background:var(--bg-surface);border:1px solid var(--border-light);border-radius:var(--radius-md);overflow:hidden;
  box-shadow:0 1px 3px rgba(14,45,88,.05);}
.an-h{font-size:11px;color:var(--text-tertiary);padding:10px 14px 7px;background:var(--bg-app);}
.an-cell{padding:9px 14px;font-size:13.5px;border-top:1px solid var(--border-light);
  display:flex;align-items:center;min-width:0;}
.an-cell.an-num{font-family:var(--font-mono);font-size:12px;color:var(--text-secondary);}
.an-cell.an-file{color:var(--text-secondary);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;display:block;line-height:1.9;}
.an-cell.an-dl{justify-content:center;padding:9px 8px;}
.an-download{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;
  border-radius:6px;color:var(--text-tertiary);transition:all .15s;}
.an-download svg{width:16px;height:16px;}
.an-download:hover{color:var(--secondary);background:var(--bg-hover);}
.an-ref{font-family:var(--font-mono);font-size:12px;color:var(--text-primary);background:color-mix(in srgb,#968B79 25%,transparent);
  padding:1px 5px;border-radius:3px;text-decoration:none;transition:background .15s;}
.an-ref:hover{background:color-mix(in srgb,#968B79 38%,transparent);text-decoration:underline;}
.an-ref-missing{color:var(--text-tertiary);background:color-mix(in srgb,var(--text-tertiary) 12%,transparent);}
.an-ref-missing:hover{background:color-mix(in srgb,var(--text-tertiary) 22%,transparent);}
.kap-legende{border-bottom:none;}
.lg-label{font-family:var(--font-mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--text-secondary);margin-bottom:12px;}
.lg-hinweis-label{margin-top:26px;}
.lg-hinweis{font-size:12.5px;line-height:1.6;color:var(--text-secondary);margin:0;max-width:880px;}
.abk-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px 18px;padding-bottom:4px;}
.abk-item{display:flex;gap:8px;font-size:11px;line-height:1.4;padding:1px 0;}
.abk-k{font-family:var(--font-mono);font-weight:600;color:var(--secondary);min-width:74px;flex-shrink:0;}
.abk-v{color:var(--text-secondary);}
.doc-footer{margin:36px 54px 0;padding-top:18px;border-top:1px solid var(--border-light);
  font-family:var(--font-mono);font-size:11px;color:var(--text-tertiary);text-align:right;}
@media (max-width:1100px){
  .dh-grid{grid-template-columns:repeat(2,1fr);}
  .abk-grid{grid-template-columns:repeat(2,1fr);}
  .pt-grid{grid-template-columns:1.1fr 1.4fr 90px 96px;}
  .pt-email{display:none;}
}`;

  /* ── Statisches Script (aus der Vorlage, <script>-Block) ─────
     Einziger dynamischer Teil: LS_KEY (Platzhalter __LS_KEY__). */
  const SCRIPT = `const LS_KEY='__LS_KEY__';
let state={collapsed:{},order:[],done:[],filters:[],hideDone:true,sortBy:'manual'};
function loadState(){try{const s=JSON.parse(localStorage.getItem(LS_KEY));if(s)state=Object.assign(state,s);}catch(e){}}
function saveState(){try{localStorage.setItem(LS_KEY,JSON.stringify(state));}catch(e){}}

document.getElementById('dsToggle').addEventListener('click',()=>{
  document.getElementById('docStructure').classList.toggle('collapsed');
});

(function(){
  const rail=document.getElementById('docStructure');
  const handle=document.getElementById('dsResize');
  const MIN=200,MAX=480;
  let startX=0,startW=0;
  function onMove(e){
    const w=Math.min(MAX,Math.max(MIN,startW+(e.clientX-startX)));
    rail.style.setProperty('--ds-width',w+'px');
  }
  function onUp(){
    handle.classList.remove('dragging');
    document.removeEventListener('mousemove',onMove);
    document.removeEventListener('mouseup',onUp);
    document.body.style.userSelect='';
  }
  handle.addEventListener('mousedown',e=>{
    if(rail.classList.contains('collapsed'))return;
    startX=e.clientX;startW=rail.getBoundingClientRect().width;
    handle.classList.add('dragging');
    document.body.style.userSelect='none';
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
    e.preventDefault();
  });
})();

document.querySelectorAll('[data-toggle]').forEach(h=>{
  const id=h.getAttribute('data-target');
  const body=document.getElementById(id);
  if(state.collapsed[id]){h.classList.add('collapsed');body.classList.add('collapsed');}
  else if(state.collapsed[id]===false){h.classList.remove('collapsed');body.classList.remove('collapsed');}
  h.addEventListener('click',()=>{
    const c=body.classList.toggle('collapsed');
    h.classList.toggle('collapsed',c);
    state.collapsed[id]=c;saveState();
  });
});

const links=[...document.querySelectorAll('.ds-body a[href^="#"]')];
const map={};links.forEach(l=>{const t=document.getElementById(l.getAttribute('href').slice(1));if(t)map[l.getAttribute('href')]=t;});
const obs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){
  links.forEach(l=>l.classList.toggle('ds-active',l.getAttribute('href')==='#'+e.target.id));}});},
  {rootMargin:'-10% 0px -80% 0px'});
Object.values(map).forEach(t=>obs.observe(t));
links.forEach(l=>l.addEventListener('click',ev=>{
  if(l.getAttribute('href')==='#teilnehmer'){
    ev.preventDefault();
    window.scrollTo({top:0,behavior:'smooth'});
    return;
  }
  const t=document.getElementById(l.getAttribute('href').slice(1));if(!t)return;
  let p=t.closest('.kap-body.collapsed,.ukap-body.collapsed');
  while(p){p.classList.remove('collapsed');const head=document.querySelector('[data-target="'+p.id+'"]');
    if(head){head.classList.remove('collapsed');state.collapsed[p.id]=false;}p=t.closest('.kap-body.collapsed,.ukap-body.collapsed');}
  saveState();
}));

const grid=document.getElementById('todoGrid');
const pills=[...document.querySelectorAll('.pill')];
const allPill=document.querySelector('.pill-all');
function applyFilters(){
  const active=state.filters;
  const cards=[...grid.querySelectorAll('.todo-card')];
  let visible=0;
  cards.forEach(c=>{
    const tags=(c.dataset.tags||'').split(',').filter(Boolean);
    const matchTag=active.length===0||tags.some(t=>active.includes(t));
    const isDone=c.classList.contains('done');
    const settling=c.classList.contains('settling');
    const show=matchTag&&(!state.hideDone||!isDone||settling);
    c.style.display=show?'':'none';
    if(show)visible++;
  });
  document.getElementById('todoEmpty').hidden=visible>0;
  allPill.classList.toggle('active',active.length===0);
  pills.forEach(p=>{if(p===allPill)return;p.classList.toggle('active',active.includes(p.dataset.tag));});
}
pills.forEach(p=>p.addEventListener('click',()=>{
  const tag=p.dataset.tag;
  if(tag==='__all__'){state.filters=[];}
  else{const i=state.filters.indexOf(tag);if(i>=0)state.filters.splice(i,1);else state.filters.push(tag);}
  saveState();applyFilters();
}));

document.getElementById('toggleDone').checked=state.hideDone;
document.getElementById('toggleDone').addEventListener('change',e=>{state.hideDone=e.target.checked;saveState();applyFilters();});
function sortDoneLast(){
  const cards=[...grid.querySelectorAll('.todo-card')];
  cards.sort((a,b)=>{const da=a.classList.contains('done')?1:0,db=b.classList.contains('done')?1:0;
    if(da!==db)return da-db;return (+a.dataset.cur||0)-(+b.dataset.cur||0);});
  cards.forEach(c=>grid.appendChild(c));
}

function fristKey(card){
  const t=(card.querySelector('.todo-frist')?.textContent||'').trim();
  if(!t||/ohne frist/i.test(t))return '99999999';
  const dm=t.match(/(\\d{2})\\.(\\d{2})\\.(\\d{4})/);
  if(dm)return dm[3]+dm[2]+dm[1];
  const kw=t.match(/KW\\s*(\\d{1,2})/i);
  if(kw)return '2026'+String(kw[1]).padStart(2,'0')+'00';
  return '99999998';
}
function idKey(card){
  const m=(card.dataset.id||'').match(/#?(\\d+)\\|([A-Z])\\.?(\\d+)?\\.?(\\d+)?/);
  if(!m)return [9999,99,999,999];
  return [ +m[1], (m[2]||'Z').charCodeAt(0), +(m[3]||0), +(m[4]||0) ];
}
function applySort(){
  if(state.sortBy==='manual')return;
  const cards=[...grid.querySelectorAll('.todo-card')];
  if(state.sortBy==='frist'){
    cards.sort((a,b)=>{const ka=fristKey(a),kb=fristKey(b);
      if(ka!==kb)return ka<kb?-1:1; return (+a.dataset.cur||0)-(+b.dataset.cur||0);});
  }else if(state.sortBy==='id'){
    cards.sort((a,b)=>{const ka=idKey(a),kb=idKey(b);
      for(let i=0;i<ka.length;i++){if(ka[i]!==kb[i])return ka[i]-kb[i];} return 0;});
  }
  cards.forEach((c,i)=>c.dataset.cur=i);
}

const sortBtn=document.getElementById('sortBtn');
const sortMenu=document.getElementById('sortMenu');
const sortBtnLabel=document.getElementById('sortBtnLabel');
const SORT_LABELS={frist:'nach Frist',id:'nach ID'};
function syncSortUI(){
  sortBtnLabel.textContent=SORT_LABELS[state.sortBy]||'Sortieren';
  sortMenu.querySelectorAll('.sort-item').forEach(it=>
    it.classList.toggle('active',it.dataset.sort===state.sortBy));
}
sortBtn.addEventListener('click',e=>{
  e.stopPropagation();
  const open=sortMenu.hidden;
  sortMenu.hidden=!open;sortBtn.setAttribute('aria-expanded',String(open));
});
sortMenu.querySelectorAll('.sort-item').forEach(it=>it.addEventListener('click',()=>{
  state.sortBy=it.dataset.sort;saveState();
  applySort();sortDoneLast();applyFilters();syncSortUI();
  sortMenu.hidden=true;sortBtn.setAttribute('aria-expanded','false');
}));
document.addEventListener('click',e=>{
  if(!sortMenu.hidden&&!sortMenu.contains(e.target)&&!sortBtn.contains(e.target)){
    sortMenu.hidden=true;sortBtn.setAttribute('aria-expanded','false');
  }
});
grid.querySelectorAll('.todo-check').forEach(chk=>{
  const card=chk.closest('.todo-card');const id=card.dataset.id;
  if(state.done.includes(id)){chk.checked=true;card.classList.add('done');}
  chk.addEventListener('change',()=>{
    card.classList.toggle('done',chk.checked);
    const i=state.done.indexOf(id);
    if(chk.checked&&i<0)state.done.push(id);
    if(!chk.checked&&i>=0)state.done.splice(i,1);
    saveState();markDirty();
    if(chk.checked){
      card.classList.add('settling');
      setTimeout(()=>{card.classList.remove('settling');reindex();sortDoneLast();applyFilters();},700);
    }else{
      reindex();sortDoneLast();applyFilters();
    }
  });
});

let dirty=false;
function markDirty(){dirty=true;}
window.addEventListener('beforeunload',e=>{
  if(dirty){e.preventDefault();e.returnValue='';}
});

let dragEl=null;
grid.querySelectorAll('.todo-card').forEach(c=>{
  c.addEventListener('dragstart',()=>{dragEl=c;c.classList.add('dragging');});
  c.addEventListener('dragend',()=>{c.classList.remove('dragging');dragEl=null;
    grid.querySelectorAll('.drop-target').forEach(x=>x.classList.remove('drop-target'));
    if(state.sortBy!=='manual'){state.sortBy='manual';syncSortUI();}
    reindex();persistOrder();markDirty();});
  c.addEventListener('dragover',e=>{e.preventDefault();if(!dragEl||dragEl===c)return;
    const r=c.getBoundingClientRect();const after=(e.clientY-r.top)/r.height>0.5;
    grid.querySelectorAll('.drop-target').forEach(x=>x.classList.remove('drop-target'));c.classList.add('drop-target');
    grid.insertBefore(dragEl,after?c.nextSibling:c);});
});
grid.addEventListener('dragover',e=>e.preventDefault());
function reindex(){[...grid.querySelectorAll('.todo-card')].forEach((c,i)=>c.dataset.cur=i);}
function persistOrder(){state.order=[...grid.querySelectorAll('.todo-card')].map(c=>c.dataset.id);saveState();}
function restoreOrder(){
  if(state.sortBy&&state.sortBy!=='manual'){
    applySort();sortDoneLast();
  }else{
    if(state.order&&state.order.length){
      state.order.forEach(id=>{const c=grid.querySelector('.todo-card[data-id="'+CSS.escape(id)+'"]');if(c)grid.appendChild(c);});
    }
    reindex();sortDoneLast();
  }
}

const saveBtn=document.getElementById('saveBtn');
saveBtn.addEventListener('click',()=>{
  grid.querySelectorAll('.todo-card .todo-check').forEach(chk=>{
    if(chk.checked)chk.setAttribute('checked','');else chk.removeAttribute('checked');
  });
  stripClampMarkup();
  const html='<!DOCTYPE html>\\n'+document.documentElement.outerHTML;
  const blob=new Blob([html],{type:'text/html;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=(document.title||'Protokoll').replace(/[\\\\/:*?"<>|]+/g,' ').trim()+'.html';
  a.click();URL.revokeObjectURL(a.href);
  clampTaskCards();   // Clamp-Markup nach dem Serialisieren wiederherstellen
  dirty=false;
  const label=saveBtn.childNodes[saveBtn.childNodes.length-1];
  const prev=label.textContent;
  saveBtn.classList.add('saved');label.textContent=' Gesichert';
  setTimeout(()=>{saveBtn.classList.remove('saved');label.textContent=prev;},1600);
});

/* ── Aufgabenkarten: lange Texte auf 8 Zeilen kuerzen ──
   Gemessen wird die gerenderte Hoehe; laeuft der Text ueber, wird die Karte
   geklappt (CSS line-clamp), eine "[...]"-Zeile ergaenzt und die Karte per Klick
   mit dem Original-Eintrag verlinkt (eingeklappte Eltern werden aufgeklappt). */
function clampTaskCards(){
  grid.querySelectorAll('.todo-card').forEach(card=>{
    const textEl=card.querySelector('.todo-text');
    if(!textEl)return;
    // Reset, damit Messung bei Resize/Neuberechnung sauber ist.
    textEl.classList.remove('clamped');
    const more=card.querySelector('.todo-more');if(more)more.remove();
    card.classList.remove('has-more');
    // Messen: clampen, dann pruefen ob Inhalt hoeher als der sichtbare Bereich ist.
    textEl.classList.add('clamped');
    const overflow=textEl.scrollHeight-textEl.clientHeight>2;
    if(overflow){
      card.classList.add('has-more');
      const hint=document.createElement('div');
      hint.className='todo-more';hint.textContent='[...]';
      textEl.after(hint);
    }else{
      textEl.classList.remove('clamped');
    }
  });
}
/* Klick auf gekuerzte Karte -> zum Eintrag springen (nicht beim Abhaken/Ziehen/Handle). */
grid.addEventListener('click',e=>{
  const card=e.target.closest('.todo-card.has-more');
  if(!card)return;
  if(e.target.closest('.todo-check,.todo-handle'))return;
  const anchor=card.dataset.anchor;if(!anchor)return;
  const t=document.getElementById(anchor);if(!t)return;
  let p=t.closest('.kap-body.collapsed,.ukap-body.collapsed');
  while(p){p.classList.remove('collapsed');const head=document.querySelector('[data-target="'+p.id+'"]');
    if(head){head.classList.remove('collapsed');state.collapsed[p.id]=false;}p=t.closest('.kap-body.collapsed,.ukap-body.collapsed');}
  saveState();
  t.scrollIntoView({behavior:'smooth',block:'start'});
});
/* "Stand sichern" serialisiert den DOM -> Clamp-Markup vorher entfernen,
   damit es beim erneuten Oeffnen frisch (und nicht doppelt) gemessen wird. */
function stripClampMarkup(){
  grid.querySelectorAll('.todo-text.clamped').forEach(el=>el.classList.remove('clamped'));
  grid.querySelectorAll('.todo-card.has-more').forEach(c=>c.classList.remove('has-more'));
  grid.querySelectorAll('.todo-more').forEach(el=>el.remove());
}

loadState();syncSortUI();restoreOrder();applyFilters();
// Nach Font-Laden messen (Zeilenhoehe haengt von der geladenen Schrift ab).
requestAnimationFrame(clampTaskCards);
if(document.fonts&&document.fonts.ready){document.fonts.ready.then(clampTaskCards);}
window.addEventListener('load',clampTaskCards);
let _clampTimer=null;
window.addEventListener('resize',()=>{clearTimeout(_clampTimer);_clampTimer=setTimeout(clampTaskCards,150);});`;

  return { exportProtocolHtml };
})();
