import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveAuthRedirectUrl } from '../src/lib/authRedirect.js';

test('keeps the GitHub Pages repository path after authentication', () => {
  assert.equal(
    resolveAuthRedirectUrl({
      href: 'https://bianchiluca-del.github.io/coach-nutrition/?deploy=abc#login',
      baseUrl: './',
    }),
    'https://bianchiluca-del.github.io/coach-nutrition/',
  );
});

test('keeps the local development root after authentication', () => {
  assert.equal(
    resolveAuthRedirectUrl({
      href: 'http://localhost:5173/?mode=signup',
      baseUrl: './',
    }),
    'http://localhost:5173/',
  );
});
