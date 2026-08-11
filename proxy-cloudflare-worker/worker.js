// Cloudflare Worker — proxy sécurisé Coach Nutrition → OpenAI.
// Secrets requis : OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY.
// Variables optionnelles : ALLOWED_ORIGINS (liste séparée par des virgules),
// OPENAI_MODEL (gpt-4o-mini par défaut).

const DEFAULT_ORIGINS = [
  'https://bianchiluca-del.github.io',
  'http://localhost:5173',
];

// Modèle économique accessible sans vérification d'organisation.
// OPENAI_MODEL permet de réactiver gpt-5-mini plus tard sans modifier le code.
const DEFAULT_MODEL = 'gpt-4o-mini';

const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    headline: { type: 'string' },
    summary: { type: 'string' },
    observations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          severity: { type: 'string', enum: ['alert', 'warning', 'positive', 'info'] },
          title: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['severity', 'title', 'description'],
      },
    },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string', enum: ['add_item', 'modify_item', 'remove_item', 'mark_consumed', 'mark_skipped'] },
          meal_id: { type: 'string' },
          item_id: { type: ['string', 'null'] },
          item: {
            anyOf: [
              { type: 'null' },
              {
                type: 'object',
                additionalProperties: false,
                properties: {
                  name: { type: 'string' }, qty: { type: 'string' },
                  cal: { type: 'number' }, p: { type: 'number' },
                  g: { type: 'number' }, l: { type: 'number' },
                },
                required: ['name', 'qty', 'cal', 'p', 'g', 'l'],
              },
            ],
          },
          new_qty: { type: ['string', 'null'] },
          new_cal: { type: ['number', 'null'] },
          new_p: { type: ['number', 'null'] },
          new_g: { type: ['number', 'null'] },
          new_l: { type: ['number', 'null'] },
          impact: {
            anyOf: [
              { type: 'null' },
              {
                type: 'object', additionalProperties: false,
                properties: { cal: { type: 'number' }, p: { type: 'number' }, g: { type: 'number' }, l: { type: 'number' } },
                required: ['cal', 'p', 'g', 'l'],
              },
            ],
          },
          auto_apply: { type: 'boolean' },
          reason: { type: 'string' },
        },
        required: ['type', 'meal_id', 'item_id', 'item', 'new_qty', 'new_cal', 'new_p', 'new_g', 'new_l', 'impact', 'auto_apply', 'reason'],
      },
    },
  },
  required: ['headline', 'summary', 'observations', 'actions'],
};

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  const configured = (env.ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
  return [...DEFAULT_ORIGINS, ...configured].includes(origin) ? origin : null;
}

function json(body, status, origin) {
  const headers = { 'Content-Type': 'application/json', 'Vary': 'Origin' };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify(body), { status, headers });
}

async function isAuthenticated(request, env) {
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return false;
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: env.SUPABASE_ANON_KEY },
  });
  return response.ok;
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    if (!origin) return json({ error: 'Origin not allowed' }, 403, null);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin',
        },
      });
    }
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);
    if (!env.OPENAI_API_KEY || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      return json({ error: 'Server configuration missing' }, 500, origin);
    }
    if (!(await isAuthenticated(request, env))) return json({ error: 'Unauthorized' }, 401, origin);

    try {
      const raw = await request.text();
      if (raw.length > 65000) return json({ error: 'Request too large' }, 413, origin);
      const { systemPrompt, userMessage } = JSON.parse(raw);
      if (typeof systemPrompt !== 'string' || typeof userMessage !== 'string' || systemPrompt.length > 50000 || userMessage.length > 2000) {
        return json({ error: 'Invalid request' }, 400, origin);
      }

      const model = env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model,
          max_completion_tokens: 1400,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'nutrition_analysis', strict: true, schema: ANALYSIS_SCHEMA },
          },
        }),
      });

      const payload = await openAIResponse.json();
      if (!openAIResponse.ok) {
        return json({ error: payload?.error?.message || 'OpenAI request failed' }, openAIResponse.status, origin);
      }

      const content = payload.choices?.[0]?.message?.content;
      if (!content) return json({ error: 'Empty OpenAI response' }, 502, origin);

      return json({
        analysis: JSON.parse(content),
        model: payload.model || model,
        usage: {
          input_tokens: payload.usage?.prompt_tokens || 0,
          output_tokens: payload.usage?.completion_tokens || 0,
          cached_input_tokens: payload.usage?.prompt_tokens_details?.cached_tokens || 0,
        },
      }, 200, origin);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Unexpected server error' }, 500, origin);
    }
  },
};
