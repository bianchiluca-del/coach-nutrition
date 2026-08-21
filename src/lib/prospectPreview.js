import { generateNutritionProfile } from './onboardingPlan.js';

const PREVIEW_USER_ID = '00000000-0000-0000-0000-000000000099';

export function isCoachProspectPreview(search, accessContext) {
  return new URLSearchParams(search || '').get('preview') === 'prospect'
    && accessContext?.is_coach === true;
}

export function createProspectPreviewProfile() {
  return generateNutritionProfile({
    firstName: 'Thomas',
    birthDate: '1992-04-12',
    sex: 'male',
    height: 181,
    weight: 82,
    goal: 'loss',
    activity: 'active',
    jobActivity: 'mixed',
    steps: '8500',
    trainingDays: '4',
    mealCount: '4',
    breakfastHabit: 'Skyr, flocons d’avoine et banane',
    foodHabits: 'Poulet, riz, légumes, saumon et pommes de terre',
    allergies: '',
    exclusions: '',
    medical: '',
    digestion: '',
    processAcknowledged: true,
    healthDataConsent: true,
  }, PREVIEW_USER_ID);
}
