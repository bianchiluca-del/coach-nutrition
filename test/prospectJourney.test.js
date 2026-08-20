import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdjustmentRecommendation, getProspectPhase, getWeighInReminder } from '../src/lib/prospectJourney.js';

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

test('aucun ajustement n’est proposé sur trop peu de mesures', () => {
  const result = getAdjustmentRecommendation('loss', [{ date: '2026-08-01', poids: 80 }]);
  assert.equal(result.ready, false);
  assert.equal(result.kcal, 0);
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
