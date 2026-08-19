import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const productionEnv = readFileSync(new URL('../.env.production', import.meta.url), 'utf8');
const deployWorkflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
const expectedEndpoint = 'https://claude-proxy-luca.bianchi-luca.workers.dev/v1/messages';

test('le build de production contient toujours le proxy IA sécurisé', () => {
  assert.match(productionEnv, new RegExp(`VITE_API_ENDPOINT=${expectedEndpoint.replaceAll('.', '\\.')}`));
  assert.ok(!productionEnv.includes('sk-'), 'aucune clé API ne doit être exposée dans le frontend');
});

test('le déploiement GitHub utilise le même proxy IA', () => {
  assert.ok(deployWorkflow.includes(`VITE_API_ENDPOINT: ${expectedEndpoint}`));
});
