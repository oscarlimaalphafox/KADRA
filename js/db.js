/**
 * db.js — IndexedDB-Wrapper für die Protokoll-App
 *
 * Datenbank: ProtokollApp
 * Object Stores:
 *   projects   – Projekte (keyPath: id)
 *   protocols  – Protokolle (keyPath: id)
 *
 * Alle Operationen sind Promise-basiert.
 */

const DB_NAME    = 'ProtokollApp';
const DB_VERSION = 1;

let _db = null;

/** Öffnet (oder erstellt) die Datenbank. */
function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // ── Projekte ─────────────────────────────────────────
      if (!db.objectStoreNames.contains('projects')) {
        const ps = db.createObjectStore('projects', { keyPath: 'id' });
        ps.createIndex('code', 'code', { unique: true });
      }

      // ── Protokolle ───────────────────────────────────────
      if (!db.objectStoreNames.contains('protocols')) {
        const pp = db.createObjectStore('protocols', { keyPath: 'id' });
        pp.createIndex('projectId', 'projectId', { unique: false });
        pp.createIndex('projectId_type', ['projectId', 'type'], { unique: false });
      }
    };

    req.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror    = (e) => reject(e.target.error);
  });
}

/** Generiert eine UUID v4. */
function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
}

/* ── Generische Hilfsfunktionen ────────────────────────────── */

function txGet(storeName, id) {
  return openDB().then(db => new Promise((res, rej) => {
    const tx  = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => res(req.result ?? null);
    req.onerror   = () => rej(req.error);
  }));
}

function txGetAll(storeName) {
  return openDB().then(db => new Promise((res, rej) => {
    const tx  = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  }));
}

function txPut(storeName, record) {
  return openDB().then(db => new Promise((res, rej) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(record);
    req.onsuccess = () => res(record);
    req.onerror   = () => rej(req.error);
  }));
}

function txDelete(storeName, id) {
  return openDB().then(db => new Promise((res, rej) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => res(true);
    req.onerror   = () => rej(req.error);
  }));
}

function txGetByIndex(storeName, indexName, value) {
  return openDB().then(db => new Promise((res, rej) => {
    const tx  = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).index(indexName).getAll(value);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  }));
}

/* ── Projekt-API ───────────────────────────────────────────── */

const Projects = {
  /** Alle aktiven Projekte laden (nicht im Papierkorb) */
  async getAll() {
    const all = await txGetAll('projects');
    return all.filter(p => !p.deletedAt);
  },

  /** Alle Projekte inkl. gelöschter laden */
  getAllIncludingDeleted() { return txGetAll('projects'); },

  /** Nur gelöschte Projekte laden */
  async getTrashed() {
    const all = await txGetAll('projects');
    return all.filter(p => p.deletedAt);
  },

  /** Ein Projekt per ID laden */
  get(id)  { return txGet('projects', id); },

  /** Projekt speichern (erstellen oder aktualisieren) */
  save(project) {
    if (!project.id) project.id = uuid();
    project.updatedAt = Date.now();
    if (!project.createdAt) project.createdAt = Date.now();
    return txPut('projects', project);
  },

  /** Projekt in Papierkorb verschieben */
  async trash(id) {
    const p = await this.get(id);
    if (!p) return;
    p.deletedAt = Date.now();
    return txPut('projects', p);
  },

  /** Projekt aus Papierkorb wiederherstellen */
  async restore(id) {
    const p = await this.get(id);
    if (!p) return;
    p.deletedAt = null;
    return txPut('projects', p);
  },

  /** Projekt endgültig löschen */
  delete(id) { return txDelete('projects', id); },
};

/* ── Protokoll-API ─────────────────────────────────────────── */

/**
 * Datenstruktur eines Protokolls:
 * {
 *   id: string (uuid),
 *   projectId: string,
 *   type: string,          // 'JFx Planung' | ...
 *   number: number,        // laufende Nummer in der Serie
 *   title: string,         // Protokolltitel
 *   date: string,          // ISO-Date
 *   time: string,          // optional
 *   location: string,      // optional
 *   tenant: string,        // optional (Mieterin)
 *   landlord: string,      // optional (Vermieterin)
 *   participants: [...],   // Array von Teilnehmer-Objekten
 *   structure: {...},      // Gliederungsstruktur
 *   points: [...],         // Array von Protokollpunkt-Objekten
 *   attachments: [...],    // Array von Anlagen-Objekten
 *   deletedAt: number|null,// null = aktiv, timestamp = im Papierkorb
 *   createdAt: number,
 *   updatedAt: number,
 * }
 */

const Protocols = {
  /** Alle Protokolle (alle Projekte, inkl. gelöschte) */
  getAll() { return txGetAll('protocols'); },

  /** Alle Protokolle eines Projekts */
  getByProject(projectId) {
    return txGetByIndex('protocols', 'projectId', projectId);
  },

  /** Alle aktiven Protokolle eines Projekts (nicht im Papierkorb) */
  async getActiveByProject(projectId) {
    const all = await this.getByProject(projectId);
    return all.filter(p => !p.deletedAt);
  },

  /** Einzelnes Protokoll laden */
  get(id) { return txGet('protocols', id); },

  /** Protokoll speichern */
  save(protocol) {
    if (!protocol.id) protocol.id = uuid();
    protocol.updatedAt = Date.now();
    if (!protocol.createdAt) protocol.createdAt = Date.now();
    return txPut('protocols', protocol);
  },

  /** Protokoll in Papierkorb verschieben */
  async trash(id) {
    const p = await this.get(id);
    if (!p) return;
    p.deletedAt = Date.now();
    return txPut('protocols', p);
  },

  /** Protokoll aus Papierkorb wiederherstellen */
  async restore(id) {
    const p = await this.get(id);
    if (!p) return;
    p.deletedAt = null;
    return txPut('protocols', p);
  },

  /** Protokoll endgültig löschen */
  delete(id) { return txDelete('protocols', id); },

  /**
   * Nächste freie Protokollnummer für einen Typ innerhalb eines Projekts.
   * @param {string} projectId
   * @param {string} type
   * @returns {Promise<number>}
   */
  async nextNumber(projectId, type) {
    const all = await this.getByProject(projectId);
    const nums = all
      .filter(p => p.type === type)
      .map(p => p.number || 0);
    return nums.length > 0 ? Math.max(...nums) + 1 : 1;
  },
};

