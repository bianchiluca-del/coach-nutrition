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
  const factors = { sedentary: 1.25, light: 1.4, active: 1.58, veryActive: 1.75 };
  let calories = bmr * (factors[a.activity] || 1.4);
  if (a.goal === 'loss') calories -= 300;
  if (a.goal === 'gain') calories += 250;
  calories = Math.round(Math.max(bmr * 1.08, calories) / 25) * 25;
  const protein = Math.round(weight * (a.goal === 'gain' ? 1.9 : 1.8));
  const fat = Math.round(weight * 0.8);
  const carbs = Math.max(80, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { cal: calories, p: protein, g: carbs, l: fat, bmr: Math.round(bmr) };
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
  for (let pass = 0; pass < 4; pass += 1) {
    let totals = sumPlan(next);
    const proteinItems = next.flatMap(m => m.items).filter(i => i.swappable === 'protein');
    const proteinNow = proteinItems.reduce((n, i) => n + i.p, 0);
    const otherProtein = totals.p - proteinNow;
    const proteinFactor = Math.max(0.65, Math.min(1.35, (target.p - otherProtein) / Math.max(1, proteinNow)));
    next = next.map(m => ({ ...m, items: m.items.map(i => i.swappable === 'protein' ? scaleItem(i, proteinFactor) : i) }));

    totals = sumPlan(next);
    const carbItems = next.flatMap(m => m.items).filter(i => i.swappable !== 'protein' && !i.name.includes('Huile') && i.g > i.p && i.g > i.l);
    const carbNow = carbItems.reduce((n, i) => n + i.g, 0);
    const otherCarbs = totals.g - carbNow;
    const carbFactor = Math.max(0.65, Math.min(1.4, (target.g - otherCarbs) / Math.max(1, carbNow)));
    next = next.map(m => ({ ...m, items: m.items.map(i => carbItems.some(c => c.id === i.id) ? scaleItem(i, carbFactor) : i) }));

    totals = sumPlan(next);
    const oilItems = next.flatMap(m => m.items).filter(i => i.name.includes('Huile'));
    const oilFat = oilItems.reduce((n, i) => n + i.l, 0);
    const otherFat = totals.l - oilFat;
    const fatFactor = Math.max(0.2, Math.min(2.5, (target.l - otherFat) / Math.max(1, oilFat)));
    next = next.map(m => ({ ...m, items: m.items.map(i => i.name.includes('Huile') ? scaleItem(i, fatFactor) : i) }));
  }
  return next;
}

