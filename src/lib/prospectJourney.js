const DAY_MS = 24 * 60 * 60 * 1000;

const PHASES = {
  initial: {
    id: 'initial', label: 'Calibration initiale', weeks: 'Semaines 1 à 3',
    weighInDays: [1, 3, 6], weighInLabels: ['lundi', 'mercredi', 'samedi'],
    description: 'Trois pesées espacées pour distinguer la tendance réelle des variations d’eau et de transit.',
  },
  adjustment: {
    id: 'adjustment', label: 'Ajustement progressif', weeks: 'Semaines 4 à 8',
    weighInDays: [1, 6], weighInLabels: ['lundi', 'samedi'],
    description: 'Les moyennes sont comparées. Les quantités évoluent par petits paliers, jamais sur une pesée isolée.',
  },
  stabilization: {
    id: 'stabilization', label: 'Stabilisation et autonomie', weeks: 'À partir de la semaine 9',
    weighInDays: [1, 6], weighInLabels: ['lundi', 'samedi (facultatif)'],
    description: 'La routine est stable : une pesée hebdomadaire suffit, la seconde reste facultative.',
  },
};

const safeDate = value => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
};

const localDateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const validWeightPoints = measurements => measurements
  .map(item => ({ date: safeDate(`${item.date || ''}T12:00:00`) || safeDate(item.date), weight: Number(item.poids) }))
  .filter(item => item.date && Number.isFinite(item.weight) && item.weight > 20 && item.weight < 350)
  .sort((a, b) => a.date - b.date);

const average = rows => rows.reduce((sum, row) => sum + row.weight, 0) / rows.length;

export function normalizeCalibration(calibration = {}, fallbackStartedAt) {
  const startedAt = safeDate(calibration.startedAt) || safeDate(fallbackStartedAt) || new Date();
  return {
    ...calibration,
    version: 2,
    startedAt: startedAt.toISOString(),
    phase: calibration.phase || 'initial',
    durationWeeks: 3,
    weighInDays: ['lundi', 'mercredi', 'samedi'],
    phases: calibration.phases || [
      { id: 'initial', startWeek: 1, endWeek: 3 },
      { id: 'adjustment', startWeek: 4, endWeek: 8 },
      { id: 'stabilization', startWeek: 9 },
    ],
  };
}

export function getProspectPhase(calibration = {}, now = new Date()) {
  const normalized = normalizeCalibration(calibration, calibration.updatedAt);
  const startedAt = new Date(normalized.startedAt);
  const elapsedDays = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / DAY_MS));
  const week = Math.floor(elapsedDays / 7) + 1;
  const phaseId = week <= 3 ? 'initial' : week <= 8 ? 'adjustment' : 'stabilization';
  return { ...PHASES[phaseId], week, elapsedDays, startedAt: normalized.startedAt };
}

export function getWeightTrend(measurements = []) {
  const points = validWeightPoints(measurements);
  if (points.length < 6) return { ready: false, count: points.length };
  const recent = points.slice(-8);
  const split = Math.max(2, Math.floor(recent.length / 2));
  const firstGroup = recent.slice(0, split);
  const secondGroup = recent.slice(split);
  if (secondGroup.length < 2) return { ready: false, count: points.length };
  const firstAverage = average(firstGroup);
  const lastAverage = average(secondGroup);
  const spanWeeks = Math.max(1, (secondGroup.at(-1).date - firstGroup[0].date) / (7 * DAY_MS));
  const percentPerWeek = ((lastAverage - firstAverage) / firstAverage) * 100 / spanWeeks;
  return {
    ready: true,
    count: points.length,
    firstAverage: Math.round(firstAverage * 10) / 10,
    lastAverage: Math.round(lastAverage * 10) / 10,
    percentPerWeek: Math.round(percentPerWeek * 100) / 100,
  };
}

export function getWeighInAction(calibration = {}, measurements = [], now = new Date()) {
  const phase = getProspectPhase(calibration, now);
  const requiredDays = phase.id === 'stabilization' ? [1] : phase.weighInDays;
  if (!requiredDays.includes(now.getDay())) return null;
  const dateKey = localDateKey(now);
  const alreadyRecorded = measurements.some(item => item.date === dateKey && Number(item.poids) > 20 && Number(item.poids) < 350);
  if (alreadyRecorded) return null;
  return {
    dateKey,
    dayLabel: now.toLocaleDateString('fr-FR', { weekday: 'long' }),
    phase,
  };
}

