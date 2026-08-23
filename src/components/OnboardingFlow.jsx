import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, LogOut, Ruler, Scale, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { generateNutritionProfile, PERSONALIZATION_OPTIONS, proteinOptionsForDietaryStyle } from '../lib/onboardingPlan';
import { saveNutritionProfile } from '../lib/cloudSync';
import { setCoachDataConsent } from '../lib/coachAccess';

const initial = {
  firstName: '', birthDate: '', sex: 'male', height: '', weight: '', goal: 'maintenance',
  activity: 'light', trainingDays: '3', steps: '', jobActivity: 'mixed', sleep: '7',
  trainingIntensity: 'moderate', trainingTime: 'evening', trainingDayPlan: '',
  breakfastHabit: '', foodHabits: '', breakfastType: 'mixed', mealCount: '4',
  dietaryStyle: 'omnivore', preferredProteins: [], preferredCarbs: [], preferredSnacks: [],
  dislikedFoods: '', wakeTime: '07:00', sleepTime: '23:00',
  cookingTime: 'moderate', budgetLevel: 'standard', batchCooking: 'sometimes',
  workMealAccess: 'microwave', shoppingFrequency: 'weekly',
  allergies: '', exclusions: '', medical: '', digestion: '', constraints: '',
  waist: '', hips: '', chest: '', arm: '', thigh: '',
  processAcknowledged: false, processAcknowledgedAt: '',
  aiHealthContextConsent: false, aiHealthContextConsentAt: '',
  healthDataConsent: false, coachDataConsent: false,
};

const steps = [
  { title: 'Ton objectif', subtitle: 'Les données qui définissent le point de départ.' },
  { title: 'Ton activité réelle', subtitle: 'Le mode entraînement n’existe que s’il correspond à ta semaine.' },
  { title: 'Tes habitudes alimentaires', subtitle: 'Tes aliments et ton nombre de prises doivent réellement te ressembler.' },
  { title: 'Ton organisation', subtitle: 'Temps, budget, travail et contraintes guident les propositions.' },
  { title: 'Mesures guidées', subtitle: 'Un point de départ reproductible, sans photo.' },
  { title: 'Calibration', subtitle: 'Le plan est créé aujourd’hui, puis affiné progressivement.' },
];

const Field = ({ label, hint, ...props }) => <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-800">{label}</span>{hint && <span className="mb-2 block text-xs text-slate-500">{hint}</span>}<input {...props} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label>;
const TextArea = ({ label, hint, ...props }) => <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-800">{label}</span>{hint && <span className="mb-2 block text-xs leading-relaxed text-slate-500">{hint}</span>}<textarea {...props} className="min-h-24 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label>;
const Select = ({ label, hint, children, ...props }) => <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-800">{label}</span>{hint && <span className="mb-2 block text-xs text-slate-500">{hint}</span>}<select {...props} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100">{children}</select></label>;

