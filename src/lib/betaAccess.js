import { supabase } from './supabaseClient';

export const PENDING_INVITE_KEY = 'coach-nutrition:pending-beta-invite';

export function rememberPendingInvite(code) {
  localStorage.setItem(PENDING_INVITE_KEY, String(code || '').trim().toUpperCase());
}
export function pendingInvite() {
  return localStorage.getItem(PENDING_INVITE_KEY) || '';
}

export function forgetPendingInvite() {
  localStorage.removeItem(PENDING_INVITE_KEY);
}

export async function checkBetaInvite(code) {
  const { data, error } = await supabase.rpc('check_beta_invite', { p_code: code });
  if (error) throw error;
  return data === true;
}

export async function redeemBetaInvite(code) {
  const { data, error } = await supabase.rpc('redeem_beta_invite', { p_code: code });
  if (error) throw error;
  forgetPendingInvite();
  return data;
}

export async function getAccessContext() {
  const { data, error } = await supabase.rpc('get_access_context');
  if (error) throw error;
  return data || { has_access: false, is_coach: false };
}

export async function loadCoachBetaDashboard() {
  const { data, error } = await supabase.rpc('coach_beta_dashboard');
  if (error) throw error;
  return data || [];
}

export async function createBetaInvite(label) {
  const { data, error } = await supabase.rpc('coach_create_beta_invite', { p_label: label });
  if (error) throw error;
  return data;
}

export async function revokeBetaInvite(inviteId) {
  const { error } = await supabase.rpc('coach_revoke_beta_invite', { p_invite_id: inviteId });
  if (error) throw error;
}
