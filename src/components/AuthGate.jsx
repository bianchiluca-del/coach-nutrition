import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { nutritionProfileForSession, profileForSession } from '../lib/cloudSync';
import Login from './Login';
import OnboardingFlow from './OnboardingFlow';
import BetaAccessGate from './BetaAccessGate';
import { getAccessContext, pendingInvite, redeemBetaInvite } from '../lib/betaAccess';

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [nutritionProfile, setNutritionProfile] = useState(null);
  const [accessContext, setAccessContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;

    const applySession = async (nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfileId(null);
        setNutritionProfile(null);
        setAccessContext(null);
        return;
      }

      const savedInvite = pendingInvite();
      if (savedInvite) {
        try { await redeemBetaInvite(savedInvite); }
        catch { /* L'écran d'accès permettra de ressaisir le code si nécessaire. */ }
      }
      const nextAccessContext = await getAccessContext();
      setAccessContext(nextAccessContext);
      if (!nextAccessContext?.has_access) {
        setProfileId(null);
        setNutritionProfile(null);
        return;
      }
      const [privateProfileId, memberProfile] = await Promise.all([
        profileForSession(nextSession),
        nutritionProfileForSession(nextSession),
      ]);
      setProfileId(privateProfileId);
      setNutritionProfile(memberProfile);
    };

    const initializeSession = async () => {
      try {
        setLoadError('');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted) await applySession(currentSession);
      } catch (error) {
        if (mounted) setLoadError(error?.message || 'Connexion au service indisponible.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        setTimeout(async () => {
          if (!mounted) return;
          try { setLoadError(''); await applySession(currentSession); }
          catch (error) { if (mounted) setLoadError(error?.message || 'Connexion au service indisponible.'); }
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

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-700 flex items-center justify-center px-4 safe-bottom">
        <div className="max-w-sm rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle size={24} className="mx-auto mb-3 text-amber-500" />
          <h1 className="font-bold text-slate-900">Connexion momentanément indisponible</h1>
          <p className="mt-2 text-sm text-slate-600">Tes données restent sauvegardées. Vérifie ta connexion puis réessaie.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 font-bold text-white">
            <RotateCcw size={17} /> Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (!accessContext?.has_access) {
    return <BetaAccessGate onGranted={setAccessContext} />;
  }

  if (!profileId && !nutritionProfile) {
    return <OnboardingFlow session={session} onComplete={setNutritionProfile} />;
  }

  if (!profileId && nutritionProfile?.onboarding_status !== 'completed') return <OnboardingFlow session={session} onComplete={setNutritionProfile} />;

  return typeof children === 'function' ? children(session, profileId || nutritionProfile.profile_id, nutritionProfile, accessContext) : children;
}
