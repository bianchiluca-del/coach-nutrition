const ACTION_TYPES = new Set([
  'add_item',
  'modify_item',
  'remove_item',
  'mark_consumed',
  'mark_skipped',
  'replace_item',
  'replace_meal',
]);

const MACROS = ['cal', 'p', 'g', 'l'];

const round = value => Math.round((Number(value) || 0) * 10) / 10;

const nutrition = value => ({
  cal: round(value?.cal),
  p: round(value?.p),
  g: round(value?.g),
  l: round(value?.l),
});

const add = (left, right) => Object.fromEntries(
  MACROS.map(key => [key, round((left?.[key] || 0) + (right?.[key] || 0))]),
);

const subtract = (left, right) => Object.fromEntries(
  MACROS.map(key => [key, round((left?.[key] || 0) - (right?.[key] || 0))]),
);

const sumItems = items => (items || []).reduce((total, item) => add(total, nutrition(item)), nutrition());

export function isPlausibleFood(item) {
  if (!item || typeof item.name !== 'string' || !item.name.trim()) return false;
  const values = MACROS.map(key => Number(item[key]));
  if (values.some(value => !Number.isFinite(value) || value < 0)) return false;
  const [cal, p, g, l] = values;
  if (cal > 2500 || p > 500 || g > 500 || l > 300) return false;
  const macroCalories = (p * 4) + (g * 4) + (l * 9);
  if (macroCalories > cal * 1.8 + 80) return false;
  if (cal > macroCalories * 3 + 250) return false;
  return true;
}

const normalizedFood = item => ({
  name: item.name.trim().slice(0, 120),
  qty: String(item.qty || '').trim().slice(0, 60),
  ...nutrition(item),
});

export function calculateActionImpact(action, plan, status = {}) {
  const meal = (plan || []).find(candidate => candidate.id === action.meal_id);
  const item = meal?.items?.find(candidate => candidate.id === action.item_id);
  switch (action.type) {
    case 'add_item':
      return nutrition(action.item);
    case 'modify_item': {
      if (!item) return nutrition();
      const updated = {
        cal: action.new_cal ?? item.cal,
        p: action.new_p ?? item.p,
        g: action.new_g ?? item.g,
        l: action.new_l ?? item.l,
      };
      return subtract(nutrition(updated), nutrition(item));
    }
    case 'remove_item':
      return item ? subtract(nutrition(), nutrition(item)) : nutrition();
    case 'mark_consumed':
      return item && status[`${action.meal_id}-${action.item_id}`] !== 'done' ? nutrition(item) : nutrition();
    case 'mark_skipped':
      return item && status[`${action.meal_id}-${action.item_id}`] === 'done'
        ? subtract(nutrition(), nutrition(item))
        : nutrition();
    case 'replace_item':
      return item ? subtract(nutrition(action.item), nutrition(item)) : nutrition();
    case 'replace_meal': {
      if (!meal) return nutrition();
      const pending = meal.items.filter(candidate => !candidate.suppl && !status[`${meal.id}-${candidate.id}`]);
      return subtract(sumItems(action.replacement_items), sumItems(pending));
    }
    default:
      return nutrition();
  }
}

const existingItemRequired = new Set([
  'modify_item', 'remove_item', 'mark_consumed', 'mark_skipped', 'replace_item',
]);

function sanitizeAction(action, plan, status) {
  if (!action || !ACTION_TYPES.has(action.type) || typeof action.meal_id !== 'string') return null;
  const meal = plan.find(candidate => candidate.id === action.meal_id);
  if (!meal) return null;
  const item = meal.items?.find(candidate => candidate.id === action.item_id);
  if (existingItemRequired.has(action.type) && !item) return null;

  if ((action.type === 'add_item' || action.type === 'replace_item') && !isPlausibleFood(action.item)) return null;
  if (action.type === 'modify_item') {
    const updated = {
      name: item.name,
      qty: action.new_qty ?? item.qty,
      cal: action.new_cal ?? item.cal,
      p: action.new_p ?? item.p,
      g: action.new_g ?? item.g,
      l: action.new_l ?? item.l,
    };
    if (!isPlausibleFood(updated)) return null;
  }

  let replacementItems = null;
  if (action.type === 'replace_meal') {
    if (!Array.isArray(action.replacement_items) || action.replacement_items.length < 1 || action.replacement_items.length > 10) return null;
    if (!action.replacement_items.every(isPlausibleFood)) return null;
    replacementItems = action.replacement_items.map(normalizedFood);
  }

  const safe = {
    ...action,
    item: action.item && isPlausibleFood(action.item) ? normalizedFood(action.item) : null,
    replacement_items: replacementItems,
    new_qty: action.new_qty == null ? null : String(action.new_qty).slice(0, 60),
    new_cal: action.new_cal == null ? null : round(action.new_cal),
    new_p: action.new_p == null ? null : round(action.new_p),
    new_g: action.new_g == null ? null : round(action.new_g),
    new_l: action.new_l == null ? null : round(action.new_l),
    option_group: typeof action.option_group === 'string' && action.option_group.trim()
      ? action.option_group.trim().slice(0, 60)
      : null,
    confidence: ['low', 'medium', 'high'].includes(action.confidence) ? action.confidence : 'medium',
    reason: String(action.reason || '').slice(0, 500),
  };
  safe.impact = calculateActionImpact(safe, plan, status);

  // Un remplacement ou un choix parmi plusieurs options doit toujours être validé par l'utilisateur.
  safe.auto_apply = Boolean(action.auto_apply)
    && !safe.option_group
    && !['replace_item', 'replace_meal'].includes(action.type);
  return safe;
}

export function validateAiAnalysis(analysis, plan = [], status = {}) {
  const actions = (Array.isArray(analysis?.actions) ? analysis.actions : [])
    .slice(0, 8)
    .map(action => sanitizeAction(action, plan, status))
    .filter(Boolean);

  return {
    headline: String(analysis?.headline || 'Analyse personnalisée').slice(0, 140),
    summary: String(analysis?.summary || '').slice(0, 1200),
    observations: (Array.isArray(analysis?.observations) ? analysis.observations : [])
      .slice(0, 5)
      .filter(item => item && typeof item.title === 'string')
      .map(item => ({
        severity: ['alert', 'warning', 'positive', 'info'].includes(item.severity) ? item.severity : 'info',
        title: item.title.slice(0, 140),
        description: String(item.description || '').slice(0, 700),
      })),
    actions,
    clarifying_question: typeof analysis?.clarifying_question === 'string' && analysis.clarifying_question.trim()
      ? analysis.clarifying_question.trim().slice(0, 300)
      : null,
  };
}

