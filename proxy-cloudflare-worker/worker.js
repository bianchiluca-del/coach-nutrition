// Cloudflare Worker — proxy sécurisé Coach Nutrition → OpenAI.
// Secret requis : OPENAI_API_KEY.
// Variables optionnelles : ALLOWED_ORIGINS (liste séparée par des virgules),
// OPENAI_DAILY_MODEL, OPENAI_COMPLEX_MODEL et OPENAI_FALLBACK_MODEL.

const DEFAULT_ORIGINS = [
  'https://bianchiluca-del.github.io',
  'http://localhost:5173',
];

const DEFAULT_DAILY_MODEL = 'gpt-5.6-luna';
const DEFAULT_COMPLEX_MODEL = 'gpt-5.6-terra';
const DEFAULT_FALLBACK_MODEL = 'gpt-4.1-mini';

// Ces valeurs sont publiques par conception (elles sont également embarquées
// dans le client web). Les garder ici évite qu'une ancienne variable Worker
// casse l'authentification après une rotation de clé Supabase.
const SUPABASE_URL = 'https://hkwmsndqojpeyqmtkblt.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_XTU1ky96KO7Els1xD_DPXg_3wBpA9Ol';

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
          type: { type: 'string', enum: ['add_item', 'modify_item', 'remove_item', 'mark_consumed', 'mark_skipped', 'replace_item', 'replace_meal'] },
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
          replacement_items: {
            anyOf: [
              { type: 'null' },
              {
                type: 'array',
                minItems: 1,
                maxItems: 10,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    name: { type: 'string' }, qty: { type: 'string' },
                    cal: { type: 'number' }, p: { type: 'number' },
                    g: { type: 'number' }, l: { type: 'number' },
                  },
                  required: ['name', 'qty', 'cal', 'p', 'g', 'l'],
                },
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
          option_group: { type: ['string', 'null'] },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
          reason: { type: 'string' },
        },
        required: ['type', 'meal_id', 'item_id', 'item', 'replacement_items', 'new_qty', 'new_cal', 'new_p', 'new_g', 'new_l', 'impact', 'auto_apply', 'option_group', 'confidence', 'reason'],
      },
    },
    clarifying_question: { type: ['string', 'null'] },
  },
  required: ['headline', 'summary', 'observations', 'actions', 'clarifying_question'],
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

async function authenticatedUser(request) {
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return null;
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: authorization,
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
    });
    if (!response.ok) return null;
    const user = await response.json();
    return typeof user?.id === 'string' ? user : null;
  } catch {
    return null;
  }
}

