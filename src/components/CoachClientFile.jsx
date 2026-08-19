import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Check, ClipboardList, Loader2, MessageCircle, Ruler, Send, ShieldCheck, Utensils } from 'lucide-react';
import { createCoachClientUpdate, loadCoachClientFile } from '../lib/coachAccess';

const formatDate = value => {
  if (!value) return '—';
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  return new Date(normalized).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};
const round = value => Math.round(Number(value) || 0);
const parseGrams = qty => {
  const match = String(qty || '').replace(',', '.').match(/([\d.]+)\s*g\b/i);
  return match ? Number(match[1]) : null;
};
const emptyMacros = () => ({ cal: 0, p: 0, g: 0, l: 0 });

function consumedMacros(row) {
  const total = emptyMacros();
  const carry = row?.real_qty_json?.__modeCarryover;
  for (const key of Object.keys(total)) total[key] = Number(carry?.[key]) || 0;
  for (const meal of row?.plan_json || []) {
    for (const item of meal.items || []) {
      const itemKey = `${meal.id}-${item.id}`;
      if (row?.status_json?.[itemKey] !== 'done') continue;
      const plannedGrams = parseGrams(item.qty);
      const realGrams = Number(row?.real_qty_json?.[itemKey]);
      const ratio = plannedGrams && Number.isFinite(realGrams) && realGrams > 0 ? realGrams / plannedGrams : 1;
      for (const key of Object.keys(total)) total[key] += (Number(item[key]) || 0) * ratio;
    }
  }
  return total;
}

const MacroCards = ({ values, prefix = '' }) => (
  <div className="grid grid-cols-4 gap-2">
    {[['cal', 'kcal', 'text-blue-700 bg-blue-50'], ['p', 'P', 'text-emerald-700 bg-emerald-50'], ['g', 'G', 'text-amber-700 bg-amber-50'], ['l', 'L', 'text-pink-700 bg-pink-50']].map(([key, label, classes]) => (
      <div key={key} className={`rounded-xl p-2 text-center ${classes}`}><p className="text-sm font-black">{prefix}{round(values?.[key])}</p><p className="text-[9px] font-bold uppercase">{label}{key === 'cal' ? '' : ' g'}</p></div>
    ))}
  </div>
);

const measureFields = [
  ['poids', 'Poids', 'kg'], ['bicepsD', 'Biceps D', 'cm'], ['bicepsG', 'Biceps G', 'cm'],
  ['poitrine', 'Poitrine', 'cm'], ['nombril', 'Nombril', 'cm'], ['fesses', 'Fesses', 'cm'],
  ['cuisseD', 'Cuisse D', 'cm'], ['cuisseG', 'Cuisse G', 'cm'],
];