function MultiChoice({ label, hint, options, values, onToggle, minimum = 1 }) {
  return <fieldset><legend className="text-sm font-bold text-slate-800">{label}</legend>{hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}<div className="mt-3 flex flex-wrap gap-2">{options.map(([value, text]) => {
    const active = values.includes(value);
    return <button key={value} type="button" aria-pressed={active} onClick={() => onToggle(value)} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold transition ${active ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{active ? '✓ ' : ''}{text}</button>;
  })}</div><p className="mt-2 text-[11px] text-slate-400">Choisis au moins {minimum} option{minimum > 1 ? 's' : ''}.</p></fieldset>;
}

export default function OnboardingFlow({ session, onComplete, isBetaClient = false }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(initial);
  const [showProcess, setShowProcess] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = key => event => setAnswers(previous => ({ ...previous, [key]: event.target.value }));
  const setChecked = key => event => setAnswers(previous => ({ ...previous, [key]: event.target.checked }));
  const toggle = key => value => setAnswers(previous => {
    const current = previous[key] || [];
    if (key === 'preferredSnacks' && value === 'none') return { ...previous, [key]: current.includes('none') ? [] : ['none'] };
    const withoutNone = key === 'preferredSnacks' ? current.filter(item => item !== 'none') : current;
    return { ...previous, [key]: withoutNone.includes(value) ? withoutNone.filter(item => item !== value) : [...withoutNone, value] };
  });
  const setDietaryStyle = event => {
    const dietaryStyle = event.target.value;
    const allowed = new Set(proteinOptionsForDietaryStyle(dietaryStyle).map(([value]) => value));
    setAnswers(previous => ({ ...previous, dietaryStyle, preferredProteins: previous.preferredProteins.filter(value => allowed.has(value)) }));
  };
  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);
  const firstValid = answers.firstName.trim() && Number(answers.height) >= 120 && Number(answers.weight) >= 35 && answers.birthDate;
  const activityValid = Number(answers.trainingDays) === 0 || Boolean(answers.trainingDayPlan);
  const snackValid = answers.preferredSnacks.length >= 1 && (Number(answers.mealCount) === 3 || answers.preferredSnacks.some(value => value !== 'none'));
  const habitsValid = answers.preferredProteins.length >= 2 && answers.preferredCarbs.length >= 2 && snackValid;
  const blocked = (step === 0 && !firstValid) || (step === 1 && !activityValid) || (step === 2 && !habitsValid) || (step === steps.length - 1 && !answers.healthDataConsent) || saving;

  const finish = async () => {
    setSaving(true); setError('');
    try {
      const finalAnswers = {
        ...answers,
        aiHealthContextConsentAt: answers.aiHealthContextConsent ? new Date().toISOString() : '',
        deficitProtocolNoticeVersion: 1,
        deficitProtocolNoticeAcknowledgedAt: answers.processAcknowledgedAt || new Date().toISOString(),
      };
      const profile = generateNutritionProfile(finalAnswers, session.user.id);
      const saved = await saveNutritionProfile(profile);
      if (isBetaClient) await setCoachDataConsent(answers.coachDataConsent);
      onComplete(saved);
    } catch (reason) {
      setError(reason?.message || 'Impossible de créer le plan. Réessaie dans un instant.');
      setSaving(false);
    }
  };

  if (showProcess) return <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-slate-50 px-4 py-6 text-slate-800 safe-bottom">
    <div className="mx-auto max-w-xl rounded-[2rem] border border-violet-200 bg-white p-5 shadow-2xl shadow-violet-100 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="process-title">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Sparkles /></div>
      <p className="mt-5 text-xs font-black uppercase tracking-[.2em] text-violet-600">Avant de commencer</p>
      <h1 id="process-title" className="mt-1 text-2xl font-black text-slate-950">Un plan construit autour de ta vraie vie</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">Le questionnaire détermine tes cibles, tes aliments, ton nombre de prises et les modes réellement utiles. Deux personnes différentes ne doivent plus recevoir le même modèle.</p>
      <div className="mt-5 space-y-3">
        {[
          ['1', 'Plan initial réellement personnel', 'Habitudes, préférences, exclusions, horaires, budget et entraînements orientent le contenu.'],
          ['2', 'Calibration · 3 semaines', 'Pesées le lundi, mercredi et samedi. Aucune décision sur une valeur isolée.'],
          ['3', 'Ajustement progressif', 'Les quantités évoluent par petits paliers si la tendance réelle le justifie.'],
        ].map(([number, title, description]) => <div key={number} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-black text-white">{number}</span><div><h2 className="text-sm font-black text-slate-900">{title}</h2><p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p></div></div>)}
      </div>
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950"><strong>À propos du déficit :</strong> ce n’est plus un mode permanent. Après 30 jours, un protocole spécifique de 7 jours pourra éventuellement être proposé selon ton objectif.</div>
      <label className="mt-5 flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950"><input type="checkbox" checked={answers.processAcknowledged} onChange={event => setAnswers(previous => ({ ...previous, processAcknowledged: event.target.checked }))} className="mt-0.5 h-5 w-5 shrink-0 accent-violet-600"/><span><strong>J’ai compris le processus</strong> et je m’engage à répondre honnêtement.</span></label>
      <button type="button" disabled={!answers.processAcknowledged} onClick={() => { setAnswers(previous => ({ ...previous, processAcknowledgedAt: new Date().toISOString() })); setShowProcess(false); }} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 font-black text-white disabled:opacity-40">Je valide et je commence <ArrowRight size={19}/></button>
    </div>
  </div>;

  return <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-slate-50 px-4 py-5 text-slate-800 safe-bottom">
    <div className="mx-auto max-w-xl">
      <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.22em] text-violet-600">Coach Nutrition</p><p className="mt-1 text-xs text-slate-500">Création de ton programme personnel</p></div><button onClick={() => supabase.auth.signOut()} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600"><LogOut size={15}/> Quitter</button></div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-violet-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all" style={{ width: `${progress}%` }}/></div>
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-violet-100/50 sm:p-8">
        <div className="mb-6"><div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">{step === 4 ? <Ruler/> : step === 5 ? <Scale/> : <Sparkles/>}</div><p className="text-xs font-bold text-violet-600">Étape {step + 1} sur {steps.length}</p><h1 className="mt-1 text-2xl font-black text-slate-950">{steps[step].title}</h1><p className="mt-1 text-sm leading-relaxed text-slate-500">{steps[step].subtitle}</p></div>
        <div className="space-y-5">
          {step === 0 && <><Field label="Prénom" value={answers.firstName} onChange={set('firstName')} autoComplete="given-name"/><Field label="Date de naissance" type="date" value={answers.birthDate} onChange={set('birthDate')}/><div className="grid grid-cols-2 gap-3"><Select label="Sexe biologique" value={answers.sex} onChange={set('sex')}><option value="male">Homme</option><option value="female">Femme</option></Select><Select label="Objectif principal" value={answers.goal} onChange={set('goal')}><option value="maintenance">Maintien / forme</option><option value="loss">Perte de graisse</option><option value="gain">Prise de muscle</option></Select></div><div className="grid grid-cols-2 gap-3"><Field label="Taille (cm)" type="number" inputMode="decimal" value={answers.height} onChange={set('height')}/><Field label="Poids actuel (kg)" type="number" inputMode="decimal" step="0.1" value={answers.weight} onChange={set('weight')}/></div></>}
          {step === 1 && <><Select label="Niveau d’activité hors sport" value={answers.activity} onChange={set('activity')}><option value="sedentary">Plutôt assis</option><option value="light">Un peu actif</option><option value="active">Actif / beaucoup debout</option><option value="veryActive">Travail physique</option></Select><div className="grid grid-cols-2 gap-3"><Field label="Entraînements / semaine" type="number" min="0" max="14" value={answers.trainingDays} onChange={set('trainingDays')}/><Field label="Pas moyens / jour" type="number" inputMode="numeric" placeholder="ex. 7500" value={answers.steps} onChange={set('steps')}/></div><div className="grid grid-cols-2 gap-3"><Select label="Intensité habituelle" value={answers.trainingIntensity} onChange={set('trainingIntensity')}><option value="light">Légère</option><option value="moderate">Modérée</option><option value="intense">Intense / HYROX</option></Select><Select label="Horaire d’entraînement" value={answers.trainingTime} onChange={set('trainingTime')}><option value="morning">Matin</option><option value="midday">Midi</option><option value="evening">Soir</option><option value="variable">Variable</option></Select></div><Select label="Veux-tu un plan distinct pour les jours d’entraînement ?" hint="Le mode Hard ne sera créé que si tu réponds oui." value={answers.trainingDayPlan} onChange={set('trainingDayPlan')}><option value="">Choisir…</option><option value="yes">Oui, mes besoins changent ces jours-là</option><option value="no">Non, un seul plan Standard me suffit</option></Select><div className="grid grid-cols-2 gap-3"><Field label="Sommeil moyen (h)" type="number" step="0.5" value={answers.sleep} onChange={set('sleep')}/><Select label="Rythme de travail" value={answers.jobActivity} onChange={set('jobActivity')}><option value="desk">Bureau</option><option value="mixed">Mixte</option><option value="standing">Debout</option><option value="physical">Physique</option><option value="night">Horaires de nuit</option></Select></div><TextArea label="Tes sports et leur durée" value={answers.constraints} onChange={set('constraints')} placeholder="Ex. musculation mardi/jeudi 1 h, course samedi 45 min…"/></>}
          {step === 2 && <><Select label="Style alimentaire" value={answers.dietaryStyle} onChange={setDietaryStyle}><option value="omnivore">Omnivore</option><option value="pescetarian">Poisson mais pas de viande</option><option value="vegetarian">Végétarien</option><option value="vegan">Végétalien</option></Select><Select label="Type de petit déjeuner préféré" value={answers.breakfastType} onChange={set('breakfastType')}><option value="sweet">Sucré</option><option value="savory">Salé</option><option value="mixed">Variable / les deux</option><option value="none">Je ne déjeune pas habituellement</option></Select><TextArea label="Ton petit déjeuner actuel" hint="Écris les aliments et les quantités si tu les connais." value={answers.breakfastHabit} onChange={set('breakfastHabit')} placeholder="Ce que tu manges vraiment…"/><TextArea label="Le reste de ta journée actuelle" hint="Repas, boissons, grignotages et horaires." value={answers.foodHabits} onChange={set('foodHabits')} placeholder="Midi, goûter, soir, boissons…"/><MultiChoice label="Protéines que tu veux réellement manger" hint="L’ordre de tes choix orientera les repas." options={proteinOptionsForDietaryStyle(answers.dietaryStyle)} values={answers.preferredProteins} onToggle={toggle('preferredProteins')} minimum={2}/><MultiChoice label="Féculents préférés" options={PERSONALIZATION_OPTIONS.carbs} values={answers.preferredCarbs} onToggle={toggle('preferredCarbs')} minimum={2}/><MultiChoice label="Collations acceptées" hint="Avec 4 ou 5 prises, choisis au moins une collation réelle." options={PERSONALIZATION_OPTIONS.snacks} values={answers.preferredSnacks} onToggle={toggle('preferredSnacks')}/>{!snackValid && answers.preferredSnacks.includes('none') && Number(answers.mealCount) > 3 && <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">Choisis 3 repas si tu ne souhaites aucune collation.</p>}<TextArea label="Aliments détestés ou refusés" hint="Ils seront exclus, même sans allergie." value={answers.dislikedFoods} onChange={set('dislikedFoods')}/><div className="grid grid-cols-2 gap-3"><Select label="Nombre de prises" value={answers.mealCount} onChange={set('mealCount')}><option value="3">3 repas</option><option value="4">4 prises</option><option value="5">5 prises</option></Select><div className="grid grid-cols-2 gap-2"><Field label="Réveil" type="time" value={answers.wakeTime} onChange={set('wakeTime')}/><Field label="Coucher" type="time" value={answers.sleepTime} onChange={set('sleepTime')}/></div></div></>}
          {step === 3 && <><div className="grid grid-cols-2 gap-3"><Select label="Temps pour cuisiner" value={answers.cookingTime} onChange={set('cookingTime')}><option value="quick">Moins de 15 min</option><option value="moderate">15 à 30 min</option><option value="flexible">Plus de 30 min possible</option></Select><Select label="Budget alimentaire" value={answers.budgetLevel} onChange={set('budgetLevel')}><option value="low">Économique</option><option value="standard">Standard</option><option value="flexible">Flexible</option></Select><Select label="Batch cooking" value={answers.batchCooking} onChange={set('batchCooking')}><option value="never">Jamais</option><option value="sometimes">Parfois</option><option value="often">Souvent</option></Select><Select label="Repas au travail" value={answers.workMealAccess} onChange={set('workMealAccess')}><option value="microwave">Micro-ondes disponible</option><option value="cold">Repas froid uniquement</option><option value="home">Je mange chez moi</option><option value="variable">Variable</option></Select></div><TextArea label="Allergies ou intolérances" value={answers.allergies} onChange={set('allergies')} placeholder="Écris “aucune” si rien à signaler."/><TextArea label="Aliments exclus pour une autre raison" value={answers.exclusions} onChange={set('exclusions')}/><TextArea label="Santé et traitements" hint="Ces informations ne bloquent pas le plan." value={answers.medical} onChange={set('medical')} placeholder="Écris “aucun” si rien à signaler."/><TextArea label="Digestion" value={answers.digestion} onChange={set('digestion')} placeholder="Écris “aucun” si rien à signaler."/><div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><ShieldCheck className="mt-0.5 shrink-0 text-amber-600"/><p className="text-xs leading-relaxed text-amber-900"><strong>Ces réponses ne bloquent pas la création du plan.</strong> L’application et son IA ne posent aucun diagnostic et ne remplacent pas un médecin.</p></div></>}
          {step === 4 && <><div className="rounded-2xl bg-slate-900 p-5 text-white"><h2 className="font-black">Protocole identique à chaque prise</h2><ol className="mt-3 space-y-2 text-sm text-slate-200"><li>1. Le matin, avant de manger, après les toilettes.</li><li>2. Mètre souple, horizontal, posé sans serrer.</li><li>3. Même côté du corps, muscles relâchés.</li><li>4. Deux mesures ; si elles diffèrent de plus de 1 cm, recommence.</li></ol></div><div className="grid grid-cols-2 gap-3"><Field label="Tour de taille (cm)" type="number" step="0.1" value={answers.waist} onChange={set('waist')}/><Field label="Hanches (cm)" type="number" step="0.1" value={answers.hips} onChange={set('hips')}/><Field label="Poitrine (cm)" type="number" step="0.1" value={answers.chest} onChange={set('chest')}/><Field label="Bras relâché (cm)" type="number" step="0.1" value={answers.arm} onChange={set('arm')}/><Field label="Cuisse (cm)" type="number" step="0.1" value={answers.thigh} onChange={set('thigh')}/></div><p className="text-xs text-slate-500">Ces mesures peuvent être complétées plus tard.</p></>}
          {step === 5 && <><div className="rounded-3xl border-2 border-violet-200 bg-violet-50 p-5"><div className="flex items-center gap-3"><Scale className="text-violet-700"/><h2 className="font-black text-violet-950">Phase 1 · Calibration initiale</h2></div><div className="mt-4 grid grid-cols-3 gap-2 text-center">{['Lundi','Mercredi','Samedi'].map(day => <div key={day} className="rounded-xl bg-white px-2 py-3 text-sm font-black text-violet-700 shadow-sm">{day}</div>)}</div><p className="mt-4 text-sm leading-relaxed text-violet-950">Pendant 3 semaines : le matin à jeun, après les toilettes, avant de boire ou manger, avec la même balance.</p></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950"><strong>Protocole Déficit :</strong> jamais à l’entrée. Après 30 jours, il pourra être proposé pour exactement 7 jours, avec activation volontaire. Il disparaîtra ensuite automatiquement.</div><label className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950"><input type="checkbox" checked={answers.healthDataConsent} onChange={setChecked('healthDataConsent')} className="mt-0.5 h-5 w-5 shrink-0 accent-violet-600"/><span><strong>J’accepte le traitement de mes données nutritionnelles et de santé</strong> pour créer et suivre mon plan.</span></label><label className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><input type="checkbox" checked={answers.aiHealthContextConsent} onChange={setChecked('aiHealthContextConsent')} className="mt-0.5 h-5 w-5 shrink-0 accent-blue-600"/><span><strong>J’autorise l’IA à prendre en compte mon contexte déclaré</strong> lorsque je lance une analyse. Ce choix reste facultatif.</span></label>{isBetaClient && <label className="flex items-start gap-3 rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm text-fuchsia-950"><input type="checkbox" checked={answers.coachDataConsent} onChange={setChecked('coachDataConsent')} className="mt-0.5 h-5 w-5 shrink-0 accent-fuchsia-600"/><span><strong>J’autorise mon coach à consulter mes données</strong> pour l’accompagnement bêta.</span></label>}</>}
        </div>
        {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-7 flex gap-3">{step > 0 && <button onClick={() => setStep(step - 1)} className="flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 px-4 font-bold text-slate-600"><ArrowLeft size={18}/> Retour</button>}<button disabled={blocked} onClick={() => step < steps.length - 1 ? setStep(step + 1) : finish()} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 font-black text-white disabled:opacity-40">{saving ? <><Loader2 className="animate-spin" size={19}/> Création…</> : step === steps.length - 1 ? <><Check size={19}/> Créer mon plan personnalisé</> : <>Continuer <ArrowRight size={19}/></>}</button></div>
      </div>
    </div>
  </div>;
}
