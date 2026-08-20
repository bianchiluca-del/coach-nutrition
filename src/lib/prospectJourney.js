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
  const points = measurements
    .map(item => ({ date: safeDate(`${item.date || ''}T12:00:00`) || safeDate(item.date), weight: Number(item.poids) }))
    .filter(item => item.date && Number.isFinite(item.weight) && item.weight > 20 && item.weight < 350)
    .sort((a, b) => a.date - b.date);
  if (points.length < 6) return { ready: false, count: points.length };
  const recent = points.slice(-8);
  const split = Math.max(2, Math.floor(recent.length / 2));
  const firstGroup = recent.slice(0, split);
  const secondGroup = recent.slice(split);
  if (secondGroup.length < 2) return { ready: false, count: points.length };
  const average = rows => rows.reduce((sum, row) => sum + row.weight, 0) / rows.length;
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

export function getAdjustmentRecommendation(goal, measurements = []) {
  const trend = getWeightTrend(measurements);
  if (!trend.ready) return { ...trend, kcal: 0, message: 'Au moins 6 pesées sont nécessaires avant toute correction.' };
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
  if (!phase.weighInDays.includes(tomorrow.getDay())) return null;
  return {
    dateKey: `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`,
    dayLabel: tomorrow.toLocaleDateString('fr-FR', { weekday: 'long' }),
    phase,
  };
}

export const PROSPECT_PHASES = PHASES;
