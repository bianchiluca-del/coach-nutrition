import { getHealthAdvisory } from './healthContext.js';

const FOOD = {
  eggs: { name: 'Œufs entiers', per: 1, unit: 'pièces', cal: 72, p: 6.3, g: 0.4, l: 4.8 },
  chickenHam: { name: 'Jambon blanc de poulet', per: 100, unit: 'g', cal: 105, p: 20, g: 1.5, l: 2 },
  banana: { name: 'Banane', per: 100, unit: 'g', cal: 89, p: 1.1, g: 23, l: 0.3 },
  compote: { name: 'Compote de pomme sans sucre', per: 100, unit: 'g', cal: 50, p: 0.2, g: 12, l: 0.1 },
  oats: { name: "Flocons d’avoine", per: 100, unit: 'g', cal: 372, p: 13, g: 60, l: 7 },
  skyr: { name: 'Skyr nature', per: 100, unit: 'g', cal: 62, p: 10.5, g: 4, l: 0.2 },
  chicken: { name: 'Filet de poulet', per: 100, unit: 'g', cal: 110, p: 22.2, g: 1, l: 2 },
  rice: { name: 'Riz basmati cuit', per: 100, unit: 'g', cal: 130, p: 2.7, g: 28, l: 0.3 },
  potato: { name: 'Pommes de terre cuites', per: 100, unit: 'g', cal: 85, p: 1.8, g: 18, l: 0.4 },
  vegetables: { name: 'Légumes variés', per: 100, unit: 'g', cal: 30, p: 1.5, g: 5, l: 0.3 },
  oliveOil: { name: "Huile d’olive", per: 100, unit: 'g', cal: 884, p: 0, g: 0, l: 100 },
  fruit: { name: 'Fruit de saison', per: 100, unit: 'g', cal: 52, p: 0.6, g: 12, l: 0.2 },
  whey: { name: 'Isolat de whey', per: 100, unit: 'g', cal: 370, p: 84, g: 4, l: 2 },
  salmon: { name: 'Saumon', per: 100, unit: 'g', cal: 208, p: 20, g: 0, l: 13 },
  bread: { name: 'Pain complet', per: 100, unit: 'g', cal: 247, p: 9, g: 41, l: 4 },
  cottage: { name: 'Cottage cheese', per: 100, unit: 'g', cal: 98, p: 12, g: 3, l: 4 },
};

const FOOD_ALIASES = {
  eggs: ['oeuf', 'oeufs'],
  chickenHam: ['jambon', 'poulet', 'volaille'],
  banana: ['banane'],
  compote: ['compote', 'pomme'],
  oats: ['avoine', 'gluten', 'ble'],
  skyr: ['skyr', 'lait', 'lactose', 'produit laitier'],
  chicken: ['poulet', 'volaille'],
  rice: ['riz'],
  potato: ['pomme de terre', 'patate'],
  vegetables: ['legume'],
  oliveOil: ['huile olive', 'olive'],
  fruit: ['fruit'],
  whey: ['whey', 'lait', 'lactose', 'produit laitier'],
  salmon: ['saumon', 'poisson'],
  bread: ['pain', 'gluten', 'ble'],
  cottage: ['cottage', 'lait', 'lactose', 'produit laitier'],
};

const normalizeText = value => String(value || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, ' ').trim();

function forbiddenFoodKeys(answers) {
  const restrictions = normalizeText(`${answers.allergies || ''} ${answers.exclusions || ''}`);
  if (!restrictions || /^(aucun|aucune|rien|neant)$/.test(restrictions)) return new Set();
  return new Set(Object.entries(FOOD_ALIASES)
    .filter(([, aliases]) => aliases.some(alias => restrictions.includes(normalizeText(alias))))
    .map(([key]) => key));
}

export function getSafetyBlockReason(answers) {
  return '';
}

