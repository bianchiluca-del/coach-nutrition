import { getHealthAdvisory } from './healthContext.js';

export const PERSONALIZATION_VERSION = 2;
export const DEFICIT_NOTICE_VERSION = 1;
export const DEFICIT_DELAY_DAYS = 30;
export const DEFICIT_DURATION_DAYS = 7;

export const PERSONALIZATION_OPTIONS = {
  proteins: [
    ['chicken', 'Poulet'], ['turkey', 'Dinde'], ['leanBeef', 'Bœuf maigre'],
    ['eggs', 'Œufs'], ['tuna', 'Thon'], ['whiteFish', 'Poisson blanc'],
    ['salmon', 'Saumon'], ['tofu', 'Tofu'], ['lentils', 'Lentilles'],
  ],
  carbs: [
    ['rice', 'Riz'], ['potato', 'Pommes de terre'], ['sweetPotato', 'Patate douce'],
    ['pasta', 'Pâtes'], ['quinoa', 'Quinoa'], ['bread', 'Pain complet'], ['oats', 'Avoine'],
  ],
  snacks: [
    ['dairy', 'Skyr / produit laitier'], ['fruit', 'Fruit'], ['shake', 'Shake protéiné'],
    ['savory', 'Collation salée'], ['none', 'Pas de collation'],
  ],
};

export function proteinOptionsForDietaryStyle(style = 'omnivore') {
  const excluded = style === 'vegan'
    ? new Set(['chicken', 'turkey', 'leanBeef', 'eggs', 'tuna', 'whiteFish', 'salmon'])
    : style === 'vegetarian'
      ? new Set(['chicken', 'turkey', 'leanBeef', 'tuna', 'whiteFish', 'salmon'])
      : style === 'pescetarian'
        ? new Set(['chicken', 'turkey', 'leanBeef'])
        : new Set();
  return PERSONALIZATION_OPTIONS.proteins.filter(([value]) => !excluded.has(value));
}

