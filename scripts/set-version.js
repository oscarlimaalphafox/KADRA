#!/usr/bin/env node
/**
 * scripts/set-version.js
 * package.json ist die einzige Versionsquelle (x.y.z). Beim Build wird sie
 * geschrieben in:
 *   - js/app.js  -> const APP_VERSION = 'x.y.z'   (Info-Modal zeigt "Vx.y.z")
 *   - sw.js      -> const CACHE_NAME = 'protokoll-app-vx.y.z'
 * Damit entfaellt das manuelle Hochzaehlen der Service-Worker-Cache-Version:
 * fuer ein Release nur package.json bumpen + npm run build.
 */

const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const version = pkg.version;

function patchFile(relPath, pattern, replacement, label) {
  const filePath = path.join(__dirname, '..', relPath);
  const src = fs.readFileSync(filePath, 'utf8');
  if (!pattern.test(src)) {
    console.error(`set-version: FEHLER — Muster fuer ${label} in ${relPath} nicht gefunden`);
    process.exitCode = 1;
    return;
  }
  const updated = src.replace(pattern, replacement);
  if (src === updated) {
    console.log(`set-version: ${label} already '${version}' — no change`);
  } else {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`set-version: ${label} set to '${version}'`);
  }
}

patchFile(
  'js/app.js',
  /^const APP_VERSION\s*=\s*'[^']*';/m,
  `const APP_VERSION = '${version}';`,
  'APP_VERSION'
);

patchFile(
  'sw.js',
  /^const CACHE_NAME\s*=\s*'protokoll-app-v[^']*';/m,
  `const CACHE_NAME    = 'protokoll-app-v${version}';`,
  'CACHE_NAME'
);
