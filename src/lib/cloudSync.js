import { supabase } from './supabaseClient';
import { localDateKey } from './date';
import { normalizeCalibration } from './prospectJourney';
import { upgradeNutritionProfileExperience } from './onboardingPlan';

export async function profileForSession(session) {
  if (!session?.user?.id) return null;
  const { data, error } = await supabase
    .from('account_profiles')
    .select('profile_id')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (error) throw error;
  return data?.profile_id || null;
}

export async function nutritionProfileForSession(session) {
  if (!session?.user?.id) return null;
  const { data, error } = await supabase
    .from('user_nutrition_profiles')
    .select('user_id, profile_id, display_name, questionnaire_json, plan_modes_json, calibration_json, onboarding_status, updated_at')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const normalizedProfile = Number(data.calibration_json?.version || 0) >= 2
    ? data
    : { ...data, calibration_json: normalizeCalibration(data.calibration_json, data.updated_at) };
  const upgradedProfile = upgradeNutritionProfileExperience(normalizedProfile);
  if (Number(data.calibration_json?.experienceVersion || 0) >= 1
      && Number(data.calibration_json?.version || 0) >= 3) return data;
  const { data: saved, error: upgradeError } = await supabase
    .from('user_nutrition_profiles')
    .upsert({ ...upgradedProfile, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select('user_id, profile_id, display_name, questionnaire_json, plan_modes_json, calibration_json, onboarding_status, updated_at')
    .single();
  if (upgradeError) throw upgradeError;
  return saved;
}

export async function saveNutritionProfile(profile) {
  const { data, error } = await supabase.from('user_nutrition_profiles').upsert({
    ...profile,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' }).select().single();
  if (error) throw error;
  return data;
}

export async function loadCloudSnapshot({ userId, profileId, dateKey }) {
  const [dailyResult, preferencesResult, trackingResult] = await Promise.all([
    supabase
      .from('user_daily_state')
      .select('profile_id, mode_id, plan_json, status_json, insight_json, real_qty_json, collapsed_json, changes_since_analysis, updated_at')
      .eq('user_id', userId)
      .eq('profile_id', profileId)
      .eq('date_key', dateKey),
    supabase
      .from('user_preferences')
      .select('current_profile_id, current_mode_id, last_mode_by_profile_json, updated_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('user_tracking')
      .select('profile_id, date_key, cal_journal, entry_json, measurements_json, updated_at')
      .eq('user_id', userId)
      .eq('profile_id', profileId)
      .order('date_key', { ascending: true }),
  ]);

  for (const result of [dailyResult, preferencesResult, trackingResult]) {
    if (result.error) throw result.error;
  }

  return {
    daily: dailyResult.data || [],
    preferences: preferencesResult.data || null,
    tracking: trackingResult.data || [],
  };
}

export async function saveDailyStates({ userId, dateKey, rows }) {
  if (!rows.length) return;
  const { error } = await supabase.from('user_daily_state').upsert(
    rows.map(row => ({
      user_id: userId,
      profile_id: row.profileId,
      mode_id: row.modeId,
      date_key: dateKey,
      plan_json: row.plan,
      status_json: row.status,
      insight_json: row.insight,
      real_qty_json: row.realQty,
      collapsed_json: row.collapsed,
      changes_since_analysis: row.changesSinceAnalysis,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'user_id,profile_id,mode_id,date_key' },
  );
  if (error) throw error;
}

export async function savePreferences({ userId, profileId, modeId, lastModeByProfile }) {
  const { error } = await supabase.from('user_preferences').upsert({
    user_id: userId,
    current_profile_id: profileId,
    current_mode_id: modeId,
    last_mode_by_profile_json: lastModeByProfile,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function saveTracking({ userId, profileId, suivi, measurements }) {
  const entries = Object.entries(suivi || {});
  if (!entries.length && !(measurements || []).length) return;

  const todayKey = localDateKey();
  const rows = entries.length ? entries : [[todayKey, {}]];
  const { error } = await supabase.from('user_tracking').upsert(
    rows.map(([dateKey, entry]) => ({
      user_id: userId,
      profile_id: profileId,
      date_key: dateKey,
      cal_journal: Number.isFinite(Number(entry?.calJournal)) ? Number(entry.calJournal) : null,
      entry_json: entry || {},
      measurements_json: measurements || [],
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'user_id,profile_id,date_key' },
  );
  if (error) throw error;
}
