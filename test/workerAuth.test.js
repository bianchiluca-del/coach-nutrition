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
      model: 'gpt-5.6-luna',
      output: [{ content: [{ type: 'output_text', text: JSON.stringify({
        headline: 'Test',
        summary: 'Test réussi',
        observations: [],
        actions: [],
        clarifying_question: null,
      }) }] }],
      usage: { input_tokens: 10, output_tokens: 5, input_tokens_details: { cached_tokens: 2 } },
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
    assert.equal(calls[1].url, 'https://api.openai.com/v1/responses');
    const requestBody = JSON.parse(calls[1].options.body);
    assert.equal(requestBody.model, 'gpt-5.6-luna');
    assert.equal(requestBody.store, false);
    assert.equal(requestBody.reasoning.effort, 'low');
    assert.equal(requestBody.text.format.type, 'json_schema');
    assert.notEqual(requestBody.safety_identifier, 'user-id');
    assert.match(requestBody.safety_identifier, /^[a-f0-9]{64}$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('les remplacements de repas utilisent le modèle de raisonnement renforcé', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith('/auth/v1/user')) {
      return new Response(JSON.stringify({ id: 'replacement-user' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({
      model: 'gpt-5.6-terra',
      output_text: JSON.stringify({ headline: 'Options', summary: 'Trois choix.', observations: [], actions: [], clarifying_question: null }),
      usage: {},
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const response = await worker.fetch(new Request('https://proxy.test/v1/messages', {
      method: 'POST',
      headers: { Origin: ORIGIN, Authorization: 'Bearer valid-session-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt: 'Analyse.', userMessage: 'Remplace mon repas.', taskType: 'meal_replacement' }),
    }), { OPENAI_API_KEY: 'test-key' });

    assert.equal(response.status, 200);
    const requestBody = JSON.parse(calls[1].options.body);
    assert.equal(requestBody.model, 'gpt-5.6-terra');
    assert.equal(requestBody.reasoning.effort, 'medium');
    assert.equal(requestBody.max_output_tokens, 2200);
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
