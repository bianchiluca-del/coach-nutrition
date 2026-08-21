import test from 'node:test';
import assert from 'node:assert/strict';
import { generateNutritionProfile, upgradeNutritionProfileExperience } from '../src/lib/onboardingPlan.js';
import { localDateKey } from '../src/lib/date.js';

const answers = overrides => ({
  firstName: 'Test', birthDate: '1990-01-01', sex: 'male', height: 178, weight: 76,
  goal: 'maintenance', activity: 'active', breakfastHabit: '3 œufs, miel, banane',
  foodHabits: 'poulet, riz, saumon', allergies: '', exclusions: '', medical: '',
  digestion: '', processAcknowledged: true, healthDataConsent: true,
  mealCount: '4', trainingDays: '3', steps: '7500', jobActivity: 'mixed', ...overrides,
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

test('une situation médicale déclarée ne bloque jamais la création du plan', () => {
  const profile = generateNutritionProfile(
    answers({ medical: 'Diabète traité par insuline' }),
    '00000000-0000-0000-0000-000000000002',
  );
  assert.equal(profile.onboarding_status, 'completed');
  assert.match(profile.calibration_json.healthAdvisory, /ne remplacent pas un médecin/);
});

test('le consentement santé est obligatoire', () => {
  assert.throws(
    () => generateNutritionProfile(answers({ healthDataConsent: false }), '00000000-0000-0000-0000-000000000003'),
    /consentement/,
  );
});

test('la validation du processus est obligatoire', () => {
  assert.throws(
    () => generateNutritionProfile(answers({ processAcknowledged: false }), '00000000-0000-0000-0000-000000000030'),
    /processus de personnalisation/,
  );
});

test('le nombre de repas demandé est respecté dans tous les modes', () => {
  for (const count of [3, 4, 5]) {
    const profile = generateNutritionProfile(answers({ mealCount: String(count) }), `00000000-0000-0000-0000-00000000004${count}`);
    for (const mode of Object.values(profile.plan_modes_json)) assert.equal(mode.plan.length, count);
  }
});

test('les pas, le métier et les entraînements personnalisent réellement la cible', () => {
  const sedentary = generateNutritionProfile(answers({ activity: 'sedentary', jobActivity: 'desk', steps: '2000', trainingDays: '0' }), '00000000-0000-0000-0000-000000000050');
  const active = generateNutritionProfile(answers({ activity: 'veryActive', jobActivity: 'physical', steps: '15000', trainingDays: '6' }), '00000000-0000-0000-0000-000000000051');
  assert.ok(active.calibration_json.target.cal >= sedentary.calibration_json.target.cal + 500);
  assert.notEqual(active.calibration_json.target.activityFactor, sedentary.calibration_json.target.activityFactor);
});

test('les situations digestives et cardiaques créent un avertissement non bloquant', () => {
  for (const medical of ['Maladie de Crohn', 'insuffisance cardiaque', 'chirurgie bypass', 'asthme sous traitement']) {
    const profile = generateNutritionProfile(answers({ medical }), '00000000-0000-0000-0000-000000000060');
    assert.equal(profile.onboarding_status, 'completed');
    assert.match(profile.calibration_json.healthAdvisory, /professionnel de santé/);
  }
});

test('les identifiants repas et aliments restent stables entre les modes', () => {
  const profile = generateNutritionProfile(answers({}), '00000000-0000-0000-0000-000000000004');
  const modes = Object.values(profile.plan_modes_json);
  const signature = mode => mode.plan.map(meal => ({ id: meal.id, items: meal.items.map(item => item.id) }));
  assert.deepEqual(signature(modes[1]), signature(modes[0]));
  assert.deepEqual(signature(modes[2]), signature(modes[0]));
});

test('un prospect reçoit les mêmes trois modes visibles que le compte Luca', () => {
  const profile = generateNutritionProfile(answers({}), '00000000-0000-0000-0000-000000000070');
  assert.deepEqual(Object.values(profile.plan_modes_json).map(mode => ({ id: mode.id, label: mode.label, emoji: mode.emoji })), [
    { id: 'standard', label: 'Standard', emoji: '💼' },
    { id: 'hard', label: 'Hard', emoji: '🔥' },
    { id: 'deficit', label: 'Déficit', emoji: '📉' },
  ]);
});

test('tous les aliments générés proposent un remplacement, pas seulement les protéines', () => {
  const profile = generateNutritionProfile(answers({}), '00000000-0000-0000-0000-000000000071');
  for (const mode of Object.values(profile.plan_modes_json)) {
    for (const item of mode.plan.flatMap(meal => meal.items)) {
      assert.ok(item.swappable, `${mode.label} · ${item.name} doit pouvoir être remplacé`);
    }
  }
});

test('les profils bêta existants sont mis à niveau sans modifier leurs quantités', () => {
  const legacy = generateNutritionProfile(answers({}), '00000000-0000-0000-0000-000000000072');
  legacy.calibration_json = { ...legacy.calibration_json, version: 2, experienceVersion: 0 };
  legacy.plan_modes_json = {
    standard: legacy.plan_modes_json.standard,
    training: { ...legacy.plan_modes_json.hard, id: 'training', label: 'Training' },
    rest: { ...legacy.plan_modes_json.deficit, id: 'rest', label: 'Repos' },
  };
  const quantityBefore = legacy.plan_modes_json.training.plan[0].items[0].qty;
  delete legacy.plan_modes_json.training.plan[0].items[0].swappable;
  const upgraded = upgradeNutritionProfileExperience(legacy);
  assert.equal(upgraded.calibration_json.experienceVersion, 1);
  assert.equal(upgraded.plan_modes_json.training.label, 'Hard');
  assert.equal(upgraded.plan_modes_json.rest.label, 'Déficit');
  assert.equal(upgraded.plan_modes_json.training.plan[0].items[0].qty, quantityBefore);
  assert.ok(upgraded.plan_modes_json.training.plan[0].items[0].swappable);
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
