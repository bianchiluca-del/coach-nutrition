import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAiHealthContext, getHealthAdvisory, hasRelevantHealthContext } from '../src/lib/healthContext.js';

const questionnaire = {
  allergies: 'Arachides',
  exclusions: 'aucun',
  medical: 'Asthme sous traitement',
  digestion: 'Reflux occasionnel',
};

test('un contexte santé déclaré déclenche un avertissement non bloquant', () => {
  assert.equal(hasRelevantHealthContext(questionnaire), true);
  assert.match(getHealthAdvisory(questionnaire), /sans bloquer ton plan/);
});

test('aucune donnée santé n’est préparée pour l’IA sans consentement explicite', () => {
  assert.equal(buildAiHealthContext(questionnaire, false), '');
});

test('seuls les quatre champs utiles sont transmis après consentement', () => {
  const context = JSON.parse(buildAiHealthContext(questionnaire, true));
  assert.deepEqual(context, {
    allergies_intolerances: 'Arachides',
    sante_traitements: 'Asthme sous traitement',
    digestion: 'Reflux occasionnel',
  });
  assert.equal('weight' in context, false);
  assert.equal('measurements' in context, false);
});
