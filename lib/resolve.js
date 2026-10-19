// Servidor: transforma o que o aluno escreveu em palavras japonesas para buscar.
// 1) catálogo (lib/catalog.js)  2) já está em japonês  3) Google Translate (opcional)
import { matchCatalog, hasJapanese } from './catalog';

const memo = new Map(); // traduções guardadas enquanto o servidor está ligado

export async function toJapanese(text) {
  return translate(text, 'ja');
}

export async function translate(text, target = 'ja') {
  const key = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
  const t = String(text || '').trim();
  if (!key || !t) return null;
  const mk = target + '|' + t;
  if (memo.has(mk)) return memo.get(mk);
  try {
    const res = await fetch('https://translation.googleapis.com/language/translate/v2', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
      body: JSON.stringify({ q: t, target, format: 'text' }),
    });
    if (!res.ok) return null; // Translation API não ativada: segue sem traduzir
    const data = await res.json();
    let out = data?.data?.translations?.[0]?.translatedText || '';
    // "おもちゃの車" → "おもちゃ 車" (o Rakuten busca melhor com palavras separadas)
    if (target === 'ja') out = out.replace(/[、。・]/g, ' ').replace(/の/g, ' ');
    out = out.replace(/\s+/g, ' ').trim();
    if (!out) return null;
    if (memo.size > 2000) memo.clear();
    memo.set(mk, out);
    return out;
  } catch {
    return null;
  }
}

// kind: 'online' (Rakuten) ou 'store' (Google Maps)
export async function resolveQuery(q, kind = 'online') {
  const t = String(q || '').trim();
  const m = matchCatalog(t);
  if (m?.sub) return { text: kind === 'store' ? m.sub.store : m.sub.kw, how: 'catalog' };
  if (m?.cat) {
    const ja = m.cat.aliases.find(hasJapanese);
    return { text: kind === 'store' ? m.cat.store : (ja || m.cat.store), how: 'catalog' };
  }
  if (hasJapanese(t)) return { text: t, how: 'original' };
  const tr = await toJapanese(t);
  if (tr) return { text: tr, how: 'translated' };
  return { text: t, how: 'original' };
}

// Para o eBay: busca em inglês (catálogo → tradução → texto original)
export async function resolveEnglish(q) {
  const t = String(q || '').trim();
  const m = matchCatalog(t);
  if (m?.sub) return { text: m.sub.en, how: 'catalog' };
  if (m?.cat) return { text: m.cat.en, how: 'catalog' };
  if (/^[\x00-\x7F]+$/.test(t) && !/\b(de|da|do|para|com|e)\b/i.test(t)) return { text: t, how: 'original' };
  const tr = await translate(t, 'en');
  return tr ? { text: tr, how: 'translated' } : { text: t, how: 'original' };
}
