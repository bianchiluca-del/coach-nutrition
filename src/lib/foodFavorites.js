import { supabase } from './supabaseClient';

const toNumber = (value) => {
  const parsed = Number.parseFloat(String(value ?? 0).replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 10) / 10 : 0;
};

export async function loadFoodFavorites(userId) {
  const { data, error } = await supabase
    .from('user_food_favorites')
    .select('id, name, portion, calories, protein, carbs, fat, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveFoodFavorite(userId, entry) {
  const row = {
    user_id: userId,
    name: entry.name.trim(),
    portion: entry.qty?.trim() || '1 portion',
    calories: toNumber(entry.cal),
    protein: toNumber(entry.p),
    carbs: toNumber(entry.g),
    fat: toNumber(entry.l),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('user_food_favorites')
    .upsert(row, { onConflict: 'user_id,name' })
    .select('id, name, portion, calories, protein, carbs, fat, updated_at')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFoodFavorite(userId, favoriteId) {
  const { error } = await supabase
    .from('user_food_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('id', favoriteId);
  if (error) throw error;
}

export function favoriteToEntry(favorite) {
  return {
    name: favorite.name,
    qty: favorite.portion,
    cal: favorite.calories,
    p: favorite.protein,
    g: favorite.carbs,
    l: favorite.fat,
  };
}
