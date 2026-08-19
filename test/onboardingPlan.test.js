import test from 'node:test';
import assert from 'node:assert/strict';
import { generateNutritionProfile } from '../src/lib/onboardingPlan.js';
import { localDateKey } from '../src/lib/date.js';

const answers = overrides => ({
  firstName: 'Test', birthDate: '1990-01-01', sex: 'male', height: 178, weight: 76,
  goal: 'maintenance', activity: 'active', breakfastHabit: '3 œufs, miel, banane',
  foodHabits: 'poulet, riz, saumon', allergies: '', exclusions: '', medical: '',
  digestion: '', healthDataConsent: true, ...overrides,
});

const allNames = profile => Object.values(profile.plan_modes_json)
  .flatMap(mode => mode.plan).flatMap(meal => meal.items).map(item => item.name.toLowerCase());

test('la date quotidienne utilise le calendrier local', () => {
  assert.equal(localDateKey(new Date(2026, 7, 18, 0, 5)), '2026-08-18');
});

test('les allergènes et exclusions connus ne sont jamais ajoutés', () => {
  const profile = generateNutritionProfile(answers({
    allergies: 'Œufs et lactose',
    exclusions: 'Poisson et saumon',
  }), '00000000-0000-0000-0000-000000000001');
  const names = allNames(profile).join(' | ');
  assert.doesNotMatch(names, /œuf|oeuf|skyr|whey|cottage|saumon/);
});

test('une situation médicale à risque bloque la génération automatique', () => {
  assert.throws(
    () => generateNutritionProfile(answers({ medical: 'Diabète traité par insuline' }), '00000000-0000-0000-0000-000000000002'),
    /professionnel de santé/,
  );
});

test('le consentement santé est obligatoire', () => {
  assert.throws(
    () => generateNutritionProfile(answers({ healthDataConsent: false }), '00000000-0000-0000-0000-000000000003'),
    /consentement/,
  );
});

test('les identifiants repas et aliments restent stables entre les modes', () => {
  const profile = generateNutritionProfile(answers({}), '00000000-0000-0000-0000-000000000004');
  const modes = Object.values(profile.plan_modes_json);
  const signature = mode => mode.plan.map(meal => ({ id: meal.id, items: meal.items.map(item => item.id) }));
  assert.deepEqual(signature(modes[1]), signature(modes[0]));
  assert.deepEqual(signature(modes[2]), signature(modes[0]));
});

test('le calibrage ne crée pas de portions alimentaires aberrantes', () => {
  const profile = generateNutritionProfile(answers({ weight: 95, activity: 'veryActive', goal: 'gain' }), '00000000-0000-0000-0000-000000000005');
  for (const mode of Object.values(profile.plan_modes_json)) {
    for (const item of mode.plan.flatMap(meal => meal.items)) {
      const amount = Number.parseFloat(item.qty);
      if (Number.isFinite(amount) && item.qty.includes('g')) assert.ok(amount <= 550, `${item.name}: ${item.qty}`);
    }
  }
});