export default function CoachClientFile({ client, onBack }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('summary');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const refresh = async () => {
    setError('');
    setLoading(true);
    try { setFile(await loadCoachClientFile(client.client_user_id)); }
    catch (reason) { setError(reason?.message || 'Impossible d’ouvrir ce dossier client.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [client.client_user_id]);

  const measurements = useMemo(() => {
    const byId = new Map();
    for (const row of file?.tracking || []) for (const entry of row.measurements_json || []) byId.set(entry.id || `${entry.date}-${JSON.stringify(entry)}`, entry);
    return [...byId.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [file]);

  const planModes = Object.values(file?.profile?.plan_modes_json || {});
  const questionnaire = file?.profile?.questionnaire_json || {};
  const currentMode = file?.preferences?.current_mode_id || 'standard';
  const latestDaily = (file?.daily || []).find(row => row.mode_id === currentMode) || file?.daily?.[0];
  const latestConsumed = consumedMacros(latestDaily);

  const sendUpdate = async event => {
    event.preventDefault();
    if (message.trim().length < 3) return;
    setSending(true); setError('');
    try {
      await createCoachClientUpdate(client.client_user_id, message);
      setMessage('');
      await refresh();
      setTab('updates');
    } catch (reason) { setError(reason?.message || 'Impossible d’envoyer cet ajustement.'); }
    finally { setSending(false); }
  };

  const tabs = [
    ['summary', 'Résumé', ClipboardList], ['plan', 'Plan', Utensils], ['journal', 'Journal', CalendarDays],
    ['measures', 'Mesures', Ruler], ['updates', 'Coach', MessageCircle],
  ];

  return (
    <div className="space-y-4 pb-28 pt-2">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600"><ArrowLeft size={17} /> Prospects</button>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-[11px] font-black text-emerald-700"><ShieldCheck size={14} /> Consentement actif</span>
      </div>

      <header className="rounded-3xl bg-gradient-to-br from-slate-950 to-violet-950 p-5 text-white shadow-lg">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-200">Dossier client</p>
        <h1 className="mt-1 text-2xl font-black">{file?.profile?.display_name || client.display_name || client.label}</h1>
        <p className="mt-1 break-all text-xs text-slate-300">{client.email}</p>
      </header>

      <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {tabs.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-black ${tab === id ? 'bg-violet-600 text-white' : 'text-slate-500'}`}><Icon size={15} /> {label}</button>)}
      </nav>

      {loading && <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-10 text-sm text-slate-500"><Loader2 size={19} className="animate-spin" /> Chargement du dossier…</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      {!loading && file && tab === 'summary' && <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-widest text-slate-400">Aujourd’hui · {currentMode}</p><h2 className="mt-1 font-black text-slate-900">Consommé enregistré</h2><div className="mt-3"><MacroCards values={latestConsumed} /></div><p className="mt-2 text-xs text-slate-400">Dernière synchronisation : {formatDate(latestDaily?.updated_at)}</p></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-black text-slate-900">Point de départ</h2><div className="mt-3 grid grid-cols-2 gap-2 text-sm">{[
          ['Objectif', questionnaire.goal], ['Poids', questionnaire.weight ? `${questionnaire.weight} kg` : '—'],
          ['Taille', questionnaire.height ? `${questionnaire.height} cm` : '—'], ['Entraînements', questionnaire.trainingDays ? `${questionnaire.trainingDays}/semaine` : '—'],
          ['Activité', questionnaire.activity], ['Sommeil', questionnaire.sleep ? `${questionnaire.sleep} h` : '—'],
        ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-0.5 font-bold text-slate-800">{value || '—'}</p></div>)}</div></section>
        {(questionnaire.allergies || questionnaire.exclusions || questionnaire.medical) && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><h2 className="font-black text-amber-950">Sécurité et exclusions</h2>{[['Allergies', questionnaire.allergies], ['Exclusions', questionnaire.exclusions], ['Santé / digestion', questionnaire.medical]].filter(([, value]) => value).map(([label, value]) => <div key={label} className="mt-3"><p className="text-[10px] font-black uppercase text-amber-600">{label}</p><p className="whitespace-pre-wrap text-sm text-amber-950">{value}</p></div>)}</section>}
      </div>}

      {!loading && file && tab === 'plan' && <div className="space-y-4">{planModes.map(mode => <section key={mode.id} className={`rounded-2xl border bg-white shadow-sm ${mode.id === currentMode ? 'border-violet-300 ring-2 ring-violet-100' : 'border-slate-200'}`}><div className="border-b border-slate-100 p-4"><div className="flex items-center justify-between"><h2 className="font-black text-slate-900">{mode.emoji} {mode.label}</h2>{mode.id === currentMode && <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-black text-violet-700">Mode actuel</span>}</div><div className="mt-3"><MacroCards values={mode.target} /></div></div><div className="divide-y divide-slate-100">{(mode.plan || []).map(meal => <div key={meal.id} className="p-4"><p className="font-black text-slate-800">{meal.emoji} {meal.name}</p><div className="mt-2 space-y-1.5">{(meal.items || []).map(item => <div key={item.id} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 text-slate-700">{item.name}</span><span className="shrink-0 text-xs font-bold text-slate-400">{item.qty} · {round(item.cal)} kcal</span></div>)}</div></div>)}</div></section>)}</div>}

      {!loading && file && tab === 'journal' && <div className="space-y-3">{(file.daily || []).length === 0 ? <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Aucune journée synchronisée.</p> : (file.daily || []).map(row => { const consumed = consumedMacros(row); const done = Object.values(row.status_json || {}).filter(value => value === 'done').length; const skipped = Object.values(row.status_json || {}).filter(value => value === 'skip').length; return <article key={`${row.date_key}-${row.mode_id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-slate-900">{formatDate(row.date_key)}</h2><p className="text-xs font-bold capitalize text-violet-600">Mode {row.mode_id}</p></div><p className="text-xs text-slate-400">{done} pris · {skipped} non pris</p></div><div className="mt-3"><MacroCards values={consumed} /></div></article>; })}</div>}

      {!loading && file && tab === 'measures' && <div className="space-y-3">{measurements.length === 0 ? <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Aucune mesure enregistrée.</p> : measurements.map(entry => <article key={entry.id || entry.date} className="rounded-2xl border border-slate-200 bg-white shadow-sm"><h2 className="border-b border-slate-100 p-4 font-black text-slate-900">{formatDate(entry.date)}</h2><div className="grid grid-cols-4">{measureFields.map(([key, label, unit]) => <div key={key} className="border-b border-r border-slate-100 p-2 text-center"><p className="text-[9px] text-slate-400">{label}</p><p className="text-sm font-black text-slate-800">{entry[key] || '—'}{entry[key] && <span className="ml-0.5 text-[9px] text-slate-400">{unit}</span>}</p></div>)}</div></article>)}</div>}

      {!loading && file && tab === 'updates' && <div className="space-y-4">
        <form onSubmit={sendUpdate} className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm"><h2 className="font-black text-slate-900">Nouvel ajustement coach</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Cette consigne sera visible par le client dans l’application et restera datée dans son dossier.</p><textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={1000} placeholder="Ex. Aujourd’hui, conserve le petit déjeuner et réduis uniquement la portion de féculents du soir…" className="mt-3 min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-base outline-none focus:border-violet-400"/><div className="mt-2 flex items-center justify-between"><span className="text-xs text-slate-400">{message.length}/1000</span><button disabled={sending || message.trim().length < 3} className="flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 font-black text-white disabled:opacity-40">{sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />} Envoyer</button></div></form>
        {(file.updates || []).map(update => <article key={update.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-black text-emerald-600"><Check size={14} /> Visible par le client</div><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{update.message}</p><p className="mt-2 text-xs text-slate-400">{formatDate(update.created_at)}</p></article>)}
      </div>}
    </div>
  );
}
