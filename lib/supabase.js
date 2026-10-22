import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Lido antes do Supabase limpar a URL: diz se a pessoa voltou de um link de
// confirmação de cadastro ("signup") ou de "esqueci minha senha" ("recovery").
export const linkType = typeof window !== 'undefined'
  ? (new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type') || new URLSearchParams(window.location.search).get('type') || '')
  : '';

export const supabase = url && key
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

export const PROFILE_COLUMNS =
  'id, name, prefecture, categories, bio, visible, buys_for_others, fee_type, fee_value, fee_note, is_student, created_at';
