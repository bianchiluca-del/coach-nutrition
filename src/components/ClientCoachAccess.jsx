import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, MessageCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { loadClientCoachContext, setCoachDataConsent } from '../lib/coachAccess';

const formatDate = value => value
  ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  : '—';

export default function ClientCoachAccess({ section }) {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setError('');
    try { setContext(await loadClientCoachContext()); }
    catch (reason) { setError(reason?.message || 'Impossible de charger le lien avec ton coach.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  if (loading || !context?.has_assignment) return null;

  const toggleConsent = async () => {
    setBusy(true);
    setError('');
    try {
      await setCoachDataConsent(!context.coach_data_consent);
      await refresh();
    } catch (reason) { setError(reason?.message || 'Impossible de modifier ton consentement.'); }
    finally { setBusy(false); }
  };

  if (section === 'settings') {
    return (
      <section className="mb-4 rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><ShieldCheck size={20} /></div>
          <div className="min-w-0 flex-1">
            <h2 className="font-black text-slate-900">Partage avec {context.coach_name || 'ton coach'}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {context.coach_data_consent
                ? 'Ton coach peut consulter ton plan, ton journal, ton suivi et tes mesures afin de t’accompagner.'
                : 'Le partage est coupé. Ton coach ne peut plus ouvrir tes données.'}
            </p>
            <p className="mt-2 text-xs text-slate-400">Dernière décision : {formatDate(context.consent_updated_at)}</p>
          </div>
        </div>
        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <button type="button" onClick={toggleConsent} disabled={busy} className={`mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl font-black text-white disabled:opacity-50 ${context.coach_data_consent ? 'bg-slate-700' : 'bg-violet-600'}`}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : context.coach_data_consent ? <EyeOff size={18} /> : <Eye size={18} />}
          {context.coach_data_consent ? 'Retirer l’accès coach' : 'Autoriser l’accès coach'}
        </button>
      </section>
    );
  }

  const latestUpdate = context.coach_data_consent ? context.updates?.[0] : null;
  if (!latestUpdate && !error) return null;

  return (
    <div className="mb-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <MessageCircle size={19} className="mt-0.5 shrink-0 text-violet-700" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-widest text-violet-600">Message de {context.coach_name || 'ton coach'}</p>
          {latestUpdate && <><p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-violet-950">{latestUpdate.message}</p><p className="mt-2 text-[11px] text-violet-500">{formatDate(latestUpdate.created_at)}</p></>}
          {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
        </div>
        <button type="button" onClick={refresh} className="rounded-xl bg-white/70 p-2 text-violet-600" title="Actualiser"><RefreshCw size={15} /></button>
      </div>
    </div>
  );
}
