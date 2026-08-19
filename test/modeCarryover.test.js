import assert from 'node:assert/strict';
import test from 'node:test';
import { transferModeConsumption } from '../src/lib/modeCarryover.js';

test('un changement de mode conserve consommé, sauté et quantité réelle', () => {
  const sourcePlan = [{ id: 'gouter', name: 'Goûter', items: [
    { id: 'miel', name: 'Miel', qty: '20 g', cal: 60, p: 0, g: 15, l: 0 },
    { id: 'compote', name: 'Compote de pomme', qty: '100 g', cal: 50, p: 0, g: 12, l: 0 },
    { id: 'skyr', name: 'Skyr', qty: '100 g', cal: 60, p: 10, g: 4, l: 0 },
  ] }];
  const destinationPlan = [{ id: 'gouter', name: 'Goûter', items: [
    { id: 'miel', name: 'Miel', qty: '20 g', cal: 60, p: 0, g: 15, l: 0 },
    { id: 'compote', name: 'Compote de pomme', qty: '100 g', cal: 50, p: 0, g: 12, l: 0 },
    { id: 'skyr', name: 'Skyr', qty: '100 g', cal: 60, p: 10, g: 4, l: 0 },
  ] }];

  const result = transferModeConsumption({
    sourcePlan,
    sourceStatus: { 'gouter-miel': 'done', 'gouter-compote': 'skip', 'gouter-skyr': 'done' },
    sourceRealQty: { 'gouter-skyr': 150 },
    destinationPlan,
    consumed: { cal: 150, p: 15, g: 21, l: 0 },
    currentMode: 'hard',
  });

  assert.equal(result.status['gouter-miel'], 'done');
  assert.equal(result.status['gouter-compote'], 'skip');
  assert.equal(result.status['gouter-skyr'], 'done');
  assert.equal(result.realQty['gouter-skyr'], 150);
  assert.equal(result.realQty.__modeCarryover.matchedItems, 2);
  assert.equal(result.realQty.__modeCarryover.totalCal, 150);
  assert.equal(result.realQty.__modeCarryover.cal, 0);
});
