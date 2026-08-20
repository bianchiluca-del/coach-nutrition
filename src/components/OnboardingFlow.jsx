import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, LogOut, Ruler, Scale, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { generateNutritionProfile } from '../lib/onboardingPlan';
import { saveNutritionProfile } from '../lib/cloudSync';
import { setCoachDataConsent } from '../lib/coachAccess';

const initial = {
  firstName: '', birthDate: '', sex: 'male', height: '', weight: '', goal: 'maintenance',
  activity: 'light', trainingDays: '3', steps: '', jobActivity: 'mixed', sleep: '7',
  breakfastHabit: '', foodHabits: '', mealCount: '4', wakeTime: '07:00', sleepTime: '23:00',
  allergies: '', exclusions: '', medical: '', digestion: '', constraints: '',
  waist: '', hips: '', chest: '', arm: '', thigh: '',
  processAcknowledged: false, processAcknowledgedAt: '',
  healthDataConsent: false, coachDataConsent: false,
};

const steps = [
  { title: 'Ton objectif', subtitle: 'Les données qui définissent le point de départ.' },
  { title: 'Ton quotidien', subtitle: 'Nous estimons la dépense à partir de ta vraie semaine.' },
  { title: 'Tes habitudes', subtitle: 'Ton futur plan part de ce que tu manges déjà.' },
  { title: 'Sécurité & préférences', subtitle: 'Pour ne jamais proposer un aliment ou une stratégie inadaptée.' },
  { title: 'Mesures guidées', subtitle: 'Un point de départ reproductible, sans photo.' },
  { title: 'Calibration', subtitle: 'Le plan est créé aujourd’hui, puis affiné sans t’envahir.' },
];

const Field = ({ label, hint, ...props }) => <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-800">{label}</span>{hint && <span className="mb-2 block text-xs text-slate-500">{hint}</span>}<input {...props} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label>;
const TextArea = ({ label, hint, ...props }) => <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-800">{label}</span>{hint && <span className="mb-2 block text-xs leading-relaxed text-slate-500">{hint}</span>}<textarea {...props} className="min-h-24 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label>;
const Select = ({ label, children, ...props }) => <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-800">{label}</span><select {...props} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100">{children}</select></label>;

