import { useState } from 'react';
import { AlertTriangle, Check, Loader2, ShieldCheck } from 'lucide-react';
import { saveNutritionProfile } from '../lib/cloudSync';

export default function CurrentProspectDeficitNotice({ profile, onAcknowledged }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const deficitEligible = profile?.questionnaire_json?.goal !== 'gain';

  const acknowledge = async () => {
    setSaving(true); setError('');
    try {
      const saved = await saveNutritionProfile({
        ...profile,
        questionnaire_json: {
          ...profile.questionnaire_json,
          deficitProtocolNoticeVersion: 1,
          deficitProtocolNoticeAcknowledgedAt: new Date().toISOString(),
        },
      });
      onAcknowledged(saved);
    } catch (reason) {
      setError(reason?.message || 'Impossible d’enregistrer ta confirmation. Réessaie dans un instant.');
      setSaving(false);
    }
  };

  return <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50 px-4 py-6 text-slate-800 safe-bottom">
    <main className="mx-auto max-w-xl rounded-[2rem] border border-amber-200 bg-white p-5 shadow-xl shadow-amber-100 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="deficit-notice-title">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><AlertTriangle /></div>
      <p className="mt-5 text-xs font-black uppercase tracking-[.2em] text-amber-700">Information importante</p>
      <h1 id="deficit-notice-title" className="mt-1 text-2xl font-black text-slate-950">Le Déficit n’est pas un mode permanent</h1>
      {deficitEligible ? <p className="mt-3 text-sm leading-relaxed text-slate-600">Après <strong>30 jours d’utilisation</strong>, un protocole Déficit pourra éventuellement t’être proposé selon ton objectif et ta progression.</p> : <p className="mt-3 text-sm leading-relaxed text-slate-600">Avec ton objectif actuel de prise de muscle, le protocole Déficit ne te sera pas proposé. Si ton objectif change un jour, les mêmes règles de sécurité s’appliqueront.</p>}
      <div className="mt-5 space-y-3 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">
        <p><strong>1. Facultatif :</strong> tu décides toi-même de l’activer ou non.</p>
        <p><strong>2. Sept jours exactement :</strong> ce protocole ne doit pas être prolongé.</p>
        <p><strong>3. Fin automatique :</strong> après sept jours, il disparaît et le mode Standard redevient ta référence.</p>
        <p><strong>4. Aucun changement aujourd’hui :</strong> cette information n’active rien et ne modifie pas ton plan actuel.</p>
      </div>
      <div className="mt-5 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><ShieldCheck className="shrink-0 text-emerald-700"/><p className="text-xs leading-relaxed text-emerald-950">L’application ne remplace pas un médecin. En cas de situation médicale, de malaise ou de fatigue inhabituelle, demande un avis professionnel.</p></div>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      <button type="button" onClick={acknowledge} disabled={saving} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 font-black text-white disabled:opacity-50">{saving ? <><Loader2 className="animate-spin" size={18}/>Enregistrement…</> : <><Check size={18}/>J’ai compris et je continue</>}</button>
    </main>
  </div>;
}
