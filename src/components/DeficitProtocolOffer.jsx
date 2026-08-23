import { useState } from 'react';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { activateDeficitProtocol, DEFICIT_DURATION_DAYS } from '../lib/onboardingPlan';
import { saveNutritionProfile } from '../lib/cloudSync';

export default function DeficitProtocolOffer({ profile, onActivate, onLater }) {
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const activate = async () => {
    setSaving(true); setError('');
    try { onActivate(await saveNutritionProfile(activateDeficitProtocol(profile))); }
    catch (reason) { setError(reason?.message || 'Le protocole n’a pas pu être activé.'); setSaving(false); }
  };
  return <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50 px-4 py-6 text-slate-800 safe-bottom"><main className="mx-auto max-w-xl rounded-[2rem] border border-amber-200 bg-white p-5 shadow-xl sm:p-8">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><AlertTriangle /></div>
    <p className="mt-5 text-xs font-black uppercase tracking-[.2em] text-amber-700">Option débloquée après 30 jours</p>
    <h1 className="mt-1 text-2xl font-black text-slate-950">Protocole Déficit · {DEFICIT_DURATION_DAYS} jours maximum</h1>
    <p className="mt-3 text-sm leading-relaxed text-slate-600">Ce protocole est spécifique, temporaire et facultatif. Il ne devient jamais ton alimentation permanente : il disparaît automatiquement après sept jours et le mode Standard redevient la référence.</p>
    <div className="mt-5 space-y-3 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><p><strong>✓</strong> Quantités recalculées à partir de ton plan personnel.</p><p><strong>✓</strong> Protéines maintenues et baisse calorique limitée.</p><p><strong>✓</strong> Aucun prolongement automatique après la date de fin.</p><p><strong>!</strong> Arrête et demande un avis professionnel en cas de malaise, fatigue inhabituelle ou situation médicale particulière.</p></div>
    <label className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-amber-600"/><span><strong>J’ai compris qu’il s’agit d’un protocole de {DEFICIT_DURATION_DAYS} jours seulement</strong> et qu’il ne doit pas être prolongé.</span></label>
    {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
    <div className="mt-6 grid grid-cols-[auto_1fr] gap-3"><button type="button" onClick={onLater} disabled={saving} className="min-h-12 rounded-2xl border border-slate-200 px-4 font-bold text-slate-500">Pas maintenant</button><button type="button" onClick={activate} disabled={!accepted || saving} className="min-h-12 rounded-2xl bg-amber-600 px-4 font-black text-white disabled:opacity-40">{saving ? <><Loader2 className="mr-2 inline animate-spin" size={18}/>Activation…</> : <><Check className="mr-2 inline" size={18}/>Activer pour 7 jours</>}</button></div>
  </main></div>;
}
