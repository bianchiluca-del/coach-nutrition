import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activateDeficitProtocol,
  generateNutritionProfile,
  getDeficitProtocolState,
  needsDeficitProtocolNotice,
  needsPersonalizationUpgrade,
  normalizeTimedProtocols,
  previewPersonalizationUpgrade,
  upgradeNutritionProfileExperience,
} from '../src/lib/onboardingPlan.js';
import { localDateKey } from '../src/lib/date.js';

const answers = overrides => ({
  firstName: 'Test', birthDate: '1990-01-01', sex: 'male', height: 178, weight: 76,
  goal: 'maintenance', activity: 'active', breakfastHabit: '3 œufs, miel, banane',
  foodHabits: 'dinde, riz, saumon', allergies: '', exclusions: '', dislikedFoods: '', medical: '',
  digestion: '', processAcknowledged: true, healthDataConsent: true,
  mealCount: '4', trainingDays: '3', steps: '7500', jobActivity: 'mixed',
  trainingIntensity: 'moderate', trainingTime: 'evening', trainingDayPlan: 'yes',
  dietaryStyle: 'omnivore', breakfastType: 'mixed',
  preferredProteins: ['turkey', 'salmon'], preferredCarbs: ['rice', 'potato'], preferredSnacks: ['dairy'],
  cookingTime: 'moderate', budgetLevel: 'standard', batchCooking: 'sometimes', workMealAccess: 'microwave',
  ...overrides,
});

const allNames = profile => Object.values(profile.plan_modes_json)
  .flatMap(mode => mode.plan).flatMap(meal => meal.items).map(item => item.name.toLowerCase());

test('la date quotidienne utilise le calendrier local', () => {
  assert.equal(localDateKey(new Date(2026, 7, 18, 0, 5)), '2026-08-18');
});

test('les allergènes et exclusions connus ne sont jamais ajoutés', () => {
  const profile = generateNutritionProfile(answers({ allergies: 'Œufs et lactose', exclusions: 'Poisson et saumon' }), 'user-allergy');
  assert.doesNotMatch(allNames(profile).join(' | '), /œuf|oeuf|skyr|whey|cottage|saumon|cabillaud|thon/);
});

test('un profil végétalien ne reçoit aucun produit animal', () => {
  const profile = generateNutritionProfile(answers({ dietaryStyle: 'vegan', preferredProteins: ['tofu', 'lentils'], preferredSnacks: ['fruit'] }), 'user-vegan');
  assert.doesNotMatch(allNames(profile).join(' | '), /poulet|dinde|bœuf|boeuf|thon|cabillaud|saumon|œuf|oeuf|skyr|whey|cottage/);
});

test('une situation médicale déclarée avertit mais ne bloque jamais', () => {
  const profile = generateNutritionProfile(answers({ medical: 'Diabète traité par insuline' }), 'user-health');
  assert.equal(profile.onboarding_status, 'completed');
  assert.match(profile.calibration_json.healthAdvisory, /ne remplacent pas un médecin/);
});

test('les consentements de processus et de santé sont obligatoires', () => {
  assert.throws(() => generateNutritionProfile(answers({ healthDataConsent: false }), 'user-no-consent'), /consentement/);
  assert.throws(() => generateNutritionProfile(answers({ processAcknowledged: false }), 'user-no-process'), /processus de personnalisation/);
});

test('le nombre de repas demandé est respecté dans tous les modes utiles', () => {
  for (const count of [3, 4, 5]) {
    const profile = generateNutritionProfile(answers({ mealCount: String(count) }), `user-meals-${count}`);
    for (const mode of Object.values(profile.plan_modes_json)) assert.equal(mode.plan.length, count);
  }
});

test('Hard est créé seulement si le prospect le demande et s’entraîne', () => {
  const noTraining = generateNutritionProfile(answers({ trainingDays: '0', trainingDayPlan: 'no' }), 'user-rest');
  const onePlan = generateNutritionProfile(answers({ trainingDays: '4', trainingDayPlan: 'no' }), 'user-one-plan');
  const hardPlan = generateNutritionProfile(answers({ trainingDays: '4', trainingDayPlan: 'yes' }), 'user-hard');
  assert.deepEqual(Object.keys(noTraining.plan_modes_json), ['standard']);
  assert.deepEqual(Object.keys(onePlan.plan_modes_json), ['standard']);
  assert.deepEqual(Object.keys(hardPlan.plan_modes_json), ['standard', 'hard']);
  assert.ok(hardPlan.plan_modes_json.hard.target.cal > hardPlan.plan_modes_json.standard.target.cal);
});

