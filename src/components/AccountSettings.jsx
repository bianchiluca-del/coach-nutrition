import { useState } from 'react';
import { AlertTriangle, AtSign, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const APP_URL = 'https://bianchiluca-del.github.io/coach-nutrition/';

function Notice({ notice }) {
  if (!notice) return null;
  const ok = notice.type === 'success';
  return <div className={`rounded-xl border px-3 py-2.5 text-sm ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{notice.text}</div>;
}

export default function AccountSettings({ session, profileName, syncState, onSignOut, signingOut }) {
  const [email, setEmail] = useState(session?.user?.email || '');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(null);
  const [emailNotice, setEmailNotice] = useState(null);
  const [passwordNotice, setPasswordNotice] = useState(null);
  const [deletionPassword, setDeletionPassword] = useState('');
  const [deletionConfirm, setDeletionConfirm] = useState('');
  const [deletionNotice, setDeletionNotice] = useState(null);

  const verifyPassword = async (password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: session.user.email, password });
    if (error) throw new Error('Le mot de passe actuel est incorrect.');
  };

  const changeEmail = async (event) => {
    event.preventDefault();
    setEmailNotice(null);
    const normalized = email.trim().toLowerCase();
    if (!normalized || normalized === session.user.email?.toLowerCase()) {
      setEmailNotice({ type: 'error', text: 'Entre une nouvelle adresse e-mail.' });
      return;
    }
    if (!emailPassword) {
      setEmailNotice({ type: 'error', text: 'Confirme ton mot de passe actuel.' });
      return;
    }
    try {
      setBusy('email');
      await verifyPassword(emailPassword);
      const { error } = await supabase.auth.updateUser({ email: normalized }, { emailRedirectTo: APP_URL });
      if (error) throw error;
      setEmailPassword('');
      setEmailNotice({ type: 'success', text: 'Demande envoyée. Confirme le changement avec le lien reçu par e-mail.' });
    } catch (error) {
      setEmailNotice({ type: 'error', text: error.message || 'Impossible de modifier cette adresse.' });
    } finally { setBusy(null); }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordNotice(null);
    if (newPassword.length < 8) {
      setPasswordNotice({ type: 'error', text: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', text: 'Les deux nouveaux mots de passe ne correspondent pas.' });
      return;
    }
    try {
      setBusy('password');
      await verifyPassword(currentPassword);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordNotice({ type: 'success', text: 'Mot de passe modifié avec succès.' });
    } catch (error) {
      setPasswordNotice({ type: 'error', text: error.message || 'Impossible de modifier le mot de passe.' });
    } finally { setBusy(null); }
  };

  const deleteAccount = async (event) => {
    event.preventDefault();
    setDeletionNotice(null);
    if (deletionConfirm.trim().toUpperCase() !== 'SUPPRIMER') {
      setDeletionNotice({ type: 'error', text: 'Écris SUPPRIMER pour confirmer.' });
      return;
    }
    if (!deletionPassword) {
      setDeletionNotice({ type: 'error', text: 'Confirme ton mot de passe actuel.' });
      return;
    }
    if (!window.confirm('Supprimer définitivement ton compte, tes plans, ton suivi et tes mensurations ? Cette action est irréversible.')) return;
    try {
      setBusy('delete');
      await verifyPassword(deletionPassword);
      const { error } = await supabase.functions.invoke('delete-account', { body: { confirm: true } });
      if (error) throw error;
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('coach-nutrition')) localStorage.removeItem(key);
      });
      await supabase.auth.signOut({ scope: 'local' });
      window.location.reload();
    } catch (error) {
      setDeletionNotice({ type: 'error', text: error.message || 'Impossible de supprimer le compte.' });
      setBusy(null);
    }
  };

  const inputClass = 'w-full min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100';
  const passwordType = showPasswords ? 'text' : 'password';

  return (
    <div className="space-y-4 pb-28 pt-2">
      <div className="text-center py-2">
        <h2 className="text-lg font-bold text-slate-800">Paramètres du compte</h2>
        <p className="mt-1 text-xs text-slate-500">Compte de {profileName} · {session?.user?.email}</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2"><AtSign size={18} className="text-violet-600" /><h3 className="font-bold text-slate-800">Changer d’adresse e-mail</h3></div>
        <form className="space-y-3" onSubmit={changeEmail}>
          <input type="email" autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Nouvelle adresse e-mail" />
          <input type={passwordType} autoComplete="current-password" className={inputClass} value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} placeholder="Mot de passe actuel" />
          <Notice notice={emailNotice} />
          <button disabled={busy !== null} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 font-bold text-white disabled:opacity-50">
            {busy === 'email' ? <Loader2 size={17} className="animate-spin" /> : <AtSign size={17} />} Mettre à jour l’e-mail
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><KeyRound size={18} className="text-violet-600" /><h3 className="font-bold text-slate-800">Changer de mot de passe</h3></div>
          <button type="button" onClick={() => setShowPasswords((value) => !value)} className="rounded-lg p-2 text-slate-500" aria-label="Afficher ou masquer les mots de passe">{showPasswords ? <EyeOff size={17} /> : <Eye size={17} />}</button>
        </div>
        <form className="space-y-3" onSubmit={changePassword}>
          <input type={passwordType} autoComplete="current-password" className={inputClass} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Mot de passe actuel" />
          <input type={passwordType} autoComplete="new-password" className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe (8 caractères minimum)" />
          <input type={passwordType} autoComplete="new-password" className={inputClass} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmer le nouveau mot de passe" />
          <Notice notice={passwordNotice} />
          <button disabled={busy !== null} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 font-bold text-white disabled:opacity-50">
            {busy === 'password' ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={17} />} Modifier le mot de passe
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          {syncState === 'synced' ? <CheckCircle2 size={20} className="text-emerald-500" /> : <ShieldCheck size={20} className="text-amber-500" />}
          <div><h3 className="text-sm font-bold text-slate-800">Sauvegarde et sécurité</h3><p className="text-xs text-slate-500">{syncState === 'synced' ? 'Tes données sont sauvegardées dans le cloud.' : 'Synchronisation en cours ou connexion indisponible.'}</p></div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        <div className="mb-2 flex items-center gap-2"><ShieldCheck size={18} className="text-violet-600" /><h3 className="font-bold text-slate-800">Confidentialité des données</h3></div>
        <p className="leading-relaxed">Tes informations servent uniquement à créer ton plan, calculer ton suivi et personnaliser les conseils. Elles sont stockées sur ton compte sécurisé et ne sont pas visibles par les autres utilisateurs.</p>
        <p className="mt-2 text-xs text-slate-500">Tu peux retirer ton consentement à tout moment en supprimant ton compte ci-dessous. Cette suppression est définitive.</p>
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
        <div className="mb-3 flex items-start gap-2">
          <AlertTriangle size={19} className="mt-0.5 shrink-0 text-red-600" />
          <div><h3 className="font-bold text-red-800">Supprimer définitivement mon compte</h3><p className="mt-1 text-xs leading-relaxed text-red-700">Tous tes plans, repas, favoris, suivis, mensurations et informations de questionnaire seront effacés.</p></div>
        </div>
        <form className="space-y-3" onSubmit={deleteAccount}>
          <input type={passwordType} autoComplete="current-password" className={inputClass} value={deletionPassword} onChange={(e) => setDeletionPassword(e.target.value)} placeholder="Mot de passe actuel" />
          <input type="text" autoComplete="off" className={inputClass} value={deletionConfirm} onChange={(e) => setDeletionConfirm(e.target.value)} placeholder="Écris SUPPRIMER" />
          <Notice notice={deletionNotice} />
          <button disabled={busy !== null} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 font-bold text-white disabled:opacity-50">
            {busy === 'delete' ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />} Supprimer mon compte
          </button>
        </form>
      </section>

      <button type="button" onClick={onSignOut} disabled={signingOut} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 font-bold text-red-600 disabled:opacity-50">
        {signingOut ? <Loader2 size={17} className="animate-spin" /> : <LogOut size={17} />} Se déconnecter
      </button>
    </div>
  );
}
