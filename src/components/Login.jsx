import { useState } from 'react';
import { LogIn, UserPlus, Mail, Lock, RotateCcw, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const authRedirectUrl = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const clearFeedback = () => setFeedback({ type: '', text: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: authRedirectUrl,
        });

        if (error) throw error;

        setFeedback({
          type: 'success',
          text: 'Consultez votre boîte mail pour réinitialiser votre mot de passe.',
        });
        setPassword('');
        return;
      }

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authRedirectUrl },
        });

        if (error) throw error;

        if (data?.user?.identities?.length === 0) {
          setFeedback({
            type: 'error',
            text: 'Cette adresse est déjà utilisée. Essayez de vous connecter.',
          });
          return;
        }

        setFeedback({
          type: 'success',
          text: 'Compte créé. Vérifiez vos emails si la confirmation est activée.',
        });
        setPassword('');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      setFeedback({
        type: 'success',
        text: 'Connexion réussie.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error?.message || 'Une erreur est survenue. Veuillez réessayer.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 px-4 pt-6 pb-8 safe-bottom">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md flex-col justify-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-violet-500">Coach Nutrition</p>
              <h1 className="text-xl font-bold text-slate-900">Accès sécurisé</h1>
            </div>
          </div>

          <p className="mb-4 text-sm text-slate-600">
            Connectez-vous ou créez un compte pour garder vos données synchronisées.
          </p>

          <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
            {[
              { key: 'login', label: 'Connexion', icon: LogIn },
              { key: 'signup', label: 'Créer', icon: UserPlus },
              { key: 'reset', label: 'Mot de passe', icon: RotateCcw },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setMode(key); clearFeedback(); }}
                className={`flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition active:scale-[0.98] ${
                  mode === key ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm text-slate-700">
              <span className="mb-1.5 flex items-center gap-1.5 font-medium">
                <Mail size={14} className="text-violet-500" /> Email
              </span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[16px] text-slate-900 outline-none ring-0 transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 touch-manipulation"
                placeholder="vous@example.com"
              />
            </label>

            {mode !== 'reset' && (
              <label className="block text-sm text-slate-700">
                <span className="mb-1.5 flex items-center gap-1.5 font-medium">
                  <Lock size={14} className="text-violet-500" /> Mot de passe
                </span>
                <input
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[16px] text-slate-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 touch-manipulation"
                  placeholder={mode === 'signup' ? 'Au moins 6 caractères' : 'Votre mot de passe'}
                />
              </label>
            )}

            {feedback.text && (
              <div className={`rounded-2xl border px-3 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}>
                <div className="flex items-start gap-2">
                  {feedback.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                  <span>{feedback.text}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-violet-300"
            >
              {loading ? 'Patientez…' : mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer un compte' : 'Envoyer le lien'}
            </button>
          </form>

          <div className="mt-4 space-y-2 text-sm text-slate-500">
            {mode !== 'reset' && (
              <button
                type="button"
                onClick={() => { setMode('reset'); clearFeedback(); }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-left font-medium text-slate-600 transition active:bg-slate-50"
              >
                Mot de passe oublié ?
              </button>
            )}
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => { setMode('login'); clearFeedback(); }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-left font-medium text-slate-600 transition active:bg-slate-50"
              >
                Retour à la connexion
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
