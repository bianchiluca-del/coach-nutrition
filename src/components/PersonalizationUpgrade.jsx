import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Loader2, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { PERSONALIZATION_OPTIONS, previewPersonalizationUpgrade, proteinOptionsForDietaryStyle } from '../lib/onboardingPlan';
import { saveNutritionProfile } from '../lib/cloudSync';

const Select = ({ label, hint, children, ...props }) => <label className="block"><span className="mb-1.5 block text-sm font-black text-slate-800">{label}</span>{hint && <span className="mb-2 block text-xs leading-relaxed text-slate-500">{hint}</span>}<select {...props} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100">{children}</select></label>;
const TextArea = ({ label, hint, ...props }) => <label className="block"><span className="mb-1.5 block text-sm font-black text-slate-800">{label}</span>{hint && <span className="mb-2 block text-xs leading-relaxed text-slate-500">{hint}</span>}<textarea {...props} className="min-h-24 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label>;

function MultiChoice({ label, hint, options, values, onToggle, minimum = 1 }) {
  return <fieldset><legend className="text-sm font-black text-slate-800">{label}</legend>{hint && <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>}<div className="mt-3 flex flex-wrap gap-2">{options.map(([value, text]) => {
    const selected = values.includes(value);
    return <button key={value} type="button" aria-pressed={selected} onClick={() => onToggle(value)} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold ${selected ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{selected ? '✓ ' : ''}{text}</button>;
  })}</div><p className="mt-2 text-[11px] text-slate-400">Minimum : {minimum} choix.</p></fieldset>;
}

function defaults(profile) {
  const old = profile?.questionnaire_json || {};
  return {
    dietaryStyle: old.dietaryStyle || 'omnivore',
    breakfastType: old.breakfastType || 'mixed',
    mealCount: String(old.mealCount || old.mealsPerDay || 4),
    preferredProteins: Array.isArray(old.preferredProteins) ? old.preferredProteins : [],
    preferredCarbs: Array.isArray(old.preferredCarbs) ? old.preferredCarbs : [],
    preferredSnacks: Array.isArray(old.preferredSnacks) ? old.preferredSnacks : [],
    dislikedFoods: old.dislikedFoods || '',
    foodHabits: old.foodHabits || '',
    trainingDays: String(old.trainingDays ?? 0),
    trainingIntensity: old.trainingIntensity || 'moderate',
    trainingTime: old.trainingTime || 'variable',
    trainingDayPlan: old.trainingDayPlan || '',
    cookingTime: old.cookingTime || 'moderate',
    budgetLevel: old.budgetLevel || 'standard',
    batchCooking: old.batchCooking || 'sometimes',
    workMealAccess: old.workMealAccess || 'variable',
  };
}

export default function PersonalizationUpgrade({ profile, onComplete, onLater }) {
  const [form, setForm] = useState(() => defaults(profile));
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = key => event => setForm(previous => ({ ...previous, [key]: event.target.value }));
  const toggle = key => value => setForm(previous => {
    const values = previous[key] || [];
    if (key === 'preferredSnacks' && value === 'none') return { ...previous, [key]: values.includes('none') ? [] : ['none'] };
    const withoutNone = key === 'preferredSnacks' ? values.filter(item => item !== 'none') : values;
    return { ...previous, [key]: withoutNone.includes(value) ? withoutNone.filter(item => item !== value) : [...withoutNone, value] };
  });
  const setDietaryStyle = event => {
    const dietaryStyle = event.target.value;
    const allowed = new Set(proteinOptionsForDietaryStyle(dietaryStyle).map(([value]) => value));
    setForm(previous => ({ ...previous, dietaryStyle, preferredProteins: previous.preferredProteins.filter(value => allowed.has(value)) }));
  };
  const snackValid = form.preferredSnacks.length >= 1 && (Number(form.mealCount) === 3 || form.preferredSnacks.some(value => value !== 'none'));
  const valid = form.preferredProteins.length >= 2 && form.preferredCarbs.length >= 2 && snackValid && (Number(form.trainingDays) === 0 || form.trainingDayPlan);
  const currentSummary = useMemo(() => Object.values(profile.plan_modes_json || {}).map(mode => mode.label).join(' · '), [profile]);

  const buildPreview = () => {
    setError('');
    try { setPreview(previewPersonalizationUpgrade(profile, form)); }
    catch (reason) { setError(reason?.message || 'Impossible de préparer l’aperçu.'); }
  };
  const confirm = async () => {
    setSaving(true); setError('');
    try { onComplete(await saveNutritionProfile(preview)); }
    catch (reason) { setError(reason?.message || 'La mise à jour n’a pas pu être enregistrée.'); setSaving(false); }
  };

  if (preview) {
    const modes = Object.values(preview.plan_modes_json || {});
    return <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-slate-50 px-4 py-6 text-slate-800 safe-bottom"><main className="mx-auto max-w-2xl rounded-[2rem] border border-violet-200 bg-white p-5 shadow-xl sm:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Check /></div>
      <p className="mt-5 text-xs font-black uppercase tracking-[.2em] text-violet-600">Aperçu avant validation</p>
      <h1 className="mt-1 text-2xl font-black text-slate-950">Voici ton plan réellement personnalisé</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">Rien n’est encore enregistré. Vérifie les modes, le nombre de prises et les aliments proposés.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{modes.map(mode => <section key={mode.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-2"><h2 className="font-black text-slate-950">{mode.emoji} {mode.label}</h2><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-violet-700">{mode.target.cal} kcal</span></div><p className="mt-1 text-xs text-slate-500">{mode.desc}</p><div className="mt-3 space-y-2">{mode.plan.map(meal => <div key={meal.id} className="rounded-2xl bg-white p-3"><p className="text-sm font-black text-slate-800">{meal.icon} {meal.name}</p><p className="mt-1 text-xs leading-relaxed text-slate-500">{meal.items.map(item => item.name).join(' · ')}</p></div>)}</div></section>)}</div>
      <div className="mt-5 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><ShieldCheck className="shrink-0 text-emerald-700"/><p className="text-xs leading-relaxed text-emerald-950"><strong>Ton historique est conservé.</strong> Les pesées, mesures, journées enregistrées et analyses précédentes ne sont pas effacées. La validation remplace uniquement la base de tes prochains plans.</p></div>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={() => setPreview(null)} disabled={saving} className="min-h-12 rounded-2xl border border-slate-200 px-4 font-bold text-slate-600"><ArrowLeft className="mr-2 inline" size={17}/>Modifier</button><button type="button" onClick={confirm} disabled={saving} className="min-h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 font-black text-white disabled:opacity-50">{saving ? <><Loader2 className="mr-2 inline animate-spin" size={18}/>Enregistrement…</> : 'Confirmer ce nouveau plan'}</button></div>
    </main></div>;
  }

  return <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-slate-50 px-4 py-6 text-slate-800 safe-bottom"><main className="mx-auto max-w-2xl rounded-[2rem] border border-violet-200 bg-white p-5 shadow-xl sm:p-8">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><RefreshCw /></div>
    <p className="mt-5 text-xs font-black uppercase tracking-[.2em] text-violet-600">Complément de personnalisation</p>
    <h1 className="mt-1 text-2xl font-black text-slate-950">{profile.display_name}, ton plan doit mieux te ressembler</h1>
    <p className="mt-3 text-sm leading-relaxed text-slate-600">Ton plan actuel utilise encore une ancienne base ({currentSummary || 'plan initial'}). Réponds à ces quelques questions : tu verras le résultat avant de décider.</p>
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2"><Select label="Style alimentaire" value={form.dietaryStyle} onChange={setDietaryStyle}><option value="omnivore">Omnivore</option><option value="pescetarian">Pescétarien</option><option value="vegetarian">Végétarien</option><option value="vegan">Végétalien</option></Select><Select label="Nombre de prises souhaité" value={form.mealCount} onChange={set('mealCount')}><option value="3">3 repas</option><option value="4">4 prises</option><option value="5">5 prises</option></Select><Select label="Petit déjeuner" value={form.breakfastType} onChange={set('breakfastType')}><option value="sweet">Sucré</option><option value="savory">Salé</option><option value="mixed">Variable</option><option value="none">Je n’en prends pas</option></Select><Select label="Repas au travail" value={form.workMealAccess} onChange={set('workMealAccess')}><option value="microwave">Micro-ondes</option><option value="cold">Froid uniquement</option><option value="home">À la maison</option><option value="variable">Variable</option></Select></div>
      <MultiChoice label="Protéines que tu aimes vraiment" hint="Au moins deux pour éviter les menus répétitifs." options={proteinOptionsForDietaryStyle(form.dietaryStyle)} values={form.preferredProteins} onToggle={toggle('preferredProteins')} minimum={2}/>
      <MultiChoice label="Féculents préférés" options={PERSONALIZATION_OPTIONS.carbs} values={form.preferredCarbs} onToggle={toggle('preferredCarbs')} minimum={2}/>
      <MultiChoice label="Collations acceptées" hint="Avec 4 ou 5 prises, choisis au moins une collation réelle." options={PERSONALIZATION_OPTIONS.snacks} values={form.preferredSnacks} onToggle={toggle('preferredSnacks')}/>{!snackValid && form.preferredSnacks.includes('none') && Number(form.mealCount) > 3 && <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">Choisis 3 repas si tu ne souhaites aucune collation.</p>}
      <TextArea label="Ce que tu manges réellement aujourd’hui" hint="Repas, horaires, boissons et grignotages : ces détails orientent le plan." value={form.foodHabits} onChange={set('foodHabits')}/><TextArea label="Aliments que tu refuses ou détestes" value={form.dislikedFoods} onChange={set('dislikedFoods')}/>
      <div className="grid gap-4 sm:grid-cols-2"><Select label="Entraînements par semaine" value={form.trainingDays} onChange={set('trainingDays')}>{[0,1,2,3,4,5,6,7].map(value => <option key={value} value={value}>{value}</option>)}</Select><Select label="Plan distinct les jours d’entraînement ?" hint="Le mode Hard est créé uniquement si tu le demandes." value={form.trainingDayPlan} onChange={set('trainingDayPlan')}><option value="">Choisir…</option><option value="yes">Oui</option><option value="no">Non</option></Select><Select label="Intensité" value={form.trainingIntensity} onChange={set('trainingIntensity')}><option value="light">Légère</option><option value="moderate">Modérée</option><option value="intense">Intense</option></Select><Select label="Horaire d’entraînement" value={form.trainingTime} onChange={set('trainingTime')}><option value="morning">Matin</option><option value="midday">Midi</option><option value="evening">Soir</option><option value="variable">Variable</option></Select></div>
      <div className="grid gap-4 sm:grid-cols-2"><Select label="Temps pour cuisiner" value={form.cookingTime} onChange={set('cookingTime')}><option value="quick">Moins de 15 min</option><option value="moderate">15 à 30 min</option><option value="flexible">Plus de 30 min</option></Select><Select label="Budget" value={form.budgetLevel} onChange={set('budgetLevel')}><option value="low">Économique</option><option value="standard">Standard</option><option value="flexible">Flexible</option></Select><Select label="Batch cooking" value={form.batchCooking} onChange={set('batchCooking')}><option value="never">Jamais</option><option value="sometimes">Parfois</option><option value="often">Souvent</option></Select></div>
    </div>
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950"><strong>Déficit :</strong> il ne sera pas ajouté maintenant. Après 30 jours d’utilisation, il pourra être proposé comme protocole volontaire de 7 jours uniquement, puis disparaîtra automatiquement.</div>
    {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
    <div className="mt-6 grid grid-cols-[auto_1fr] gap-3"><button type="button" onClick={onLater} className="min-h-12 rounded-2xl border border-slate-200 px-4 font-bold text-slate-500">Plus tard</button><button type="button" disabled={!valid} onClick={buildPreview} className="min-h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 font-black text-white disabled:opacity-40"><Sparkles className="mr-2 inline" size={18}/>Voir mon nouveau plan</button></div>
  </main></div>;
}