/* ── Gliederungs-Vorlagen ──────────────────────────────────── */

/**
 * Standardgliederung für jeden Protokolltyp.
 * Kapitel A–E sind fest; Unterkapitel sind typenspezifisch.
 *
 * Struktur:
 * {
 *   A: { label: 'Organisation | Information', subchapters: [{id, label, topics:[]}] },
 *   B: { ... },
 *   ...
 * }
 */
function getDefaultStructure(type) {
  // Aktennotiz: eigene Kapitelstruktur P / A / N
  if (type === 'Aktennotiz') {
    return {
      P: { label: 'Präambel',         subchapters: [] },
      A: { label: 'Abschnitt 1',      subchapters: [] },
      N: { label: 'Nächste Schritte',  subchapters: [] },
    };
  }

  const chapters = {
    A: { label: 'Organisation | Information',                              subchapters: [] },
    B: { label: 'Qualitäten | Planung',                                    subchapters: [] },
    C: { label: 'Kosten',                                                  subchapters: [] },
    D: { label: 'Termine',                                                 subchapters: [] },
    E: { label: 'Vertragswesen | Rechtliche Themen | Versicherungen',      subchapters: [] },
  };

  if (type === 'JFx Planung') {
    chapters.B.subchapters = [
      { id: 'B.1', label: 'Objektplanung',                            topics: [] },
      { id: 'B.2', label: 'Fachplanung IT | ELT | Medientechnik',     topics: [] },
      { id: 'B.3', label: 'Fachplanung HKLS',                         topics: [] },
      { id: 'B.4', label: 'Genehmigung',                              topics: [] },
    ];
  } else if (type === 'JFx Mieter') {
    chapters.B.subchapters = [
      { id: 'B.1', label: 'Mieterausbau',      topics: [] },
      { id: 'B.2', label: 'Planungsunterlagen', topics: [] },
    ];
  } else if (type === 'JFx Bauherr') {
    chapters.B.subchapters = [
      { id: 'B.1', label: 'Planung',     topics: [] },
      { id: 'B.2', label: 'Ausführung',  topics: [] },
    ];
  } else if (type === 'Baubesprechung') {
    chapters.B.subchapters = [
      { id: 'B.1', label: 'Rohbau',              topics: [] },
      { id: 'B.2', label: 'Ausbau',              topics: [] },
      { id: 'B.3', label: 'Technische Anlagen',  topics: [] },
    ];
  }

  return chapters;
}

/* ── Protokollpunkt-Hilfsfunktionen ────────────────────────── */

/**
 * Generiert eine Protokollpunkt-ID.
 * Format: #[ProtokollNr]|[Kapitel].[Unterkapitel].[lfd. Punkt, 2-stellig]
 *
 * @param {number} protocolNumber   – z. B. 11
 * @param {string} chapter          – z. B. 'B'
 * @param {string|null} subchapter  – z. B. '1' (oder null bei Kapitel ohne Unterkapitel)
 * @param {number} seq              – laufende Nummer ab 1
 * @returns {string} z. B. '#11|B.1.02'
 */
function generatePointId(protocolNumber, chapter, subchapter, seq, akSectionNum) {
  const seqStr = String(seq).padStart(2, '0');
  // Aktennotiz: kein #Nr-Prefix, Abschnitt-Nummer statt Buchstabe
  if (akSectionNum !== undefined) {
    const prefix = chapter === 'P' ? 'P' : chapter === 'N' ? 'N' : String(akSectionNum);
    return `${prefix}.${seqStr}`;
  }
  const numStr = String(protocolNumber).padStart(2, '0');
  if (subchapter) {
    return `#${numStr}|${chapter}.${subchapter}.${seqStr}`;
  } else {
    return `#${numStr}|${chapter}.${seqStr}`;
  }
}

/**
 * Generiert eine Anlagen-ID.
 * Format: #[ProtokollNr].[lfd. Nr, 2-stellig]
 *
 * @param {number} protocolNumber
 * @param {number} seq
 * @returns {string} z. B. '#12.01'
 */
function generateAttachmentId(protocolNumber, seq) {
  const numStr = String(protocolNumber).padStart(2, '0');
  const seqStr = String(seq).padStart(2, '0');
  return `#${numStr}.${seqStr}`;
}

/** Löscht die gesamte Datenbank. */
function deleteDatabase() {
  return new Promise((resolve, reject) => {
    if (_db) { _db.close(); _db = null; }
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/* ── Exports ───────────────────────────────────────────────── */
window.DB = {
  openDB,
  deleteDatabase,
  uuid,
  Projects,
  Protocols,
  getDefaultStructure,
  generatePointId,
  generateAttachmentId,
};
