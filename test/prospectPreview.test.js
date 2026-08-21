import test from 'node:test';
import assert from 'node:assert/strict';
import { createProspectPreviewProfile, isCoachProspectPreview } from '../src/lib/prospectPreview.js';

test('l’aperçu prospect est réservé au compte coach', () => {
  assert.equal(isCoachProspectPreview('?preview=prospect', { is_coach: true }), true);
  assert.equal(isCoachProspectPreview('?preview=prospect', { is_coach: false }), false);
  assert.equal(isCoachProspectPreview('', { is_coach: true }), false);
});

test('l’aperçu utilise un profil fictif complet avec les mêmes trois modes', () => {
  const profile = createProspectPreviewProfile();
  assert.equal(profile.display_name, 'Thomas');
  assert.deepEqual(Object.values(profile.plan_modes_json).map(mode => mode.id), ['standard', 'hard', 'deficit']);
  for (const mode of Object.values(profile.plan_modes_json)) {
    assert.equal(mode.plan.length, 4);
    assert.ok(mode.plan.every(meal => meal.items.every(item => item.swappable)));
  }
});
