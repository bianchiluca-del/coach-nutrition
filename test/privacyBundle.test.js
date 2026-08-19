import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const htmlSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('aucun profil personnel historique n’est intégré au frontend', () => {
  const forbidden = [/PLAN_LUCA/i, /PLAN_EMILIE/i, /70 kg/i, /infirmière/i, /garde de nuit/i];
  for (const pattern of forbidden) {
    assert.doesNotMatch(appSource, pattern);
    assert.doesNotMatch(htmlSource, pattern);
  }
});

test('aucun ancien bundle compilé n’est versionné dans la branche source', () => {
  const assetsUrl = new URL('../assets', import.meta.url);
  const files = existsSync(assetsUrl) ? readdirSync(assetsUrl) : [];
  assert.deepEqual(files.filter(file => /\.(?:js|css)$/i.test(file)), []);
});
