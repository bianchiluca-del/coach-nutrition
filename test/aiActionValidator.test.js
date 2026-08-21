import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateActionImpact, validateAiAnalysis } from '../src/lib/aiActionValidator.js';

const plan = [{
  id: 'lunch',
  name: 'Déjeuner',
  items: [
    { id: 'chicken', name: 'Poulet', qty: '150 g', cal: 180, p: 35, g: 0, l: 4 },
    { id: 'rice', name: 'Riz', qty: '180 g', cal: 230, p: 5, g: 49, l: 1 },
    { id: 'veg', name: 'Légumes', qty: '200 g', cal: 70, p: 4, g: 10, l: 1 },
  ],
}];

const baseAnalysis = actions => ({
  headline: 'Solutions', summary: 'Voici des options.', observations: [], actions, clarifying_question: null,
});

const emptyFields = {
  replacement_items: null,
  new_qty: null,
  new_cal: null,
  new_p: null,
  new_g: null,
  new_l: null,
  impact: { cal: 9999, p: 9999, g: 9999, l: 9999 },
  auto_apply: true,
  option_group: 'protein-choice',
  confidence: 'high',
  reason: 'Même rôle nutritionnel.',
};

test('un remplacement alimentaire est validé et son impact est recalculé localement', () => {
  const action = {
    ...emptyFields,
    type: 'replace_item', meal_id: 'lunch', item_id: 'chicken',
    item: { name: 'Tofu ferme', qty: '220 g', cal: 260, p: 30, g: 6, l: 12 },
  };
  const result = validateAiAnalysis(baseAnalysis([action]), plan, {});
  assert.equal(result.actions.length, 1);
  assert.deepEqual(result.actions[0].impact, { cal: 80, p: -5, g: 6, l: 8 });
  assert.equal(result.actions[0].auto_apply, false);
});

test('un repas complet ne remplace que les éléments encore en attente', () => {
  const action = {
    ...emptyFields,
    type: 'replace_meal', meal_id: 'lunch', item_id: null, item: null,
    replacement_items: [
      { name: 'Skyr', qty: '250 g', cal: 160, p: 27, g: 10, l: 0 },
      { name: 'Banane', qty: '120 g', cal: 105, p: 1, g: 27, l: 0 },
    ],
  };
  const status = { 'lunch-chicken': 'done' };
  const result = validateAiAnalysis(baseAnalysis([action]), plan, status);
  assert.deepEqual(result.actions[0].impact, { cal: -35, p: 19, g: -22, l: -2 });
});

test('les macros aberrantes et les références inexistantes sont rejetées', () => {
  const impossibleFood = {
    ...emptyFields,
    type: 'replace_item', meal_id: 'lunch', item_id: 'chicken',
    item: { name: 'Aliment impossible', qty: '100 g', cal: 10, p: 100, g: 100, l: 100 },
  };
  const missingItem = {
    ...emptyFields,
    type: 'remove_item', meal_id: 'lunch', item_id: 'missing', item: null,
  };
  const result = validateAiAnalysis(baseAnalysis([impossibleFood, missingItem]), plan, {});
  assert.deepEqual(result.actions, []);
});

test('le calcul ne fait pas confiance à l’impact fourni par le modèle', () => {
  const impact = calculateActionImpact({
    type: 'modify_item', meal_id: 'lunch', item_id: 'rice',
    new_cal: 180, new_p: 4, new_g: 38, new_l: 1,
  }, plan, {});
  assert.deepEqual(impact, { cal: -50, p: -1, g: -11, l: 0 });
});
