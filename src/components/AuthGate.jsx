import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { nutritionProfileForSession, profileForSession } from '../lib/cloudSync';
import Login from './Login';
import OnboardingFlow from './OnboardingFlow';

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [nutritionProfile, setNutritionProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const applySession = async (nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
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

  if (!profileId && !nutritionProfile) {
    return <OnboardingFlow session={session} onComplete={setNutritionProfile} />;
  }

  if (!profileId && nutritionProfile?.onboarding_status !== 'completed') return <OnboardingFlow session={session} onComplete={setNutritionProfile} />;

  return typeof children === 'function' ? children(session, profileId || nutritionProfile.profile_id, nutritionProfile) : children;
}