const round1 = value => Math.round(value * 10) / 10;
const slug = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function foodItem(key, amount, id) {
  const food = FOOD[key];
  const ratio = amount / food.per;
  return {
    id: id || `${slug(food.name)}-${Math.random().toString(36).slice(2, 7)}`,
    name: food.name,
    qty: `${round1(amount)} ${food.unit}`,
    cal: round1(food.cal * ratio), p: round1(food.p * ratio),
    g: round1(food.g * ratio), l: round1(food.l * ratio),
    swappable: ['chicken', 'salmon', 'chickenHam', 'whey', 'skyr', 'cottage', 'eggs'].includes(key) ? 'protein' : undefined,
  };
}

function ageFromBirthDate(birthDate) {
  if (!birthDate) return 30;
  const born = new Date(birthDate);
  const age = Math.floor((Date.now() - born.getTime()) / 31557600000);
  return Math.min(85, Math.max(16, age || 30));
}

function targetFromAnswers(a) {
  const weight = Number(a.weight) || 70;
  const height = Number(a.height) || 170;
  const age = ageFromBirthDate(a.birthDate);
  const sexOffset = a.sex === 'female' ? -161 : 5;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexOffset;
  const activityFactors = { sedentary: 1.22, light: 1.34, active: 1.48, veryActive: 1.62 };
  const jobAdjustments = { desk: -0.04, mixed: 0, standing: 0.07, physical: 0.15, night: 0.02 };
  const steps = Math.max(0, Number(a.steps) || 0);
  const stepAdjustment = steps >= 14000 ? 0.18
    : steps >= 11000 ? 0.13
      : steps >= 8000 ? 0.08
        : steps >= 5000 ? 0.03
          : steps > 0 && steps < 3000 ? -0.03 : 0;
  const trainingDays = Math.min(7, Math.max(0, Number(a.trainingDays) || 0));
  const trainingAdjustment = trainingDays * 0.025;
  const activityFactor = Math.min(1.95, Math.max(1.15,
    (activityFactors[a.activity] || 1.34)
      + (jobAdjustments[a.jobActivity] || 0)
      + stepAdjustment
      + trainingAdjustment,
  ));
  let calories = bmr * activityFactor;
  if (a.goal === 'loss') calories -= 300;
  if (a.goal === 'gain') calories += 250;
  calories = Math.round(Math.max(bmr * 1.08, calories) / 25) * 25;
  const protein = Math.round(weight * (a.goal === 'gain' ? 1.9 : 1.8));
  const fat = Math.round(weight * 0.8);
  const carbs = Math.max(80, Math.round((calories - protein * 4 - fat * 9) / 4));
  return {
    cal: calories, p: protein, g: carbs, l: fat, bmr: Math.round(bmr),
    activityFactor: round1(activityFactor),
  };
}