export default function OnboardingFlow({ session, onComplete, isBetaClient = false }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(initial);
  const [showProcess, setShowProcess] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = key => event => setAnswers(previous => ({ ...previous, [key]: event.target.value }));
  const setChecked = key => event => setAnswers(previous => ({ ...previous, [key]: event.target.checked }));
  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);
  const firstValid = answers.firstName.trim() && Number(answers.height) >= 120 && Number(answers.weight) >= 35 && answers.birthDate;

  const finish = async () => {
    setSaving(true); setError('');
    try {
      const profile = generateNutritionProfile(answers, session.user.id);
      await saveNutritionProfile(profile);
      if (isBetaClient) await setCoachDataConsent(answers.coachDataConsent);
      onComplete(profile);
    } catch (reason) {
      setError(reason?.message || 'Impossible de créer le plan. Réessaie dans un instant.');
      setSaving(false);
    }
  };

  if (showProcess) return <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-slate-50 px-4 py-6 text-slate-800 safe-bottom">
    <div className="mx-auto max-w-xl rounded-[2rem] border border-violet-200 bg-white p-5 shadow-2xl shadow-violet-100 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="process-title">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Sparkles /></div>
      <p className="mt-5 text-xs font-black uppercase tracking-[.2em] text-violet-600">Avant de commencer</p>
      <h1 id="process-title" className="mt-1 text-2xl font-black text-slate-950">Comment ton plan devient vraiment personnel</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">Le questionnaire crée ton premier plan à partir de ton corps, de ton activité, de tes horaires, de tes habitudes et du nombre de repas souhaité. Ensuite, la tendance de tes pesées permet de l’affiner progressivement.</p>
      <div className="mt-5 space-y-3">
        {[
          ['1', 'Calibration initiale · 3 semaines', 'Pesées le lundi, mercredi et samedi, le matin à jeun. Aucune décision sur une valeur isolée.'],
          ['2', 'Ajustement progressif · semaines 4 à 8', 'Les moyennes sont comparées et les quantités évoluent par petits paliers si la tendance le justifie.'],
          ['3', 'Stabilisation et autonomie · dès la semaine 9', 'Une routine stable et seulement 1 à 2 pesées par semaine.'],
        ].map(([number, title, description]) => <div key={number} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-black text-white">{number}</span><div><h2 className="text-sm font-black text-slate-900">{title}</h2><p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p></div></div>)}
      </div>
      <label className="mt-5 flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950"><input type="checkbox" checked={answers.processAcknowledged} onChange={event => setAnswers(previous => ({ ...previous, processAcknowledged: event.target.checked }))} className="mt-0.5 h-5 w-5 shrink-0 accent-violet-600"/><span><strong>J’ai compris le processus</strong> et je m’engage à répondre honnêtement puis à suivre le protocole de pesée pour permettre une personnalisation fiable.</span></label>
      <button type="button" disabled={!answers.processAcknowledged} onClick={() => { setAnswers(previous => ({ ...previous, processAcknowledgedAt: new Date().toISOString() })); setShowProcess(false); }} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 font-black text-white shadow-lg shadow-violet-200 disabled:cursor-not-allowed disabled:opacity-40">Je valide et je commence <ArrowRight size={19}/></button>
    </div>
  </div>;

  return <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-slate-50 px-4 py-5 text-slate-800 safe-bottom">
    <div className="mx-auto max-w-xl">
      <div className="mb-5 flex items-center justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.22em] text-violet-600">Coach Nutrition</p><p className="mt-1 text-xs text-slate-500">Création de ton programme personnel</p></div>
        <button onClick={() => supabase.auth.signOut()} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600"><LogOut size={15}/> Quitter</button>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-violet-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all" style={{ width: `${progress}%` }}/></div>
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-violet-100/50 sm:p-8">
        <div className="mb-6"><div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">{step === 4 ? <Ruler/> : step === 5 ? <Scale/> : <Sparkles/>}</div><p className="text-xs font-bold text-violet-600">Étape {step + 1} sur {steps.length}</p><h1 className="mt-1 text-2xl font-black text-slate-950">{steps[step].title}</h1><p className="mt-1 text-sm leading-relaxed text-slate-500">{steps[step].subtitle}</p></div>

        <div className="space-y-5">
          {step === 0 && <><Field label="Prénom" value={answers.firstName} onChange={set('firstName')} autoComplete="given-name"/><Field label="Date de naissance" type="date" value={answers.birthDate} onChange={set('birthDate')}/><div className="grid grid-cols-2 gap-3"><Select label="Sexe biologique" value={answers.sex} onChange={set('sex')}><option value="male">Homme</option><option value="female">Femme</option></Select><Select label="Objectif principal" value={answers.goal} onChange={set('goal')}><option value="maintenance">Maintien / forme</option><option value="loss">Perte de graisse</option><option value="gain">Prise de muscle</option></Select></div><div className="grid grid-cols-2 gap-3"><Field label="Taille (cm)" type="number" inputMode="decimal" value={answers.height} onChange={set('height')}/><Field label="Poids actuel (kg)" type="number" inputMode="decimal" step="0.1" value={answers.weight} onChange={set('weight')}/></div></>}
          {step === 1 && <><Select label="Niveau d’activité hors sport" value={answers.activity} onChange={set('activity')}><option value="sedentary">Plutôt assis</option><option value="light">Un peu actif</option><option value="active">Actif / beaucoup debout</option><option value="veryActive">Travail physique</option></Select><div className="grid grid-cols-2 gap-3"><Field label="Entraînements / semaine" type="number" min="0" max="14" value={answers.trainingDays} onChange={set('trainingDays')}/><Field label="Pas moyens / jour" type="number" inputMode="numeric" placeholder="ex. 7500" value={answers.steps} onChange={set('steps')}/></div><div className="grid grid-cols-2 gap-3"><Field label="Sommeil moyen (h)" type="number" step="0.5" value={answers.sleep} onChange={set('sleep')}/><Select label="Rythme de travail" value={answers.jobActivity} onChange={set('jobActivity')}><option value="desk">Bureau</option><option value="mixed">Mixte</option><option value="standing">Debout</option><option value="physical">Physique</option><option value="night">Horaires de nuit</option></Select></div><TextArea label="Tes sports et leur durée" placeholder="Ex. musculation mardi/jeudi 1 h, course samedi 45 min…" value={answers.constraints} onChange={set('constraints')}/></>}
          {step === 2 && <><TextArea label="Ton petit déjeuner habituel" hint="Écris les aliments et les quantités si tu les connais. Exemple : 3 œufs, miel, une banane." value={answers.breakfastHabit} onChange={set('breakfastHabit')} placeholder="Ce que tu manges vraiment aujourd’hui…"/><TextArea label="Le reste de ta journée habituelle" hint="Repas, boissons, grignotages et horaires. Pas besoin de connaître les calories ou les macros." value={answers.foodHabits} onChange={set('foodHabits')} placeholder="Midi, goûter, soir, boissons…"/><div className="grid grid-cols-2 gap-3"><Select label="Repas souhaités" value={answers.mealCount} onChange={set('mealCount')}><option value="3">3 repas</option><option value="4">4 prises</option><option value="5">5 prises</option></Select><div className="grid grid-cols-2 gap-2"><Field label="Réveil" type="time" value={answers.wakeTime} onChange={set('wakeTime')}/><Field label="Coucher" type="time" value={answers.sleepTime} onChange={set('sleepTime')}/></div></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900"><strong>Notre règle :</strong> préserver tes habitudes, corriger seulement ce qui améliore vraiment l’équilibre. L’application ne te demandera pas de tout recommencer.</div></>}
          {step === 3 && <><TextArea label="Allergies ou intolérances" value={answers.allergies} onChange={set('allergies')} placeholder="Écris “aucune” si rien à signaler."/><TextArea label="Aliments exclus ou détestés" value={answers.exclusions} onChange={set('exclusions')}/><TextArea label="Santé et traitements" hint="Maladie, grossesse/allaitement, chirurgie, trouble alimentaire ou traitement en cours. Écris “aucun” si rien à signaler." value={answers.medical} onChange={set('medical')} placeholder="Réponse complète, même si la situation te semble légère…"/><TextArea label="Digestion" hint="Reflux, douleurs, ballonnements, transit, diagnostic digestif ou autre gêne." value={answers.digestion} onChange={set('digestion')} placeholder="Écris “aucun” si rien à signaler."/><div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><ShieldCheck className="mt-0.5 shrink-0 text-amber-600"/><p className="text-xs leading-relaxed text-amber-900">Le filtre vérifie notamment les situations métaboliques, rénales, hépatiques, cardiaques, digestives, hormonales, oncologiques et les troubles alimentaires. En cas de risque, aucun plan automatique n’est créé avant validation d’un professionnel de santé.</p></div></>}
          {step === 4 && <><div className="rounded-2xl bg-slate-900 p-5 text-white"><h2 className="font-black">Protocole identique à chaque prise</h2><ol className="mt-3 space-y-2 text-sm text-slate-200"><li>1. Le matin, avant de manger, après les toilettes.</li><li>2. Mètre souple, horizontal, posé sans serrer.</li><li>3. Même côté du corps, muscles relâchés.</li><li>4. Deux mesures ; si elles diffèrent de plus de 1 cm, recommence.</li></ol></div><div className="grid grid-cols-2 gap-3"><Field label="Tour de taille (cm)" hint="Au niveau du nombril, fin d’expiration." type="number" step="0.1" value={answers.waist} onChange={set('waist')}/><Field label="Hanches (cm)" hint="Au point le plus large." type="number" step="0.1" value={answers.hips} onChange={set('hips')}/><Field label="Poitrine (cm)" hint="Horizontal, respiration normale." type="number" step="0.1" value={answers.chest} onChange={set('chest')}/><Field label="Bras relâché (cm)" hint="Milieu épaule-coude." type="number" step="0.1" value={answers.arm} onChange={set('arm')}/><Field label="Cuisse (cm)" hint="15 cm au-dessus de la rotule." type="number" step="0.1" value={answers.thigh} onChange={set('thigh')}/></div><p className="text-xs text-slate-500">Les mensurations peuvent être complétées plus tard. Aucune photo n’est demandée.</p></>}
          {step === 5 && <><div className="rounded-3xl border-2 border-violet-200 bg-violet-50 p-5"><div className="flex items-center gap-3"><Scale className="text-violet-700"/><h2 className="font-black text-violet-950">Phase 1 · Calibration initiale</h2></div><div className="mt-4 grid grid-cols-3 gap-2 text-center">{['Lundi','Mercredi','Samedi'].map(day => <div key={day} className="rounded-xl bg-white px-2 py-3 text-sm font-black text-violet-700 shadow-sm">{day}</div>)}</div><p className="mt-4 text-sm leading-relaxed text-violet-950">Pendant 3 semaines : le matin à jeun, après les toilettes, avant de boire ou manger, avec la même balance au même endroit et une tenue comparable. <strong>Une pesée isolée ne déclenche jamais de correction.</strong></p></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><h3 className="font-black text-blue-950">Phase 2 · Ajustement</h3><p className="mt-1 text-sm leading-relaxed text-blue-900">Semaines 4 à 8 : comparaison des moyennes et correction prudente des quantités selon la tendance réelle.</p></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><h3 className="font-black text-emerald-950">Phase 3 · Autonomie</h3><p className="mt-1 text-sm leading-relaxed text-emerald-900">Dès la semaine 9 : routine stable et 1 pesée par semaine, avec une seconde facultative.</p></div></div><div className="rounded-2xl border border-slate-200 p-4"><h3 className="font-black text-slate-900">Utilisation quotidienne : 20 à 40 secondes</h3><p className="mt-1 text-sm text-slate-600">Tu valides “comme prévu” en un toucher. Tu ouvres l’application seulement quand quelque chose change.</p></div><label className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950"><input type="checkbox" checked={answers.healthDataConsent} onChange={setChecked('healthDataConsent')} className="mt-0.5 h-5 w-5 shrink-0 accent-violet-600"/><span><strong>J’accepte le traitement de mes données nutritionnelles et de santé</strong> pour créer et suivre mon plan. Je peux retirer mon consentement et supprimer définitivement mon compte depuis les paramètres.</span></label>{isBetaClient && <label className="flex items-start gap-3 rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm text-fuchsia-950"><input type="checkbox" checked={answers.coachDataConsent} onChange={setChecked('coachDataConsent')} className="mt-0.5 h-5 w-5 shrink-0 accent-fuchsia-600"/><span><strong>J’autorise mon coach à consulter mes données</strong> : plan, journal alimentaire, suivi et mesures. Cet accès est recommandé pour l’accompagnement bêta, mais reste facultatif et révocable.</span></label>}<p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600"><strong>Analyse IA facultative :</strong> uniquement lorsque tu appuies sur “Analyser”, ton plan, ses consignes associées et le bilan nutritionnel de la journée sont envoyés via le proxy sécurisé. Ton questionnaire médical et tes mensurations ne sont pas envoyés à l’IA.</p></>}
        </div>

        {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-7 flex gap-3">{step > 0 && <button onClick={() => setStep(step - 1)} className="flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 px-4 font-bold text-slate-600"><ArrowLeft size={18}/> Retour</button>}<button disabled={(step === 0 && !firstValid) || (step === steps.length - 1 && !answers.healthDataConsent) || saving} onClick={() => step < steps.length - 1 ? setStep(step + 1) : finish()} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 font-black text-white shadow-lg shadow-violet-200 disabled:cursor-not-allowed disabled:opacity-40">{saving ? <><Loader2 className="animate-spin" size={19}/> Création du plan…</> : step === steps.length - 1 ? <><Check size={19}/> Créer mon plan</> : <>Continuer <ArrowRight size={19}/></>}</button></div>
      </div>
    </div>
  </div>;
}