test('aucun prospect ne reçoit un déficit permanent à son inscription', () => {
  const profile = generateNutritionProfile(answers({ goal: 'loss' }), 'user-loss');
  assert.equal(profile.plan_modes_json.deficit, undefined);
  assert.equal(getDeficitProtocolState(profile, new Date(profile.calibration_json.startedAt)).status, 'locked');
});

test('les prospects actuels doivent confirmer l’information Déficit une seule fois', () => {
  const currentProspect = generateNutritionProfile(answers({}), 'user-current-notice');
  delete currentProspect.questionnaire_json.deficitProtocolNoticeVersion;
  assert.equal(needsDeficitProtocolNotice(currentProspect), true);
  currentProspect.questionnaire_json.deficitProtocolNoticeVersion = 1;
  currentProspect.questionnaire_json.deficitProtocolNoticeAcknowledgedAt = '2026-08-23T12:00:00.000Z';
  assert.equal(needsDeficitProtocolNotice(currentProspect), false);
  assert.equal(needsDeficitProtocolNotice({ ...currentProspect, profile_id: 'luca', questionnaire_json: {} }), false);
});

test('les pas, le métier et les entraînements personnalisent réellement la cible', () => {
  const sedentary = generateNutritionProfile(answers({ activity: 'sedentary', jobActivity: 'desk', steps: '2000', trainingDays: '0', trainingDayPlan: 'no' }), 'user-sedentary');
  const active = generateNutritionProfile(answers({ activity: 'veryActive', jobActivity: 'physical', steps: '15000', trainingDays: '6' }), 'user-active');
  assert.ok(active.calibration_json.target.cal >= sedentary.calibration_json.target.cal + 500);
  assert.notEqual(active.calibration_json.target.activityFactor, sedentary.calibration_json.target.activityFactor);
});

test('les préférences produisent des plans alimentaires différents', () => {
  const fish = generateNutritionProfile(answers({ preferredProteins: ['salmon', 'whiteFish'], preferredCarbs: ['potato', 'quinoa'] }), 'user-fish');
  const meat = generateNutritionProfile(answers({ preferredProteins: ['leanBeef', 'turkey'], preferredCarbs: ['pasta', 'rice'] }), 'user-meat');
  const fishNames = allNames(fish).join(' | ');
  const meatNames = allNames(meat).join(' | ');
  assert.match(fishNames, /saumon|cabillaud/);
  assert.match(meatNames, /steak|dinde/);
  assert.notEqual(fishNames, meatNames);
});

test('les habitudes, horaires et contraintes d’organisation sont utilisés', () => {
  const profile = generateNutritionProfile(answers({
    preferredProteins: [], preferredCarbs: [], foodHabits: 'thon, quinoa, fruits',
    workMealAccess: 'cold', cookingTime: 'quick', wakeTime: '05:30', sleepTime: '21:30',
  }), 'user-organization');
  const standard = profile.plan_modes_json.standard;
  assert.match(allNames(profile).join(' | '), /thon/);
  assert.equal(standard.plan.find(meal => meal.id === 'lunch').name, 'Repas froid transportable');
  assert.equal(standard.plan[0].suggestedTime, '06:15');
  assert.equal(standard.plan.at(-1).suggestedTime, '19:30');
});

test('un petit déjeuner sucré et une collation laitière restent cohérents avec leur contexte', () => {
  const profile = generateNutritionProfile(answers({ breakfastType: 'sweet', preferredCarbs: ['potato', 'rice'], preferredSnacks: ['dairy'] }), 'user-breakfast');
  const breakfast = profile.plan_modes_json.standard.plan.find(meal => meal.id === 'breakfast');
  const snack = profile.plan_modes_json.standard.plan.find(meal => meal.id === 'snack');
  assert.match(breakfast.items.map(item => item.name).join(' | '), /avoine|pain/);
  assert.doesNotMatch(breakfast.items.map(item => item.name).join(' | '), /pomme de terre/);
  assert.match(snack.items.map(item => item.name).join(' | '), /skyr|cottage/i);
  assert.match(profile.plan_modes_json.hard.desc, /modéré · soir/);
});

test('les identifiants restent stables entre Standard et Hard pour reporter le journal', () => {
  const profile = generateNutritionProfile(answers({}), 'user-stable');
  const signature = mode => mode.plan.map(meal => ({ id: meal.id, items: meal.items.map(item => item.id) }));
  assert.deepEqual(signature(profile.plan_modes_json.hard), signature(profile.plan_modes_json.standard));
});

test('tous les aliments générés proposent un remplacement', () => {
  const profile = generateNutritionProfile(answers({}), 'user-swaps');
  for (const mode of Object.values(profile.plan_modes_json)) for (const item of mode.plan.flatMap(meal => meal.items)) assert.ok(item.swappable, `${mode.label} · ${item.name}`);
});

