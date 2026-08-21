import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { sanitizeBreadcrumb, sanitizeSentryEvent, sanitizeText, sanitizeUrl } from '../src/lib/monitoring.js';

const workflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
const monitoringSource = readFileSync(new URL('../src/lib/monitoring.js', import.meta.url), 'utf8');
const viteSource = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');

test('les URL envoyées au monitoring perdent requêtes et fragments', () => {
  assert.equal(sanitizeUrl('https://example.com/page?email=luca@example.com#secret'), 'https://example.com/page');
});

test('les emails, identifiants et jetons sont masqués', () => {
  const source = 'luca@example.com 123e4567-e89b-12d3-a456-426614174000 abcdefghijklmnopqrstuvwxyz123456';
  const sanitized = sanitizeText(source);
  assert.doesNotMatch(sanitized, /luca@example\.com|123e4567|abcdefghijklmnopqrstuvwxyz/);
});

test('un breadcrumb réseau ne conserve que les champs techniques autorisés', () => {
  const breadcrumb = sanitizeBreadcrumb({
    category: 'fetch',
    message: 'repas skyr',
    data: {
      url: 'https://api.test/x?user=luca', method: 'POST', status_code: 500,
      request_body: { weight: 82 }, response: 'diagnostic médical',
    },
  });
  assert.deepEqual(breadcrumb.data, { url: 'https://api.test/x', method: 'POST', status_code: 500 });
  assert.equal('message' in breadcrumb, false);
});

test('un événement Sentry est reconstruit sans donnée personnelle ou nutritionnelle', () => {
  const event = sanitizeSentryEvent({
    message: 'Erreur pour luca@example.com avec poids 82 kg',
    user: { id: 'client-1', email: 'luca@example.com' },
    extra: { calories: 2200, medical: 'asthme' },
    contexts: { nutrition: { proteins: 150 } },
    request: { url: 'https://app.test/?meal=skyr', headers: { authorization: 'secret' }, data: { weight: 82 } },
    tags: { app_area: 'sync', operation: 'save', client: 'Luca' },
    breadcrumbs: [{ category: 'console', message: 'repas: skyr' }, { category: 'fetch', data: { url: 'https://api.test/x?user=1' } }],
    exception: { values: [{ type: 'Error', value: 'profil médical Luca', stacktrace: { frames: [{ filename: 'https://app.test/a.js?client=luca', lineno: 12 }] } }] },
  });
  const serialized = JSON.stringify(event);
  assert.doesNotMatch(serialized, /luca@example|calories|medical|proteins|skyr|weight|authorization|client-1|profil médical/i);
  assert.equal(event.request.url, 'https://app.test/');
  assert.deepEqual(event.tags, { app_area: 'sync', operation: 'save' });
  assert.equal(event.breadcrumbs.length, 1);
});

test('les secrets Sentry restent dans GitHub Actions et le DSN n’est pas codé en dur', () => {
  for (const name of ['VITE_SENTRY_DSN', 'SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT']) {
    assert.match(workflow, new RegExp(`secrets\\.${name}`));
  }
  assert.doesNotMatch(monitoringSource, /https:\/\/[a-f0-9]+@[^\s]+\.ingest\./i);
});

test('le monitoring désactive PII et traces, et garde les source maps privées', () => {
  assert.match(monitoringSource, /sendDefaultPii:\s*false/);
  assert.match(monitoringSource, /tracesSampleRate:\s*0/);
  assert.match(viteSource, /filesToDeleteAfterUpload/);
  assert.match(viteSource, /sentryUploadEnabled \? 'hidden' : false/);
});