const FOOD = {
  eggs: { name: 'Œufs entiers', per: 1, unit: 'pièces', cal: 72, p: 6.3, g: 0.4, l: 4.8, category: 'protein', tags: ['egg', 'vegetarian'] },
  chickenHam: { name: 'Jambon blanc de poulet', per: 100, unit: 'g', cal: 105, p: 20, g: 1.5, l: 2, category: 'protein', tags: ['poultry'] },
  chicken: { name: 'Filet de poulet', per: 100, unit: 'g', cal: 110, p: 22.2, g: 1, l: 2, category: 'protein', tags: ['poultry'] },
  turkey: { name: 'Escalope de dinde', per: 100, unit: 'g', cal: 109, p: 24, g: 0, l: 1, category: 'protein', tags: ['poultry'] },
  leanBeef: { name: 'Steak haché 5 %', per: 100, unit: 'g', cal: 133, p: 21, g: 0, l: 5, category: 'protein', tags: ['meat'] },
  tuna: { name: 'Thon au naturel égoutté', per: 100, unit: 'g', cal: 116, p: 26, g: 0, l: 1, category: 'protein', tags: ['fish'] },
  whiteFish: { name: 'Cabillaud', per: 100, unit: 'g', cal: 82, p: 18, g: 0, l: 0.7, category: 'protein', tags: ['fish'] },
  salmon: { name: 'Saumon', per: 100, unit: 'g', cal: 208, p: 20, g: 0, l: 13, category: 'protein', tags: ['fish'] },
  tofu: { name: 'Tofu ferme', per: 100, unit: 'g', cal: 144, p: 15, g: 3, l: 8, category: 'protein', tags: ['soy', 'vegan'] },
  lentils: { name: 'Lentilles cuites', per: 100, unit: 'g', cal: 116, p: 9, g: 20, l: 0.4, category: 'protein', tags: ['legume', 'vegan'] },
  whey: { name: 'Isolat de whey', per: 100, unit: 'g', cal: 370, p: 84, g: 4, l: 2, category: 'protein', tags: ['dairy', 'vegetarian'] },
  soyProtein: { name: 'Protéine végétale', per: 100, unit: 'g', cal: 370, p: 80, g: 6, l: 3, category: 'protein', tags: ['soy', 'vegan'] },
  skyr: { name: 'Skyr nature', per: 100, unit: 'g', cal: 62, p: 10.5, g: 4, l: 0.2, category: 'fromages', tags: ['dairy', 'vegetarian'] },
  cottage: { name: 'Cottage cheese', per: 100, unit: 'g', cal: 98, p: 12, g: 3, l: 4, category: 'fromages', tags: ['dairy', 'vegetarian'] },
  soyYogurt: { name: 'Yaourt soja nature', per: 100, unit: 'g', cal: 45, p: 4, g: 3, l: 2, category: 'laitiers', tags: ['soy', 'vegan'] },
  hummus: { name: 'Houmous', per: 100, unit: 'g', cal: 166, p: 8, g: 14, l: 10, category: 'protein', tags: ['sesame', 'legume', 'vegan'] },
  banana: { name: 'Banane', per: 100, unit: 'g', cal: 89, p: 1.1, g: 23, l: 0.3, category: 'fruits', tags: ['vegan'] },
  fruit: { name: 'Fruit de saison', per: 100, unit: 'g', cal: 52, p: 0.6, g: 12, l: 0.2, category: 'fruits', tags: ['vegan'] },
  compote: { name: 'Compote sans sucre', per: 100, unit: 'g', cal: 50, p: 0.2, g: 12, l: 0.1, category: 'fruits', tags: ['vegan'] },
  oats: { name: 'Flocons d’avoine', per: 100, unit: 'g', cal: 372, p: 13, g: 60, l: 7, category: 'feculents', tags: ['gluten', 'vegan'] },
  bread: { name: 'Pain complet', per: 100, unit: 'g', cal: 247, p: 9, g: 41, l: 4, category: 'feculents', tags: ['gluten', 'vegan'] },
  rice: { name: 'Riz basmati cuit', per: 100, unit: 'g', cal: 130, p: 2.7, g: 28, l: 0.3, category: 'feculents', tags: ['vegan'] },
  potato: { name: 'Pommes de terre cuites', per: 100, unit: 'g', cal: 85, p: 1.8, g: 18, l: 0.4, category: 'feculents', tags: ['vegan'] },
  sweetPotato: { name: 'Patate douce cuite', per: 100, unit: 'g', cal: 86, p: 1.6, g: 20, l: 0.1, category: 'feculents', tags: ['vegan'] },
  pasta: { name: 'Pâtes cuites', per: 100, unit: 'g', cal: 131, p: 5, g: 25, l: 1.1, category: 'feculents', tags: ['gluten', 'vegan'] },
  quinoa: { name: 'Quinoa cuit', per: 100, unit: 'g', cal: 120, p: 4.4, g: 21, l: 1.9, category: 'feculents', tags: ['vegan'] },
  vegetables: { name: 'Légumes variés', per: 100, unit: 'g', cal: 30, p: 1.5, g: 5, l: 0.3, category: 'legumes_crudites', tags: ['vegan'] },
  oliveOil: { name: 'Huile d’olive', per: 100, unit: 'g', cal: 884, p: 0, g: 0, l: 100, category: 'matieres_grasses', tags: ['vegan'] },
  avocado: { name: 'Avocat', per: 100, unit: 'g', cal: 160, p: 2, g: 9, l: 15, category: 'matieres_grasses', tags: ['vegan'] },
  almonds: { name: 'Amandes', per: 100, unit: 'g', cal: 579, p: 21, g: 22, l: 50, category: 'oleagineux', tags: ['nuts', 'vegan'] },
};

const normalizeText = value => String(value || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, ' ').trim();
const round1 = value => Math.round(value * 10) / 10;
const deepClone = value => JSON.parse(JSON.stringify(value));
const toArray = value => Array.isArray(value) ? value : String(value || '').split(/[,;|]/).map(item => item.trim()).filter(Boolean);

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value || '')) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return Math.abs(hash >>> 0);
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
  const stepAdjustment = steps >= 14000 ? 0.18 : steps >= 11000 ? 0.13 : steps >= 8000 ? 0.08 : steps >= 5000 ? 0.03 : steps > 0 && steps < 3000 ? -0.03 : 0;
  const trainingDays = Math.min(7, Math.max(0, Number(a.trainingDays) || 0));
  const activityFactor = Math.min(1.95, Math.max(1.15, (activityFactors[a.activity] || 1.34) + (jobAdjustments[a.jobActivity] || 0) + stepAdjustment + trainingDays * 0.025));
  let calories = bmr * activityFactor;
  if (a.goal === 'loss') calories -= 300;
  if (a.goal === 'gain') calories += 250;
  calories = Math.round(Math.max(bmr * 1.08, calories) / 25) * 25;
  const protein = Math.round(weight * (a.goal === 'gain' ? 1.9 : 1.8));
  const fat = Math.round(weight * 0.8);
  const carbs = Math.max(80, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { cal: calories, p: protein, g: carbs, l: fat, bmr: Math.round(bmr), activityFactor: round1(activityFactor) };
}