function contains(text, words) {
  const normalized = (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return words.some(word => normalized.includes(word));
}

function meal(id, name, icon, items, note) {
  return { id, name, icon, color: 'from-violet-50 to-indigo-50', border: 'border-violet-200', items, onboardingNote: note };
}

function sumPlan(plan) {
  return plan.flatMap(m => m.items).reduce((s, item) => ({ cal: s.cal + item.cal, p: s.p + item.p, g: s.g + item.g, l: s.l + item.l }), { cal: 0, p: 0, g: 0, l: 0 });
}

function scaleItem(item, factor) {
  const amount = parseFloat(item.qty);
  const unit = item.qty.replace(/^[\d.,\s]+/, '') || 'g';
  return {
    ...item,
    qty: Number.isFinite(amount) ? `${round1(Math.max(1, amount * factor))} ${unit}` : item.qty,
    cal: round1(item.cal * factor), p: round1(item.p * factor), g: round1(item.g * factor), l: round1(item.l * factor),
  };
}

function normalizePlan(plan, target) {
  let next = JSON.parse(JSON.stringify(plan));
  let totals = sumPlan(next);
  const proteinItems = next.flatMap(m => m.items).filter(i => i.swappable === 'protein');
  const proteinNow = proteinItems.reduce((n, i) => n + i.p, 0);
  const otherProtein = totals.p - proteinNow;
  const proteinFactor = Math.max(0.7, Math.min(1.35, (target.p - otherProtein) / Math.max(1, proteinNow)));
  next = next.map(m => ({ ...m, items: m.items.map(i => i.swappable === 'protein' ? scaleItem(i, proteinFactor) : i) }));

  totals = sumPlan(next);
  const carbItems = next.flatMap(m => m.items).filter(i => i.swappable !== 'protein' && !i.name.includes('Huile') && !i.name.includes('Légumes') && i.g > i.p && i.g > i.l);
  const carbNow = carbItems.reduce((n, i) => n + i.g, 0);
  const otherCarbs = totals.g - carbNow;
  const carbFactor = Math.max(0.7, Math.min(1.8, (target.g - otherCarbs) / Math.max(1, carbNow)));
  const carbIds = new Set(carbItems.map(item => item.id));
  next = next.map(m => ({ ...m, items: m.items.map(i => carbIds.has(i.id) ? scaleItem(i, carbFactor) : i) }));

  totals = sumPlan(next);
  const oilItems = next.flatMap(m => m.items).filter(i => i.name.includes('Huile'));
  const oilFat = oilItems.reduce((n, i) => n + i.l, 0);
  const otherFat = totals.l - oilFat;
  const fatFactor = Math.max(0.25, Math.min(2, (target.l - otherFat) / Math.max(1, oilFat)));
  next = next.map(m => ({ ...m, items: m.items.map(i => i.name.includes('Huile') ? scaleItem(i, fatFactor) : i) }));
  return next;
}

function buildStandardPlan(a, target) {
  const habits = `${a.breakfastHabit || ''} ${a.foodHabits || ''}`;
  const forbidden = forbiddenFoodKeys(a);
  const choose = (...keys) => keys.find(key => !forbidden.has(key)) || null;
  const proteinAmount = (key, role = 'meal') => ({
    eggs: role === 'balance' || role === 'snack' ? 2 : 3,
    chickenHam: 80,
    whey: role === 'balance' ? 25 : 30,
    skyr: role === 'balance' ? 150 : 200,
    cottage: 200,
    chicken: role === 'dinner' ? 140 : 160,
    salmon: role === 'dinner' ? 140 : 160,
  }[key] || 100);
  const add = (items, key, amount, id) => {
    if (key) items.push(foodItem(key, amount, id));
  };
  const breakfast = [];
  const reasons = [];
  const breakfastProtein = contains(habits, ['oeuf', 'œuf'])
    ? choose('eggs', 'skyr', 'chickenHam', 'whey')
    : choose('skyr', 'eggs', 'chickenHam', 'whey');
  add(breakfast, breakfastProtein, proteinAmount(breakfastProtein, 'breakfast'), 'breakfast-protein');
  const breakfastFruit = contains(habits, ['banane']) ? choose('banana', 'fruit', 'compote') : choose('fruit', 'banana', 'compote');
  add(breakfast, breakfastFruit, breakfastFruit === 'compote' ? 100 : 150, 'breakfast-fruit');
  if (contains(habits, ['miel', 'confiture', 'sirop'])) {
    const sweetAlternative = choose('compote', 'banana', 'fruit');
    add(breakfast, sweetAlternative, sweetAlternative === 'compote' ? 100 : 120, 'optimized-sweet');
    if (sweetAlternative) reasons.push('Le miel/confiture est remplacé par une option compatible avec tes exclusions et moins dense en calories.');
  } else {
    const breakfastCarb = choose('oats', 'bread', 'potato', 'rice');
    add(breakfast, breakfastCarb, breakfastCarb === 'oats' ? (contains(habits, ['avoine', 'porridge', 'muesli']) ? 45 : 40) : 100, 'breakfast-carb');
  }
  const breakfastProteinTotal = breakfast.reduce((n, i) => n + i.p, 0);
  if (breakfastProteinTotal < target.p * 0.22) {
    const balanceProtein = choose('chickenHam', 'whey', 'eggs', 'skyr');
    if (balanceProtein && !breakfast.some(item => item.name === FOOD[balanceProtein].name)) {
      add(breakfast, balanceProtein, proteinAmount(balanceProtein, 'balance'), 'protein-balance');
    }
    reasons.push('Une source de protéines compatible complète le petit déjeuner sans bouleverser tes habitudes.');
  }

  const lunchProtein = choose('chicken', 'salmon', 'eggs');
  const dinnerProtein = choose('salmon', 'chicken', 'eggs');
  const snackProtein = choose('skyr', 'whey', 'cottage', 'eggs', 'chickenHam');
  const preferredLunchCarb = contains(a.foodHabits, ['pomme de terre', 'patate']) ? 'potato' : 'rice';
  const lunchCarb = choose(preferredLunchCarb, 'rice', 'potato', 'bread');
  const dinnerCarb = choose('potato', 'rice', 'bread');
  const snackFruit = choose('fruit', 'banana', 'compote');
  const snackCarb = choose('oats', 'bread', 'rice', 'potato');
  const lunchItems = [];
  add(lunchItems, lunchProtein, proteinAmount(lunchProtein, 'meal'));
  add(lunchItems, lunchCarb, lunchCarb === 'potato' ? 300 : 200);
  add(lunchItems, choose('vegetables'), 250);
  add(lunchItems, choose('oliveOil'), 10);
  const snackItems = [];
  add(snackItems, snackProtein, proteinAmount(snackProtein, 'snack'));
  add(snackItems, snackFruit, snackFruit === 'compote' ? 150 : 180);
  add(snackItems, snackCarb, snackCarb === 'oats' ? 25 : 80);
  const dinnerItems = [];
  add(dinnerItems, dinnerProtein, proteinAmount(dinnerProtein, 'dinner'));
  add(dinnerItems, dinnerCarb, dinnerCarb === 'potato' ? 280 : 190);
  add(dinnerItems, choose('vegetables'), 300);
  add(dinnerItems, choose('oliveOil'), 5);
  let plan = [
    meal('breakfast', 'Petit déjeuner', '☕', breakfast, reasons.join(' ')),
    meal('lunch', 'Repas midi', '🍽️', lunchItems, 'Repas complet construit autour de tes habitudes.'),
    meal('snack', 'Goûter', '🍌', snackItems, 'Collation simple, rapide et protéinée.'),
    meal('dinner', 'Repas soir', '🌙', dinnerItems, 'Dîner rassasiant avec protéines, fibres et lipides utiles.'),
  ];

  const totals = sumPlan(plan);
  const proteinDelta = target.p - totals.p;
  if (proteinDelta > 8) {
    const adjustmentProtein = choose('whey', 'chickenHam', 'eggs', 'skyr', 'cottage');
    add(plan[2].items, adjustmentProtein, proteinAmount(adjustmentProtein, 'snack'), 'protein-adjustment');
  }
  const requestedMeals = Math.min(5, Math.max(3, Number(a.mealCount) || 4));
  if (requestedMeals === 3) {
    const snack = plan.find(row => row.id === 'snack');
    const breakfastRow = plan.find(row => row.id === 'breakfast');
    const dinnerRow = plan.find(row => row.id === 'dinner');
    snack?.items.forEach((item, index) => {
      (index % 2 === 0 ? breakfastRow : dinnerRow)?.items.push({ ...item, id: `merged-${item.id}` });
    });
    plan = plan.filter(row => row.id !== 'snack');
  }
  if (requestedMeals === 5) {
    const breakfastRow = plan.find(row => row.id === 'breakfast');
    const snack = plan.find(row => row.id === 'snack');
    const morningItems = [];
    if (breakfastRow?.items.length > 2) {
      morningItems.push({ ...breakfastRow.items.splice(1, 1)[0], id: 'morning-snack-fruit' });
    }
    if (snack?.items.length > 1) {
      morningItems.push({ ...snack.items.shift(), id: 'morning-snack-protein' });
    }
    if (!morningItems.length && snack?.items.length) {
      morningItems.push({ ...snack.items.shift(), id: 'morning-snack-item' });
    }
    const snackIndex = plan.findIndex(row => row.id === 'snack');
    plan.splice(Math.max(1, snackIndex), 0,
      meal('morning-snack', 'Collation matin', '🍏', morningItems, 'Une prise légère répartit l’énergie selon ton rythme demandé.'),
    );
    if (snack) snack.name = 'Goûter';
  }
  return plan;
}

function scalePlan(plan, factor) {
  return plan.map(mealRow => ({
    ...mealRow,
    items: mealRow.items.map(item => {
      if (item.swappable === 'protein' || item.name.includes('Légumes')) return { ...item };
      const amount = parseFloat(item.qty);
      if (!Number.isFinite(amount)) return { ...item };
      return { ...item, qty: `${round1(amount * factor)} ${item.qty.replace(/[\d.,\s]/g, '') || 'g'}`, cal: round1(item.cal * factor), p: round1(item.p * factor), g: round1(item.g * factor), l: round1(item.l * factor) };
    }),
  }));
}

export function generateNutritionProfile(answers, userId) {
  if (answers.processAcknowledged !== true) {
    throw new Error('Tu dois d’abord comprendre et valider le processus de personnalisation.');
  }
  if (answers.healthDataConsent !== true) {
    throw new Error('Ton consentement est nécessaire pour créer et enregistrer le plan.');
  }
  const target = targetFromAnswers(answers);
  const standardBasePlan = buildStandardPlan(answers, target);
  const standardPlan = normalizePlan(standardBasePlan, target);
  const trainingTarget = { ...target, cal: target.cal + 200, g: target.g + 50 };
  const restTarget = { ...target, cal: Math.max(1400, target.cal - 150), g: Math.max(80, target.g - 38) };
  const profileId = `member-${userId}`;
  const trainingPlan = normalizePlan(scalePlan(standardBasePlan, 1.08), trainingTarget);
  const restPlan = normalizePlan(scalePlan(standardBasePlan, 0.94), restTarget);
  const standardActual = { ...target, ...Object.fromEntries(Object.entries(sumPlan(standardPlan)).map(([key, value]) => [key, Math.round(value)])) };
  const trainingActual = { ...trainingTarget, ...Object.fromEntries(Object.entries(sumPlan(trainingPlan)).map(([key, value]) => [key, Math.round(value)])) };
  const restActual = { ...restTarget, ...Object.fromEntries(Object.entries(sumPlan(restPlan)).map(([key, value]) => [key, Math.round(value)])) };
  return {
    user_id: userId,
    profile_id: profileId,
    display_name: answers.firstName.trim(),
    questionnaire_json: answers,
    onboarding_status: 'completed',
    calibration_json: {
      version: 2,
      phase: 'initial',
      startedAt: new Date().toISOString(),
      durationWeeks: 3,
      weighInDays: ['lundi', 'mercredi', 'samedi'],
      explanation: 'Trois mesures espacées révèlent la tendance réelle malgré l’eau, le sel, le transit et l’entraînement. Une valeur isolée ne déclenche jamais de correction.',
      target: standardActual,
      healthAdvisory: getHealthAdvisory(answers),
      phases: [
        { id: 'initial', label: 'Calibration initiale', startWeek: 1, endWeek: 3, weighInDays: ['lundi', 'mercredi', 'samedi'] },
        { id: 'adjustment', label: 'Ajustement progressif', startWeek: 4, endWeek: 8, weighInDays: ['lundi', 'samedi'] },
        { id: 'stabilization', label: 'Stabilisation et autonomie', startWeek: 9, weighInDays: ['lundi', 'samedi'] },
      ],
      adjustmentPolicy: {
        minimumMeasurements: 6,
        compareWeeklyAverages: true,
        maximumWeeklyChangeKcal: 100,
        maximumTotalChangeKcal: 200,
        coachReviewRecommended: true,
      },
    },
    plan_modes_json: {
      standard: { id: 'standard', label: 'Standard', emoji: '💼', desc: 'Journée habituelle', target: standardActual, plan: standardPlan },
      training: { id: 'training', label: 'Training', emoji: '🔥', desc: 'Journée avec entraînement', target: trainingActual, plan: trainingPlan },
      rest: { id: 'rest', label: 'Repos', emoji: '🌿', desc: 'Journée moins active', target: restActual, plan: restPlan },
    },
  };
}
