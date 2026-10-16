import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && key
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

export const PROFILE_COLUMNS =
  'id, name, prefecture, categories, bio, visible, buys_for_others, fee_type, fee_value, fee_note, is_student, created_at';
