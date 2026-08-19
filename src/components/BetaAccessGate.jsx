import { useState } from 'react';
import { AlertCircle, KeyRound, Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { redeemBetaInvite } from '../lib/betaAccess';
import { supabase } from '../lib/supabaseClient';

export default function BetaAccessGate({ onGranted }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const context = await redeemBetaInvite(code);
      onGranted(context);
    } catch (reason) {
      setError(reason?.message || 'Ce code bêta ne peut pas être utilisé.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 safe-bottom">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><ShieldCheck size={23} /></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-500">Bêta privée</p><h1 className="text-xl font-black text-slate-950">Active ton invitation</h1></div>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-slate-600">Ton compte est confirmé. Entre maintenant le code transmis par Luca pour accéder à ton plan personnalisé.</p>
          <form className="space-y-3" onSubmit={submit}>
            <label className="block text-sm font-bold text-slate-700">Code d’invitation
              <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
                <KeyRound size={17} className="text-violet-500" />
                <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} required autoCapitalize="characters" autoComplete="off" className="min-h-12 w-full bg-transparent text-base font-bold uppercase tracking-wider outline-none" placeholder="CN-XXXX-XXXX-XXXXXX" />
              </div>
            </label>
            {error && <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
            <button disabled={loading || !code.trim()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 font-black text-white disabled:opacity-50">{loading ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />} Activer mon accès</button>
          </form>
          <button type="button" onClick={() => supabase.auth.signOut()} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-500"><LogOut size={16} /> Se déconnecter</button>
        </div>
      </div>
    </div>
  );
}
