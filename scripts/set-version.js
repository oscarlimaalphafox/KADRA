#!/usr/bin/env node
/**
 * scripts/set-version.js
 * Liest version aus package.json und schreibt sie in js/app.js
 * (ersetzt die Zeile: const APP_VERSION = '...')
 */

const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const version = pkg.version;

const appJsPath = path.join(__dirname, '../js/app.js');
const src = fs.readFileSync(appJsPath, 'utf8');
const updated = src.replace(/^const APP_VERSION\s*=\s*'[^']*';/m, `const APP_VERSION = '${version}';`);

if (src === updated) {
  console.log(`set-version: APP_VERSION already '${version}' — no change`);
} else {
  fs.writeFileSync(appJsPath, updated, 'utf8');
  console.log(`set-version: APP_VERSION set to '${version}'`);
}
