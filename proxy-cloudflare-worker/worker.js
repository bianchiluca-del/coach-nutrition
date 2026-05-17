// Cloudflare Worker — Proxy minimal pour l'API Anthropic.
//
// DÉPLOIEMENT :
//   1. Va sur https://dash.cloudflare.com/ → Workers & Pages → Create Worker
//   2. Colle ce code dans l'éditeur
//   3. Ajoute un secret "ANTHROPIC_API_KEY" (Settings → Variables → Secret)
//      Récupère la clé sur https://console.anthropic.com/settings/keys
//   4. Déploie. Tu obtiens une URL du type https://ton-worker.workers.dev
//   5. Dans le .env du frontend, mets :
//      VITE_API_ENDPOINT=https://ton-worker.workers.dev/v1/messages
//
// SÉCURITÉ : optionnel mais recommandé, restreins l'origine CORS
// au domaine où ton app est hébergée (variable ALLOWED_ORIGIN ci-dessous).

const ALLOWED_ORIGIN = '*'; // ⚠️ remplace par 'https://ton-app.github.io' en prod

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    if (!env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY secret' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = await request.text();

      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body,
      });

      const responseBody = await anthropicResponse.text();

      return new Response(responseBody, {
        status: anthropicResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        },
      });
    }
  },
};
