import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdjustmentRecommendation, getProgressReport, getProspectPhase, getWeighInAction, getWeighInReminder } from '../src/lib/prospectJourney.js';

const calibration = { startedAt: '2026-08-03T08:00:00.000Z', version: 2 };

test('les trois phases avancent automatiquement selon la semaine', () => {
  assert.equal(getProspectPhase(calibration, new Date('2026-08-10T12:00:00Z')).id, 'initial');
  assert.equal(getProspectPhase(calibration, new Date('2026-08-31T12:00:00Z')).id, 'adjustment');
  assert.equal(getProspectPhase(calibration, new Date('2026-10-05T12:00:00Z')).id, 'stabilization');
});

test('le rappel apparaît la veille au soir, jamais avant 18 h', () => {
  assert.equal(getWeighInReminder(calibration, new Date(2026, 7, 18, 17, 30)), null);
});

test('le rappel apparaît le mardi soir pour la pesée du mercredi', () => {
  const reminder = getWeighInReminder(calibration, new Date(2026, 7, 18, 19, 0));
  assert.equal(reminder?.dateKey, '2026-08-19');
});

test('la carte de pesée apparaît seulement le jour requis puis disparaît après saisie', () => {
  const monday = new Date(2026, 7, 10, 8, 0);
  assert.equal(getWeighInAction(calibration, [], monday)?.dateKey, '2026-08-10');
  assert.equal(getWeighInAction(calibration, [{ date: '2026-08-10', poids: 80 }], monday), null);
  assert.equal(getWeighInAction(calibration, [], new Date(2026, 7, 11, 8, 0)), null);
});

test('la pesée facultative du samedi ne déclenche plus de carte en phase 3', () => {
  assert.equal(getWeighInAction(calibration, [], new Date(2026, 9, 3, 8, 0)), null);
});

test('aucun ajustement n’est proposé sur trop peu de mesures', () => {
  const result = getAdjustmentRecommendation('loss', [{ date: '2026-08-01', poids: 80 }]);
  assert.equal(result.ready, false);
  assert.equal(result.kcal, 0);
  assert.match(result.message, /deux moyennes de 3/);
});

test('une tendance insuffisante en perte déclenche seulement un petit palier', () => {
  const result = getAdjustmentRecommendation('loss', [
    { date: '2026-08-01', poids: 80 }, { date: '2026-08-04', poids: 80.1 },
    { date: '2026-08-08', poids: 80 }, { date: '2026-08-11', poids: 80 },
    { date: '2026-08-15', poids: 80.1 }, { date: '2026-08-18', poids: 80 },
  ]);
  assert.equal(result.ready, true);
  assert.equal(result.kcal, -100);
});

const phaseMeasurements = [
  ['2026-08-03', 80], ['2026-08-08', 79.9], ['2026-08-15', 79.7],
  ['2026-08-22', 79.2], ['2026-08-29', 78.9], ['2026-09-05', 78.6],
  ['2026-09-12', 78.3], ['2026-09-19', 78], ['2026-09-26', 77.8],
].map(([date, poids], index) => ({ id: `m-${index}`, date, poids }));

test('le rapport reste indisponible avant la fin de la phase 2', () => {
  const report = getProgressReport({ calibration, goal: 'loss', measurements: phaseMeasurements, now: new Date('2026-09-20T12:00:00Z') });
  assert.equal(report.available, false);
  assert.equal(report.phaseComplete, false);
});

test('le rapport de phase 2 utilise poids, alimentation et entraînement sans IA', () => {
  const dailyEntries = Object.fromEntries(phaseMeasurements.map((entry, index) => [entry.date, {
    diet: index < 6 ? 'ecart' : 'ok',
    training: index < 7 ? 'ok' : 'ecart',
  }]));
  const report = getProgressReport({ calibration, goal: 'loss', measurements: phaseMeasurements, dailyEntries, now: new Date('2026-10-05T12:00:00Z') });
  assert.equal(report.available, true);
  assert.equal(report.measurementCount, 9);
  assert.ok(report.totalDelta < 0);
  assert.ok(report.findings.some(finding => /Régularité alimentaire/.test(finding.title) && finding.level === 'warning'));
  assert.ok(report.findings.some(finding => /Entraînements réalisés/.test(finding.title)));
});

test('des pesées ajoutées en phase 3 peuvent compléter un rapport encore insuffisant', () => {
  const lateMeasurements = phaseMeasurements.slice(0, 7).concat([
    { id: 'late-1', date: '2026-10-03', poids: 77.7 },
    { id: 'late-2', date: '2026-10-10', poids: 77.6 },
  ]);
  const report = getProgressReport({ calibration, goal: 'loss', measurements: lateMeasurements, now: new Date('2026-10-12T12:00:00Z') });
  assert.equal(report.available, true);
  assert.equal(report.measurementCount, 9);
  assert.match(report.summary, /Depuis le début de l’accompagnement/);
});
