const normalizeText = value => String(value || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, ' ').trim();

const NO_ISSUE = /^(aucun|aucune|rien|neant|ras|non)$/;

const meaningful = value => {
  const raw = String(value || '').trim();
  return raw && !NO_ISSUE.test(normalizeText(raw)) ? raw.slice(0, 800) : '';
};

export function hasRelevantHealthContext(questionnaire = {}) {
  return Boolean([
    questionnaire.allergies,
    questionnaire.exclusions,
    questionnaire.medical,
    questionnaire.digestion,
  ].some(value => meaningful(value)));
}

export function buildAiHealthContext(questionnaire = {}, consentGranted = false) {
  if (!consentGranted) return '';
  const context = Object.fromEntries([
    ['allergies_intolerances', meaningful(questionnaire.allergies)],
    ['aliments_exclus', meaningful(questionnaire.exclusions)],
    ['sante_traitements', meaningful(questionnaire.medical)],
    ['digestion', meaningful(questionnaire.digestion)],
  ].filter(([, value]) => value));
  return Object.keys(context).length ? JSON.stringify(context) : '';
}

export function getHealthAdvisory(questionnaire = {}) {
  if (!hasRelevantHealthContext(questionnaire)) return '';
  return 'Tes informations sont prises en compte sans bloquer ton plan. L’application et son IA ne posent pas de diagnostic et ne remplacent pas un médecin. Si une maladie, un traitement ou un symptôme persistant n’a jamais été évalué, il est conseillé d’en parler à un professionnel de santé.';
}