const adherenceMetric = (dailyEntries, key) => {
  const values = Object.values(dailyEntries || {}).map(entry => entry?.[key]).filter(value => value === 'ok' || value === 'ecart');
  if (!values.length) return null;
  return {
    count: values.length,
    percent: Math.round((values.filter(value => value === 'ok').length / values.length) * 100),
  };
};

export function getProgressReport({ calibration = {}, goal = 'maintenance', measurements = [], dailyEntries = {}, now = new Date() } = {}) {
  const phase = getProspectPhase(calibration, now);
  const startedAt = new Date(phase.startedAt);
  const startedDay = new Date(startedAt.getFullYear(), startedAt.getMonth(), startedAt.getDate());
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const points = validWeightPoints(measurements).filter(point => point.date >= startedDay && point.date < tomorrow);
  const phaseEntries = Object.fromEntries(Object.entries(dailyEntries || {}).filter(([dateKey]) => {
    const date = safeDate(`${dateKey}T12:00:00`);
    return date && date >= startedDay && date < tomorrow;
  }));
  const spanDays = points.length > 1 ? Math.round((points.at(-1).date - points[0].date) / DAY_MS) : 0;
  const readiness = {
    available: phase.week >= 9 && points.length >= 9 && spanDays >= 35,
    phaseComplete: phase.week >= 9,
    measurementCount: points.length,
    requiredMeasurements: 9,
    spanDays,
    requiredSpanDays: 35,
  };
  if (!readiness.available) return readiness;

  const firstAverage = average(points.slice(0, 3));
  const lastAverage = average(points.slice(-3));
  const totalDelta = lastAverage - firstAverage;
  const spanWeeks = Math.max(1, spanDays / 7);
  const percentPerWeek = ((lastAverage - firstAverage) / firstAverage) * 100 / spanWeeks;
  const successiveChanges = points.slice(1).map((point, index) => Math.abs(point.weight - points[index].weight) / points[index].weight * 100);
  const averageVariation = successiveChanges.length ? successiveChanges.reduce((sum, value) => sum + value, 0) / successiveChanges.length : 0;
  const diet = adherenceMetric(phaseEntries, 'diet');
  const training = adherenceMetric(phaseEntries, 'training');
  const calorieValues = Object.values(phaseEntries).map(entry => Number(entry?.calJournal)).filter(value => Number.isFinite(value) && value > 500);
  const findings = [];

  const roundedWeekly = Math.round(percentPerWeek * 100) / 100;
  if (goal === 'loss') {
    if (roundedWeekly > -0.15) findings.push({ level: 'warning', title: 'Perte plus lente que prévu', text: 'La tendance ne baisse pas encore assez pour confirmer le déficit. Vérifie surtout la régularité des journées et les portions réellement consommées.' });
    else if (roundedWeekly < -1) findings.push({ level: 'warning', title: 'Perte rapide', text: 'La baisse dépasse 1 % par semaine. La priorité est de vérifier énergie, récupération et maintien des performances avant toute nouvelle réduction.' });
    else findings.push({ level: 'success', title: 'Perte progressive', text: 'La moyenne évolue dans une zone prudente et cohérente avec l’objectif.' });
  } else if (goal === 'gain') {
    if (roundedWeekly < 0.1) findings.push({ level: 'warning', title: 'Prise plus lente que prévu', text: 'La moyenne progresse peu. La régularité alimentaire et la récupération sont les premières pistes à vérifier.' });
    else if (roundedWeekly > 0.6) findings.push({ level: 'warning', title: 'Prise rapide', text: 'La hausse dépasse la zone prudente. Vérifie les portions et les écarts répétés avant d’augmenter davantage.' });
    else findings.push({ level: 'success', title: 'Prise progressive', text: 'La moyenne évolue dans une zone cohérente avec une prise contrôlée.' });
  } else if (Math.abs(roundedWeekly) <= 0.5) {
    findings.push({ level: 'success', title: 'Poids globalement stable', text: 'La tendance reste compatible avec un objectif de maintien.' });
  } else {
    findings.push({ level: 'warning', title: 'Écart par rapport au maintien', text: 'La moyenne évolue au-delà de la zone de stabilité. Vérifie la régularité alimentaire et l’activité réelle.' });
  }

  if (diet && diet.count >= 5) findings.push(diet.percent >= 70
    ? { level: 'success', title: `Régularité alimentaire ${diet.percent} %`, text: 'Les journées renseignées montrent une base suffisamment régulière pour interpréter la tendance.' }
    : { level: 'warning', title: `Régularité alimentaire ${diet.percent} %`, text: 'Les écarts déclarés peuvent expliquer une partie de la tendance. C’est la première piste concrète à travailler.' });
  if (training && training.count >= 5) findings.push(training.percent >= 70
    ? { level: 'success', title: `Entraînements réalisés ${training.percent} %`, text: 'La régularité d’entraînement soutient l’interprétation du résultat.' }
    : { level: 'warning', title: `Entraînements réalisés ${training.percent} %`, text: 'Le volume réel est inférieur au rythme déclaré. Les besoins peuvent donc différer de l’estimation initiale.' });
  if (!diet || diet.count < 5) findings.push({ level: 'info', title: 'Régularité alimentaire à compléter', text: 'Moins de 5 journées ont un statut alimentaire. Le rapport ne peut pas encore relier clairement la tendance aux écarts déclarés.' });
  if (!training || training.count < 5) findings.push({ level: 'info', title: 'Régularité d’entraînement à compléter', text: 'Moins de 5 journées ont un statut d’entraînement. Cette piste reste donc incertaine.' });
  if (calorieValues.length >= 7) {
    const calorieAverage = calorieValues.reduce((sum, value) => sum + value, 0) / calorieValues.length;
    const calorieVariance = calorieValues.reduce((sum, value) => sum + ((value - calorieAverage) ** 2), 0) / calorieValues.length;
    const calorieVariation = Math.sqrt(calorieVariance) / calorieAverage;
    if (calorieVariation > 0.2) findings.push({ level: 'warning', title: 'Apports enregistrés irréguliers', text: 'Les calories des journées renseignées varient fortement. Vérifie si cela vient d’écarts réels ou de journées incomplètement enregistrées.' });
  }
  if (averageVariation > 1.2) findings.push({ level: 'info', title: 'Variations quotidiennes importantes', text: 'Les écarts brefs sont élevés. Eau, sel, transit, sommeil ou entraînement peuvent brouiller une pesée isolée ; les moyennes restent la référence.' });

  return {
    ...readiness,
    firstAverage: Math.round(firstAverage * 10) / 10,
    lastAverage: Math.round(lastAverage * 10) / 10,
    totalDelta: Math.round(totalDelta * 10) / 10,
    percentPerWeek: roundedWeekly,
    dietAdherence: diet,
    trainingAdherence: training,
    findings,
    summary: `Depuis le début de l’accompagnement, la moyenne est passée de ${firstAverage.toFixed(1)} à ${lastAverage.toFixed(1)} kg (${totalDelta >= 0 ? '+' : ''}${totalDelta.toFixed(1)} kg).`,
  };
}