function buildStandardPlan(a, target) {
  const habits = `${a.breakfastHabit || ''} ${a.foodHabits || ''}`;
  const breakfast = [];
  const reasons = [];
  if (contains(habits, ['oeuf', 'œuf'])) breakfast.push(foodItem('eggs', 3, 'habit-eggs'));
  else breakfast.push(foodItem('skyr', 200, 'breakfast-skyr'));
  if (contains(habits, ['banane'])) breakfast.push(foodItem('banana', 120, 'habit-banana'));
  else breakfast.push(foodItem('fruit', 150, 'breakfast-fruit'));
  if (contains(habits, ['miel', 'confiture', 'sirop'])) {
    breakfast.push(foodItem('compote', 100, 'optimized-sweet'));
    reasons.push('Le miel/confiture est remplacé par une compote sans sucre : même rôle sucré, moins dense en calories.');
  } else if (contains(habits, ['avoine', 'porridge', 'muesli'])) breakfast.push(foodItem('oats', 45, 'habit-oats'));
  else breakfast.push(foodItem('oats', 40, 'breakfast-oats'));
  const breakfastProtein = breakfast.reduce((n, i) => n + i.p, 0);
  if (breakfastProtein < target.p * 0.22) {
    breakfast.push(foodItem('chickenHam', 80, 'protein-balance'));
    reasons.push('Du jambon blanc de poulet complète les protéines du petit déjeuner sans bouleverser tes habitudes.');
  }

  const lunchCarb = contains(a.foodHabits, ['pomme de terre', 'patate']) ? 'potato' : 'rice';
  const plan = [
    meal('breakfast', 'Petit déjeuner', '☕', breakfast, reasons.join(' ')),
    meal('lunch', 'Repas midi', '🍽️', [foodItem('chicken', 160), foodItem(lunchCarb, lunchCarb === 'potato' ? 300 : 200), foodItem('vegetables', 250), foodItem('oliveOil', 10)], 'Repas complet construit autour de tes habitudes.'),
    meal('snack', 'Goûter', '🍌', [foodItem('skyr', 200), foodItem('fruit', 180), foodItem('oats', 25)], 'Collation simple, rapide et protéinée.'),
    meal('dinner', 'Repas soir', '🌙', [foodItem('salmon', 140), foodItem('potato', 280), foodItem('vegetables', 300), foodItem('oliveOil', 5)], 'Dîner rassasiant avec protéines, fibres et lipides utiles.'),
  ];

  let totals = sumPlan(plan);
  const carbDelta = target.g - totals.g;
  if (Math.abs(carbDelta) > 8) {
    const rice = plan[1].items.find(i => i.name.includes('Riz'));
    if (rice) {
      const nextAmount = Math.max(80, 200 + carbDelta / 0.28);
      Object.assign(rice, foodItem('rice', nextAmount, rice.id));
    }
  }
  totals = sumPlan(plan);
  const proteinDelta = target.p - totals.p;
  if (proteinDelta > 8) plan[2].items.push(foodItem('whey', Math.min(35, proteinDelta / 0.84), 'protein-adjustment'));
  return normalizePlan(plan, target);
}

function scalePlan(plan, factor, suffix) {
  return plan.map(mealRow => ({
    ...mealRow,
    id: `${mealRow.id}-${suffix}`,
    items: mealRow.items.map(item => {
      if (item.swappable === 'protein' || item.name.includes('Légumes')) return { ...item, id: `${item.id}-${suffix}` };
      const amount = parseFloat(item.qty);
      if (!Number.isFinite(amount)) return { ...item, id: `${item.id}-${suffix}` };
      return { ...item, id: `${item.id}-${suffix}`, qty: `${round1(amount * factor)} ${item.qty.replace(/[\d.,\s]/g, '') || 'g'}`, cal: round1(item.cal * factor), p: round1(item.p * factor), g: round1(item.g * factor), l: round1(item.l * factor) };
    }),
  }));
}

export function generateNutritionProfile(answers, userId) {
  const target = targetFromAnswers(answers);
  const standardPlan = buildStandardPlan(answers, target);
  const trainingTarget = { ...target, cal: target.cal + 200, g: target.g + 50 };
  const restTarget = { ...target, cal: Math.max(1400, target.cal - 150), g: Math.max(80, target.g - 38) };
  const profileId = `member-${userId}`;
  const trainingPlan = normalizePlan(scalePlan(standardPlan, 1.08, 'training'), trainingTarget);
  const restPlan = normalizePlan(scalePlan(standardPlan, 0.94, 'rest'), restTarget);
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
      phase: 'initial', durationWeeks: 3, weighInDays: ['lundi', 'mercredi', 'samedi'],
      explanation: 'Trois mesures espacées révèlent la tendance réelle malgré l’eau, le sel, le transit et l’entraînement. Une valeur isolée ne déclenche jamais de correction.',
      target: standardActual,
    },
    plan_modes_json: {
      standard: { id: 'standard', label: 'Standard', emoji: '💼', desc: 'Journée habituelle', target: standardActual, plan: standardPlan },
      training: { id: 'training', label: 'Training', emoji: '🔥', desc: 'Journée avec entraînement', target: trainingActual, plan: trainingPlan },
      rest: { id: 'rest', label: 'Repos', emoji: '🌿', desc: 'Journée moins active', target: restActual, plan: restPlan },
    },
  };
}
