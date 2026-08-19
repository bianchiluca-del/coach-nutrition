import { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { passwordValidationMessage } from '../lib/passwordPolicy';

export default function RecoveryPassword({ onComplete }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const submit = async event => {
    event.preventDefault();
    const policyError = passwordValidationMessage(password);
    if (policyError) return setNotice({ ok: false, text: policyError });
    if (password !== confirmation) return setNotice({ ok: false, text: 'Les deux mots de passe ne correspondent pas.' });
    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setNotice({ ok: true, text: 'Ton mot de passe est mis à jour.' });
      setTimeout(onComplete, 900);
    } catch (error) {
      setNotice({ ok: false, text: error?.message || 'Impossible de modifier le mot de passe.' });
      setSaving(false);
    }
  };

  return <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 safe-bottom"><div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center"><div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600"><KeyRound size={22}/></div><div><p className="text-[11px] font-bold uppercase tracking-[.2em] text-violet-500">Récupération sécurisée</p><h1 className="text-xl font-black">Nouveau mot de passe</h1></div></div><p className="mb-5 text-sm leading-relaxed text-slate-600">Choisis au moins 12 caractères avec majuscule, minuscule, chiffre et symbole.</p><form onSubmit={submit} className="space-y-3"><div className="relative"><input type={show ? 'text' : 'password'} autoComplete="new-password" minLength={12} required value={password} onChange={event => setPassword(event.target.value)} placeholder="Nouveau mot de passe" className="min-h-12 w-full rounded-xl border border-slate-200 px-3 pr-12 text-base outline-none focus:border-violet-400"/><button type="button" onClick={() => setShow(value => !value)} aria-label="Afficher ou masquer le mot de passe" className="absolute right-2 top-2 rounded-lg p-2 text-slate-500">{show ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div><input type={show ? 'text' : 'password'} autoComplete="new-password" minLength={12} required value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="Confirmer le mot de passe" className="min-h-12 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-violet-400"/>{notice && <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${notice.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{notice.ok && <CheckCircle2 size={16}/>} {notice.text}</div>}<button disabled={saving} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={17}/> : <KeyRound size={17}/>} Enregistrer</button></form><button type="button" onClick={() => supabase.auth.signOut()} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"><LogOut size={15}/> Annuler et se déconnecter</button></div></div></div>;
}
