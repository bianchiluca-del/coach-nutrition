import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Clipboard, KeyRound, Loader2, RefreshCw, ShieldCheck, UserPlus, Users, X } from 'lucide-react';
import { createBetaInvite, loadCoachBetaDashboard, revokeBetaInvite } from '../lib/betaAccess';

const formatDate = value => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const statusConfig = {
  active: { label: 'Actif', classes: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'Invitation prête', classes: 'bg-amber-100 text-amber-700' },
  expired: { label: 'Expirée', classes: 'bg-slate-100 text-slate-600' },
  revoked: { label: 'Désactivée', classes: 'bg-red-100 text-red-700' },
};

export default function CoachDashboard({ onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const [newInvite, setNewInvite] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState(null);

  const refresh = async () => {
    setError('');
    setLoading(true);
    try { setRows(await loadCoachBetaDashboard()); }
    catch (reason) { setError(reason?.message || 'Impossible de charger la bêta.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const stats = useMemo(() => ({
    total: rows.filter(row => row.status !== 'revoked').length,
    active: rows.filter(row => row.status === 'active').length,
    onboarded: rows.filter(row => row.onboarding_status === 'completed').length,
  }), [rows]);

  const createInvite = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const invite = await createBetaInvite(label);
      setNewInvite(invite);
      setLabel('');
      await refresh();
    } catch (reason) { setError(reason?.message || 'Impossible de créer l’invitation.'); }
    finally { setBusy(false); }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(newInvite.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const confirmRevoke = async () => {
    setBusy(true);
    setError('');
    try { await revokeBetaInvite(pendingRevoke.invite_id); setPendingRevoke(null); await refresh(); }
    catch (reason) { setError(reason?.message || 'Impossible de désactiver cette invitation.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 pb-28 pt-2">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600"><ArrowLeft size={17} /> Réglages</button>
        <button type="button" onClick={refresh} disabled={loading} className="flex min-h-11 items-center gap-2 rounded-xl bg-violet-50 px-3 text-sm font-bold text-violet-700"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualiser</button>
      </div>

      <header className="rounded-3xl bg-gradient-to-br from-slate-950 to-violet-950 p-5 text-white shadow-lg">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><ShieldCheck size={22} /></div><div><p className="text-xs font-bold uppercase tracking-widest text-violet-200">Pilotage privé</p><h1 className="text-xl font-black">Bêta · 10 prospects</h1></div></div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[['Places', `${stats.total}/10`], ['Actifs', stats.active], ['Onboardés', stats.onboarded]].map(([name, value]) => <div key={name} className="rounded-2xl bg-white/10 p-3"><p className="text-xl font-black">{value}</p><p className="text-[10px] uppercase tracking-wide text-violet-200">{name}</p></div>)}
        </div>
      </header>

      <form onSubmit={createInvite} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2"><UserPlus size={18} className="text-violet-600" /><h2 className="font-black text-slate-900">Créer une invitation</h2></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={label} onChange={event => setLabel(event.target.value)} maxLength={80} className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base outline-none focus:border-violet-400" placeholder={`Nom ou repère (Prospect ${stats.total + 1})`} />
          <button disabled={busy || stats.total >= 10} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 font-black text-white disabled:opacity-50">{busy ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={17} />} Générer</button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Le code ne sera affiché qu’une fois. La base conserve uniquement son empreinte sécurisée.</p>
      </form>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 p-4"><Users size={18} className="text-violet-600" /><h2 className="font-black text-slate-900">Invitations et comptes</h2></div>
        {loading ? <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" /> Chargement…</div> : rows.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Aucune invitation créée.</p> : <div className="divide-y divide-slate-100">
          {rows.map(row => {
            const state = statusConfig[row.status] || statusConfig.pending;
            return <article key={row.invite_id} className="p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-900">{row.display_name || row.label}</p><p className="mt-0.5 break-all text-xs text-slate-500">{row.email || 'Code non utilisé'}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${state.classes}`}>{state.label}</span></div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600"><div className="rounded-xl bg-slate-50 p-2"><span className="block text-[10px] uppercase text-slate-400">Onboarding</span>{row.onboarding_status === 'completed' ? 'Terminé' : row.status === 'active' ? 'À terminer' : '—'}</div><div className="rounded-xl bg-slate-50 p-2"><span className="block text-[10px] uppercase text-slate-400">Dernière activité</span>{formatDate(row.last_activity_at)}</div></div>
              {row.status === 'pending' && <button type="button" onClick={() => setPendingRevoke(row)} className="mt-3 min-h-10 rounded-xl border border-red-100 px-3 text-xs font-bold text-red-600">Désactiver ce code</button>}
            </article>;
          })}
        </div>}
      </section>

      {newInvite && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/50 p-3 sm:items-center" role="dialog" aria-modal="true">
        <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-violet-600">Invitation créée</p><h2 className="mt-1 text-xl font-black text-slate-950">{newInvite.label}</h2></div><button onClick={() => setNewInvite(null)} className="rounded-xl bg-slate-100 p-2 text-slate-500"><X size={18} /></button></div><div className="my-5 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50 p-4 text-center"><p className="break-all font-mono text-xl font-black tracking-wider text-violet-900">{newInvite.code}</p></div><button onClick={copyCode} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 font-black text-white">{copied ? <Check size={18} /> : <Clipboard size={18} />}{copied ? 'Code copié' : 'Copier le code'}</button><p className="mt-3 text-center text-xs text-slate-500">Envoie ce code uniquement au prospect concerné.</p></div>
      </div>}

      {pendingRevoke && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/50 p-3 sm:items-center" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl"><h2 className="text-lg font-black text-slate-950">Désactiver l’invitation ?</h2><p className="mt-2 text-sm text-slate-600">Le code de <strong>{pendingRevoke.label}</strong> ne pourra plus être utilisé. La place bêta redeviendra disponible.</p><div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => setPendingRevoke(null)} className="min-h-12 rounded-2xl border border-slate-200 font-bold text-slate-600">Annuler</button><button onClick={confirmRevoke} disabled={busy} className="min-h-12 rounded-2xl bg-red-600 font-black text-white disabled:opacity-50">Désactiver</button></div></div></div>}
    </div>
  );
}
