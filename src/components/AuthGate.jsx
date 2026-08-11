import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { profileForSession } from '../lib/cloudSync';
import Login from './Login';

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const applySession = async (nextSession) => {
      setSession(nextSession);
      setProfileId(nextSession ? await profileForSession(nextSession) : null);
    };

    const initializeSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (mounted) {
        await applySession(currentSession);
        setLoading(false);
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        setTimeout(async () => {
          if (!mounted) return;
          try { await applySession(currentSession); }
          finally { if (mounted) setLoading(false); }
        }, 0);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-700 flex items-center justify-center px-4 safe-bottom">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <Loader2 size={22} className="mx-auto mb-3 animate-spin text-violet-600" />
          <p className="text-sm font-medium text-slate-700">Chargement de l’application…</p>
          <p className="text-xs text-slate-500 mt-1">Initialisation de la session Supabase</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (!profileId) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 text-slate-700 safe-bottom flex items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle size={24} className="mx-auto mb-3 text-amber-500" />
          <h1 className="text-lg font-bold text-slate-900">Compte en attente d’un programme</h1>
          <p className="mt-2 text-sm text-slate-600">Aucun plan nutritionnel n’est encore associé à cette adresse. Les programmes de Luca et Émilie restent privés.</p>
          <button onClick={() => supabase.auth.signOut()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
            <LogOut size={15} /> Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return typeof children === 'function' ? children(session, profileId) : children;
}
