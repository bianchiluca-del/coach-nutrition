import { supabase } from './supabaseClient';

export async function setCoachDataConsent(granted) {
  const { data, error } = await supabase.rpc('set_coach_data_consent', { p_granted: Boolean(granted) });
  if (error) throw error;
  return data;
}

export async function loadClientCoachContext() {
  const { data, error } = await supabase.rpc('get_client_coach_context');
  if (error) throw error;
  return data || { has_assignment: false, coach_data_consent: false, updates: [] };
}

export async function loadCoachClientFile(clientUserId) {
  const { data, error } = await supabase.rpc('coach_get_client_file', { p_client_id: clientUserId });
  if (error) throw error;
  return data || {};
}

export async function createCoachClientUpdate(clientUserId, message) {
  const { data, error } = await supabase.rpc('coach_create_client_update', {
    p_client_id: clientUserId,
    p_message: message,
  });
  if (error) throw error;
  return data;
}