function foodItem(key, amount, id) {
  const food = FOOD[key];
  const ratio = amount / food.per;
  return { id, name: food.name, qty: `${round1(amount)} ${food.unit}`, cal: round1(food.cal * ratio), p: round1(food.p * ratio), g: round1(food.g * ratio), l: round1(food.l * ratio), swappable: food.category };
}

function restrictionsFor(answers) {
  const text = normalizeText([answers.allergies, answers.exclusions, answers.dislikedFoods].filter(Boolean).join(' '));
  const forbiddenTags = new Set();
  if (/lactose|lait|produit laitier/.test(text)) forbiddenTags.add('dairy');
  if (/gluten|ble/.test(text)) forbiddenTags.add('gluten');
  if (/oeuf/.test(text)) forbiddenTags.add('egg');
  if (/poisson|saumon|thon|cabillaud/.test(text)) forbiddenTags.add('fish');
  if (/soja|soy/.test(text)) forbiddenTags.add('soy');
  if (/amande|noix|oleagineux/.test(text)) forbiddenTags.add('nuts');
  if (/sesame/.test(text)) forbiddenTags.add('sesame');
  return { text, forbiddenTags };
}

function allowedFood(key, answers, restrictions) {
  const food = FOOD[key];
  if (!food || food.tags.some(tag => restrictions.forbiddenTags.has(tag))) return false;
  if (restrictions.text && normalizeText(food.name).split(' ').some(token => token.length > 4 && restrictions.text.includes(token))) return false;
  const style = answers.dietaryStyle || 'omnivore';
  if (style === 'pescetarian' && food.category === 'protein' && food.tags.some(tag => ['poultry', 'meat'].includes(tag))) return false;
  if (style === 'vegetarian' && food.category === 'protein' && food.tags.some(tag => ['poultry', 'meat', 'fish'].includes(tag))) return false;
  if (style === 'vegan' && food.category === 'protein' && !food.tags.includes('vegan')) return false;
  if (style === 'vegan' && food.tags.some(tag => ['dairy', 'egg', 'fish', 'poultry', 'meat'].includes(tag))) return false;
  return true;
}

function orderedChoices(preferences, fallback, answers, seed, restrictions) {
  const preferred = toArray(preferences).filter(key => allowedFood(key, answers, restrictions));
  const remaining = fallback.filter(key => allowedFood(key, answers, restrictions) && !preferred.includes(key));
  if (remaining.length) {
    const offset = seed % remaining.length;
    remaining.push(...remaining.splice(0, offset));
  }
  return [...preferred, ...remaining];
}

const HABIT_KEYWORDS = {
  chicken: ['poulet'], turkey: ['dinde'], leanBeef: ['boeuf', 'steak'], eggs: ['oeuf'],
  tuna: ['thon'], whiteFish: ['cabillaud', 'poisson blanc'], salmon: ['saumon'], tofu: ['tofu'], lentils: ['lentille'],
  rice: ['riz'], potato: ['pomme de terre'], sweetPotato: ['patate douce'], pasta: ['pate'], quinoa: ['quinoa'], bread: ['pain'], oats: ['avoine'],
  dairy: ['skyr', 'yaourt', 'cottage'], fruit: ['fruit', 'banane', 'pomme', 'compote'], shake: ['whey', 'shake', 'proteine'], savory: ['sale', 'houmous'],
};

function inferredChoices(text, allowedKeys) {
  const normalized = normalizeText(text);
  return allowedKeys.filter(key => (HABIT_KEYWORDS[key] || []).some(keyword => normalized.includes(normalizeText(keyword))));
}

function unique(values) { return [...new Set(values.filter(Boolean))]; }

function prioritizeLunch(proteins, answers) {
  const preferred = answers.workMealAccess === 'cold'
    ? ['tuna', 'eggs', 'tofu', 'lentils', 'chicken', 'turkey']
    : answers.cookingTime === 'quick'
      ? ['tuna', 'eggs', 'tofu', 'turkey', 'chicken']
      : answers.budgetLevel === 'low'
        ? ['eggs', 'lentils', 'chicken', 'turkey', 'tuna']
        : [];
  return [...proteins].sort((a, b) => {
    const aRank = preferred.indexOf(a); const bRank = preferred.indexOf(b);
    return (aRank < 0 ? 99 : aRank) - (bRank < 0 ? 99 : bRank);
  });
}

function minutesFromTime(value, fallback) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : fallback;
}