test('les profils existants gardent leur plan tant que le complément n’est pas confirmé', () => {
  const legacy = generateNutritionProfile(answers({}), 'user-legacy');
  legacy.calibration_json = { ...legacy.calibration_json, personalizationVersion: 0, version: 2, experienceVersion: 0 };
  legacy.questionnaire_json = { ...legacy.questionnaire_json, personalizationVersion: 0 };
  const planBefore = JSON.stringify(legacy.plan_modes_json);
  const cosmeticUpgrade = upgradeNutritionProfileExperience(legacy);
  assert.equal(needsPersonalizationUpgrade(cosmeticUpgrade), true);
  assert.equal(cosmeticUpgrade.calibration_json.experienceVersion, 1);
  assert.equal(JSON.stringify(legacy.plan_modes_json), planBefore);
});

test('seuls les anciens prospects reçoivent le libellé ancien plan', () => {
  const prospect = generateNutritionProfile(answers({}), 'user-old-label');
  prospect.calibration_json.personalizationVersion = 0;
  prospect.plan_modes_json.deficit = { ...prospect.plan_modes_json.standard, id: 'deficit', label: 'Déficit' };
  const personal = { ...structuredClone(prospect), profile_id: 'luca' };
  assert.equal(upgradeNutritionProfileExperience(prospect).plan_modes_json.deficit.label, 'Déficit (ancien plan)');
  assert.equal(upgradeNutritionProfileExperience(personal).plan_modes_json.deficit.label, 'Déficit');
});

test('l’aperçu complémentaire préserve le démarrage et révise seulement le plan futur', () => {
  const legacy = generateNutritionProfile(answers({}), 'user-preview', { startedAt: '2026-07-01T08:00:00.000Z' });
  legacy.calibration_json.personalizationVersion = 0;
  const original = JSON.stringify(legacy);
  const preview = previewPersonalizationUpgrade(legacy, {
    preferredProteins: ['tofu', 'lentils'], preferredCarbs: ['quinoa', 'sweetPotato'], preferredSnacks: ['fruit'],
    dietaryStyle: 'vegan', mealCount: '3', trainingDays: '0', trainingDayPlan: 'no',
  });
  assert.equal(preview.user_id, legacy.user_id);
  assert.equal(preview.calibration_json.startedAt, '2026-07-01T08:00:00.000Z');
  assert.equal(preview.calibration_json.planRevision, 1);
  assert.equal(preview.calibration_json.previousPlanPreservedInHistory, true);
  assert.equal(preview.plan_modes_json.standard.plan.length, 3);
  assert.deepEqual(Object.keys(preview.plan_modes_json), ['standard']);
  assert.equal(JSON.stringify(legacy), original, 'la prévisualisation ne mute pas le profil enregistré');
});

test('le déficit apparaît après 30 jours, dure 7 jours puis disparaît', () => {
  const startedAt = '2026-07-01T08:00:00.000Z';
  const profile = generateNutritionProfile(answers({ goal: 'loss' }), 'user-deficit', { startedAt });
  assert.equal(getDeficitProtocolState(profile, new Date('2026-07-30T08:00:00.000Z')).status, 'locked');
  const availableAt = new Date('2026-07-31T08:00:00.000Z');
  assert.equal(getDeficitProtocolState(profile, availableAt).status, 'available');
  const active = activateDeficitProtocol(profile, availableAt);
  assert.equal(getDeficitProtocolState(active, new Date('2026-08-03T08:00:00.000Z')).status, 'active');
  assert.equal(active.plan_modes_json.deficit.label, 'Déficit · 7 jours');
  const completed = normalizeTimedProtocols(active, new Date('2026-08-07T08:00:01.000Z'));
  assert.equal(completed.plan_modes_json.deficit, undefined);
  assert.equal(completed.calibration_json.deficitProtocol.status, 'completed');
});

test('le déficit n’est jamais proposé pour une prise de masse', () => {
  const profile = generateNutritionProfile(answers({ goal: 'gain' }), 'user-gain', { startedAt: '2026-01-01T00:00:00.000Z' });
  assert.equal(getDeficitProtocolState(profile, new Date('2026-08-01T00:00:00.000Z')).status, 'not_applicable');
});

test('le calibrage ne crée pas de portions alimentaires aberrantes', () => {
  const profile = generateNutritionProfile(answers({ weight: 95, activity: 'veryActive', goal: 'gain' }), 'user-portions');
  for (const mode of Object.values(profile.plan_modes_json)) for (const item of mode.plan.flatMap(meal => meal.items)) {
    const amount = Number.parseFloat(item.qty);
    if (Number.isFinite(amount) && item.qty.includes('g')) assert.ok(amount <= 500, `${item.name}: ${item.qty}`);
  }
});
