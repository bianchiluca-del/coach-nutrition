import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../proxy-cloudflare-worker/worker.js';

const ORIGIN = 'https://bianchiluca-del.github.io';

test('le proxy valide la session avec le projet Supabase de production', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });

    if (String(url).endsWith('/auth/v1/user')) {
      return new Response(JSON.stringify({ id: 'user-id' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      model: 'gpt-4o-mini',
      choices: [{
        message: {
          content: JSON.stringify({
            headline: 'Test',
            summary: 'Test réussi',
            observations: [],
            actions: [],
          }),
        },
      }],
      usage: {},
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const response = await worker.fetch(new Request('https://proxy.test/v1/messages', {
      method: 'POST',
      headers: {
        Origin: ORIGIN,
        Authorization: 'Bearer valid-session-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ systemPrompt: 'Analyse.', userMessage: 'Test.' }),
    }), { OPENAI_API_KEY: 'test-key' });

    assert.equal(response.status, 200);
    assert.equal(calls[0].url, 'https://hkwmsndqojpeyqmtkblt.supabase.co/auth/v1/user');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer valid-session-token');
    assert.match(calls[0].options.headers.apikey, /^sb_publishable_/);
    assert.equal(calls[1].url, 'https://api.openai.com/v1/chat/completions');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('le proxy refuse une requête sans session avant tout appel externe', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error('ne doit pas être appelé');
  };

  try {
    const response = await worker.fetch(new Request('https://proxy.test/v1/messages', {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt: 'Analyse.', userMessage: 'Test.' }),
    }), { OPENAI_API_KEY: 'test-key' });

    assert.equal(response.status, 401);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