function formatMinutes(value) {
  const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function assignMealTimes(plan, answers) {
  const wake = minutesFromTime(answers.wakeTime, 420);
  let sleep = minutesFromTime(answers.sleepTime, 1380);
  if (sleep <= wake) sleep += 1440;
  const start = wake + 45;
  const end = Math.max(start, sleep - 120);
  const interval = plan.length > 1 ? (end - start) / (plan.length - 1) : 0;
  return plan.map((row, index) => ({ ...row, suggestedTime: formatMinutes(start + interval * index) }));
}

function sumPlan(plan) {
  return plan.flatMap(row => row.items).reduce((sum, item) => ({ cal: sum.cal + item.cal, p: sum.p + item.p, g: sum.g + item.g, l: sum.l + item.l }), { cal: 0, p: 0, g: 0, l: 0 });
}

function scaleItem(item, factor) {
  const amount = parseFloat(item.qty);
  const unit = item.qty.replace(/^[\d.,\s]+/, '') || 'g';
  const scaledAmount = Math.max(1, amount * factor);
  const cappedAmount = unit.trim() === 'g' ? Math.min(500, scaledAmount) : scaledAmount;
  const appliedFactor = Number.isFinite(amount) && amount > 0 ? cappedAmount / amount : factor;
  return { ...item, qty: Number.isFinite(amount) ? `${round1(cappedAmount)} ${unit}` : item.qty, cal: round1(item.cal * appliedFactor), p: round1(item.p * appliedFactor), g: round1(item.g * appliedFactor), l: round1(item.l * appliedFactor) };
}

function normalizePlan(plan, target) {
  let next = deepClone(plan);
  let totals = sumPlan(next);
  const proteins = next.flatMap(row => row.items).filter(item => ['protein', 'fromages', 'laitiers'].includes(item.swappable));
  const proteinNow = proteins.reduce((sum, item) => sum + item.p, 0);
  const proteinFactor = Math.max(0.65, Math.min(1.5, (target.p - (totals.p - proteinNow)) / Math.max(1, proteinNow)));
  const proteinIds = new Set(proteins.map(item => item.id));
  next = next.map(row => ({ ...row, items: row.items.map(item => proteinIds.has(item.id) ? scaleItem(item, proteinFactor) : item) }));
  totals = sumPlan(next);
  const carbs = next.flatMap(row => row.items).filter(item => ['feculents', 'fruits'].includes(item.swappable));
  const carbNow = carbs.reduce((sum, item) => sum + item.g, 0);
  const carbFactor = Math.max(0.55, Math.min(2, (target.g - (totals.g - carbNow)) / Math.max(1, carbNow)));
  const carbIds = new Set(carbs.map(item => item.id));
  next = next.map(row => ({ ...row, items: row.items.map(item => carbIds.has(item.id) ? scaleItem(item, carbFactor) : item) }));
  totals = sumPlan(next);
  const fats = next.flatMap(row => row.items).filter(item => ['matieres_grasses', 'oleagineux'].includes(item.swappable));
  const fatNow = fats.reduce((sum, item) => sum + item.l, 0);
  const fatFactor = Math.max(0.2, Math.min(2.2, (target.l - (totals.l - fatNow)) / Math.max(1, fatNow)));
  const fatIds = new Set(fats.map(item => item.id));
  return next.map(row => ({ ...row, items: row.items.map(item => fatIds.has(item.id) ? scaleItem(item, fatFactor) : item) }));
}

function meal(id, name, icon, items, note) {
  return { id, name, icon, color: 'from-violet-50 to-indigo-50', border: 'border-violet-200', items, onboardingNote: note };
}

function proteinAmount(key, role) {
  if (key === 'eggs') return role === 'snack' ? 2 : 3;
  if (['whey', 'soyProtein'].includes(key)) return role === 'snack' ? 25 : 30;
  if (['skyr', 'soyYogurt'].includes(key)) return role === 'snack' ? 170 : 220;
  if (key === 'cottage') return 180;
  if (key === 'lentils') return 220;
  if (key === 'tofu') return 180;
  return role === 'dinner' ? 150 : 165;
}

function buildStandardPlan(answers, target, seedValue) {
  const seed = stableHash(seedValue || `${answers.firstName}-${answers.birthDate}`);
  const restrictions = restrictionsFor(answers);
  const proteinFallback = ['chicken', 'turkey', 'leanBeef', 'tuna', 'whiteFish', 'salmon', 'eggs', 'tofu', 'lentils'];
  const carbFallback = ['rice', 'potato', 'sweetPotato', 'pasta', 'quinoa', 'bread'];
  const habitText = `${answers.breakfastHabit || ''} ${answers.foodHabits || ''}`;
  const proteinPreferences = unique([...toArray(answers.preferredProteins), ...inferredChoices(habitText, proteinFallback)]);
  const carbPreferences = unique([...toArray(answers.preferredCarbs), ...inferredChoices(habitText, [...carbFallback, 'oats'])]);
  const proteins = orderedChoices(proteinPreferences, proteinFallback, answers, seed, restrictions);
  const lunchOrderedProteins = prioritizeLunch(proteins, answers);
  const carbs = orderedChoices(carbPreferences, carbFallback, answers, seed + 7, restrictions);
  const breakfastType = answers.breakfastType || (/oeuf/i.test(answers.breakfastHabit || '') ? 'savory' : 'sweet');
  const snackStyles = unique([...toArray(answers.preferredSnacks), ...inferredChoices(habitText, ['dairy', 'fruit', 'shake', 'savory'])]);
  const breakfastProtein = breakfastType === 'savory'
    ? orderedChoices(['eggs', 'chickenHam'], ['tofu', 'skyr', 'soyYogurt'], answers, seed, restrictions)[0]
    : orderedChoices(answers.dietaryStyle === 'vegan' ? ['soyYogurt', 'soyProtein'] : ['skyr', 'cottage', 'whey'], ['soyYogurt', 'eggs', 'soyProtein'], answers, seed, restrictions)[0];
  const breakfastCarbPreferences = breakfastType === 'savory'
    ? carbPreferences
    : unique([...inferredChoices(answers.breakfastHabit, ['oats', 'bread']), 'oats', 'bread']);
  const breakfastCarb = orderedChoices(breakfastCarbPreferences, breakfastType === 'savory' ? ['bread', 'potato', 'oats'] : ['oats', 'bread', 'potato'], answers, seed + 3, restrictions)[0];
  const breakfastItems = [];
  if (breakfastProtein) breakfastItems.push(foodItem(breakfastProtein, proteinAmount(breakfastProtein, 'breakfast'), 'breakfast-protein'));
  if (breakfastCarb) breakfastItems.push(foodItem(breakfastCarb, breakfastCarb === 'oats' ? 45 : breakfastCarb === 'bread' ? 80 : 180, 'breakfast-carb'));
  breakfastItems.push(foodItem(seed % 2 ? 'banana' : 'fruit', 150, 'breakfast-fruit'));

  const lunchProtein = lunchOrderedProteins[0];
  if (!lunchProtein) throw new Error('Aucune source de protéines compatible n’a été trouvée. Vérifie tes allergies et tes choix alimentaires.');
  const dinnerProtein = proteins.find(key => key !== lunchProtein) || lunchProtein;
  const lunchCarb = carbs[0] || 'rice';
  const dinnerCarb = carbs.find(key => key !== lunchCarb) || lunchCarb;
  const fatOne = seed % 3 === 0 && allowedFood('avocado', answers, restrictions) ? 'avocado' : 'oliveOil';
  const lunchItems = [foodItem(lunchProtein, proteinAmount(lunchProtein, 'lunch'), 'lunch-protein'), foodItem(lunchCarb, ['potato', 'sweetPotato'].includes(lunchCarb) ? 300 : 210, 'lunch-carb'), foodItem('vegetables', 250, 'lunch-vegetables'), foodItem(fatOne, fatOne === 'avocado' ? 60 : 10, 'lunch-fat')];
  const dinnerItems = [foodItem(dinnerProtein, proteinAmount(dinnerProtein, 'dinner'), 'dinner-protein'), foodItem(dinnerCarb, ['potato', 'sweetPotato'].includes(dinnerCarb) ? 280 : 190, 'dinner-carb'), foodItem('vegetables', 300, 'dinner-vegetables'), foodItem('oliveOil', 6, 'dinner-fat')];
  const snackStyle = snackStyles.find(style => style !== 'none') || (answers.dietaryStyle === 'vegan' ? 'fruit' : 'dairy');
  const snackProtein = snackStyle === 'shake'
    ? orderedChoices(answers.dietaryStyle === 'vegan' ? ['soyProtein'] : ['whey'], ['soyProtein'], answers, seed, restrictions)[0]
    : snackStyle === 'savory'
      ? orderedChoices([], ['chickenHam', 'eggs', 'hummus', 'tofu'], answers, seed, restrictions)[0]
      : orderedChoices(answers.dietaryStyle === 'vegan' ? ['soyYogurt'] : ['skyr', 'cottage'], ['soyYogurt', 'whey', 'soyProtein'], answers, seed, restrictions)[0];
  const snackItems = [];
  if (snackProtein) snackItems.push(foodItem(snackProtein, proteinAmount(snackProtein, 'snack'), 'snack-protein'));
  snackItems.push(foodItem(seed % 2 ? 'compote' : 'fruit', 160, 'snack-fruit'));
  if (allowedFood('almonds', answers, restrictions) && answers.budgetLevel !== 'low') snackItems.push(foodItem('almonds', 15, 'snack-fat'));
  let plan = [
    meal('breakfast', breakfastType === 'none' ? 'Première prise' : 'Petit déjeuner', '☕', breakfastItems, `Choisi selon ton profil ${answers.dietaryStyle || 'omnivore'} et tes habitudes.`),
    meal('lunch', answers.workMealAccess === 'cold' ? 'Repas froid transportable' : 'Repas midi', '🍽️', lunchItems, `Compatible avec ton organisation : ${answers.workMealAccess || 'standard'}.`),
    meal('snack', 'Goûter', '🍌', snackItems, 'Collation construite selon tes préférences.'),
    meal('dinner', 'Repas soir', '🌙', dinnerItems, `Préparation ${answers.cookingTime || 'modérée'}, budget ${answers.budgetLevel || 'standard'} et batch cooking ${answers.batchCooking || 'variable'}.`),
  ];
  const requestedMeals = Math.min(5, Math.max(3, Number(answers.mealCount) || 4));
  if (requestedMeals === 3) {
    plan[2].items.forEach((item, index) => plan[index % 2 === 0 ? 0 : 3].items.push({ ...item, id: `merged-${item.id}` }));
    plan = plan.filter(row => row.id !== 'snack');
  } else if (requestedMeals === 5) {
    const morningItems = [plan[0].items.pop()].filter(Boolean).map(item => ({ ...item, id: `morning-${item.id}` }));
    if (plan[2].items.length > 1) morningItems.push({ ...plan[2].items.shift(), id: 'morning-snack-protein' });
    plan.splice(1, 0, meal('morning-snack', 'Collation matin', '🍏', morningItems, 'Répartition demandée sur cinq prises.'));
  }
  return normalizePlan(assignMealTimes(plan, answers), target);
}

function shouldCreateHardMode(answers) {
  return Number(answers.trainingDays || 0) > 0 && answers.trainingDayPlan === 'yes';
}

function trainingTarget(target, answers) {
  const extra = ({ light: 100, moderate: 200, intense: 300 })[answers.trainingIntensity] || 200;
  return { ...target, cal: target.cal + extra, g: target.g + Math.round(extra / 4) };
}

const TRAINING_LABELS = { light: 'léger', moderate: 'modéré', intense: 'intense' };
const TRAINING_TIME_LABELS = { morning: 'matin', midday: 'midi', evening: 'soir', variable: 'horaire variable' };

function scalePlanForTraining(plan, answers) {
  const factor = answers.trainingIntensity === 'intense' ? 1.16 : answers.trainingIntensity === 'light' ? 1.05 : 1.1;
  const targetMeal = answers.trainingTime === 'morning' ? 'breakfast' : answers.trainingTime === 'midday' ? 'lunch' : answers.trainingTime === 'evening' ? 'dinner' : 'snack';
  return plan.map(row => ({ ...row, items: row.items.map(item => item.swappable === 'feculents' || (row.id === targetMeal && item.swappable === 'fruits') ? scaleItem(item, factor) : { ...item }) }));
}

function actualTarget(formulaTarget, plan) {
  const totals = sumPlan(plan);
  return { ...formulaTarget, cal: Math.round(totals.cal), p: Math.round(totals.p), g: Math.round(totals.g), l: Math.round(totals.l) };
}

function deficitProtocolFor(answers, startedAt) {
  return {
    status: answers.goal === 'gain' ? 'not_applicable' : 'locked',
    availableAt: new Date(new Date(startedAt).getTime() + DEFICIT_DELAY_DAYS * 86400000).toISOString(),
    delayDays: DEFICIT_DELAY_DAYS,
    durationDays: DEFICIT_DURATION_DAYS,
    warning: 'Protocole spécifique de 7 jours seulement. Ce n’est pas un mode permanent et il ne doit pas être prolongé automatiquement.',
  };
}

export function getSafetyBlockReason() { return ''; }

export function generateNutritionProfile(answers, userId, options = {}) {
  if (answers.processAcknowledged !== true) throw new Error('Tu dois d’abord comprendre et valider le processus de personnalisation.');
  if (answers.healthDataConsent !== true) throw new Error('Ton consentement est nécessaire pour créer et enregistrer le plan.');
  const startedAt = options.startedAt || new Date().toISOString();
  const formulaTarget = targetFromAnswers(answers);
  const standardPlan = buildStandardPlan(answers, formulaTarget, userId);
  const standardTarget = actualTarget(formulaTarget, standardPlan);
  const modes = { standard: { id: 'standard', label: 'Standard', emoji: '💼', desc: 'Journée habituelle personnalisée', target: standardTarget, plan: standardPlan } };
  if (shouldCreateHardMode(answers)) {
    const hardFormula = trainingTarget(formulaTarget, answers);
    const hardPlan = normalizePlan(scalePlanForTraining(standardPlan, answers), hardFormula);
    modes.hard = { id: 'hard', label: 'Hard', emoji: '🔥', desc: `Entraînement ${TRAINING_LABELS[answers.trainingIntensity] || 'modéré'} · ${TRAINING_TIME_LABELS[answers.trainingTime] || 'horaire variable'}`, target: actualTarget(hardFormula, hardPlan), plan: hardPlan };
  }
  return {
    user_id: userId,
    profile_id: `member-${userId}`,
    display_name: answers.firstName.trim(),
    questionnaire_json: {
      ...answers,
      personalizationVersion: PERSONALIZATION_VERSION,
      deficitProtocolNoticeVersion: Number(answers.deficitProtocolNoticeVersion || DEFICIT_NOTICE_VERSION),
      deficitProtocolNoticeAcknowledgedAt: answers.deficitProtocolNoticeAcknowledgedAt || answers.processAcknowledgedAt || startedAt,
    },
    onboarding_status: 'completed',
    calibration_json: {
      version: 4, experienceVersion: 2, personalizationVersion: PERSONALIZATION_VERSION,
      defaultMode: 'standard', phase: 'initial', startedAt, durationWeeks: 3,
      weighInDays: ['lundi', 'mercredi', 'samedi'],
      explanation: 'Trois mesures espacées révèlent la tendance réelle malgré l’eau, le sel, le transit et l’entraînement. Une valeur isolée ne déclenche jamais de correction.',
      target: standardTarget, formulaTarget, healthAdvisory: getHealthAdvisory(answers), deficitProtocol: deficitProtocolFor(answers, startedAt),
      phases: [
        { id: 'initial', label: 'Calibration initiale', startWeek: 1, endWeek: 3, weighInDays: ['lundi', 'mercredi', 'samedi'] },
        { id: 'adjustment', label: 'Ajustement progressif', startWeek: 4, endWeek: 8, weighInDays: ['lundi', 'samedi'] },
        { id: 'stabilization', label: 'Stabilisation et autonomie', startWeek: 9, weighInDays: ['lundi', 'samedi'] },
      ],
      adjustmentPolicy: { minimumMeasurements: 6, compareWeeklyAverages: true, maximumWeeklyChangeKcal: 100, maximumTotalChangeKcal: 200, coachReviewRecommended: true },
    },
    plan_modes_json: modes,
  };
}

export function needsPersonalizationUpgrade(profile) {
  return Boolean(profile?.profile_id?.startsWith('member-') && Number(profile.calibration_json?.personalizationVersion || 0) < PERSONALIZATION_VERSION);
}

export function needsDeficitProtocolNotice(profile) {
  return Boolean(
    profile?.profile_id?.startsWith('member-')
    && Number(profile.questionnaire_json?.deficitProtocolNoticeVersion || 0) < DEFICIT_NOTICE_VERSION
  );
}

export function previewPersonalizationUpgrade(profile, supplement) {
  const answers = {
    ...profile.questionnaire_json,
    ...supplement,
    firstName: supplement.firstName || profile.questionnaire_json?.firstName || profile.display_name || 'Membre',
    processAcknowledged: true,
    healthDataConsent: true,
  };
  const regenerated = generateNutritionProfile(answers, profile.user_id, { startedAt: profile.calibration_json?.startedAt || profile.updated_at || new Date().toISOString() });
  return {
    ...profile,
    display_name: regenerated.display_name,
    questionnaire_json: { ...answers, personalizationCompletedAt: new Date().toISOString(), personalizationVersion: PERSONALIZATION_VERSION },
    plan_modes_json: regenerated.plan_modes_json,
    calibration_json: {
      ...profile.calibration_json, ...regenerated.calibration_json,
      startedAt: profile.calibration_json?.startedAt || regenerated.calibration_json.startedAt,
      planRevision: Number(profile.calibration_json?.planRevision || 0) + 1,
      previousPlanPreservedInHistory: true,
    },
  };
}

export function getDeficitProtocolState(profile, now = new Date()) {
  const protocol = profile?.calibration_json?.deficitProtocol;
  if (!protocol || protocol.status === 'not_applicable') return { status: 'not_applicable' };
  if (protocol.status === 'completed') return { status: 'completed', completedAt: protocol.completedAt };
  if (protocol.status === 'active') {
    const endsAt = new Date(protocol.endsAt);
    if (now >= endsAt) return { status: 'expired', endsAt: protocol.endsAt };
    return { status: 'active', endsAt: protocol.endsAt, daysRemaining: Math.max(1, Math.ceil((endsAt - now) / 86400000)), warning: protocol.warning };
  }
  const availableAt = new Date(protocol.availableAt);
  if (now < availableAt) return { status: 'locked', availableAt: protocol.availableAt, daysRemaining: Math.ceil((availableAt - now) / 86400000) };
  return { status: 'available', durationDays: DEFICIT_DURATION_DAYS, warning: protocol.warning };
}

export function activateDeficitProtocol(profile, now = new Date()) {
  if (getDeficitProtocolState(profile, now).status !== 'available') throw new Error('Le protocole déficit n’est pas disponible pour le moment.');
  const standard = profile.plan_modes_json?.standard;
  if (!standard) throw new Error('Le mode Standard est introuvable.');
  const formula = profile.calibration_json?.formulaTarget || standard.target;
  const floor = Math.max(1400, Math.round(Number(formula.bmr || 0) * 1.08));
  const deficitFormula = { ...formula, cal: Math.max(floor, Math.round(Number(standard.target.cal) * 0.9)), p: Number(standard.target.p), l: Math.max(Math.round(Number(profile.questionnaire_json?.weight || 70) * 0.7), Math.round(Number(standard.target.l) * 0.88)) };
  deficitFormula.g = Math.max(80, Math.round((deficitFormula.cal - deficitFormula.p * 4 - deficitFormula.l * 9) / 4));
  const deficitPlan = normalizePlan(standard.plan, deficitFormula);
  const activatedAt = now.toISOString();
  const endsAt = new Date(now.getTime() + DEFICIT_DURATION_DAYS * 86400000).toISOString();
  return {
    ...profile,
    plan_modes_json: { ...profile.plan_modes_json, deficit: { id: 'deficit', label: 'Déficit · 7 jours', emoji: '📉', desc: 'Protocole spécifique et temporaire', target: actualTarget(deficitFormula, deficitPlan), plan: deficitPlan, protocolEndsAt: endsAt } },
    calibration_json: { ...profile.calibration_json, deficitProtocol: { ...profile.calibration_json.deficitProtocol, status: 'active', activatedAt, endsAt } },
  };
}

export function normalizeTimedProtocols(profile, now = new Date()) {
  if (getDeficitProtocolState(profile, now).status !== 'expired') return profile;
  const modes = { ...profile.plan_modes_json };
  delete modes.deficit;
  return { ...profile, plan_modes_json: modes, calibration_json: { ...profile.calibration_json, defaultMode: 'standard', deficitProtocol: { ...profile.calibration_json.deficitProtocol, status: 'completed', completedAt: now.toISOString() } } };
}

const MODE_EXPERIENCE = {
  standard: { label: 'Standard', emoji: '💼', desc: 'Journée habituelle' },
  training: { label: 'Hard', emoji: '🔥', desc: 'Journée avec entraînement' },
  hard: { label: 'Hard', emoji: '🔥', desc: 'Journée avec entraînement' },
  rest: { label: 'Déficit', emoji: '📉', desc: 'Ancien mode à remplacer par le questionnaire personnalisé' },
  deficit: { label: 'Déficit', emoji: '📉', desc: 'Journée allégée' },
};

export function upgradeNutritionProfileExperience(profile) {
  if (!profile?.plan_modes_json) return profile;
  const planModes = Object.fromEntries(Object.entries(profile.plan_modes_json).map(([key, mode]) => {
    const timedDeficit = (mode?.id === 'deficit' || key === 'deficit') && profile.calibration_json?.deficitProtocol?.status === 'active';
    const legacyMemberDeficit = (mode?.id === 'deficit' || key === 'deficit' || mode?.id === 'rest' || key === 'rest')
      && profile.profile_id?.startsWith('member-')
      && Number(profile.calibration_json?.personalizationVersion || 0) < PERSONALIZATION_VERSION;
    const experience = timedDeficit
      ? { label: 'Déficit · 7 jours', emoji: '📉', desc: 'Protocole spécifique et temporaire' }
      : legacyMemberDeficit
        ? { label: 'Déficit (ancien plan)', emoji: '📉', desc: 'À réévaluer avec le questionnaire complémentaire' }
      : MODE_EXPERIENCE[mode?.id] || MODE_EXPERIENCE[key] || {};
    return [key, { ...mode, ...experience, plan: (mode?.plan || []).map(row => ({ ...row, color: row.color || 'from-violet-50 to-indigo-50', border: row.border || 'border-violet-200', items: (row.items || []).map(item => ({ ...item, swappable: item.swappable || 'protein' })) })) }];
  }));
  return { ...profile, calibration_json: { ...(profile.calibration_json || {}), version: Math.max(3, Number(profile.calibration_json?.version || 0)), experienceVersion: Math.max(1, Number(profile.calibration_json?.experienceVersion || 0)), defaultMode: profile.calibration_json?.defaultMode || 'standard' }, plan_modes_json: planModes };
}