export function getAdjustmentRecommendation(goal, measurements = []) {
  const trend = getWeightTrend(measurements);
  if (!trend.ready) return { ...trend, kcal: 0, message: 'Il faut 6 pesées pour former deux moyennes de 3 avant la première suggestion. L’objectif complet reste 9 pesées sur les 3 semaines de calibration.' };
  let kcal = 0;
  if (goal === 'loss') {
    if (trend.percentPerWeek > -0.15) kcal = -100;
    if (trend.percentPerWeek < -1) kcal = 100;
  } else if (goal === 'gain') {
    if (trend.percentPerWeek < 0.1) kcal = 100;
    if (trend.percentPerWeek > 0.6) kcal = -100;
  } else {
    if (trend.percentPerWeek > 0.5) kcal = -100;
    if (trend.percentPerWeek < -0.5) kcal = 100;
  }
  return {
    ...trend,
    kcal,
    message: kcal === 0
      ? 'La tendance est dans la zone attendue : les quantités restent identiques.'
      : `La tendance justifie un palier prudent de ${kcal > 0 ? '+' : ''}${kcal} kcal, à confirmer avec le coach.`,
  };
}

export function getWeighInReminder(calibration = {}, now = new Date()) {
  const phase = getProspectPhase(calibration, now);
  if (now.getHours() < 18) return null;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const requiredDays = phase.id === 'stabilization' ? [1] : phase.weighInDays;
  if (!requiredDays.includes(tomorrow.getDay())) return null;
  return {
    dateKey: `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`,
    dayLabel: tomorrow.toLocaleDateString('fr-FR', { weekday: 'long' }),
    phase,
  };
}

export const PROSPECT_PHASES = PHASES;
