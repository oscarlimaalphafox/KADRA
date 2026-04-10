/**
 * markdown-export.js - Markdown-Export fuer die Protokoll-App (KADRA)
 *
 * Einstiegspunkt: MarkdownExport.exportProtocolMarkdown(protocolId, hiddenChapters)
 */

/* global DB, getDefaultStructure */

const MarkdownExport = (() => {
  'use strict';

  const DISCLAIMER =
    'Der in obenstehendem Text beschriebene Besprechungsinhalt gibt das Verstaendnis des Verfassers wieder. ' +
    'Die Empfaenger des Protokolls werden gebeten eventuell gewuenschte Ergaenzungen und/oder Korrekturen ' +
    'moeglichst innerhalb von drei Tagen nach Zustellung beim Verfasser schriftlich anzumelden. ' +
    'Diese werden dann in der naechsten Besprechung dokumentiert. Ohne Einwaende wird von einer ordnungsgemaessen ' +
    'Besprechungswiedergabe ausgegangen. Das Protokoll wird regelmaessig durch Entfall aelterer und ' +
    'nur dokumentierender Eintraege bewusst gekuerzt.';

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

  function sanitizeFilePart(value) {
    return String(value || '')
      .trim()
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeCell(value) {
    return String(value || '')
      .replace(/\r?\n/g, '<br>')
      .replace(/\|/g, '\\|')
      .trim();
  }

  function pointDoneSymbol(done) {
    return done ? 'x' : '-';
  }

  function participantSymbol(value) {
    return value ? 'x' : '-';
  }

  function buildProtocolFileName(protocol, project) {
    const now = new Date();
    const fileDate = buildFileDate(now);
    const typeName = sanitizeFilePart(protocol.seriesName || protocol.title || protocol.type || 'Protokoll');
    const numStr = protocol.type === 'Aktennotiz'
      ? ''
      : ` Nr.${pad2(protocol.number || 1)}`;
    const projectCode = sanitizeFilePart(project.code || 'Projekt');
    return `${fileDate} ${projectCode}_${typeName}${numStr}.md`;
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
            description: 'Markdown',
            accept: { 'text/markdown': ['.md'], 'text/plain': ['.md'] },
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

  function collectAbbreviations(participants, customAbbrevs) {
    const result = [];
    const seen = new Set();

    (participants || []).forEach((participant) => {
      const abbr = String(participant.abbr || '').trim();
      if (!abbr || seen.has(abbr)) return;
      seen.add(abbr);
      result.push({
        abbr,
        name: String(participant.company || participant.name || '').trim(),
      });
    });

    (customAbbrevs || []).forEach((item) => {
      const abbr = String(item.abbr || '').trim();
      if (!abbr || seen.has(abbr)) return;
      seen.add(abbr);
      result.push({
        abbr,
        name: String(item.name || '').trim(),
      });
    });

    return result;
  }

  function collectPointRows(protocol, hiddenChapters) {
    const structure = protocol.structure || getDefaultStructure(protocol.type);
    const points = protocol.points || [];
    const rows = [];

    Object.keys(structure).sort().forEach((chapterKey) => {
      if (hiddenChapters && hiddenChapters.has(chapterKey)) return;

      const chapter = structure[chapterKey];
      rows.push({
        type: 'chapter',
        chapterKey,
        title: `${chapterKey} - ${chapter.label || ''}`.trim(),
      });

      const subchapters = chapter.subchapters || [];
      if (subchapters.length === 0) {
        points
          .filter((point) => point.chapter === chapterKey)
          .forEach((point) => rows.push({ type: 'point', point }));
        return;
      }

      subchapters.forEach((subchapter) => {
        rows.push({
          type: 'subchapter',
          title: `${subchapter.id} - ${subchapter.label || ''}`.trim(),
        });

        (subchapter.topics || []).forEach((topic) => {
          rows.push({ type: 'topic', title: topic.label || '' });
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

  function buildPointTable(points) {
    const lines = [
      '| ID | Inhalt | Kategorie | Verantw. | Frist | Erledigt |',
      '|---|---|---|---|---|:---:|',
    ];

    points.forEach((entry) => {
      const point = entry.point;
      const label = point.isNew ? `${point.id || ''} *(neu)*` : (point.id || '');
      lines.push(
        `| ${escapeCell(label)} | ${escapeCell(point.content || '')} | ${escapeCell(point.category || '')} | ${escapeCell(point.responsible || '-')} | ${escapeCell(point.deadline || '-')} | ${pointDoneSymbol(!!point.done)} |`
      );
    });

    return lines;
  }

  function buildMarkdown(protocol, project, hiddenChapters) {
    const lines = [];
    const title = protocol.seriesName || protocol.title || protocol.type || 'Protokoll';
    const numberedTitle = protocol.type === 'Aktennotiz'
      ? title
      : `${title} Nr. ${protocol.number || 1}`;

    lines.push(`# ${numberedTitle}`);
    lines.push('');

    const metaLines = [
      ['Projekt', project.name || ''],
      ['Projektkuerzel', project.code || ''],
      ['Mieterin', protocol.tenant || ''],
      ['Vermieterin', protocol.landlord || ''],
      ['Datum', formatDate(protocol.date)],
      ['Zeit', protocol.time || ''],
      ['Ort', protocol.location || ''],
    ];

    const author = protocol.author || {};
    const authorName = String(author.name || [author.firstName, author.lastName].filter(Boolean).join(' ')).trim();
    const authorParts = [authorName, author.company || '', formatDate(author.date)].filter(Boolean);
    if (authorParts.length) {
      metaLines.push(['Aufgestellt', authorParts.join(', ')]);
    }

    metaLines.forEach(([label, value]) => {
      if (!value) return;
      lines.push(`**${label}:** ${value}  `);
    });

    lines.push('');
    lines.push('---');
    lines.push('');

    lines.push('## Teilnehmer');
    lines.push('');
    if (protocol.participants && protocol.participants.length) {
      lines.push('| Name | Firma | Kuerzel | Teilgenommen | Verteiler |');
      lines.push('|---|---|---|:---:|:---:|');
      protocol.participants.forEach((participant) => {
        lines.push(
          `| ${escapeCell(participant.name || '')} | ${escapeCell(participant.company || '')} | ${escapeCell(participant.abbr || '')} | ${participantSymbol(!!participant.attended)} | ${participantSymbol(!!participant.inDistrib)} |`
        );
      });
    } else {
      lines.push('*Keine Teilnehmer.*');
    }

    const pointRows = collectPointRows(protocol, hiddenChapters);
    let pendingPoints = [];

    function flushPoints() {
      if (!pendingPoints.length) return;
      buildPointTable(pendingPoints).forEach((line) => lines.push(line));
      lines.push('');
      pendingPoints = [];
    }

    pointRows.forEach((row) => {
      if (row.type === 'point') {
        pendingPoints.push(row);
        return;
      }

      flushPoints();

      if (row.type === 'chapter') {
        lines.push('---');
        lines.push('');
        lines.push(`## ${row.title}`);
        lines.push('');
        return;
      }

      if (row.type === 'subchapter') {
        lines.push(`### ${row.title}`);
        lines.push('');
        return;
      }

      if (row.type === 'topic') {
        lines.push(`#### Thema: ${row.title}`);
        lines.push('');
      }
    });

    flushPoints();

    lines.push('---');
    lines.push('');
    lines.push('## Anlagen');
    lines.push('');
    if (protocol.attachments && protocol.attachments.length) {
      protocol.attachments.forEach((attachment) => {
        const parts = [attachment.id || '', attachment.content || attachment.fileName || ''].filter(Boolean);
        const fileLabel = attachment.fileName && attachment.content !== attachment.fileName
          ? ` (${attachment.fileName})`
          : '';
        lines.push(`- ${parts.join(': ')}${fileLabel}`.trim());
      });
    } else {
      lines.push('*Keine Anlagen.*');
    }

    const abbreviations = collectAbbreviations(protocol.participants, protocol.customAbbreviations);
    if (abbreviations.length) {
      lines.push('');
      lines.push('---');
      lines.push('');
      lines.push('## Abkuerzungsverzeichnis');
      lines.push('');
      lines.push('| Kuerzel | Name |');
      lines.push('|---|---|');
      abbreviations.forEach((item) => {
        lines.push(`| ${escapeCell(item.abbr)} | ${escapeCell(item.name)} |`);
      });
    }

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Hinweis');
    lines.push('');
    lines.push(DISCLAIMER);
    lines.push('');

    return lines.join('\n');
  }

  async function exportProtocolMarkdown(protocolId, hiddenChapters) {
    const protocol = await DB.Protocols.get(protocolId);
    if (!protocol) throw new Error('Protokoll nicht gefunden');

    const project = await DB.Projects.get(protocol.projectId);
    if (!project) throw new Error('Projekt nicht gefunden');

    const markdown = buildMarkdown(protocol, project, hiddenChapters);
    const fileName = buildProtocolFileName(protocol, project);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });

    await saveBlob(blob, fileName);
    return fileName;
  }

  return { exportProtocolMarkdown };
})();
