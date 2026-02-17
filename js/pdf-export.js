/**
 * pdf-export.js — PDF-Export für die Protokoll-App (KADRA)
 *
 * Abhängigkeiten (müssen vorher geladen sein):
 *   - jspdf.umd.min.js            (jsPDF 3.x)
 *   - jspdf.plugin.autotable.min.js (autotable 5.x)
 *   - nunito-sans-fonts.js         (Base64-kodierte TTF-Daten)
 *   - db.js                        (DB-Zugriff, getDefaultStructure)
 *
 * Einstiegspunkt: PDFExport.exportProtocolPDF(protocolId, hiddenChapters)
 */

/* global jspdf, DB, getDefaultStructure, NunitoSansFonts */

const PDFExport = (() => {
  'use strict';

  /* ── Farben & Konstanten ──────────────────────────────────── */
  const BLUE           = [0, 51, 128];
  const BLUE_LIGHT     = [230, 238, 248];
  const BLUE_AMENDMENT = [15, 49, 136];
  const RED_OVERDUE    = [255, 51, 0];
  const GRAY_DONE      = [170, 170, 170];
  const GRAY_MID       = [200, 200, 200];
  const BLACK          = [0, 0, 0];

  const MARGIN_LEFT   = 20;
  const MARGIN_RIGHT  = 20;
  const MARGIN_TOP    = 28;
  const MARGIN_BOTTOM = 22;
  const PAGE_WIDTH    = 210;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  const FONT_NAME = 'NunitoSans';

  /* ── Font-Registrierung ───────────────────────────────────── */

  function registerFonts(doc) {
    doc.addFileToVFS('NunitoSans-Regular.ttf', NunitoSansFonts['NunitoSans-Regular']);
    doc.addFont('NunitoSans-Regular.ttf', FONT_NAME, 'normal');

    doc.addFileToVFS('NunitoSans-SemiBold.ttf', NunitoSansFonts['NunitoSans-SemiBold']);
    doc.addFont('NunitoSans-SemiBold.ttf', FONT_NAME, 'bold');

    doc.addFileToVFS('NunitoSans-Italic.ttf', NunitoSansFonts['NunitoSans-Italic']);
    doc.addFont('NunitoSans-Italic.ttf', FONT_NAME, 'italic');

    doc.addFileToVFS('NunitoSans-Bold.ttf', NunitoSansFonts['NunitoSans-Bold']);
    doc.addFont('NunitoSans-Bold.ttf', FONT_NAME, 'bolditalic');

    doc.setFont(FONT_NAME, 'normal');
  }

  /* ── Logo als Base64 laden (einmal) ───────────────────────── */
  let logoBase64 = null;
  let logoLoaded = false;

  async function loadLogo() {
    if (logoLoaded) return logoBase64;
    try {
      const resp = await fetch('icons/HOPRO Logo_weißerHintergrund_medres.jpg');
      const blob = await resp.blob();
      logoBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      logoLoaded = true;
    } catch (e) {
      console.warn('PDF-Export: Logo konnte nicht geladen werden', e);
      logoLoaded = true;
    }
    return logoBase64;
  }

  /* ── Hilfsfunktionen ──────────────────────────────────────── */

  function formatDate(isoDate) {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return isoDate;
  }

  function toIsoDate(str) {
    if (!str) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const m = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (m) {
      const y = m[3].length === 2 ? '20' + m[3] : m[3];
      return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    }
    return '';
  }

  /* ── Spiegelstrich: Hanging Indent für PDF ─────────────────── */

  function applyHangingIndent(doc, text, maxWidth) {
    if (!text) return text;
    const lines = text.split('\n');
    const result = [];
    lines.forEach(line => {
      const bulletMatch = line.match(/^(\s*-\s)/);
      if (!bulletMatch) {
        result.push(line);
        return;
      }
      const prefix = bulletMatch[1];
      const rest = line.slice(prefix.length);
      // Messen, wie breit das Präfix in Leerzeichen ist
      const prefixWidth = doc.getTextWidth(prefix);
      // Padding für Folgezeilen (gleich breit wie Präfix)
      const padChars = Math.ceil(prefixWidth / doc.getTextWidth(' '));
      const pad = ' '.repeat(padChars);
      // Erste Zeile mit Präfix, Folgezeilen mit Padding umbrechen
      const availWidth = maxWidth - doc.getTextWidth(prefix);
      const wrapped = doc.splitTextToSize(rest, availWidth > 10 ? availWidth : maxWidth);
      wrapped.forEach((w, i) => {
        result.push(i === 0 ? prefix + w : pad + w);
      });
    });
    return result.join('\n');
  }

  /* ── Kopf- und Fußzeile ───────────────────────────────────── */

  function addHeaderFooter(doc) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      if (logoBase64) {
        const logoH = 7;
        const logoW = 28;
        doc.addImage(logoBase64, 'JPEG',
          PAGE_WIDTH - MARGIN_RIGHT - logoW, 8, logoW, logoH);
      }

      doc.setFont(FONT_NAME, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Seite ${i} von ${pageCount}`,
        MARGIN_LEFT, doc.internal.pageSize.getHeight() - 10);
    }
  }

  /* ── Titelblock (Metadaten) ───────────────────────────────── */

  function renderTitleBlock(doc, protocol, project) {
    let y = MARGIN_TOP + 4;
    const boxH = 12;

    const code = project.code || '';
    const typeName = protocol.seriesName || protocol.title || protocol.type || '';
    const numStr = protocol.type === 'Aktennotiz'
      ? '' : `Nr. ${String(protocol.number || 1).padStart(2, '0')}`;

    // Breite des schwarzen Code-Bereichs berechnen
    doc.setFontSize(14);
    doc.setFont(FONT_NAME, 'bold');
    const codeBoxW = Math.max(doc.getTextWidth(code) + 10, 28);

    // Schwarzer Hintergrund für Projektcode
    doc.setFillColor(0, 0, 0);
    doc.rect(MARGIN_LEFT, y - 4, codeBoxW, boxH, 'F');

    // Grauer Hintergrund für Protokollname + Nummer
    doc.setFillColor(...GRAY_MID);
    doc.rect(MARGIN_LEFT + codeBoxW, y - 4, CONTENT_WIDTH - codeBoxW, boxH, 'F');

    // Projektcode weiß auf schwarz
    doc.setTextColor(255, 255, 255);
    doc.text(code, MARGIN_LEFT + 5, y + 4);

    // Protokolltitel mittig auf grauem Bereich
    doc.setFontSize(12);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(...BLACK);
    const grayStart = MARGIN_LEFT + codeBoxW;
    const grayW = CONTENT_WIDTH - codeBoxW;
    const titleW = doc.getTextWidth(typeName);
    doc.text(typeName, grayStart + grayW / 2 - titleW / 2, y + 4);

    // Nr. rechts auf grauem Bereich
    if (numStr) {
      doc.setFontSize(14);
      const numW = doc.getTextWidth(numStr);
      doc.text(numStr, MARGIN_LEFT + CONTENT_WIDTH - numW - 4, y + 4);
    }

    y += 16;

    // Metadaten-Block
    doc.setFontSize(9);
    const meta = [
      ['Projekt:', project.name || ''],
      ['Termin:', formatDate(protocol.date) + (protocol.time ? `    ${protocol.time}` : '')],
      ['Ort:', protocol.location || ''],
    ];
    if (protocol.tenant)   meta.push(['Mieterin:', protocol.tenant]);
    if (protocol.landlord) meta.push(['Vermieterin:', protocol.landlord]);

    meta.forEach(([label, value]) => {
      doc.setFont(FONT_NAME, 'normal');
      doc.setTextColor(...BLACK);
      doc.text(label, MARGIN_LEFT, y);
      doc.setFont(FONT_NAME, 'bold');
      doc.text(value, MARGIN_LEFT + 28, y);
      y += 5;
    });

    return y + 3;
  }

  /* ── Checkbox zeichnen ──────────────────────────────────────── */

  function drawCheckbox(doc, x, y, size, checked) {
    const boxTop = y - size + 1;
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.15);
    doc.roundedRect(x, boxTop, size, size, 0.4, 0.4);
    if (checked) {
      // Häkchen innerhalb der Box
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.25);
      const m = 0.15 * size; // Innenabstand
      const x0 = x + m;
      const y0 = boxTop + size * 0.55;
      const x1 = x + size * 0.38;
      const y1 = boxTop + size - m;
      const x2 = x + size - m;
      const y2 = boxTop + m;
      doc.line(x0, y0, x1, y1);
      doc.line(x1, y1, x2, y2);
    }
  }

  /* ── Teilnehmertabelle ────────────────────────────────────── */

  function renderParticipantsTable(doc, participants, startY) {
    if (!participants || !participants.length) return startY;

    const body = participants.map(p => [
      p.name || '',
      p.company || '',
      p.abbr || '',
      p.email || '',
      '',
      '',
    ]);

    const partData = participants.map(p => ({
      attended: !!p.attended,
      inDistrib: !!p.inDistrib,
    }));

    const bodyLen = body.length;

    doc.autoTable({
      startY,
      margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
      head: [['Name', 'Firma / Organisation', 'Kürzel', 'E-Mail-Adresse', 'Teilnehmer', 'Verteiler']],
      body,
      styles: {
        font: FONT_NAME,
        fontSize: 8,
        cellPadding: 2,
        lineWidth: 0,  // Keine Borders (plain)
      },
      headStyles: {
        fillColor: false,
        textColor: BLACK,
        fontStyle: 'bold',
        fontSize: 7,  // Gleich wie Punkte-Header
      },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 40 },
        2: { cellWidth: 14 },
        3: { cellWidth: 48 },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' },
      },
      theme: 'plain',

      didDrawCell(data) {
        // Horizontale Linien: nur zwischen Zeilen (nicht oben, nicht unten)
        const isLastBodyRow = data.section === 'body' && data.row.index === bodyLen - 1;
        if (!isLastBodyRow && data.column.index === 0) {
          doc.setDrawColor(180, 180, 180);
          doc.setLineWidth(0.2);
          const lineY = data.cell.y + data.cell.height;
          doc.line(MARGIN_LEFT, lineY, PAGE_WIDTH - MARGIN_RIGHT, lineY);
        }

        // Checkboxen für Teilnehmer/Verteiler
        if (data.section !== 'body') return;
        const colIdx = data.column.index;
        if (colIdx !== 4 && colIdx !== 5) return;

        const row = partData[data.row.index];
        if (!row) return;
        const checked = colIdx === 4 ? row.attended : row.inDistrib;

        const boxSize = 2.5;
        const bx = data.cell.x + data.cell.width / 2 - boxSize / 2;
        const by = data.cell.y + data.cell.height / 2 + boxSize / 2 - 0.5;
        drawCheckbox(doc, bx, by, boxSize, checked);
      },
    });

    return doc.lastAutoTable.finalY + 6;
  }

  /* ── Punkt-Tabelle (Kernteil) ─────────────────────────────── */

  function buildPointTableData(protocol, hiddenChapters) {
    const structure = protocol.structure || getDefaultStructure(protocol.type);
    const points    = protocol.points || [];
    const rows      = [];

    const chapterKeys = Object.keys(structure).sort();

    chapterKeys.forEach(chKey => {
      if (hiddenChapters && hiddenChapters.has(chKey)) return;

      const ch = structure[chKey];
      rows.push({ type: 'chapter', label: chKey, fullLabel: ch.label });

      const subs = ch.subchapters || [];

      if (subs.length === 0) {
        points.filter(pt => pt.chapter === chKey)
          .forEach(pt => rows.push({ type: 'point', point: pt }));
      } else {
        subs.forEach(sub => {
          rows.push({ type: 'subchapter', label: sub.id, fullLabel: sub.label });

          (sub.topics || []).forEach(topic => {
            rows.push({ type: 'topic', label: topic.label });
            points
              .filter(pt => pt.chapter === chKey && pt.subchapter === sub.id && pt.topic === topic.id)
              .forEach(pt => rows.push({ type: 'point', point: pt }));
          });

          points
            .filter(pt => pt.chapter === chKey && pt.subchapter === sub.id && !pt.topic)
            .forEach(pt => rows.push({ type: 'point', point: pt }));
        });
      }
    });

    return rows;
  }

  function renderPointsTable(doc, protocol, startY, hiddenChapters) {
    const tableRows = buildPointTableData(protocol, hiddenChapters);
    if (tableRows.length === 0) return startY;

    const head = [['ID', 'Inhalt', 'Kategorie', 'Zuständig', 'Termin', 'Erledigt']];

    const body = [];
    const rowStyles = {};
    const noTopBorderRows = new Set();
    const pointDoneState = {};  // bodyRowIndex → boolean (für Checkbox)
    const today = new Date().toISOString().slice(0, 10);

    let lastRowWasPoint = false;

    tableRows.forEach(row => {
      if (row.type === 'chapter') {
        lastRowWasPoint = false;
        body.push([
          { content: `${row.label} - ${row.fullLabel}`, colSpan: 6, styles: { fontStyle: 'bold', textColor: [255,255,255], fontSize: 9 } },
        ]);
        rowStyles[body.length - 1] = { fillColor: BLUE, textColor: [255,255,255], fontStyle: 'bold' };

      } else if (row.type === 'subchapter') {
        lastRowWasPoint = false;
        body.push([
          { content: `${row.label} - ${row.fullLabel}`, colSpan: 6, styles: { fontStyle: 'bold', fontSize: 8.5 } },
        ]);
        rowStyles[body.length - 1] = { fillColor: BLUE_LIGHT, textColor: BLACK, fontStyle: 'bold' };

      } else if (row.type === 'topic') {
        lastRowWasPoint = false;
        body.push([
          { content: row.label, colSpan: 6, styles: { fontStyle: 'italic', fontSize: 8, cellPadding: { top: 2, right: 2, bottom: 2, left: 18 } } },
        ]);
        rowStyles[body.length - 1] = { fillColor: [250, 250, 250] };

      } else if (row.type === 'point') {
        const pt = row.point;
        const isDone = pt.done;
        const isNew  = pt.isNew;
        const snap   = pt.snapshot || null;
        const contentAmended  = snap && (pt.content  || '') !== snap.content;
        const deadlineAmended = snap && (pt.deadline || '') !== snap.deadline;

        const iso = toIsoDate(pt.deadline);
        const isOverdue = !isDone && iso && iso < today;

        const catVal = pt.category === 'Freigabe' ? 'Freigabe erfordl.' : (pt.category || 'Aufgabe');

        const contentStyle = {
          textColor: isDone ? GRAY_DONE : (contentAmended ? BLUE_AMENDMENT : BLACK),
          fontStyle: isNew ? 'bold' : 'normal',
          fontSize: 8,
        };
        const deadlineStyle = {
          textColor: isDone ? GRAY_DONE : (isOverdue ? RED_OVERDUE : (deadlineAmended ? BLUE_AMENDMENT : BLACK)),
          fontStyle: (isNew || isOverdue) ? 'bold' : 'normal',
          fontSize: 6.5,
        };
        const baseStyle = {
          textColor: isDone ? GRAY_DONE : BLACK,
          fontStyle: isNew ? 'bold' : 'normal',
          fontSize: 8,
        };

        if (lastRowWasPoint) {
          noTopBorderRows.add(body.length);
        }
        lastRowWasPoint = true;

        // Erledigt-Zustand merken für Checkbox-Zeichnung
        pointDoneState[body.length] = isDone;

        // Spiegelstrich-Einrückung (hanging indent) für PDF
        const contentWidth = CONTENT_WIDTH - 16 - 20 - 15 - 18 - 14 - 12; // auto-Spalte minus Padding
        doc.setFont(FONT_NAME, contentStyle.fontStyle || 'normal');
        doc.setFontSize(contentStyle.fontSize || 8);
        const formattedContent = applyHangingIndent(doc, pt.content || '', contentWidth);

        body.push([
          { content: pt.id || '', styles: { ...baseStyle, fontSize: 6 } },
          { content: formattedContent, styles: contentStyle },
          { content: catVal, styles: { ...baseStyle, fontSize: 6.5 } },
          { content: pt.responsible || '', styles: { ...baseStyle, fontSize: 6.5 } },
          { content: pt.deadline || '', styles: deadlineStyle },
          { content: '', styles: baseStyle },  // Erledigt — leer, wird als Checkbox gezeichnet
        ]);
      }
    });

    doc.autoTable({
      startY,
      margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, top: MARGIN_TOP + 2, bottom: MARGIN_BOTTOM + 5 },
      head,
      body,
      styles: {
        font: FONT_NAME,
        fontSize: 8,
        cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
        lineColor: [210, 210, 210],
        lineWidth: 0.2,
        overflow: 'linebreak',
        valign: 'top',
      },
      headStyles: {
        fillColor: [245, 245, 245],
        textColor: BLACK,
        fontStyle: 'bold',
        lineWidth: 0.2,
        lineColor: [210, 210, 210],
        fontSize: 7,
      },
      columnStyles: {
        0: { cellWidth: 16 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20 },
        3: { cellWidth: 15 },
        4: { cellWidth: 18 },
        5: { cellWidth: 14, halign: 'center' },
      },
      theme: 'grid',
      showHead: 'everyPage',

      didParseCell(data) {
        if (data.section === 'body' && rowStyles[data.row.index]) {
          const style = rowStyles[data.row.index];
          if (style.fillColor) data.cell.styles.fillColor = style.fillColor;
          if (style.textColor) data.cell.styles.textColor = style.textColor;
          if (style.fontStyle) data.cell.styles.fontStyle = style.fontStyle;
        }
      },

      didDrawCell(data) {
        // ── Vertikale Linie zwischen ID (col 0) und Inhalt (col 1) entfernen ──
        if (data.column.index === 0) {
          const fc = data.cell.styles.fillColor;
          if (Array.isArray(fc)) {
            doc.setFillColor(fc[0], fc[1], fc[2]);
          } else {
            doc.setFillColor(255, 255, 255);
          }
          // Rechte Zellgrenze überzeichnen
          doc.rect(data.cell.x + data.cell.width - 0.2, data.cell.y, 0.5, data.cell.height, 'F');
        }

        if (data.section !== 'body') return;

        // ── Horizontale Linie zwischen Punkten im selben Thema entfernen ──
        if (noTopBorderRows.has(data.row.index)) {
          const fc = data.cell.styles.fillColor;
          if (Array.isArray(fc)) {
            doc.setFillColor(fc[0], fc[1], fc[2]);
          } else {
            doc.setFillColor(255, 255, 255);
          }
          doc.rect(data.cell.x, data.cell.y - 0.15, data.cell.width, 0.4, 'F');
        }

        // ── Erledigt-Checkbox zeichnen (auf Höhe der ersten Zeile) ──
        if (data.column.index === 5 && pointDoneState[data.row.index] !== undefined) {
          const checked = pointDoneState[data.row.index];
          const boxSize = 3;
          const padding = data.cell.styles.cellPadding;
          const padTop = (typeof padding === 'object') ? (padding.top || 0) : (padding || 0);
          const bx = data.cell.x + data.cell.width / 2 - boxSize / 2;
          const by = data.cell.y + padTop + boxSize - 0.5;
          drawCheckbox(doc, bx, by, boxSize, checked);
        }
      },
    });

    return doc.lastAutoTable.finalY + 6;
  }

  /* ── Anlagen ──────────────────────────────────────────────── */

  function renderAttachments(doc, attachments, startY) {
    const pageH = doc.internal.pageSize.getHeight();
    if (startY > pageH - MARGIN_BOTTOM - 30) {
      doc.addPage();
      startY = MARGIN_TOP + 4;
    }

    doc.setFillColor(...GRAY_MID);
    doc.rect(MARGIN_LEFT, startY - 1, CONTENT_WIDTH, 7, 'F');
    doc.setFontSize(9);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(...BLACK);
    doc.text('ANLAGEN', MARGIN_LEFT + 3, startY + 4);
    startY += 10;

    if (!attachments || !attachments.length) {
      doc.setFont(FONT_NAME, 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...GRAY_DONE);
      doc.text('keine Anlagen', MARGIN_LEFT + 3, startY);
      return startY + 8;
    }

    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(8);

    attachments.forEach(att => {
      if (startY > pageH - MARGIN_BOTTOM - 10) {
        doc.addPage();
        startY = MARGIN_TOP + 4;
      }
      doc.setFillColor(245, 245, 245);
      doc.rect(MARGIN_LEFT, startY - 3.5, CONTENT_WIDTH, 5.5, 'F');
      doc.setTextColor(...BLACK);
      doc.text(`${att.id || ''}    ${att.content || ''}`, MARGIN_LEFT + 10, startY);
      startY += 6;
    });

    return startY + 4;
  }

  /* ── Sektions-Überschrift (GROSSBUCHSTABEN, wie KAP) ──────── */

  function renderSectionHeading(doc, title, startY, minSpace) {
    const pageH = doc.internal.pageSize.getHeight();
    if (startY > pageH - MARGIN_BOTTOM - (minSpace || 20)) {
      doc.addPage();
      startY = MARGIN_TOP + 4;
    }
    doc.setFontSize(9);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(...BLACK);
    doc.text(title, MARGIN_LEFT, startY);
    return startY + 6;
  }

  /* ── Formatierungskonventionen (inkl. Farblegenden) ──────── */

  function renderFormatConventions(doc, startY) {
    // Trennlinie mittelgrau
    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_LEFT, startY, MARGIN_LEFT + CONTENT_WIDTH, startY);
    startY += 6;

    startY = renderSectionHeading(doc, 'FORMATIERUNGSKONVENTIONEN', startY, 40);

    doc.setFontSize(8);

    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(...BLACK);
    doc.text('Neue Punkte sind fett markiert', MARGIN_LEFT, startY);
    startY += 4.5;

    doc.setFont(FONT_NAME, 'normal');
    doc.setTextColor(...BLUE_AMENDMENT);
    doc.text('Ergänzungen/Korrekturen sind farbig hervorgehoben (blau)', MARGIN_LEFT, startY);
    startY += 4.5;

    doc.setTextColor(...RED_OVERDUE);
    doc.text('Überfällige Fristen sind rot markiert', MARGIN_LEFT, startY);
    startY += 4.5;

    doc.setTextColor(...GRAY_DONE);
    doc.text('Erledigte Punkte sind in hellgrauer Schrift markiert und werden mit dem nächsten Protokoll gelöscht', MARGIN_LEFT, startY);
    startY += 10;

    return startY;
  }

  /* ── ID-Syntax ──────────────────────────────────────────────── */

  function renderIdSyntax(doc, startY) {
    startY = renderSectionHeading(doc, 'ID-SYNTAX', startY, 25);

    doc.setFontSize(8);
    doc.setFont(FONT_NAME, 'normal');
    doc.setTextColor(...BLACK);
    doc.text('Syntax der Protokollpunkte:', MARGIN_LEFT, startY);
    doc.setFont(FONT_NAME, 'bold');
    doc.text('#[Protokoll-Nr]|[Kapitel].[Unterkapitel].[lfd. Nr.]', MARGIN_LEFT + 48, startY);
    startY += 5;

    doc.setFont(FONT_NAME, 'normal');
    doc.text('Beispiel:', MARGIN_LEFT, startY);
    doc.setFont(FONT_NAME, 'bold');
    doc.text('#11|B.1.02', MARGIN_LEFT + 48, startY);
    doc.setFont(FONT_NAME, 'normal');
    doc.text('= Punkt aus Protokoll Nr. 11, Kapitel B, Unterkapitel 1, laufende Nr. 02', MARGIN_LEFT + 62, startY);
    startY += 10;

    return startY;
  }

  /* ── Abkürzungen ──────────────────────────────────────────── */

  function renderAbbreviations(doc, participants, customAbbrevs, startY) {
    const abbrevs = [];
    const seen = new Set();
    (participants || []).forEach(p => {
      if (p.abbr && !seen.has(p.abbr)) {
        seen.add(p.abbr);
        abbrevs.push({ abbr: p.abbr, name: p.company || '' });
      }
    });
    (customAbbrevs || []).forEach(ca => {
      if (ca.abbr) abbrevs.push({ abbr: ca.abbr, name: ca.name || '' });
    });

    if (abbrevs.length === 0) return startY;

    // Trennlinie mittelgrau
    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_LEFT, startY, MARGIN_LEFT + CONTENT_WIDTH, startY);
    startY += 6;

    startY = renderSectionHeading(doc, 'ABKÜRZUNGSVERZEICHNIS', startY, 20);

    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont(FONT_NAME, 'normal');
    abbrevs.forEach(a => {
      if (startY > pageH - MARGIN_BOTTOM - 8) {
        doc.addPage();
        startY = MARGIN_TOP + 4;
      }
      doc.text(`${a.abbr} = ${a.name}`, MARGIN_LEFT, startY);
      startY += 4;
    });

    return startY + 4;
  }

  /* ── Hinweistext ──────────────────────────────────────────── */

  function renderDisclaimer(doc, startY) {
    // Trennlinie mittelgrau
    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_LEFT, startY, MARGIN_LEFT + CONTENT_WIDTH, startY);
    startY += 6;

    startY = renderSectionHeading(doc, 'HINWEIS', startY, 30);

    doc.setFontSize(8);
    doc.setFont(FONT_NAME, 'normal');
    const disclaimer =
      'Der in obenstehendem Text beschriebene Besprechungsinhalt gibt das Verständnis des Verfassers wieder. ' +
      'Die Empfänger des Protokolls werden gebeten eventuell gewünschte Ergänzungen und/oder Korrekturen ' +
      'möglichst innerhalb von drei Tagen nach Zustellung beim Verfasser schriftlich anzumelden. ' +
      'Diese werden dann in der nächsten Besprechung dokumentiert. Ohne Einwände wird von einer ordnungsgemäßen ' +
      'Besprechungswiedergabe ausgegangen. Das Protokoll wird regelmäßig durch Entfall älterer und ' +
      'nur dokumentierender Einträge bewusst gekürzt.';

    const lines = doc.splitTextToSize(disclaimer, CONTENT_WIDTH);
    doc.text(lines, MARGIN_LEFT, startY);
    startY += lines.length * 3.5 + 8;

    return startY;
  }

  /* ── Aufgestellt ──────────────────────────────────────────── */

  function renderAuthor(doc, author, startY) {
    const pageH = doc.internal.pageSize.getHeight();
    if (startY > pageH - MARGIN_BOTTOM - 15) {
      doc.addPage();
      startY = MARGIN_TOP + 4;
    }

    doc.setFontSize(9);
    doc.setFont(FONT_NAME, 'normal');
    doc.setTextColor(...BLACK);

    const a = author || {};
    const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
    const parts = [name, a.company, a.date].filter(Boolean).join(', ');
    doc.text(`Aufgestellt: ${parts}`, MARGIN_LEFT, startY);

    return startY + 8;
  }

  /* ── Hauptfunktion ────────────────────────────────────────── */

  async function exportProtocolPDF(protocolId, hiddenChapters) {
    const protocol = await DB.Protocols.get(protocolId);
    if (!protocol) throw new Error('Protokoll nicht gefunden');

    const project = await DB.Projects.get(protocol.projectId);
    if (!project) throw new Error('Projekt nicht gefunden');

    await loadLogo();

    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    registerFonts(doc);

    let y = renderTitleBlock(doc, protocol, project);
    y = renderParticipantsTable(doc, protocol.participants, y);
    y = renderPointsTable(doc, protocol, y, hiddenChapters);
    y = renderAttachments(doc, protocol.attachments || [], y);
    y = renderAuthor(doc, protocol.author, y);
    y = renderFormatConventions(doc, y);
    y = renderIdSyntax(doc, y);
    y = renderDisclaimer(doc, y);
    y = renderAbbreviations(doc, protocol.participants, protocol.customAbbreviations, y);

    addHeaderFooter(doc);

    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const numStr = protocol.type === 'Aktennotiz'
      ? '' : ` Nr.${String(protocol.number || 1).padStart(2, '0')}`;
    const typeName = protocol.seriesName || protocol.title || protocol.type || '';
    const fileName = `${yy}${mm}${dd} ${project.code}_${typeName}${numStr}.pdf`;

    doc.save(fileName);
    return fileName;
  }

  return { exportProtocolPDF };
})();