async function privacySafeUserId(userId) {
  const bytes = new TextEncoder().encode(`coach-nutrition:${userId}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

function responseText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  for (const output of payload?.output || []) {
    for (const content of output?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  return null;
}

function parseAnalysisContent(content) {
  if (typeof content !== 'string' || !content.trim()) throw new Error('empty_analysis');
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  const analysis = JSON.parse(cleaned);
  if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) {
    throw new Error('invalid_analysis_shape');
  }
  return analysis;
}

function responseUsage(payload) {
  return {
    input_tokens: payload?.usage?.input_tokens || 0,
    output_tokens: payload?.usage?.output_tokens || 0,
    cached_input_tokens: payload?.usage?.input_tokens_details?.cached_tokens || 0,
  };
}

function mergeUsage(first, second) {
  return {
    input_tokens: first.input_tokens + second.input_tokens,
    output_tokens: first.output_tokens + second.output_tokens,
    cached_input_tokens: first.cached_input_tokens + second.cached_input_tokens,
  };
}

async function callOpenAI(env, { model, systemPrompt, userMessage, taskType, safetyIdentifier, recovery = false }) {
  const complex = taskType === 'meal_replacement' || taskType === 'strategic_adjustment';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model,
      instructions: systemPrompt,
      input: userMessage,
      max_output_tokens: recovery ? (complex ? 3600 : 2800) : (complex ? 2200 : 1600),
      reasoning: { effort: complex ? 'medium' : 'low' },
      text: {
        verbosity: 'low',
        format: { type: 'json_schema', name: 'nutrition_analysis', strict: true, schema: ANALYSIS_SCHEMA },
      },
      store: false,
      safety_identifier: safetyIdentifier,
    }),
  });
  return { response, payload: await response.json() };
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
    if (!env.OPENAI_API_KEY) {
      return json({ error: 'Server configuration missing' }, 500, origin);
    }
    const user = await authenticatedUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401, origin);

    try {
      const raw = await request.text();
      if (raw.length > 65000) return json({ error: 'Request too large' }, 413, origin);
      const { systemPrompt, userMessage, taskType = 'daily_analysis' } = JSON.parse(raw);
      if (typeof systemPrompt !== 'string' || typeof userMessage !== 'string' || systemPrompt.length > 50000 || userMessage.length > 2000) {
        return json({ error: 'Invalid request' }, 400, origin);
      }
      if (!['daily_analysis', 'meal_replacement', 'strategic_adjustment'].includes(taskType)) {
        return json({ error: 'Invalid task type' }, 400, origin);
      }

      const complex = taskType === 'meal_replacement' || taskType === 'strategic_adjustment';
      const preferredModel = complex
        ? (env.OPENAI_COMPLEX_MODEL?.trim() || DEFAULT_COMPLEX_MODEL)
        : (env.OPENAI_DAILY_MODEL?.trim() || DEFAULT_DAILY_MODEL);
      const safetyIdentifier = await privacySafeUserId(user.id);
      let { response: openAIResponse, payload } = await callOpenAI(env, {
        model: preferredModel, systemPrompt, userMessage, taskType, safetyIdentifier,
      });
      let model = preferredModel;

      const unavailable = openAIResponse.status === 404
        || payload?.error?.code === 'model_not_found'
        || payload?.error?.code === 'unsupported_model';
      if (!openAIResponse.ok && unavailable) {
        model = env.OPENAI_FALLBACK_MODEL?.trim() || DEFAULT_FALLBACK_MODEL;
        ({ response: openAIResponse, payload } = await callOpenAI(env, {
          model, systemPrompt, userMessage, taskType, safetyIdentifier,
        }));
      }

      if (!openAIResponse.ok) {
        return json({ error: payload?.error?.message || 'OpenAI request failed' }, openAIResponse.status, origin);
      }

      let usage = responseUsage(payload);
      let analysis;
      let recovered = false;
      try {
        analysis = parseAnalysisContent(responseText(payload));
      } catch {
        // Une réponse structurée peut exceptionnellement être tronquée ou mal
        // sérialisée. On la régénère une seule fois côté serveur, avec plus de
        // marge de sortie, au lieu d'exposer une erreur JSON au client.
        recovered = true;
        const recoveryModel = env.OPENAI_FALLBACK_MODEL?.trim() || DEFAULT_FALLBACK_MODEL;
        const recoveryPrompt = `${systemPrompt}\n\nRÉCUPÉRATION TECHNIQUE : la tentative précédente n'était pas exploitable. Génère à nouveau la réponse complète et respecte strictement le schéma JSON, sans texte autour.`;
        const recoveryResult = await callOpenAI(env, {
          model: recoveryModel,
          systemPrompt: recoveryPrompt,
          userMessage,
          taskType,
          safetyIdentifier,
          recovery: true,
        });
        usage = mergeUsage(usage, responseUsage(recoveryResult.payload));

        if (!recoveryResult.response.ok) {
          const status = recoveryResult.response.status === 429 ? 429 : 502;
          return json({
            error: status === 429 ? 'AI rate limit reached' : 'AI response recovery failed',
            code: status === 429 ? 'ai_rate_limited' : 'ai_recovery_failed',
            retryable: true,
          }, status, origin);
        }

        try {
          analysis = parseAnalysisContent(responseText(recoveryResult.payload));
          payload = recoveryResult.payload;
          model = recoveryModel;
        } catch {
          return json({ error: 'AI response recovery failed', code: 'invalid_ai_json', retryable: true }, 502, origin);
        }
      }

      return json({
        analysis,
        model: payload.model || model,
        usage,
        recovered,
      }, 200, origin);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Unexpected server error' }, 500, origin);
    }
  },
};
